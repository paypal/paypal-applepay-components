import {
    getSDKQueryParam,
    getPayPalAPIDomain
} from '@paypal/sdk-client/src';

export function getMerchantDomain(){
    const url = window.location.origin;
    return url.split("//")[1];
}

export function getCurrency(){
    return getSDKQueryParam("currency", "USD");
}

export function getPayPalHost(customDomain){
    let params = new URLSearchParams(document.location.search);
    if(params.get(customDomain))
        return params.get(customDomain);
    return getPayPalAPIDomain().split("//")[1];
}