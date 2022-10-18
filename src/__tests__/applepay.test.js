/* @flow */

import fetch from 'isomorphic-fetch';
import btoa from 'btoa';
import atob from 'atob';

import { Applepay } from '../applepay';


global.fetch = fetch;
global.btoa = btoa;
global.atob = atob;

jest.mock('@paypal/sdk-client/src', () => ({
    getClientID:        () => 'AfALq_mQ3SUUltuavn8MnEaXPCPFRl4aOZDTcDTo1I4FsJGN3TPFZ1THvcT39wAF3S250a5oqCUbpJHH',
    getMerchantID:      () => [ 'HZZ2RQHJM4CE6' ],
    getPayPalAPIDomain: () => 'https://www.sandbox.paypal.com',
    getBuyerCountry:    () => 'US',
    getLogger:          () => ({
        info: () => ({
            track: () => ({
                flush: () => ({})
            })
        }),
        error: () => ({
            track: () => ({
                flush: () => ({})
            })
        })
    }),
    getSDKQueryParam: (param) => {
        if (param === 'currency') {
            return 'USD';
        }

        return '';
    }
}));

jest.mock('.././util', () => {
    const originalModule = jest.requireActual('.././util');

    return {
        ...originalModule,
        getMerchantDomain: () => 'sandbox-applepay-paypal-js-sdk.herokuapp.com',
        getPayPalHost:     () => 'msmaster.qa.paypal.com'
    };
});

describe('applepay', () => {

    describe('Order', () => {
        it('Creates Order', async () => {
            const applepay = Applepay();
           
            const { id, status } = await applepay.createOrder({
                intent:         'CAPTURE',
                purchase_units: [
                    {
                        amount: {
                            currency_code: 'USD',
                            value:         '1.00'
                        },
                        payee: {
                            merchant_id: 'HZZ2RQHJM4CE6'
                        }
                    }
                ]
            });
    
            expect(id).toBeTruthy();
            expect(status).toBe('CREATED');
    
        });
    
    });


    describe('Config', () => {
        it('GetAppelPayConfig', async () => {
            const applepay = Applepay();
            const config = await applepay.config();
            expect(config).toEqual({
                merchantCountry:       'US',
                countryCode:       'US',
                currencyCode:      'USD',
                supportedNetworks: [
                    'masterCard',
                    'discover',
                    'visa',
                    'amex'
                ],
                isEligible:           true,
                merchantCapabilities: [ 'supports3DS', 'supportsCredit', 'supportsDebit' ]
            });
        });
    });

    it('should fail for invalid domain', async () => {
        const applepay = Applepay();


        global.window = {
            location: {
                href: 'xxx.com'
            }
        };

       
        const res = await applepay.validateMerchant({
            validationUrl: 'https://apple-pay-gateway-cert.apple.com/paymentservices/startSession'
        });
            
        expect(res.name).toBe('ERROR_VALIDATING_MERCHANT');
        expect(res.message.includes('NOT_ENABLED_FOR_APPLE_PAY')).toBe(true);
        expect(res.paypalDebugId).toEqual(expect.any(String));
        

    });

    describe('Validate Merchant', () => {
        it('should validdate a valid url', async () => {
            const applepay = Applepay();
    
    
            global.window = {
                location: {
                    href: 'https://sandbox-applepay-paypal-js-sdk.herokuapp.com'
                }
            };
    
            const response = await applepay.validateMerchant({
                validationUrl: 'https://apple-pay-gateway-cert.apple.com/paymentservices/startSession'
            });
    
            expect(response.displayName).toEqual('Custom Clothing');
            expect(response.signature).toEqual(expect.any(String));
            expect(response.nonce).toEqual(expect.any(String));
    
        });
    });

});
