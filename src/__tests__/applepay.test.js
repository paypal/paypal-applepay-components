/* eslint-disable eslint-comments/disable-enable-pair */

/* @flow */

import fetch from "isomorphic-fetch";
import btoa from "btoa";
import atob from "atob";

import { Applepay } from "../applepay";
import { getMerchantDomain } from "../util";

jest.mock("@paypal/sdk-client/src", () => ({
  getClientID: () =>
    "AdVrVyh_UduEct9CWFHsaHRXKVxbnCDleEJdVOZdb52qSjrWkKDNd6E1CNvd5BvNrGSsXzgQ238dGgZ4",
  getMerchantID: () => ["2V9L63AM2BYKC"],
  getPayPalAPIDomain: () => "https://cors.api.sandbox.paypal.com",
  getPayPalDomain: () => "https://www.sandbox.paypal.com",
  getBuyerCountry: () => "US",
  getLogger: () => ({
    info: () => ({
      track: () => ({
        flush: () => ({}),
      }),
    }),
    error: () => ({
      track: () => ({
        flush: () => ({}),
      }),
    }),
  }),
  getSDKQueryParam: (param) => {
    if (param === "currency") {
      return "USD";
    }

    return "";
  },
}));

jest.mock("../util", () => {
  const originalModule = jest.requireActual("../util");

  return {
    __esModule: true,
    ...originalModule,
    getMerchantDomain: jest.fn(),
    getPayPalHost: () => "paypal.com",
  };
});

global.fetch = fetch;
global.btoa = btoa;
global.atob = atob;

describe("applepay", () => {
  describe("Order", () => {
    it("Creates Order", async () => {
      const applepay = Applepay();

      const { id, status } = await applepay.createOrder({
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

      expect(id).toBeTruthy();
      expect(status).toBe("CREATED");
    });
  });

  describe("Config", () => {
    it("GetAppelPayConfig", async () => {
      const applepay = Applepay();
      const config = await applepay.config();
      expect(config).toEqual({
        merchantCountry: "US",
        countryCode: "US",
        currencyCode: "USD",
        supportedNetworks: ["masterCard", "discover", "visa", "amex"],
        isEligible: true,
        merchantCapabilities: [
          "supports3DS",
          "supportsCredit",
          "supportsDebit",
        ],
      });
    });
  });

  it("should fail for invalid domain", async () => {
    const applepay = Applepay();

    getMerchantDomain.mockReturnValueOnce("xxx.com");

    try {
      await applepay.validateMerchant({
        validationUrl:
          "https://apple-pay-gateway-cert.apple.com/paymentservices/startSession",
      });
    } catch (err) {
      expect(err.name).toBe("PayPalApplePayError");
      expect(err.message.includes("NOT_ENABLED_FOR_APPLE_PAY")).toBe(true);
      expect(err.paypalDebugId).toEqual(expect.any(String));
    }
  });

  describe("Validate Merchant", () => {
    it("should validate a valid url", async () => {
      const applepay = Applepay();

      getMerchantDomain.mockReturnValueOnce(
        "sandbox-applepay-paypal-js-sdk.herokuapp.com"
      );

      // eslint-disable-next-line flowtype/no-weak-types
      const response: any = await applepay.validateMerchant({
        validationUrl:
          "https://apple-pay-gateway-cert.apple.com/paymentservices/startSession",
      });

      expect(response.merchantSession.displayName).toEqual("Custom Clothing");
      expect(response.merchantSession.signature).toEqual(expect.any(String));
      expect(response.merchantSession.nonce).toEqual(expect.any(String));
      expect(response.paypalDebugId).toEqual(expect.any(String));
    });

    it("should accept an optional display name for the apple pay button", async () => {
      const applepay = Applepay();

      getMerchantDomain.mockReturnValueOnce(
        "sandbox-applepay-paypal-js-sdk.herokuapp.com"
      );

      // eslint-disable-next-line flowtype/no-weak-types
      const response: any = await applepay.validateMerchant({
        validationUrl:
          "https://apple-pay-gateway-cert.apple.com/paymentservices/startSession",
        displayName: "Custom Business Name",
      });

      expect(response.merchantSession.displayName).toEqual(
        "Custom Business Name"
      );
      expect(response.merchantSession.signature).toEqual(expect.any(String));
      expect(response.merchantSession.nonce).toEqual(expect.any(String));
      expect(response.paypalDebugId).toEqual(expect.any(String));
    });
  });
});
