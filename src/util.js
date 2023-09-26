/* eslint-disable eslint-comments/disable-enable-pair */

/* @flow */
import { getSDKQueryParam } from "@paypal/sdk-client/src";

import type { ConfigResponse, GQLConfigResponse } from "./types";

export function getMerchantDomain(): string {
  const url = window.location.origin;
  return url.split("//")[1];
}

export function getCurrency(): string {
  return getSDKQueryParam("currency", "USD");
}

export function mapGetConfigResponse(
  applepayConfig: GQLConfigResponse
): ConfigResponse {
  return {
    ...applepayConfig,
    currencyCode: getCurrency(),
    countryCode: applepayConfig.merchantCountry
  };
}

export class PayPalApplePayError extends Error {
  paypalDebugId: null | string;
  errorName: string;
  constructor(name: string, message: string, paypalDebugId: null | string) {
    super(message);
    this.name = "PayPalApplePayError";
    this.errorName = name;
    this.paypalDebugId = paypalDebugId;
  }
}
