'use strict';

var server = require('server');

/* API Includes */
var BasketMgr = require('dw/order/BasketMgr');

/* Script Modules */
var BoltPreferences = require('int_bolt_core/cartridge/scripts/services/utils/preferences');
var UserSignature = require('int_bolt_core/cartridge/scripts/cart/userSignature');

/**
 *  Get basket ID since SFCC frontend doesn't expose it by default.
 *  Also adding user signatures in case user logged in
 */
server.get('GetOrderReference', server.middleware.https, function (req, res, next) {
    var configuration = BoltPreferences.getSitePreferences();
  var basketID, hints, dwsid; // eslint-disable-line

    if (configuration && configuration.boltEnableCartPage) {
        var basket = BasketMgr.getCurrentBasket();
        basketID = basket.getUUID();
        dwsid = getDwsidCookie();
        hints = UserSignature.getPrefillUserSignature();
        hints.fetch_cart_metadata = {
            SFCCSessionID: dwsid
        };
    }

    res.setStatusCode(200);
    res.json({
        basketID: basketID,
        dwsid: dwsid,
        hints: hints,
        config: configuration
    });
    next();
});

/**
 * Get dwsid cookie
 * @returns {string} dwsid cookie value
 */
function getDwsidCookie() {
    var cookies = request.getHttpCookies();

    for (var i = 0; i < cookies.cookieCount; i++) {
        if (cookies[i].name === 'dwsid') {
            return cookies[i].value;
        }
    }

    return '';
}

server.post('UpdateOrder', server.middleware.https, function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');
    var Site = require('dw/system/Site');
    var Transaction = require('dw/system/Transaction');

    try {
        var httpParameterMap = request.getHttpParameterMap();
        var transaction = JSON.parse(httpParameterMap.transaction);
        var customFields = transaction.custom_field_responses;
        for (var i = 0; i < customFields.length; i++) {
            if (customFields[i].public_id === Site.current.getCustomPreferenceValue('boltGiftMessageFieldID') && !empty(customFields[i].response)) {
                // Code of adding gift message to SFCC gift message field
                let order = OrderMgr.getOrder(transaction.merchant_order_number, transaction.sfcc.sfcc_order_token);
                if (order) {
                    Transaction.wrap(function () {
                        order.defaultShipment.giftMessage = customFields[i].response;
                    });
                }
            }
            if (customFields[i].public_id === Site.current.getCustomPreferenceValue('boltNewsletterFieldID') && customFields[i].response === true) {
                // Code of newsletter enrollment flow
            }
            if (customFields[i].public_id === Site.current.getCustomPreferenceValue('{BOLT_CUSTOM_FIELD_ID}') && customFields[i].response) {
                // Code of processing Bolt custom field data
            }
        }
    } catch (e) {
        res.json({
            success: false
        });
    }

    res.json({
        success: true
    });
    next();
});

module.exports = server.exports();
