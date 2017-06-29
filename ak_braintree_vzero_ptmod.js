// PT: I'm using my own mod of this script to fine tune language and error handling. 6/29/2017

/*global window, braintree*/
var actionkit = window.actionkit || {};
actionkit.donations = actionkit.donations || {};

(function (donations) {

    // Among other things, this will add the nonce.
    donations.addHiddenInput = function(form, name, value) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
        return input;
    };

    // This is main error handler. With a few expections, this should mainly handle tokenization errors resulting from invalid fields.
    donations.handleError = function(error) {
        window.alert(error.message);
        if (window.console) {
            window.console.log(error);
        }
    };

    // This initializes the data collector. Shouldn't need to change this. I'm also not sure this is necessary for us since we only use BT.
    donations.initDataCollector = function(clientInstance, options) {
        if (!braintree.dataCollector) {
            console && console.log("Data collector not found.");
            return;
        }
        if (!clientInstance.getConfiguration().gatewayConfiguration.kount) {
            console && console.log("Kount not enabled.");
            return;
        }
        braintree.dataCollector.create({
            client: clientInstance,
            kount: true
        }, function (dataCollectorError, dataCollectorInstance) {
            if (dataCollectorError) {
                donations.handleError(dataCollectorError);
                return;
            }
            donations.addHiddenInput(options.form, 'device_data', dataCollectorInstance.deviceData);
        });
    };

    // This will tokenize and submit. Must have.
    donations.tokenizeOnSubmit = function(hostedFieldsInstance, options) {
        options.form.addEventListener('submit', function (event) {
            event.preventDefault();
            hostedFieldsInstance.tokenize(function (tokenizeErr, payload) {
                // A tokenization error
                if (tokenizeErr) {
                    // Allows you to submit an empty form
                    if (options.submitOnEmpty && options.submitOnEmpty() &&
                            tokenizeErr.code == 'HOSTED_FIELDS_FIELDS_EMPTY') {
                        options.form.submit();
                    } else {
                        donations.handleError(tokenizeErr);
                    }
                    return;
                }
                donations.addHiddenInput(options.form, 'payment_method_nonce', payload.nonce);
                options.form.submit();
            });
        }, false);
    };
    
    // Set up the hosted fields. You should almost never see a hosted field error (only if you fucked up the selector queries).
    donations.initHostedFields = function(clientInstance, options) {
        braintree.hostedFields.create({
            client: clientInstance,
            fields: options.fields,
            styles: options.styles
        }, function(hostedFieldsErr, hostedFieldsInstance) {
            if (hostedFieldsErr) {
                donations.handleError(hostedFieldsErr);
                return;
            }
            var submit = options.submit || options.form.querySelector('[type=submit]');
            submit.removeAttribute('disabled');
            donations.tokenizeOnSubmit(hostedFieldsInstance, options);
        });
    };

    // Set up the client and trigger everything else, nbd
    donations.initClient = function(clientToken, options) {
        if (! options.form) {
            donations.handleError({message: 'Configuration error: need form.'});
        }
        braintree.client.create({
            authorization: clientToken
        }, function (clientErr, clientInstance) {
            if (clientErr) {
                donations.handleError(clientErr);
                return;
            }
            donations.initDataCollector(clientInstance, options);
            donations.initHostedFields(clientInstance, options);
        });
    };

}(actionkit.donations));