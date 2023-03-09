/* @flow */

import { getMerchantDomain, getCurrency, mapGetConfigResponse } from "../util";

global.window = Object.create(window);

const url = "http://checkout.com";
Object.defineProperty(window, "location", {
  value: {
    origin: url,
    search: "?customDomain='testenv.qa.paypal.com'",
  },
});

jest.mock("@paypal/sdk-client/src", () => ({
  getPayPalDomain: () => "https://www.sandbox.paypal.com",
  getMerchantID: () => "2V9L63AM2BYKC",
  getBuyerCountry: () => "US",
  getSDKQueryParam: (param) => {
    if (param === "currency") {
      return "USD";
    }

    return "";
  },
}));

describe("util", () => {
  describe("should return merchant domain", () => {
    it("validate getMerchantDomain", () => {
      const domain = getMerchantDomain();
      expect(domain).toBe("checkout.com");
    });
  });

  describe("getCurrency", () => {
    it("Should return USD by default", () => {
      expect(getCurrency()).toBe("USD");
    });
  });

  describe("mapGetConfigResponse", () => {
    it("should return config data mapped as per client api spec", () => {
      const requestPayLoad = {
        merchantCountry: "US",
        supportedNetworks: ["masterCard", "discover", "visa", "amex"],
        isEligible: true,
        merchantCapabilities: [
          "supports3DS",
          "supportsCredit",
          "supportsDebit",
        ],
      };

      expect(mapGetConfigResponse(requestPayLoad)).toStrictEqual({
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
});
