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



export function Applepay() : Object {
    const merchantID = getMerchantID();
    const clientID = getClientID();

    return {
        async getConfiguration() : Promise<ApplepayConfig> {

            // TO BE IMPLIMENTED
            return {
                isApplePayEligible:   true,
                countryCode:          'US',
                currencyCode:         'USD',
                merchantCapabilities: [ 'supports3DS' ],
                supportedNetworks:    [ 'visa', 'masterCard', 'amex', 'discover' ]
            };
        },
        async validateMerchant({ url, orderID, merchantDomain } : ValidateMerchanParms) : Promise<string> {
            const res = await fetch(
                '/graphql?GetApplePayMerchantSession',
                {
                    method:       'POST',
                    credentials: 'include',
                    body:         JSON.stringify({
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
                    }
              `,
                        variables: {
                            url,
                            clientID,
                            orderID,
                            merchantDomain
                        }
                    })
                }
            );
            if (!res.ok) {
                // logging here ...
                throw new Error('applepay validateMerchant failed');
            }

            const { data, errors } = await res.json();
            if (Array.isArray(errors) && Boolean(errors.length)) {
                // log errors here ...
            }

            return data;
        },
        async confirmOrder({
            token,
        clientID,
        billingContact,
        shippingContact,
      }: {
        token: string,
        clientID: string,
        billingContact: ApplePayPaymentContact,
        shippingContact: ApplePayPaymentContact,
      }) {
        const res = await fetch(
          "https://www.sandbox.paypal.com/graphql?ApproveApplePayPayment",
          {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({
              query: `mutation ApproveApplePayPayment(
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
                clientID,
                billingContact,
                shippingContact,
              },
            }),
          }
        );
        if (!res.ok) {
          // logging here ...
          throw new Error("applepay confirmOrder failed");
        }
        const { data, errors } = await res.json();
        if (Array.isArray(errors) && !!errors.length) {
          // log errors here ...
        }
        return data;
      },
    };
}

/*
Legal.FUNDING = {
  PAY_UPON_INVOICE: "PayUponInvoice",
  BOLETO: "boleto",
  BOLETOBANCARIO: "boletobancario",
};
*/
/* Export Constants for Referencing by the Client*/
/*
Legal.ERROR_CODE = {
  PAYMENT_SOURCE_INFO_CANNOT_BE_VERIFIED:
    "PAYMENT_SOURCE_INFO_CANNOT_BE_VERIFIED",
  PAYMENT_SOURCE_DECLINED_BY_PROCESSOR: "PAYMENT_SOURCE_DECLINED_BY_PROCESSOR",
};
*/
