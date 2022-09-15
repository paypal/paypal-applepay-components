
/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable import/namespace */
/* eslint-disable import/no-namespace */
/* @flow */

import { getLocale } from '@paypal/sdk-client/src';

import type { ContentConfig } from '../types';
import * as LegalConstants from '../constants';

export function getBuyerCountryFromFundingSource(fundingSource : string) : string {
     
    const buyerCountry = LegalConstants[fundingSource]?.BUYER_COUNTRY || '';
    return buyerCountry;
}

export function buildContent(options : ContentConfig) : string {
    let content = '';
    const buyerCountry = options.buyerCountry || getBuyerCountryFromFundingSource(options.fundingSource);
    const legalLocale = options.legalLocale ||  LegalConstants[options.fundingSource]?.DEFAULT_LOCALE;

    const paypalPolicyLink = `https://www.paypal.com/${ buyerCountry }/webapps/mpp/ua/privacy-full?locale.x=${ legalLocale }`;
    if (options.errorCode) {
        content =
        LegalConstants[options.fundingSource]?.ERROR_MESSAGES?.[options.errorCode]?.[
            options.legalLocale
         
        ] ||  LegalConstants[options.fundingSource]?.ERROR_MESSAGES?.[options.errorCode]?.[
             
            LegalConstants[options.fundingSource]?.DEFAULT_LOCALE
        ];
    } else {
         
        content = LegalConstants[options.fundingSource]?.LEGAL_TEXT?.[options.legalLocale]?.(
            paypalPolicyLink
         
        ) || LegalConstants[options.fundingSource]?.LEGAL_TEXT?.[LegalConstants[options.fundingSource]?.DEFAULT_LOCALE]?.(
            paypalPolicyLink
        );
    }
    return content || '';
}


/**
 * This function defaults the legal text language locale based on
 * payment option and overrides based on the user preferences
 * @param {*} fundingOption
 * @returns
 */
export function getLegalLocale() : string  {
    const locale = getLocale();
    return `${ locale.lang }-${ locale.country }`;

}
export const FPTI_KEY = {
    CLIENT_ID: 'client_id',
    PAGE_TYPE: 'legal_component'
};
