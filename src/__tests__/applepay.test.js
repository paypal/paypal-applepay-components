/* eslint-disable eslint-comments/disable-enable-pair */
 

/* @flow */

import fetch from 'isomorphic-fetch';
import btoa from 'btoa';
import atob from 'atob';

import { Applepay } from '../applepay';
import { getMerchantDomain } from '../util';

jest.mock('@paypal/sdk-client/src', () => ({
    getClientID:        () => 'AfALq_mQ3SUUltuavn8MnEaXPCPFRl4aOZDTcDTo1I4FsJGN3TPFZ1THvcT39wAF3S250a5oqCUbpJHH',
    getMerchantID:      () => [ 'HZZ2RQHJM4CE6' ],
    getPayPalAPIDomain: () => 'https://api.msmaster.qa.paypal.com',
    getPayPalDomain:    () => 'https://www.msmaster.qa.paypal.com',
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


jest.mock('../util', () => {
    const originalModule = jest.requireActual('../util');

    return {
        __esModule:        true,
        ...originalModule,
        getMerchantDomain: jest.fn(),
        getPayPalHost:     () => 'msmaster.qa.paypal.com'
    };
});

global.fetch = fetch;
global.btoa = btoa;
global.atob = atob;


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

       
        getMerchantDomain.mockReturnValueOnce('xxx.com');
         
         
        try {
            await applepay.validateMerchant({
                validationUrl: 'https://apple-pay-gateway-cert.apple.com/paymentservices/startSession'
            });
        } catch (err) {
            expect(err.name).toBe('PayPalApplePayError');
            expect(err.message.includes('NOT_ENABLED_FOR_APPLE_PAY')).toBe(true);
            expect(err.paypalDebugId).toEqual(expect.any(String));
        }
    });

    describe('Validate Merchant', () => {
        it('should validdate a valid url', async () => {
            const applepay = Applepay();
    
            getMerchantDomain.mockReturnValueOnce('stage-applepay-paypal-js-sdk.herokuapp.com');

            // eslint-disable-next-line flowtype/no-weak-types
            const response : any = await applepay.validateMerchant({
                validationUrl: 'https://apple-pay-gateway-cert.apple.com/paymentservices/startSession'
            });
    
            expect(response.displayName).toEqual('Demo Inc.');
            expect(response.signature).toEqual(expect.any(String));
            expect(response.nonce).toEqual(expect.any(String));
    
        });
    });

});
