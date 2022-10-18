/* @flow */

import {
    getClientID,
    getMerchantID,
    getLogger,
    getBuyerCountry
} from '@paypal/sdk-client/src';
import { FPTI_KEY } from '@paypal/sdk-constants/src';
import {getMerchantDomain, getCurrency, getPayPalHost} from './util'

import type { ConfigResponse, ApplePaySession, ApproveParams, CreateOrderResponse, OrderPayload, ValidateMerchantParams, ApplepayType } from './types';
import { FPTI_TRANSITION, FPTI_CUSTOM_KEY, DEFAULT_API_HEADERS, DEFAULT_GQL_HEADERS } from './constants';
import { logApplePayEvent } from './logging';

async function createOrder(payload : OrderPayload) : Promise<CreateOrderResponse> {
    const basicAuth = btoa(`${ getClientID() }`);
    const domain = getPayPalHost('customDomain')
    const accessToken = await fetch(
        `https://api.${domain}/v1/oauth2/token`,
        {
            method:       'POST',
            headers:      {
                Authorization: `Basic ${ basicAuth }`
            },
            body: 'grant_type=client_credentials'
        }
    )
        .then((res) => res.json())
        .then(({ access_token }) => access_token);

    const res = await fetch(
        `https://api.${domain}/v2/checkout/orders`,
        {
            method:       'POST',
            headers:      {
                ...DEFAULT_API_HEADERS,
                'Authorization':  `Bearer ${ accessToken }`
            },
            body: JSON.stringify(payload)
        }
    );
    const { id, status } = await res.json();

    return {
        id,
        status
    };
}

async function config() : Promise<ConfigResponse> {
    const domain = getPayPalHost('customDomain')

    return fetch(
        `https://www.${domain}/graphql?GetApplepayConfig`,
        {
            method:       'POST',
            credentials: 'include',
            headers:      {
                ...DEFAULT_GQL_HEADERS
            },
            body:        JSON.stringify({
                query: `
                  query GetApplepayConfig(
                    $buyerCountry: CountryCodes
                    $clientId: String!
                    $merchantId: [String]!
                  ) {
                    applepayConfig(
                      buyerCountry: $buyerCountry
                      clientId: $clientId
                      merchantId: $merchantId
                    ) {
                      merchantCountry,
                      supportedNetworks,
                      isEligible,
                      merchantCapabilities
                    }
                  }`,
                variables: {
                    buyerCountry: getBuyerCountry(),
                    clientId:     getClientID(),
                    merchantId:   getMerchantID()
                }
            })
        }
    )
        .then((res) => {
            if (!res.ok) {
                throw new Error(`GetApplepayConfig response status ${ res.status }`);
            }
            return res.json();
        })
        .then(({ data, errors }) => {
            if (Array.isArray(errors) && errors.length) {
                const message = errors[0]?.message ?? JSON.stringify(errors[0]);
                throw new Error(message);
            }
            
            return { ...data.applepayConfig, currencyCode: getCurrency(), countryCode: data.applepayConfig.merchantCountry };
        })
        .catch((err) => {
            getLogger().error(FPTI_TRANSITION.APPLEPAY_CONFIG_ERROR)
                .track({
                    [FPTI_KEY.TRANSITION]:      FPTI_TRANSITION.APPLEPAY_CONFIG_ERROR,
                    [FPTI_CUSTOM_KEY.ERR_DESC]: `Error: ${ err.message }) }`
                })
                .flush();

            throw err;
        });
}


async function validateMerchant({ validationUrl } : ValidateMerchantParams) : Promise<ApplePaySession> {
    logApplePayEvent('validatemerchant', { validationUrl });
    const domain = getPayPalHost('customDomain')

    return fetch(
        `https://www.${domain}/graphql?GetApplePayMerchantSession`,
        {
            credentials: 'include',
            method:       'POST',
            headers:      {
                ...DEFAULT_GQL_HEADERS
            },
            body: JSON.stringify({
                query: `
                query GetApplePayMerchantSession(
                    $url : String!
                    $clientID : String!
                    $merchantID : [String]
                    $merchantDomain : String!
                ) {
                    applePayMerchantSession(
                        url: $url
                        clientID: $clientID
                        merchantID: $merchantID
                        merchantDomain: $merchantDomain
                    ) {
                        session
                    }
                }`,
              variables: {
                  url:            validationUrl,
                  clientID:       getClientID(),
                  merchantID: getMerchantID()
                  merchantDomain: getMerchantDomain()
                }
            })
        }
    )
        .then((res) => {
            if (!res.ok) {
                throw new Error(`GetApplePayMerchantSession response status ${ res.status }`);
            }
            return res.json();
        })
        .then(({ data, errors }) => {
            if (Array.isArray(errors) && errors.length) {
                const message = errors[0]?.message ?? JSON.stringify(errors[0]);

                throw new Error(message);
            }
            return data;
        })
        .then(({ applePayMerchantSession }) => {
            const payload = atob(applePayMerchantSession.session);
            return JSON.parse(payload);
        })
        .catch((err) => {
            getLogger().error(FPTI_TRANSITION.APPLEPAY_MERCHANT_VALIDATION_ERROR)
                .track({
                    [FPTI_KEY.TRANSITION]:      FPTI_TRANSITION.APPLEPAY_MERCHANT_VALIDATION_ERROR,
                    [FPTI_CUSTOM_KEY.ERR_DESC]: `Error: ${ err.message }) }`
                })
                .flush();
            throw err;
        });
}


async function approvePayment({ orderID, payment } : ApproveParams) : Promise<void> {
    logApplePayEvent('paymentauthorized');
    const domain = getPayPalHost('customDomain')

    return fetch(
        `https://www.${domain}/graphql?ApproveApplePayPayment`,
        {
            credentials: 'include',
            method:       'POST',
            headers:      {
                ...DEFAULT_GQL_HEADERS
            },
            body: JSON.stringify({
                query: `
                    mutation ApproveApplePayPayment(
                      $token: ApplePayPaymentToken!
                      $orderID: String!
                      $clientID : String!
                      $billingContact: ApplePayPaymentContact!
                      $shippingContact: ApplePayPaymentContact
                    ) {
                      approveApplePayPayment(
                        token: $token
                        orderID: $orderID
                        clientID: $clientID
                        billingContact: $billingContact
                        shippingContact: $shippingContact
                      )
                    }`,
                variables: {
                    token:           payment.token,
                    billingContact:  payment.billingContact,
                    shippingContact: payment.shippingContact,
                    clientID:        getClientID(),
                    orderID
                }
            })
        }
    )
        .then((res) => {
            if (!res.ok) {
                throw new Error(`ApproveApplePayPayment response status ${ res.status }`);
            }
            return res.json();
        })
        .then(({ data, errors }) => {
            if (Array.isArray(errors) && errors.length) {
                const message = errors[0]?.message ?? JSON.stringify(errors[0]);
                throw new Error(message);
            }
            return data;
        })
        .catch((err) => {
            getLogger().error(FPTI_TRANSITION.APPLEPAY_PAYMENT_ERROR)
                .track({
                    [FPTI_KEY.TRANSITION]:      FPTI_TRANSITION.APPLEPAY_PAYMENT_ERROR,
                    [FPTI_CUSTOM_KEY.ERR_DESC]: `Error: ${ err.message }) }`
                })
                .flush();

            throw err;
        });
}


export function Applepay() : ApplepayType {

    return {
        createOrder,
        config,
        validateMerchant,
        approvePayment
    };
}
