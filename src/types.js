/* @flow */

// type ErrorCode = "PAYMENT_SOURCE_INFO_CANNOT_BE_VERIFIED" | "PAYMENT_SOURCE_DECLINED_BY_PROCESSOR";

export type OrderPayload = {|
  intent: string,
  purchase_units: $ReadOnlyArray<{|
    amount: {| currency_code: string, value: string |},
    payee: {| merchant_id: string |},
  |}>,
|};

export type PayPalApplePayErrorType = {|
  name: string,
  message: string,
  paypalDebugId: null | string,
|};

export type ConfigResponse = {|
  isEligible: boolean,
  countryCode: string,
  merchantCountry: string,
  currencyCode: string,
  merchantCapabilities: $ReadOnlyArray<string>,
  supportedNetworks: $ReadOnlyArray<string>,
  tokenNotificationURL: string,
|};

export type GQLConfigResponse = {|
  isEligible: boolean,
  merchantCountry: string,
  merchantCapabilities: $ReadOnlyArray<string>,
  supportedNetworks: $ReadOnlyArray<string>,
  tokenNotificationURL: string,
|};

export type ApplePaySession = {|
  displayName: string,
  domainName: string,
  epochTimestamp: number,
  expiresAt: number,
  merchantIdentifier: string,
  merchantSessionIdentifier: string,
  nonce: string,
  operationalAnalyticsIdentifier: string,
  pspId: string,
  retries: number,
  signature: string,
|};

export type ApplePayPaymentContact = {|
  phoneNumber?: string,
  emailAddress?: string,
  givenName?: string,
  familyName?: string,
  phoneticGivenName?: string,
  phoneticFamilyName?: string,
  addressLines?: $ReadOnlyArray<string>,
  subLocality?: string,
  locality?: string,
  postalCode?: string,
  subAdministrativeArea?: string,
  administrativeArea?: string,
  country?: string,
  countryCode?: string,
|};

export type ApplePayPaymentMethodType =
  | "debit"
  | "credit"
  | "prepaid"
  | "store";

export type ApplePayPaymentPassActivationState =
  | "activated"
  | "requiresActivation"
  | "activating"
  | "suspended"
  | "deactivated";

export type ApplePayPaymentPass = {|
  primaryAccountIdentifier: string,
  primaryAccountNumberSuffix: string,
  deviceAccountIdentifier?: string,
  deviceAccountNumberSuffic?: string,
  activationState: ApplePayPaymentPassActivationState,
|};

// https://developer.apple.com/documentation/apple_pay_on_the_web/applepaypaymentmethod
export type ApplePayPaymentMethod = {|
  displayName?: string,
  network?: string,
  type?: ApplePayPaymentMethodType,
  paymentPass?: ApplePayPaymentPass,
  billingContact?: ApplePayPaymentContact,
|};

export type ApplePayPaymentToken = {|
  paymentMethod: ApplePayPaymentMethod,
  transactionIdentifier?: string,
  paymentData?: Object,
|};

export type ApplePayPayment = {|
  token: ApplePayPaymentToken,
  billingContact?: ApplePayPaymentContact,
  shippingContact?: ApplePayPaymentContact,
|};

export type ConfirmOrderParams = {|
  orderId: string,
  token: ApplePayPaymentToken,
  billingContact?: ApplePayPaymentContact,
  shippingContact?: ApplePayPaymentContact,
|};

export type ValidateMerchantParams = {|
  validationUrl: string,
  displayName?: string,
|};

export type ValidateMerchantResponse = {|
  merchantSession: ApplePaySession,
  paypalDebugId: null | string,
|};

export type ApplepayType = {|
  config(): Promise<ConfigResponse | PayPalApplePayErrorType>,
  validateMerchant(
    ValidateMerchantParams
  ): Promise<ValidateMerchantResponse | PayPalApplePayErrorType>,
  confirmOrder(ConfirmOrderParams): Promise<void | PayPalApplePayErrorType>,
|};
