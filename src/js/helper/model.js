($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.ModelHelper = function (ext) {

        const defaultColors = $.defaults.colors;

        const surfaceColorDependentStyles = [
            "textColor",
            "hoverColor",
            "sidebarMaskColor",
            "overlayMaskColor",
            "bookmarksDirColor"
        ];

        const defaults = $.defaults.config;

        let data = {};
        let userType = null;

        /**
         * Initialises the model
         *
         * @returns {Promise}
         */
        this.init = async () => {
            await refresh();
        };

        /**
         *
         * @returns {Promise}
         */
        const refresh = async () => {
            if (!$.api.storage) { // if the context got invalidated (e.g. extension update), access to chrome.* namespace is not working anymore
                return;
            }

            const keys = ["utility", "behaviour", "appearance", "newtab"];
            const newData = {};

            for (const key of keys) {
                const storedData = await $.api.storage[key === "utility" ? "local" : "sync"].get([key]);
                newData[key] = storedData[key] || {};
            }

            data = newData;

            if (userType === null) {
                const obj = await this.call("userType");
                if (obj && obj.userType) {
                    userType = obj.userType;
                }
            }
        };

        /**
         * Returns the name of the given alias
         * e.g. "b" -> "behaviour"
         *
         * @param alias
         * @returns {*}
         */
        const getNameByAlias = (alias) => {
            switch (alias) {
                case "u": {
                    return "utility";
                }
                case "b": {
                    return "behaviour";
                }
                case "a": {
                    return "appearance";
                }
                case "n": {
                    return "newtab";
                }
            }
            return null;
        };

        /**
         * Returns the user type (default, legacy or premium)
         *
         * @returns {string}
         */
        this.getUserType = () => userType;

        /**
         * Returns all stored configuration
         *
         * @returns {object}
         */
        this.getAllData = () => data;

        /**
         * Returns all surface color dependent styles
         * TODO DEPRECATED Remove this since it is no longer used in the new settings
         *
         * @returns {Array}
         */
        this.getSurfaceColorDependentStyles = () => surfaceColorDependentStyles;

        /**
         * Returns the default configuration
         *
         * @returns {object}
         */
        this.getDefaultData = () => {
            const ret = {};

            Object.entries(defaults).forEach(([alias, values]) => {
                const scopeName = getNameByAlias(alias);
                if (scopeName) {
                    ret[scopeName] = values;
                }
            });

            return ret;
        };

        this.getDefaultColors = (theme = "default") => {
            return Object.assign({}, defaultColors["default"], defaultColors[theme]);
        };

        /**
         * Returns whether the given color is the default color scheme of any theme and surface,
         * those are replaced with the default of the current theme and surface, while a custom color scheme is kept
         *
         * @param {string} color
         * @returns {boolean}
         */
        this.isDefaultColorScheme = (color) => {
            return Object.values(defaultColors).some((colors) => colors.colorScheme && (colors.colorScheme.light === color || colors.colorScheme.dark === color));
        };

        /**
         * Retrieves the stored values for the given keys,
         * if a value is undefined, it will be set to the default value
         *
         * @param {object|string} keys
         * @param {boolean} defaultVal
         */
        this.getData = (keys, defaultVal = false) => {
            let configKeys = keys;
            if (typeof configKeys === "string") {
                configKeys = [configKeys];
            }

            let result = {};

            configKeys.forEach((keyInfo) => {
                const parts = keyInfo.split("/");
                const scope = parts[0];
                const key = parts[1];
                let value = null;

                const scopeName = getNameByAlias(scope);
                if (scopeName && data[scopeName]) {
                    if (defaultVal === true || typeof data[scopeName][key] === "undefined") {
                        if (typeof defaults[scope] !== "undefined" && typeof defaults[scope][key] !== "undefined") { // default values if undefined
                            value = defaults[scope][key];
                        }
                    } else {
                        value = data[scopeName][key];
                    }
                }

                if (scope === "a" && key === "styles") {
                    const surface = this.getData("a/surface");
                    const colorScheme = surface === "auto" ? ext.helper.stylesheet.getSystemSurface() : surface;
                    const theme = this.getData("a/theme");
                    value = Object.assign({}, defaults.a.styles, value);

                    for (const k of surfaceColorDependentStyles) {
                        if (value[k] === null || surface === "auto") {
                            if (defaultColors[theme] && defaultColors[theme][k]) {
                                value[k] = defaultColors[theme][k][colorScheme];
                            } else {
                                value[k] = defaultColors["default"][k][colorScheme];
                            }
                        }
                    }

                    if (surface === "auto" && this.isDefaultColorScheme(value.colorScheme)) { // change color scheme according to the system color, when automatical switch is enabled and the color scheme is the default value
                        value.colorScheme = this.getDefaultColors(theme).colorScheme[colorScheme];
                    }

                    if (ext.helper.font) { // FontHelper is available -> extend object with font weights
                        Object.assign(value, ext.helper.font.getFontWeights());
                    }
                }

                if (parts.length > 2 && value !== null && typeof value === "object") {
                    for (let i = 2; i < parts.length; i++) {
                        if (typeof value[parts[i]] !== "undefined") {
                            value = value[parts[i]];
                        } else {
                            value = undefined;
                            break;
                        }
                    }
                }

                result[parts[parts.length - 1]] = value;
            });

            if (typeof keys === "string") {
                const parts = keys.split("/");
                result = result[parts[parts.length - 1]];
            }

            return result;
        };

        /**
         * Converts a "scope/key/.../key" string + value into a nested data object
         * e.g. ("b/mode", "overlay") => {behaviour: {mode: "overlay"}}
         * e.g. ("a/styles/fontSize", 14) => {appearance: {styles: {fontSize: 14}}}
         *
         * @param {string} keyInfo
         * @param {*} value
         * @returns {object}
         */
        this.toDataObject = (keyInfo, value) => {
            const scopeMap = {
                u: "utility",
                b: "behaviour",
                a: "appearance",
                n: "newtab"
            };

            const parts = keyInfo.split("/");
            const scope = scopeMap[parts[0]];
            const path = parts.slice(1); // everything after the scope

            const leafKey = path.pop();
            let leaf = {[leafKey]: value};

            // build up nested objects from the inside out for any remaining path segments
            while (path.length) {
                leaf = {[path.pop()]: leaf};
            }

            return {[scope]: leaf};
        };

        /**
         * Saves the given values in the storage
         *
         * @param {object} values
         * @returns {Promise}
         */
        this.setData = (values) => {
            return new Promise((resolve) => {
                refresh().then(() => { // refresh to retrieve the newest data
                    Object.keys(values).forEach((keyInfo) => { // replace the value at the given path instead of merging it, so removed keys (e.g. unpinned entries) stay removed
                        const parts = keyInfo.split("/");
                        const scopeName = getNameByAlias(parts[0]);
                        const leafKey = parts.pop();

                        let target = data[scopeName];
                        parts.slice(1).forEach((key) => {
                            if (typeof target[key] !== "object" || target[key] === null || Array.isArray(target[key])) {
                                target[key] = {};
                            }
                            target = target[key];
                        });

                        target[leafKey] = values[keyInfo];
                    });

                    let savedAmount = 0;
                    const saved = (amount = 1) => { // is getting called after data is saved in the storage
                        savedAmount += amount;
                        if (savedAmount >= 4) { // behaviour, appearance and utility has been saved -> resolve promise
                            resolve();
                        }
                    };

                    try { // can fail (e.g. MAX_WRITE_OPERATIONS_PER_MINUTE exceeded)
                        $.api.storage.local.set({utility: data.utility}, () => {
                            $.api.runtime.lastError; // do nothing specific with the error -> is thrown if too many save attempts are triggered
                            saved();
                        });

                        $.api.storage.sync.set({
                            behaviour: data.behaviour,
                            appearance: data.appearance,
                            newtab: data.newtab
                        }, () => {
                            $.api.runtime.lastError; // do nothing specific with the error -> is thrown if too many save attempts are triggered
                            saved(3);
                        });
                    } catch (e) {
                        resolve();
                    }
                });
            });
        };

        /**
         * Sends a message to the background script and resolves when receiving a response
         *
         * @param {string} key
         * @param {object} opts
         * @param {number} retry
         * @returns {Promise}
         */
        this.call = async (key, opts = {}, retry = 0) => {
            let backendDead = false;
            opts.type = key;

            let response = await $.api.runtime.sendMessage(opts)["catch"]((err) => {
                if (err && ("" + err).includes("Could not establish connection")) {
                    backendDead = true;
                } else if (err && ("" + err).includes("back/forward cache")) {
                    // the page got moved into the back/forward cache while waiting for the response -> nothing to do
                } else {
                    console.error(err);
                }
            });

            if (backendDead && retry < 50) { // backend got killed by the browser -> it should restart and be available after a short delay, so we try again
                await $.delay(100);
                response = await this.call(key, opts, retry + 1);
            }

            return response;
        };
    };

})(jsu);
