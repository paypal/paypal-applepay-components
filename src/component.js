/* @flow */

import { getClientID, getMerchantID, getLogger } from "@paypal/sdk-client/src";

import type { ApplePayPaymentContact } from "./types";

type ApplepayConfig = {|
  isApplePayEligible : boolean,
  countryCode : string,
  currencyCode : string,
  merchantCapabilities : $ReadOnlyArray<string>,
  supportedNetworks : $ReadOnlyArray<string>
|};


type ValidateMerchanParms = {|
    url : string,
    clientID : string,
    orderID : string,
    merchantDomain : string
|};


async function createOrder(payload) {
  const clientID = getClientID();
  const basicAuth = btoa(`${clientID}:`);

  const accessToken = await fetch(
    "https://api.sandbox.paypal.com/v1/oauth2/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
      },
      body: "grant_type=client_credentials",
    }
  )
    .then((res) => res.json())
    .then((res) => {
      return res.access_token;
    });

  const res = await fetch("https://api.sandbox.paypal.com/v2/checkout/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const { id } = await res.json();

  return {
    id,
  };
}

async function config() {
  const clientID = getClientID();

  return await fetch(
    "https://cors-anywhere.herokuapp.com/https://www.sandbox.paypal.com/graphql?GetApplepayConfig",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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
          buyerCountry: "US",
          clientId: clientID,
          merchantId: ["2V9L63AM2BYKC"],
        },
      }),
    }
  )
    .then((res) => res.json())
    .then(res => res.data.applepayConfig)
    .catch(console.error);
}

let orderID;

async function validateMerchant({ validationUrl }) {
  const clientID = getClientID();

  const { id } = await createOrder({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: "1.00",
        },
        payee: {
          merchant_id: "2V9L63AM2BYKC",
        },
      },
    ],
  });

  orderID = id;

  return await fetch(
    "https://cors-anywhere.herokuapp.com/https://www.sandbox.paypal.com/graphql?GetApplepayConfig",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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
          url: validationUrl,
          clientID: clientID,
          orderID: id,
          merchantDomain: "sandbox-applepay-paypal-js-sdk.herokuapp.com",
        },
      }),
    }
  )
    .then((res) => res.json())
    .then((res) => res.data.applePayMerchantSession)
    .then((merchantSession) => {
      const payload = atob(merchantSession.session);
      return JSON.parse(payload);
    })
    .catch(console.error);
}

async function approvePayment({ orderID, payment }) {
  const clientID = getClientID();

  console.log(JSON.stringify(payment, null, 4))
  return await fetch(
    "https://cors-anywhere.herokuapp.com/https://www.sandbox.paypal.com/graphql?ApproveApplePayPayment",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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
          token: payment.token,
          billingContact: payment.billingContact,
          shippingContact: payment.shippingContact,
          clientID: clientID,
          orderID,
        },
      }),
    }
  )
    .then((res) => res.json())
    .catch(console.error);
}


export function Applepay() : Object {

    return {
      createOrder,
      config,
      validateMerchant,
      approvePayment,
    }
}
