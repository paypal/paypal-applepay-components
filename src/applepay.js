/* @flow */

import {
  getClientID,
  getMerchantID,
  getLogger,
  getBuyerCountry,
  getPayPalDomain,
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
  ValidateMerchantParams,
  ApplepayType,
  ConfirmOrderParams,
  PayPalApplePayErrorType,
  ValidateMerchantResponse,
} from "./types";
import {
  FPTI_TRANSITION,
  FPTI_CUSTOM_KEY,
  DEFAULT_GQL_HEADERS,
} from "./constants";
import { logApplePayEvent } from "./logging";

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
                      merchantCapabilities,
                      tokenNotificationURL
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
  domainName,
}: ValidateMerchantParams): Promise<
  ValidateMerchantResponse | PayPalApplePayErrorType
> {
  logApplePayEvent("validatemerchant", {
    validationUrl,
    displayName,
    domainName,
  });

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
        merchantDomain: domainName || getMerchantDomain(),
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
      "PayPal-Partner-Attribution-Id": partnerAttributionId || "",
    },
    body: JSON.stringify({
      query: `
                    mutation ApproveApplePayPayment(
                      $token: ApplePayPaymentToken!
                      $orderID: String!
                      $clientID : String!
                      $billingContact: ApplePayPaymentContact!
                      $shippingContact: ApplePayPaymentContact
                      $productFlow: String
                    ) {
                      approveApplePayPayment(
                        token: $token
                        orderID: $orderID
                        clientID: $clientID
                        billingContact: $billingContact
                        shippingContact: $shippingContact
                        productFlow: $productFlow
                      )
                    }`,
      variables: {
        token,
        billingContact,
        shippingContact,
        clientID: getClientID(),
        orderID: orderId,
        productFlow: "CUSTOM_DIGITAL_WALLET",
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
    config,
    validateMerchant,
    confirmOrder,
  };
}
