/* eslint-disable eslint-comments/disable-enable-pair */

/* @flow */

import fetch from "isomorphic-fetch";
import btoa from "btoa";
import atob from "atob";

import { Applepay } from "../applepay";
import { getMerchantDomain } from "../util";

jest.mock("@paypal/sdk-client/src", () => ({
  getPartnerAttributionID: () => "bn_code",
  getClientID: () =>
    "AeH0vEMSIJhmj8c9zEMii_Ftr_8Kvkhc72rSjW7Ri_vr3GorvmjWXxLBJnWDh-dpIpo_BH-S4fVqXec4",
  getMerchantID: () => ["RZB8FGXVSK48S"],
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
        tokenNotificationURL:
          "https://api.sandbox.paypal.com/v1/payment-provider/applepay",
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
      expect(
        err.message.includes("APPLE_PAY_MERCHANT_SESSION_VALIDATION_ERROR")
      ).toBe(true);
      expect(err.paypalDebugId).toEqual(expect.any(String));
    }
  });

  describe("Validate Merchant", () => {
    it("should validate a valid url", async () => {
      const applepay = Applepay();

      getMerchantDomain.mockReturnValueOnce(
        "www.te-apm-test-tool.qa.paypal.com"
      );

      // eslint-disable-next-line flowtype/no-weak-types
      const response: any = await applepay.validateMerchant({
        validationUrl:
          "https://apple-pay-gateway-cert.apple.com/paymentservices/startSession",
      });

      expect(response.merchantSession.displayName).toEqual("Test Store");
      expect(response.merchantSession.signature).toEqual(expect.any(String));
      expect(response.merchantSession.nonce).toEqual(expect.any(String));
      expect(response.paypalDebugId).toEqual(expect.any(String));
    });

    it("should accept an optional display name for the apple pay button", async () => {
      const applepay = Applepay();

      getMerchantDomain.mockReturnValueOnce(
        "www.te-apm-test-tool.qa.paypal.com"
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

    it("should accept an optional custom domain for the apple pay button", async () => {
      const applepay = Applepay();

      getMerchantDomain.mockReturnValueOnce("www.invalid-domain.com");

      // eslint-disable-next-line flowtype/no-weak-types
      const response: any = await applepay.validateMerchant({
        validationUrl:
          "https://apple-pay-gateway-cert.apple.com/paymentservices/startSession",
        displayName: "Custom Business Name",
        domainName: "www.te-apm-test-tool.qa.paypal.com",
      });

      expect(response.merchantSession.displayName).toEqual(
        "Custom Business Name"
      );
      expect(response.merchantSession.domainName).toEqual(
        "www.te-apm-test-tool.qa.paypal.com"
      );
      expect(response.merchantSession.signature).toEqual(expect.any(String));
      expect(response.merchantSession.nonce).toEqual(expect.any(String));
      expect(response.paypalDebugId).toEqual(expect.any(String));
    });
  });
});
