/* @flow */

import {
  getClientID,
  getMerchantID,
  getLogger,
  getBuyerCountry,
  getPayPalDomain,
  getPayPalAPIDomain,
  getPartnerAttributionID,
} from "@paypal/sdk-client/src";
import { FPTI_KEY } from "@paypal/sdk-constants/src";

import {
  getMerchantDomain,
  mapGetConfigResponse,
  PayPalApplePayError,
} from "./util";
import type {
  ConfigResponse,
  CreateOrderResponse,
  OrderPayload,
  ValidateMerchantParams,
  ApplepayType,
  ConfirmOrderParams,
  PayPalApplePayErrorType,
  ValidateMerchantResponse,
} from "./types";
import {
  FPTI_TRANSITION,
  FPTI_CUSTOM_KEY,
  DEFAULT_API_HEADERS,
  DEFAULT_GQL_HEADERS,
} from "./constants";
import { logApplePayEvent } from "./logging";

async function createOrder(
  payload: OrderPayload
): Promise<CreateOrderResponse> {
  const basicAuth = btoa(`${getClientID()}`);
  const partnerAttributionId = getPartnerAttributionID();

  try {
    const accessToken = await fetch(`${getPayPalAPIDomain()}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'PayPal-Partner-Attribution-Id': partnerAttributionId,
      },
      body: "grant_type=client_credentials",
    })
      .then((res) => {
        return res.json();
      })
      .then(({ access_token }) => {
        return access_token;
      });

    const res = await fetch(`${getPayPalAPIDomain()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        ...DEFAULT_API_HEADERS,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }).catch((err) => {
      throw err;
    });

    const { id, status } = await res.json();

    return {
      id,
      status,
    };
  } catch (error) {
    getLogger()
      .error(FPTI_TRANSITION.APPLEPAY_CREATE_ORDER_ERROR)
      .track({
        [FPTI_KEY.TRANSITION]: FPTI_TRANSITION.APPLEPAY_CREATE_ORDER_ERROR,
        [FPTI_CUSTOM_KEY.ERR_DESC]: `Error: ${error.message}) }`,
      })
      .flush();
    throw error;
  }
}

function config(): Promise<ConfigResponse | PayPalApplePayErrorType> {
  return fetch(`${getPayPalDomain()}/graphql?GetApplepayConfig`, {
    method: "POST",
    headers: {
      ...DEFAULT_GQL_HEADERS,
    },
    body: JSON.stringify({
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
        clientId: getClientID(),
        merchantId: getMerchantID(),
      },
    }),
  })
    .then((res) => {
      if (!res.ok) {
        const { headers } = res;
        throw new PayPalApplePayError(
          "INTERNAL_SERVER_ERROR",
          "An internal server error has occurred",
          headers.get("Paypal-Debug-Id")
        );
      }
      return res.json();
    })
    .then(({ data, errors, extensions }) => {
      if (Array.isArray(errors) && errors.length) {
        const message = errors[0]?.message ?? JSON.stringify(errors[0]);
        throw new PayPalApplePayError(
          "APPLEPAY_CONFIG_ERROR",
          message,
          extensions?.correlationId
        );
      }

      return mapGetConfigResponse(data.applepayConfig);
    })
    .catch((err) => {
      getLogger()
        .error(FPTI_TRANSITION.APPLEPAY_CONFIG_ERROR)
        .track({
          [FPTI_KEY.TRANSITION]: FPTI_TRANSITION.APPLEPAY_CONFIG_ERROR,
          [FPTI_CUSTOM_KEY.ERR_DESC]: `Error: ${err.message}) }`,
        })
        .flush();

      throw err;
    });
}

function validateMerchant({
  validationUrl,
  displayName,
}: ValidateMerchantParams): Promise<
  ValidateMerchantResponse | PayPalApplePayErrorType
