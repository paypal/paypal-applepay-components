/* @flow */
type FundingSource = "PayUponInvoice" | "boletobancario";
type ErrorCode = "PAYMENT_SOURCE_INFO_CANNOT_BE_VERIFIED" | "PAYMENT_SOURCE_DECLINED_BY_PROCESSOR";

export type ContentConfig = {|
    legalLocale : string,
    buyerCountry : string,
    fundingSource : FundingSource,
    errorCode? : ErrorCode
|};

export type ApplepayConfigInput = {|
    fundingSource : FundingSource,
    errorCode? : ErrorCode
|};

export type LegalServerConfigType = {|
    assetsUrl : string
|};


export type LegalGlobalType = {|
    serverConfig : LegalServerConfigType
|};


declare var __legal__ : LegalGlobalType;

export type ApplePayPaymentContact = {|
    phoneNumber? : string,
    emailAddress? : string,
    givenName? : string,
    familyName? : string,
    phoneticGivenName? : string,
    phoneticFamilyName? : string,
    addressLines? : $ReadOnlyArray<string>,
    subLocality? : string,
    locality? : string,
    postalCode? : string,
    subAdministrativeArea? : string,
    administrativeArea? : string,
    country? : string,
    countryCode? : string
|};