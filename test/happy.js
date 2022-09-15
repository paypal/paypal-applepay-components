/* @flow */

describe('Should render legal text', () => {

    it('Should create an instance of the client and render legal text for PayUponInvoice payment', () => {

        const body = document.body;
        if (!body) {
            throw new Error(`Expected document.body to be present`);
        }

        const legalContainer = document.createElement('div');
        legalContainer.id = 'paypal-legal-container';
        body.appendChild(legalContainer);

        window.paypal.Legal({
            fundingSource: 'PayUponInvoice'
        }).render('#paypal-legal-container');


        if (!legalContainer.textContent) {
            throw new Error(`Expected Legal Text Container to have text`);
        }

        body.removeChild(legalContainer);
    });

    it('Should create an instance of the client and render legal text for boletobancario payment', () => {

        const body = document.body;
        if (!body) {
            throw new Error(`Expected document.body to be present`);
        }

        const legalContainer = document.createElement('div');
        legalContainer.id = 'paypal-legal-container';
        body.appendChild(legalContainer);

        window.paypal.Legal({
            fundingSource: 'boletobancario'
        }).render('#paypal-legal-container');
        if (!legalContainer.textContent) {
            throw new Error(`Expected Legal Text Container to have text`);
        }

        body.removeChild(legalContainer);
    });

    it('Should create an instance of the client and render legal text for error scenario', () => {

        const body = document.body;
        if (!body) {
            throw new Error(`Expected document.body to be present`);
        }

        const legalContainer = document.createElement('div');
        legalContainer.id = 'paypal-legal-container';
        body.appendChild(legalContainer);

        window.paypal.Legal({
            fundingSource: 'PayUponInvoice',
            errorCode:     'PAYMENT_SOURCE_INFO_CANNOT_BE_VERIFIED'
        }).render('#paypal-legal-container');


        if (!legalContainer.textContent) {
            throw new Error(`Expected Legal Text Container to have text`);
        }

        body.removeChild(legalContainer);
    });

    it('Should create an instance of the client but not render any text for incorrect fundingsource', () => {

        const body = document.body;
        if (!body) {
            throw new Error(`Expected document.body to be present`);
        }

        const legalContainer = document.createElement('div');
        legalContainer.id = 'paypal-legal-container';
        body.appendChild(legalContainer);

        window.paypal.Legal({
            fundingSource: 'fundingSource'
        }).render('#paypal-legal-container');


        if (legalContainer.textContent) {
            throw new Error(`Expected Legal Text Container to not have text`);
        }

        body.removeChild(legalContainer);
    });
});
