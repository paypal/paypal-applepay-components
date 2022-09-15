/* @flow */

export const PayUponInvoice : Object = {
    LEGAL_TEXT: {
        'en-DE': (paypalPolicyLink : string) =>
            `By clicking on the button, you agree to the <a rel='noopener noreferrer' target='_blank' href='https://www.ratepay.com/legal-payment-terms/'>terms of payment</a> and <a rel='noopener noreferrer' target='_blank' href='https://www.ratepay.com/legal-payment-dataprivacy/'>performance of a risk</a> check from the payment partner, Ratepay. You also agree to PayPal’s <a target='_blank' rel='noopener noreferrer' href='${ paypalPolicyLink }'>privacy statement.</a> If your request to purchase upon invoice is accepted, the purchase price claim will be assigned to Ratepay, and you may only pay Ratepay, not the merchant.`,
        'de-DE': (paypalPolicyLink : string) =>
            `Mit Klicken auf den Button akzeptieren Sie die <a rel='noopener noreferrer' target='_blank' href='https://www.ratepay.com/legal-payment-terms/'>Ratepay Zahlungsbedingungen</a> und erklären sich mit der Durchführung einer <a rel='noopener noreferrer' target='_blank' href='https://www.ratepay.com/legal-payment-dataprivacy/'>Risikoprüfung durch Ratepay</a>, unseren Partner, einverstanden. Sie akzeptieren auch PayPals <a target='_blank' rel='noopener noreferrer' href='${ paypalPolicyLink }'>Datenschutzerklärung</a>. Falls Ihre Transaktion per Kauf auf Rechnung erfolgreich abgewickelt werden kann, wird der Kaufpreis an Ratepay abgetreten und Sie dürfen nur an Ratepay überweisen, nicht an den Händler.`
    },
    ERROR_MESSAGES: {
        PAYMENT_SOURCE_INFO_CANNOT_BE_VERIFIED: {
            'en-DE': `The combination of your name and address could not be validated. Please correct your data and try again. You can find further information in the <a href="https://www.ratepay.com/en/ratepay-data-privacy-statement/" title="external link" target="_blank" rel="noopener noreferrer"> Ratepay Data Privacy Statement</a> or you can contact Ratepay using this <a href="https://www.ratepay.com/en/contact/" title="external link" target="_blank" rel="noopener noreferrer">contact form</a>.`,
            'de-DE': `Die Kombination aus Ihrem Namen und Ihrer Anschrift konnte nicht validiert werden. Bitte korrigieren Sie Ihre Daten und versuchen Sie es erneut. Weitere Informationen finden Sie in den Ratepay <a href="https://www.ratepay.com/legal-payment-dataprivacy/?lang=de" title="external link" target="_blank" rel="noopener noreferrer">Datenschutzbestimmungen</a> oder nutzen Sie das Ratepay <a href="https://www.ratepay.com/kontakt/" title="external link" target="_blank" rel="noopener noreferrer">Kontaktformular</a>.`
        },
        PAYMENT_SOURCE_DECLINED_BY_PROCESSOR: {
            'en-DE': `It is not possible to use the selected payment method. This decision is based on automated data processing. You can find further information in the <a href="https://www.ratepay.com/en/ratepay-data-privacy-statement/" title="external link" target="_blank" rel="noopener noreferrer">Ratepay Data Privacy Statement</a> or you can contact Ratepay using this <a href="https://www.ratepay.com/en/contact/" title="external link" target="_blank" rel="noopener noreferrer">contact form</a>.`,
            'de-DE': `Die gewählte Zahlungsart kann nicht genutzt werden. Diese Entscheidung basiert auf einem automatisierten Datenverarbeitungsverfahren. Weitere Informationen finden Sie in den Ratepay <a href="https://www.ratepay.com/legal-payment-dataprivacy/?lang=de" title="external link" target="_blank" rel="noopener noreferrer">Datenschutzbestimmungen</a> oder nutzen Sie das Ratepay <a href="https://www.ratepay.com/kontakt/" title="external link" target="_blank" rel="noopener noreferrer">Kontaktformular</a>.`
        }
    },
    DEFAULT_LOCALE: 'en-DE',
    BUYER_COUNTRY:          'DE'
};


export const boletobancario : Object = {
    LEGAL_TEXT: {
        'en-BR': (paypalPolicyLink : string) =>
            `By choosing this payment option you agree that your information will be collected according to <a rel='noopener noreferrer' target='_blank' href='${ paypalPolicyLink }'>PayPal's Privacy Statement</a>`,
        'pt-BR': (paypalPolicyLink : string) =>
            `Ao clicar neste botão, você concorda que as suas informações serão coletadas de acordo com a Declaração de <a target='_blank' rel='noopener noreferrer' href='${ paypalPolicyLink }'>Privacidade do PayPal</a>`
    },
    DEFAULT_LOCALE: 'en-BR',
    BUYER_COUNTRY:          'BR'
};
