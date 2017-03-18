($ => {
    "use strict";

    window.ModelHelper = function (ext) {

        let defaultConfig = {
            addVisual: "y",
            rememberScroll: "y",
            rememberSearch: "n",
            hideEmptyDirs: "y",
            openAction: "contextmenu",
            pxTolerance: "{\"windowed\":20,\"maximized\":1}",
            scrollPos: "{}",
            openStates: "{}",
            closeTimeout: 1,
            middleClickActive: "y",
            newTab: "foreground",
            scrollSensitivity: "{\"mouse\":1,\"trackpad\":1}",
            entriesLocked: "y"
        };

        /**
         * Sends a message to the model and calls the callback function when receiving a response
         *
         * @param {string} key
         * @param {object} opts
         * @param {function} callback
         */
        this.call = (key, opts, callback) => {
            opts.type = key;
            chrome.extension.sendMessage(opts, (response) => {
                if (typeof callback === "function") {
                    callback(response);
                }
            });
        };

        /**
         * Saves the given values in the storage and calls the callback function afterwards
         *
         * @param {object} values
         * @param {function} callback
         */
        this.setConfig = (values, callback) => {
            chrome.storage.sync.set(values, (response) => {
                if (typeof callback === "function") {
                    callback(response);
                }
            });
        };

        /**
         * Retrieves the config values for the given keys and calls the callback function afterwards,
         * calls the second callback function (if defined) with the default values as parameters,
         * if a value is undefined, it will be set to the default value
         *
         * @param {object|string} keys
         * @param {function} callback called asynchronously
         * @param {function} callback2 called synchronously
         */
        this.getConfig = (keys, callback, callback2) => {
            let configKeys = keys;
            if (typeof configKeys === "string") {
                configKeys = [configKeys];
            }

            if (configKeys.indexOf("newTab") > -1) { // backward compatibility
                configKeys.push("middleClickActive");
            }

            if (configKeys.indexOf("addVisual") > -1 && configKeys.indexOf("openAction") === -1) {
                configKeys.push("openAction");
            }

            // get default values
            let defaultValues = {};

            configKeys.forEach((configKey) => {
                defaultValues[configKey] = defaultConfig[configKey];
            });

            if (typeof keys === "string") {
                defaultValues = defaultValues[keys];
            }

            if (typeof callback2 === "function") { // callback if defined with the default configuration of the given keys
                callback2(defaultValues);
            }

            // get configured values
            chrome.storage.sync.get(configKeys, (obj) => {
                let result = {};

                configKeys.forEach((configKey) => { // if result is empty fill atleast with the keys so the next loop over the result array can fill it with the default config
                    if (typeof obj[configKey] === "undefined") {
                        obj[configKey] = undefined;
                    }
                });

                Object.keys(obj).forEach((key) => {
                    let val = obj[key];

                    if (key === "pxTolerance" && typeof val === "string" && val.search(/^\d+$/) === 0) { // backward compatibility
                        val = "{\"windowed\":20,\"maximized\":" + val + "}";
                    }

                    if (key === "addVisual") { // do not show visual if sidebar opens on mouseover
                        if (typeof obj["openAction"] !== "undefined" && obj["openAction"] === "mousemove") {
                            val = "n";
                        }
                    }

                    if (typeof val === "undefined") { // fill config keys with default values if undefined

                        if (typeof obj["middleClickActive"] !== "undefined") { // backward compatibility
                            val = obj["middleClickActive"] === "y" ? "foreground" : "background";
                        } else {
                            val = defaultConfig[key];
                        }
                    }
                    result[key] = val;
                });


                if (typeof keys === "string") {
                    result = result[keys];
                }

                if (typeof callback === "function") { // callback if defined with the configured values of the given keys
                    callback(result);
                }
            });
        };
    };

})(jsu);
