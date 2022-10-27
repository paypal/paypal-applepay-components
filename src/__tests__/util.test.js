/* @flow */


import { getMerchantDomain, getCurrency, getCreateOrderPayLoad, mapGetConfigResponse } from '../util';


global.window = Object.create(window);

const url = 'http://checkout.com';
Object.defineProperty(window, 'location', {
    value: {
        origin: url,
        search: '?customDomain=\'testenv.qa.paypal.com\''
    }
});

jest.mock('@paypal/sdk-client/src', () => ({
    getPayPalDomain:      () => 'https://paypal.com',
    getMerchantID:      () => 'HZZ2RQHJM4CE6',
    getBuyerCountry:    () => 'US',
    getSDKQueryParam:   (param) => {
        if (param === 'currency') {
            return 'USD';
        }

        return '';
    }
}));

describe('util', () => {
    describe('should return merchant domain', () => {
        it('validate getMerchantDomain', () => {
            const domain = getMerchantDomain();
            expect(domain).toBe('checkout.com');
        });
    });

    describe('getCurrency', () => {
        it('Should return USD by default', () => {
            expect(getCurrency()).toBe('USD');
        });
    });


    describe('getCreateOrderPayLoad', () => {
        it('should create order with capture Intent and default payee Information', () => {
            const requestPayLoad = {
                purchase_units: [
                    {
                        amount: {
                            currency_code: 'USD',
                            value:         '0.99'
                        }
                    }
                ]
            };
            expect(getCreateOrderPayLoad(requestPayLoad)).toStrictEqual({
                intent:         'CAPTURE',
                purchase_units: [
                    {
                        amount: {
                            currency_code: 'USD',
                            value:         '0.99'
                        },
                        payee: {
                            merchant_id: 'HZZ2RQHJM4CE6'
                        }
                    }
                ],
                payer:               undefined,
                application_context: undefined
            });
        });

        it('should create order with passed in information', () => {
            const requestPayLoad = {
                intent:         'AUTHORIZE',
                purchase_units: [
                    {
                        amount: {
                            currency_code: 'USD',
                            value:         '0.99'
                        }
                    }
                ]
            };
            expect(getCreateOrderPayLoad(requestPayLoad)).toStrictEqual({
                intent:         'AUTHORIZE',
                purchase_units: [
                    {
                        amount: {
                            currency_code: 'USD',
                            value:         '0.99'
                        },
                        payee: {
                            merchant_id: 'HZZ2RQHJM4CE6'
                        }
                    }
                ],
                payer:               undefined,
                application_context: undefined
            });
        });
    });

    describe('mapGetConfigResponse', () => {
        it('should return config data mapped as per client api spec', () => {
            const requestPayLoad = {
                'merchantCountry':   'US',
                'supportedNetworks': [
                    'masterCard',
                    'discover',
                    'visa',
                    'amex'
                ],
                'isEligible':           true,
                'merchantCapabilities': [
                    'supports3DS',
                    'supportsCredit',
                    'supportsDebit'
                ]
            };

            expect(mapGetConfigResponse(requestPayLoad)).toStrictEqual({
                'merchantCountry':   'US',
                'countryCode':       'US',
                'currencyCode':      'USD',
                'supportedNetworks': [
                    'masterCard',
                    'discover',
                    'visa',
                    'amex'
                ],
                'isEligible':           true,
                'merchantCapabilities': [
                    'supports3DS',
                    'supportsCredit',
                    'supportsDebit'
                ]
            });
        });
    });
});
