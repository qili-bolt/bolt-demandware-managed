'use strict';

var successRedirect = $('#successRedirect').val();
var sfccData;
var callbacks = {
    close: function () {
    // This function is called when the Bolt checkout modal is closed.
        var sfccBaseVersion = $('#sfccBaseVersion').val();
        if (sfccData && sfccBaseVersion >= 6) {
            var redirect = $('<form>')
                .appendTo(document.body)
                .attr({
                    method: 'POST',
                    action: successRedirect
                });

            $('<input>')
                .appendTo(redirect)
                .attr({
                    name: 'orderID',
                    value: sfccData.merchant_order_number
                });

            $('<input>')
                .appendTo(redirect)
                .attr({
                    name: 'orderToken',
                    value: sfccData.sfcc.sfcc_order_token
                });

            redirect.submit();
        }
    },
    onCheckoutStart: function () {
    // This function is called after the checkout form is presented to the user.
    },

    // eslint-disable-next-line no-unused-vars
    onEmailEnter: function (email) {
    // This function is called after the user enters their email address.
    },

    onShippingDetailsComplete: function () {
    // This function is called when the user proceeds to the shipping options page.
    // This is applicable only to multi-step checkout.
    },

    onShippingOptionsComplete: function () {
    // This function is called when the user proceeds to the payment details page.
    // This is applicable only to multi-step checkout.
    },

    onPaymentSubmit: function () {
    // This function is called after the user clicks the pay button.
    },
    success: function (transaction, callback) {
    // This function is called when the Bolt checkout transaction is successful.
        sfccData = transaction;
        callback();
    }
};

var configureBoltApp = function (winBoltProperty) {
    var createBoltOrderUrl = $('.create-bolt-order-url').val();
    $.ajax({
        url: createBoltOrderUrl,
        method: 'GET',
        async: false,
        success: function (data) {
            if (data !== null) {
                // use the response from backend to configure Bolt connect
                var cart = {
                    id: data.basketID
                };
                BoltCheckout.configure(cart, data.hints, callbacks); // eslint-disable-line no-undef
                if (winBoltProperty === 'cart') {
                    window.BoltButtonApp = true;
                } else {
                    window.BoltMiniCartButtonApp = true;
                }
            }
        }
    });
};

var BoltHasConfigureRun = function () {
    return typeof window.BoltButtonApp !== 'undefined' && window.BoltButtonApp;
};

var boltMiniCartHasConfigureRun = function () {
    return typeof window.BoltMiniCartButtonApp !== 'undefined' && window.BoltMiniCartButtonApp;
};

exports.resetBoltMiniCartConfigure = function () {
    window.BoltMiniCartButtonApp = false;
};

exports.initBoltButton = function () {
    var boltButtonExist = setInterval(function () {
        var checkoutBoltButton = $('.bolt-cart-btn[data-tid="instant-bolt-checkout-button"]'); // @ts-ignore
        // have to check if child of this dom is svg, otherwise bolt button is not fully rendered (it's the object)
        var boltButtonLoaded = checkoutBoltButton && window.BoltCheckout && checkoutBoltButton.children()[0].nodeName === 'svg';
        if (boltButtonLoaded) {
            clearInterval(boltButtonExist);
            if (!BoltHasConfigureRun()) {
                configureBoltApp('cart');
            }
        }
    }, 100);
};

exports.initBoltMiniCartButton = function () {
    $('.minicart-footer').spinner().start();
    var boltButtonExist = setInterval(function () {
        var checkoutBoltButton = $('.bolt-minicart-btn[data-tid="instant-bolt-checkout-button"]'); // @ts-ignore
        var boltButtonLoaded = checkoutBoltButton && window.BoltCheckout;
        if (boltButtonLoaded) {
            clearInterval(boltButtonExist);
            if (!boltMiniCartHasConfigureRun()) {
                successRedirect = $('#successRedirect').val();
                configureBoltApp('minicart');
                $('.minicart-footer').spinner().stop();
            }
        }
    }, 100);
};

/**
 * This function is to add event listener to order total element if applePay button is detected.
 * Once change of order total is detected, reload the page to run bolt configure logic again(currently page load is the only way to configure bolt modal)
 * with updated cart information. This is because applepay only allows sync action, order data needs to be ready(via bolt configure)
 * before applepay button shows up.
 * This is a short term solution, once storm side expose 'reconfigure' function. We can reconfigure bolt modal without page reload.
 */
exports.addApplePayHandlerIfNeeded = function () {
    const MAX_COUNT = 30;
    var timeCounter = 0;
    var grandTotalClass = '.grand-total';
    var applePayButtonExist = setInterval(function () {
        if (timeCounter >= MAX_COUNT) {
            clearInterval(applePayButtonExist);
        } else {
            var applePayButton = $('[data-tid="apple-pay-button"]');
            if (applePayButton.length > 0) {
                clearInterval(applePayButtonExist);
                $('body').on('DOMSubtreeModified', grandTotalClass, function () {
                    location.reload(); // eslint-disable-line no-restricted-globals
                });
            }
            timeCounter += 1;
        }
    }, 1000);
};

exports.BoltHasConfigureRun = BoltHasConfigureRun;
exports.boltMiniCartHasConfigureRun = boltMiniCartHasConfigureRun;
