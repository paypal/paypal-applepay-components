/* @flow */

export const DEFAULT_API_HEADERS = {
    'Content-Type': 'application/json',
    'Accept':       'application/json'
};

export const DEFAULT_GQL_HEADERS = {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
    'origin':       (process.env.NODE_ENV === 'test') && 'https://www.mypaypal.com'
};

export const FPTI_TRANSITION = {
    APPLEPAY_EVENT:                                     ('applepay_event' : 'applepay_event'),
    APPLEPAY_FLOW_ERROR:                                ('applepay_flow_error' : 'applepay_flow_error'),
    APPLEPAY_ON_CLICK_INVALID:                          ('applepay_onclick_invalid' : 'applepay_onclick_invalid'),
    APPLEPAY_MERCHANT_VALIDATION_COMPLETION_ERROR:      ('applepay_merchant_validation_completion_error' : 'applepay_merchant_validation_completion_error'),
    APPLEPAY_MERCHANT_VALIDATION_ERROR:                 ('applepay_merchant_validation_error' : 'applepay_merchant_validation_error'),
    APPLEPAY_CREATE_ORDER_ERROR:                        ('applepay_create_order_error' : 'applepay_create_order_error'),
    APPLEPAY_GET_DETAILS_ERROR:                         ('applepay_get_details_error' : 'applepay_get_details_error'),
    APPLEPAY_PAYMENT_ERROR:                             ('applepay_payment_error' : 'applepay_payment_error'),
    APPLEPAY_CONFIG_ERROR:                              ('applepay_config_error' : 'applepay_config_error')
};

export const FPTI_CUSTOM_KEY = {
    ERR_DESC:                   ('int_error_desc' : 'int_error_desc'),
    INFO_MSG:                   ('info_msg' : 'info_msg')
};

