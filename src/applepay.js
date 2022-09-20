/* @flow */

import {
    getClientID,
    getMerchantID,
    getLogger,
    // getEnv,
    // getDefaultStageHost,
    getPayPalAPIDomain,
    // getCorrelationID
    getBuyerCountry
} from '@paypal/sdk-client/src';
import { FPTI_KEY } from '@paypal/sdk-constants/src';

import type { ConfigResponse, ApplePaySession, ApproveParams, CreateOrderResponse } from './types';
import { FPTI_TRANSITION, FPTI_CUSTOM_KEY, DEFAULT_HEADERS } from './constants';


function logApplePayEvent(event : string, payload : Object) {
    const data = payload || {};

    getLogger().info(`${ FPTI_TRANSITION.APPLEPAY_EVENT }_${ event }`, data)
        .track({
            [FPTI_KEY.TRANSITION]:      `${ FPTI_TRANSITION.APPLEPAY_EVENT }_${ event }`,
            [FPTI_CUSTOM_KEY.INFO_MSG]: JSON.stringify(data)
        })
        .flush();
}

type OrderPayload = {|
    intent : string,
    purchase_units : $ReadOnlyArray<{|
      amount : {| currency_code : string, value : string |},
      payee : {| merchant_id : $ReadOnlyArray<string> |}
    |}>
|};

async function createOrder(payload : OrderPayload) : Promise<CreateOrderResponse> {
    const basicAuth = btoa(`${ getClientID() }:`);

    const accessToken = await fetch(
    //   "https://api.sandbox.paypal.com/v1/oauth2/token",
        `${ getPayPalAPIDomain() }/v1/oauth2/token`,
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

    // "https://api.sandbox.paypal.com/v2/checkout/orders"
    const res = await fetch(
        `${ getPayPalAPIDomain() }/v2/checkout/orders`,
        {
            method:       'POST',
            headers:      {
                ...DEFAULT_HEADERS,
                'Authorization':  `Bearer ${ accessToken }`
            },
            body: JSON.stringify(payload)
        }
    );
    const { id } = await res.json();

    return {
        id
    };
}

function config() : Promise<ConfigResponse> {
    // alert(getDefaultStageHost());
    //  alert(getEnv());
    // console.log(getEnv());
    // console.log(getMerchantID());
    // console.log(getPayPalAPIDomain());

    return fetch(
    //  "https://cors-anywhere.herokuapp.com/https://www.sandbox.paypal.com/graphql?GetApplepayConfig",
        `${ getPayPalAPIDomain() }/graphql?GetApplepayConfig`,
        {
            method:       'POST',
            credentials: 'include',
            headers:      {
                ...DEFAULT_HEADERS
            },
            body: JSON.stringify({
                query: `
                  query GetApplepayConfig(
                    $buyerCountry: CountryCodes!
                    $clientId: String!
                    $merchantId: [String]!
                  ) {
                    applepayConfig(
                      buyerCountry: $buyerCountry
                      clientId: $clientId
                      merchantId: $merchantId
                    ) {
                      merchantCountry,
                      supportedNetworks
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
                throw new Error('GetApplepayConfig response not ok');
            }
            return res;
        })
        .then((res) => res.json())
        .then(({ data, errors }) => {
            if (Array.isArray(errors) && errors.length) {
                const message = errors[0]?.message ?? JSON.stringify(errors[0]);
                throw new Error(message);
            }
            
            return data.applepayConfig;
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

let orderID_ : ?string;

type ValidateMerchantParams = {|
    validationUrl : string
|};

async function validateMerchant({ validationUrl } : ValidateMerchantParams) : Promise<ApplePaySession> {
    logApplePayEvent('validatemerchant', { validationUrl });

    const { id } = await createOrder({
        intent:         'CAPTURE',
        purchase_units: [
            {
                amount: {
                    currency_code: 'USD',
                    value:         '1.00'
                },
                payee: {
                    merchant_id: getMerchantID()
                }
            }
        ]
    });

    orderID_ = id;

    return fetch(
    // "https://cors-anywhere.herokuapp.com/https://www.sandbox.paypal.com/graphql?GetApplepayConfig",v
        `${ getPayPalAPIDomain() }/graphql?GetApplePayMerchantSession`,
        {
            credentials: 'include',
            method:       'POST',
            headers:      {
                ...DEFAULT_HEADERS
            },
            body: JSON.stringify({
                query: `
                  query GetApplePayMerchantSession(
                      $url : String!
                      $orderID : String!
                      $clientID : String!
                      $merchantDomain : String!
                  ) {
                      applePayMerchantSession(
                          url: $url
                          orderID: $orderID
                          clientID: $clientID
                          merchantDomain: $merchantDomain
                      ) {
                          session
                      }
                  }`,
                variables: {
                    url:            validationUrl,
                    clientID:       getClientID(),
                    orderID:        id,
                    merchantDomain: window.location.href
                }
            })
        }
    )
        .then((res) => {
            if (!res.ok) {
                throw new Error('GetApplePayMerchantSession response not ok');
            }
            return res;
        })
        .then((res) => res.json())
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


function approvePayment({ orderID, payment } : ApproveParams) : Promise<void> {
    logApplePayEvent('paymentauthorized');

    return fetch(
        `{ ${ getPayPalAPIDomain() }/graphql?ApproveApplePayPayment`,
        //  "https://cors-anywhere.herokuapp.com/https://www.sandbox.paypal.com/graphql?ApproveApplePayPayment",
        {
            credentials: 'include',
            method:       'POST',
            headers:      {
                ...DEFAULT_HEADERS
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
                throw new Error('ApproveApplePayPayment response error');
            }
            return res;
        })
        .then((res) => res.json())
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

type ApplepayType = {|
    createOrder(OrderPayload) : Promise<CreateOrderResponse>,
    config() : Promise<ConfigResponse>,
    validateMerchant(ValidateMerchantParams) : Promise<ApplePaySession>,
    approvePayment(ApproveParams) : Promise<void>
|};

export function Applepay() : ApplepayType {

    return {
        createOrder,
        config,
        validateMerchant,
        approvePayment
    };
}
