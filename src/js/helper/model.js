($ => {
    "use strict";

    window.ModelHelper = function (ext) {

        let mainColor = "#7b5fa4";

        let defaultColors = {
            textColor: {
                light: "rgb(100,100,100)",
                dark: "rgb(200,200,200)"
            },
            sidebarMaskColor: {
                light: "rgba(255,255,255,0.8)",
                dark: "rgba(0,0,0,0.6)"
            },
            colorScheme: {
                light: "rgb(27,130,241)",
                dark: "rgb(31, 77, 128)"
            }
        };

        let defaults = {
            u: { // utility -> saved locally
                openStates: {},
                hiddenEntries: {},
                scrollPos: {},
                separators: {},
                pinnedEntries: {},
                entriesLocked: false,
                sort: {
                    name: "custom",
                    dir: "ASC"
                },
                mostViewedPerMonth: false,
                viewAsTree: true
            },
            b: { // behaviour -> synced across devices
                animations: true,
                preventPageScroll: false,
                pxTolerance: {windowed: 20, maximized: 1},
                sidebarPosition: "left",
                language: "default",
                openAction: "mousedown",
                newTab: "foreground",
                newTabPosition: "afterCurrent",
                linkAction: "current",
                dirAccordion: false,
                rememberState: "all",
                rememberSearch: true,
                tooltipDelay: 1,
                tooltipContent: "all",
                dndOpen: true,
                openChildrenWarnLimit: 10,
                dirOpenDuration: 0.5,
                openDelay: 0,
                closeTimeout: 1,
                initialOpenOnNewTab: false
            },
            a: { // appearance -> synced across devices
                showIndicator: true,
                showIndicatorIcon: true,
                darkMode: false,
                showBookmarkIcons: true,
                showDirectoryIcons: true,
                styles: {
                    colorScheme: defaultColors.colorScheme.light,
                    textColor: defaultColors.textColor.light,
                    indicatorWidth: "40px",
                    indicatorIconSize: "32px",
                    indicatorIconColor: "rgb(255,255,255)",
                    indicatorColor: "rgba(0,0,0,0.5)",
                    sidebarWidth: "350px",
                    sidebarMaskColor: defaultColors.sidebarMaskColor.light,
                    bookmarksFontSize: "14px",
                    directoriesIconSize: "16px",
                    bookmarksIconSize: "16px",
                    bookmarksLineHeight: "40px",
                    bookmarksDirIcon: "dir-1",
                    bookmarksDirColor: defaultColors.textColor.light,
                    bookmarksDirIndentation: "25px",
                    bookmarksHorizontalPadding: "16px",
                    overlayMaskColor: "rgba(0,0,0,0.5)",
                    fontFamily: "default"
                }
            }
        };

        let data = {};
        let port = null;
        let callbacks = {};

        /**
         * Initialises the model
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                Promise.all([
                    initPort(),
                    refresh()
                ]).then(resolve);
            });
        };

        let initPort = () => {
            return new Promise((resolve) => {
                if (port) {
                    port.disconnect();
                }

                port = chrome.runtime.connect({name: "background"});

                port.onMessage.addListener((obj) => {
                    if (callbacks[obj.uid]) {
                        callbacks[obj.uid](obj.result);
                        delete callbacks[obj.uid];
                    }
                });

                resolve();
            });
        };

        /**
         *
         * @returns {Promise}
         */
        let refresh = () => {
            return new Promise((resolve) => {
                let keys = ["utility", "behaviour", "appearance"];
                let newData = {};

                let len = keys.length;
                let loaded = 0;
                keys.forEach((key) => {
                    chrome.storage[key === "utility" ? "local" : "sync"].get([key], (obj) => {
                        newData[key] = obj[key] || {};

                        if (key === "utility" && Object.keys(newData[key]).length === 0) { // @deprecated fallback to sync storage for utility data
                            chrome.storage.sync.get([key], (obj2) => {
                                newData[key] = obj2[key] || {};
                                if (++loaded === len) {
                                    data = newData;
                                    resolve();
                                }
                            });
                        } else {
                            if (++loaded === len) { // all data loaded from storage -> resolve promise
                                data = newData;
                                resolve();
                            }
                        }
                    });
                });
            });
        };

        /**
         * Returns all stored configuration
         *
         * @returns {object}
         */
        this.getAllData = () => {
            return data;
        };

        /**
         * Retrieves the stored values for the given keys,
         * if a value is undefined, it will be set to the default value
         *
         * @param {object|string} keys
         */
        this.getData = (keys) => {
            let configKeys = keys;
            if (typeof configKeys === "string") {
                configKeys = [configKeys];
            }

            let result = {};

            configKeys.forEach((keyInfo) => {
                let scope = keyInfo.split("/")[0];
                let key = keyInfo.split("/")[1];
                let value = null;
                let dataSearchScope = null;

                switch (scope) {
                    case "u": {
                        dataSearchScope = data.utility;
                        break;
                    }
                    case "b": {
                        dataSearchScope = data.behaviour;
                        break;
                    }
                    case "a": {
                        dataSearchScope = data.appearance;
                        break;
                    }
                }

                if (dataSearchScope !== null) {
                    if (typeof dataSearchScope[key] === "undefined") {
                        ["sidebarPosition", "language"].some((f) => { // @deprecated backward compatibility
                            if (keyInfo === "b/" + f) {
                                value = this.getData("a/" + f);

                                if (value !== null) {
                                    scope = "__FOUND";
                                }
                                return true;
                            }
                        });

                        if (typeof defaults[scope] !== "undefined" && typeof defaults[scope][key] !== "undefined") { // default values if undefined
                            value = defaults[scope][key];
                        }
                    } else {
                        value = dataSearchScope[key];
                    }
                }

                if (keyInfo === "b/pxTolerance" && matchMedia("(min-resolution: 1.25dppx)").matches) { // hdpi monitor -> increase pixel tolerance by one -> Bugfix for right positioned sidebar
                    value = Object.assign({}, value);
                    Object.keys(value).forEach((k) => {
                        value[k]++;
                    });
                }

                if (keyInfo === "a/styles") {
                    value = Object.assign({}, defaults.a.styles, value);

                    if (ext.helper.font && ext.helper.font.isLoaded()) { // FontHelper is available and loaded -> extend object with detailed font information
                        let fontInfo = ext.helper.font.getFontInfo();
                        value.fontFamily = fontInfo.name;
                        Object.assign(value, fontInfo.fontWeights);
                    }

                    if (value.colorScheme === "__color_ee") {
                        value.isEE = true;
                        value.colorScheme = mainColor;
                    }
                }

                result[key] = value;
            });

            if (typeof keys === "string") {
                let key = keys.split("/")[1];
                result = result[key];
            }

            return result;
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
                    Object.keys(values).forEach((keyInfo) => {
                        let scope = keyInfo.split("/")[0];
                        let key = keyInfo.split("/")[1];
                        let value = values[keyInfo];

                        switch (scope) {
                            case "u": {
                                data.utility[key] = value;
                                break;
                            }
                            case "b": {
                                data.behaviour[key] = value;
                                break;
                            }
                            case "a": {
                                data.appearance[key] = value;
                                break;
                            }
                        }
                    });

                    let savedAmount = 0;
                    let saved = (amount = 1) => { // is getting called after data is saved in the chrome.storage
                        savedAmount += amount;
                        if (savedAmount >= 3) { // behaviour, appearance and utility has been saved -> resolve promise
                            resolve();
                        }
                    };

                    try { // can fail (e.g. MAX_WRITE_OPERATIONS_PER_MINUTE exceeded)
                        chrome.storage.local.set({utility: data.utility}, () => {
                            saved();
                        });

                        chrome.storage.sync.set({
                            behaviour: data.behaviour,
                            appearance: data.appearance
                        }, () => {
                            saved(2);
                        });
                    } catch (e) {
                        resolve();
                    }
                });
            });
        };

        /**
         * Sends a message to the model and resolves when receiving a response
         *
         * @param {string} key
         * @param {object} opts
         * @returns {Promise}
         */
        this.call = (key, opts = {}) => {
            return new Promise((resolve) => {
                opts.type = key;
                opts.uid = key + "_" + JSON.stringify(opts) + "_" + (+new Date()) /* REMOVE --> */ + Math.random().toString(36).substr(2, 12);

                callbacks[opts.uid] = (response) => {
                    resolve(response);
                };

                port.postMessage(opts);
            });
        };

        /**
         * Returns the default text color for the given appearance (light or dark)
         *
         * @param {string} name
         * @param {string} appearance
         * @returns {string|null}
         */
        this.getDefaultColor = (name, appearance) => {
            if (defaultColors[name]) {
                if (appearance && defaultColors[name][appearance]) {
                    return defaultColors[name][appearance];
                } else {
                    return defaultColors[name].light;
                }
            }

            return null;
        };
    };

})(jsu);