> {
  logApplePayEvent("validatemerchant", { validationUrl, displayName });

  return fetch(`${getPayPalDomain()}/graphql?GetApplePayMerchantSession`, {
    method: "POST",
    headers: {
      ...DEFAULT_GQL_HEADERS,
    },
    body: JSON.stringify({
      query: `
                query GetApplePayMerchantSession(
                    $url : String!
                    $displayName : String
                    $clientID : String!
                    $merchantID : [String]
                    $merchantDomain : String!
                ) {
                    applePayMerchantSession(
                        url: $url
                        displayName: $displayName
                        clientID: $clientID
                        merchantID: $merchantID
                        merchantDomain: $merchantDomain
                    ) {
                        session
                    }
                }`,
      variables: {
        url: validationUrl,
        displayName,
        clientID: getClientID(),
        merchantID: getMerchantID(),
        merchantDomain: getMerchantDomain(),
      },
    }),
  })
    .then((res) => {
      if (!res.ok) {
        const { headers } = res;
        throw new PayPalApplePayError(
          "INTERNAL_SERVER_ERROR",
          "An internal server error has occurred",
          headers.get("Paypal-Debug-Id")
        );
      }
      return res.json();
    })
    .then(({ data, errors, extensions }) => {
      if (Array.isArray(errors) && errors.length) {
        const error = {
          name: errors[0]?.name || "ERROR_VALIDATING_MERCHANT",
          fullDescription: errors[0]?.message ?? JSON.stringify(errors[0]),
          paypalDebugId: extensions?.correlationId,
        };

        throw new PayPalApplePayError(
          error.name,
          error.fullDescription,
          error.paypalDebugId
        );
      }

      const { applePayMerchantSession } = data;
      const payload = applePayMerchantSession
        ? atob(applePayMerchantSession.session)
        : data;
      return {
        merchantSession: JSON.parse(payload),
        paypalDebugId: extensions?.correlationId,
      };
    })
    .catch((err) => {
      getLogger()
        .error(FPTI_TRANSITION.APPLEPAY_MERCHANT_VALIDATION_ERROR)
        .track({
          [FPTI_KEY.TRANSITION]:
            FPTI_TRANSITION.APPLEPAY_MERCHANT_VALIDATION_ERROR,
          [FPTI_CUSTOM_KEY.ERR_DESC]: `Error: ${err.message}) }`,
        })
        .flush();

      throw err;
    });
}

function confirmOrder({
  orderId,
  token,
  billingContact,
  shippingContact,
}: ConfirmOrderParams): Promise<void | PayPalApplePayErrorType> {
  logApplePayEvent("paymentauthorized");

  // Fix Lowercase CountryCode from Apple
  if (shippingContact?.countryCode) {
    shippingContact.countryCode = shippingContact.countryCode.toUpperCase();
  }

  if (billingContact?.countryCode) {
    billingContact.countryCode = billingContact.countryCode.toUpperCase();
  }
  
  const partnerAttributionId = getPartnerAttributionID();

  return fetch(`${getPayPalDomain()}/graphql?ApproveApplePayPayment`, {
    method: "POST",
    headers: {
      ...DEFAULT_GQL_HEADERS,
      'PayPal-Partner-Attribution-Id': partnerAttributionId  
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
        clientID: getClientID(),
        orderID: orderId,
      },
    }),
  })
    .then((res) => {
      if (!res.ok) {
        const { headers } = res;
        const error = {
          name: "INTERNAL_SERVER_ERROR",
          fullDescription: "An internal server error has occurred",
          paypalDebugId: headers.get("Paypal-Debug-Id"),
        };

        throw new PayPalApplePayError(
          error.name,
          error.fullDescription,
          error.paypalDebugId
        );
      }
      return res.json();
    })
    .then(({ data, errors, extensions }) => {
      if (Array.isArray(errors) && errors.length) {
        const error = {
          name: errors[0]?.name || "APPLEPAY_PAYMENT_ERROR",
          fullDescription: errors[0]?.message ?? JSON.stringify(errors[0]),
          paypalDebugId: extensions?.correlationId,
        };

        throw new PayPalApplePayError(
          error.name,
          error.fullDescription,
          error.paypalDebugId
        );
      }
      return data;
    })
    .catch((err) => {
      getLogger()
        .error(FPTI_TRANSITION.APPLEPAY_PAYMENT_ERROR)
        .track({
          [FPTI_KEY.TRANSITION]: FPTI_TRANSITION.APPLEPAY_PAYMENT_ERROR,
          [FPTI_CUSTOM_KEY.ERR_DESC]: `Error: ${err.message}) }`,
        })
        .flush();

      throw err;
    });
}

export function Applepay(): ApplepayType {
  return {
    createOrder,
    config,
    validateMerchant,
    confirmOrder,
  };
}
