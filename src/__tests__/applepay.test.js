/* @flow */
// import fetchMock from 'jest-fetch-mock';

import fetch from 'isomorphic-fetch';
import btoa from 'btoa';
import atob from 'atob';

import { Applepay } from '../applepay';

global.fetch = fetch;
global.btoa = btoa;
global.atob = atob;

jest.mock('@paypal/sdk-client/src', () => ({
    getClientID:        () => 'AdVrVyh_UduEct9CWFHsaHRXKVxbnCDleEJdVOZdb52qSjrWkKDNd6E1CNvd5BvNrGSsXzgQ238dGgZ4',
    getMerchantID:      () => [ '2V9L63AM2BYKC' ],
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
    })
}));

describe('applepay', () => {

    it('Creates Order', async () => {
        const applepay = Applepay();
       
        const { id, status } = await applepay.createOrder({
            intent:         'CAPTURE',
            purchase_units: [
                {
                    amount: {
                        currency_code: 'USD',
                        value:         '1.00'
                    }
                }
            ]
        });

        expect(id).toBeTruthy();
        expect(status).toBe('CREATED');

    });

    it('GetAppelPayConfig', async () => {
        const applepay = Applepay();
    
        expect(await applepay.config()).toEqual({
            merchantCountry:   'US',
            supportedNetworks: [
                'masterCard',
                'discover',
                'visa',
                'amex'
            ]
        });
    });


    it('validateMerchant should fail for invalid domain', async () => {
        const applepay = Applepay();


        global.window = {
            location: {
                href: 'xxx.com'
            }
        };

        try {
            await applepay.validateMerchant({
                validationUrl: 'https://apple-pay-gateway-cert.apple.com/paymentservices/startSession'
            });
        } catch (err) {
            expect(err.message.includes('NOT_ENABLED_FOR_APPLE_PAY')).toBe(true);
        }

    });

    it('validateMerchant', async () => {
        const applepay = Applepay();


        global.window = {
            location: {
                href: 'sandbox-applepay-paypal-js-sdk.herokuapp.com'
            }
        };

        const response = await applepay.validateMerchant({
            validationUrl: 'https://apple-pay-gateway-cert.apple.com/paymentservices/startSession'
        });

        expect(response.displayName).toEqual('Custom Clothing');
        expect(response.signature).toEqual(expect.any(String));
        expect(response.nonce).toEqual(expect.any(String));
        expect(response.displayName).toEqual('Custom Clothing');

    });
});

