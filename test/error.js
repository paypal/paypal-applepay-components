/* @flow */

import '../src/index'; // eslint-disable-line import/no-unassigned-import

describe('Error cases', () => {

    it('Should error out if legal container is not passed to Legal', () => {
        let error;

        try {
            window.paypal.Legal({}).render('');
        } catch (err) {
            error = err;
        }

        if (!error) {
            throw new Error(`Expected Legal.render call to throw an error`);
        }
    });
});
