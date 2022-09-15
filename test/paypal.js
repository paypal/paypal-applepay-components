/* @flow */

import { getHost, getPath } from '@paypal/sdk-client/src';

const script = document.createElement('script');
script.setAttribute('type', 'mock/javascript');
script.setAttribute('src', `https://${ getHost() }${ getPath() }?client-id=test`);
script.setAttribute('data-client-token', 'TEST');

const body = document.body;

if (body) {
    body.appendChild(script);
}

window.paypal = require('../src'); // eslint-disable-line import/no-commonjs
