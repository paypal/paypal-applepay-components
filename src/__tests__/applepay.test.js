/* @flow */

import { Applepay } from '../applepay';
/*
import {
    getClientID,
    getMerchantID,
    getLogger,
    getEnv,
    getDefaultStageHost,
    getPayPalAPIDomain,
    getCorrelationID
} from '@paypal/sdk-client/src';
*/

jest.mock('@paypal/sdk-client/src', () => ({
    getClientID:   () => 'test',
    getMerchantID: () => 'test',
    getPayPalAPIDomain: () => 'https://api.sandbox.paypal.com'
}));

it('xxxx', async () => {
    const applepay = Applepay();

    expect(await applepay.config()).toBe({
        x: "x"
    });
});
