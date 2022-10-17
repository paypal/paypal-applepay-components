/* @flow */

import {
    getClientID,
    getMerchantID,
    getLogger,
    getBuyerCountry
} from '@paypal/sdk-client/src';
import { FPTI_KEY } from '@paypal/sdk-constants/src';

import { getMerchantDomain, getPayPalHost, mapGetConfigResponse, ApplePayError } from './util';
import type { ConfigResponse, ApplePaySession, CreateOrderResponse, OrderPayload, ValidateMerchantParams, ApplepayType, ConfirmOrderParams } from './types';
import { FPTI_TRANSITION, FPTI_CUSTOM_KEY, DEFAULT_API_HEADERS, DEFAULT_GQL_HEADERS } from './constants';
import { logApplePayEvent } from './logging';

async function createOrder(payload : OrderPayload) : Promise<CreateOrderResponse> {
    const basicAuth = btoa(`${ getClientID() }`);
    const domain = getPayPalHost('customDomain');
    const accessToken = await fetch(
        `https://api.${ domain }/v1/oauth2/token`,
        {
            method:       'POST',
            headers:      {
                Authorization: `Basic ${ basicAuth }`
            },
            body: 'grant_type=client_credentials'
        }
    )
        .then((res) => {
            return res.json();
        })
        .then(({ access_token }) => {
            return access_token;
        });

    const res = await fetch(
        `https://api.${ domain }/v2/checkout/orders`,
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

function config() : Promise<ConfigResponse> {
    const domain = getPayPalHost('customDomain');

    return fetch(
        `https://www.${ domain }/graphql?GetApplepayConfig`,
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
                const { headers } = res;
                throw new ApplePayError('INTERNAL_SERVER_ERROR', 'An internal server error has occurred', headers['Paypal-Debug-Id']);
            }
            return res.json();
        })
        .then(({ data, errors, extensions }) => {
            if (Array.isArray(errors) && errors.length) {
                const message = errors[0]?.message ?? JSON.stringify(errors[0]);
                throw new ApplePayError('APPLEPAY_CONFIG_ERROR', message, extensions?.correlationId);
            }
            
            return mapGetConfigResponse(data.applepayConfig);
        })
        .catch((err) => {
            getLogger().error(FPTI_TRANSITION.APPLEPAY_CONFIG_ERROR)
                .track({
                    [FPTI_KEY.TRANSITION]:      FPTI_TRANSITION.APPLEPAY_CONFIG_ERROR,
                    [FPTI_CUSTOM_KEY.ERR_DESC]: `Error: ${ err.message }) }`
                })
                .flush();

            return {
                name:            err.errorName,
                fullDescription: err.message,
                paypalDebugId:   err.paypalDebugId
            };
        });
}


function validateMerchant({ validationUrl } : ValidateMerchantParams) : Promise<ApplePaySession> {
    logApplePayEvent('validatemerchant', { validationUrl });
    const domain = getPayPalHost('customDomain');

    return fetch(
        `https://www.${ domain }/graphql?GetApplePayMerchantSession`,
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
                      $merchantDomain : String!
                  ) {
                      applePayMerchantSession(
                          url: $url
                          clientID: $clientID
                          merchantDomain: $merchantDomain
                      ) {
                          session
                      }
                  }`,
                variables: {
                    url:            validationUrl,
                    clientID:       getClientID(),
                    merchantDomain: getMerchantDomain()
                }
            })
        }
    )
        .then((res) => {
            if (!res.ok) {
                const { headers } = res;
                throw new ApplePayError('INTERNAL_SERVER_ERROR', 'An internal server error has occurred', headers['Paypal-Debug-Id']);
            }
            return res.json();
        })
        .then(({ data, errors, extensions }) => {
            if (Array.isArray(errors) && errors.length) {
                const error = {
                    name:            errors[0]?.name || 'ERROR_VALIDATING_MERCHANT',
                    fullDescription: errors[0]?.message ?? JSON.stringify(errors[0]),
                    paypalDebugId:   extensions?.correlationId
                };

                throw new ApplePayError(error.name, error.fullDescription, error.paypalDebugId);
            }

            const { applePayMerchantSession } =  data;
            const payload = applePayMerchantSession ? atob(applePayMerchantSession.session) : data;
            return JSON.parse(payload);
        })
        .catch((err) => {
            getLogger().error(FPTI_TRANSITION.APPLEPAY_MERCHANT_VALIDATION_ERROR)
                .track({
                    [FPTI_KEY.TRANSITION]:      FPTI_TRANSITION.APPLEPAY_MERCHANT_VALIDATION_ERROR,
                    [FPTI_CUSTOM_KEY.ERR_DESC]: `Error: ${ err.message }) }`
                })
                .flush();

            return {
                name:            err.errorName,
                message:       err.message,
                paypalDebugId:   err.paypalDebugId
            };
        });
}


function confirmOrder({ orderID, token, billingContact, shippingContact } : ConfirmOrderParams) : Promise<void> {
    logApplePayEvent('paymentauthorized');
    const domain = getPayPalHost('customDomain');

    return fetch(
        `https://www.${ domain }/graphql?ApproveApplePayPayment`,
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
                    token,
                    billingContact,
                    shippingContact,
                    clientID:        getClientID(),
                    orderID
                }
            })
        }
    )
        .then((res) => {
            if (!res.ok) {
                const { headers } = res;
                const error = {
                    name:            'INTERNAL_SERVER_ERROR',
                    fullDescription: 'An internal server error has occurred',
                    paypalDebugId:   headers['Paypal-Debug-Id']
                };

                throw new ApplePayError(error.name, error.fullDescription, error.paypalDebugId);
            }
            return res.json();
        })
        .then(({ data, errors, extensions }) => {
            if (Array.isArray(errors) && errors.length) {

                const error = {
                    name:            errors[0]?.name || 'APPLEPAY_PAYMENT_ERROR',
                    fullDescription: errors[0]?.message ?? JSON.stringify(errors[0]),
                    paypalDebugId:   extensions?.correlationId
                };
                
                throw new ApplePayError(error.name, error.fullDescription, error.paypalDebugId);
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

            return {
                name:            err.errorName,
                message:       err.message,
                paypalDebugId:   err.paypalDebugId
            };
        });
}


export function Applepay() : ApplepayType {

    return {
        createOrder,
        config,
        validateMerchant,
        confirmOrder
    };
}
