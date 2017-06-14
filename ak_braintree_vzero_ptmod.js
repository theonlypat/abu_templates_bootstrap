/*global window, braintree*/
var actionkit = window.actionkit || {};
actionkit.donations = actionkit.donations || {};

(function (donations) {

    donations.addHiddenInput = function(form, name, value) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
        return input;
    };

    donations.handleError = function(error) {
        window.alert(error.message);
        if (window.console) {
            window.console.log(error);
        }
    };

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

    donations.tokenizeOnSubmit = function(hostedFieldsInstance, options) {
        options.form.addEventListener('submit', function (event) {
            event.preventDefault();
            hostedFieldsInstance.tokenize(function (tokenizeErr, payload) {
                if (tokenizeErr) {
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
    
    donations.initHostedFields = function(clientInstance, options) {
        braintree.hostedFields.create({
            client: clientInstance,
            fields: options.fields,
            styles: {
              'input': {
                'font-size': '16px',
                'font-family': 'courier, monospace',
                'font-weight': 'lighter',
                'color': '#ccc'
              },
              ':focus': {
                'color': 'black',
                'border-bottom': '2px solid orange'
              },
              '.valid': {
                'color': '#8bdda8'
              }
            }
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
0
