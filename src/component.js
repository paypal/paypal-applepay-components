/* @flow */

import {
    getClientID,
    getMerchantID,
    getLogger,
    getEnv,
    getDefaultStageHost,
    getPayPalAPIDomain,
    getCorrelationID
} from '@paypal/sdk-client/src';
import { stringifyError } from '@krakenjs/belter/src';
import { FPTI_KEY } from '@paypal/sdk-constants/src';

import type { ConfigResponse, ApplePaySession, ApproveParams, CreateOrderResponse } from './types';

const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    'Accept':         'application/json'
};

export const FPTI_TRANSITION = {
    APPLEPAY_EVENT:                                     ('applepay_event' : 'applepay_event'),
    APPLEPAY_FLOW_ERROR:                                ('applepay_flow_error' : 'applepay_flow_error'),
    APPLEPAY_ON_CLICK_INVALID:                          ('applepay_onclick_invalid' : 'applepay_onclick_invalid'),
    APPLEPAY_MERCHANT_VALIDATION_COMPLETION_ERROR:      ('applepay_merchant_validation_completion_error' : 'applepay_merchant_validation_completion_error'),
    APPLEPAY_MERCHANT_VALIDATION_ERROR:                 ('applepay_merchant_validation_error' : 'applepay_merchant_validation_error'),
    APPLEPAY_CREATE_ORDER_ERROR:                        ('applepay_create_order_error' : 'applepay_create_order_error'),
    APPLEPAY_GET_DETAILS_ERROR:                         ('applepay_get_details_error' : 'applepay_get_details_error'),
    APPLEPAY_PAYMENT_ERROR:                             ('applepay_payment_error' : 'applepay_payment_error'),
    APPLEPAY_CONFIG_ERROR:                             ('applepay_config_error' : 'applepay_config_error')
};

export const FPTI_CUSTOM_KEY = {
    ERR_DESC:                   ('int_error_desc' : 'int_error_desc'),
    EXPERIENCE:                 ('experience' : 'experience'),
    HONEY_DEVICE_ID:            ('honey_device_id' : 'honey_device_id'),
    HONEY_SESSION_ID:           ('honey_session_id' : 'honey_session_id'),
    INTEGRATION_ISSUE:          ('integration_issue' : 'integration_issue'),
    INTEGRATION_WHITELIST:      ('whitelist' : 'whitelist'),
    INFO_MSG:                   ('info_msg' : 'info_msg'),
    PMT_TOKEN:                  ('pmt_token' : 'pmt_token'),
    TRANSITION_TYPE:            ('transition_type' : 'transition_type'),
    TRANSITION_REASON:          ('transition_reason' : 'transition_reason'),
    SHIPPING_CALLBACK_PASSED:   ('shipping_callback_passed' : 'shipping_callback_passed'),
    SHIPPING_CALLBACK_INVOKED:  ('shipping_callback_invoked' : 'shipping_callback_invoked'),
    DESKTOP_EXIT_SURVEY_REASON: ('desktop_exit_survey_reason' : 'desktop_exit_survey_reason')
};

function logApplePayEvent(event : string, payload : string) {
    const data = payload || {};

    // $FlowFixMe
    getLogger().info(`${ FPTI_TRANSITION.APPLEPAY_EVENT }_${ event }`, data)
        .track({
            [FPTI_KEY.TRANSITION]:      `${ FPTI_TRANSITION.APPLEPAY_EVENT }_${ event }`,
            [FPTI_CUSTOM_KEY.INFO_MSG]: JSON.stringify(data)
        })
        .flush();
}

async function createOrder(payload) : Promise<CreateOrderResponse> {
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
                    buyerCountry: 'US',
                    clientId:     getClientID(),
                    merchantId:   getMerchantID()
                }
            })
        }
    )
        .then((res) => res.json())
        .then(({ data, errors }) => {
            if (Array.isArray(errors) && errors.length) {
                const errorMessage = errors[0]?.message;

                getLogger().error(FPTI_TRANSITION.APPLEPAY_CONFIG_ERROR)
                    .track({
                        [FPTI_KEY.TRANSITION]:      FPTI_TRANSITION.APPLEPAY_CONFIG_ERROR,
                        [FPTI_CUSTOM_KEY.ERR_DESC]: `Error: ${ errorMessage }) }`
                    })
                    .flush();
                throw new Error(errors[0].message);
            }
            return data.applepayConfig;
        });
}

let orderID_ : ?string;

async function validateMerchant({ validationUrl }) : Promise<ApplePaySession> {

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
                    merchantDomain: window.location.href // "sandbox-applepay-paypal-js-sdk.herokuapp.com",
                }
            })
        }
    )
        .then((res) => {
            if (!res.ok) {
                throw new Error('GetApplePayMerchantSession response error');
            }
            return res;
        })
        .then((res) => res.json())
        .then(({ data, errors }) => {
            if (Array.isArray(errors) && errors.length) {
                const message = errors[0].message || JSON.stringify(errors[0]);
                throw new Error(message);
            }
            return data;
        })
        .then(({ applePayMerchantSession }) => {
            const payload = atob(applePayMerchantSession.session);
            return JSON.parse(payload);
        })
        .catch((err) => {
            getLogger().error('GetApplepayConfig_error', {
                err: stringifyError(err)
            });
            throw err;
        });
}


function approvePayment({ orderID, payment } : ApproveParams) : Promise<void> {

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
                const message = errors[0].message || JSON.stringify(errors[0]);
                throw new Error(message);
            }
            return data;
        })
        .catch((err) => {
            getLogger().error('ApproveApplePayPayment_error', {
                err: stringifyError(err)
            });
            throw err;
        });
}

export function Applepay() : Object {

    return {
        createOrder,
        config,
        validateMerchant,
        approvePayment
    };
}
