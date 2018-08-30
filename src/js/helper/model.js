($ => {
    "use strict";

    /**
     * @requires helper: (optional) font
     * @param {object} ext
     * @constructor
     */
    $.ModelHelper = function (ext) {

        let defaultColors = {
            textColor: {
                light: "#646464",
                dark: "#c8c8c8"
            },
            sidebarMaskColor: {
                light: "rgba(255,255,255,0.8)",
                dark: "rgba(0,0,0,0.6)"
            },
            hoverColor: {
                light: "#f5f5f5",
                dark: "#555555"
            },
            colorScheme: {
                light: "#1b82f1",
                dark: "#1f4d80"
            },
            foregroundColor: {
                light: "#ffffff",
                dark: "#333333"
            }
        };

        let defaults = {
            u: { // utility -> saved locally
                openStates: {},
                hiddenEntries: {},
                additionalInfo: {},
                scrollPos: 0,
                separators: {},
                customCss: "",
                pinnedEntries: {},
                lockPinned: true,
                translationHelp: true,
                performReopening: false,
                entryAmounts: {},
                lastOpened: null,
                sort: {
                    name: "custom",
                    dir: "ASC"
                },
                mostViewedPerMonth: false,
                viewAsTree: true
            },
            b: { // behaviour -> synced across devices
                animations: true,
                contextmenu: true,
                preventPageScroll: false,
                toggleArea: {
                    width: 1,
                    widthWindowed: 20,
                    height: 100,
                    top: 0
                },
                blacklist: [],
                whitelist: [],
                sidebarPosition: "left",
                openAction: "mousedown",
                newTab: "foreground",
                newTabPosition: "afterCurrent",
                visibility: "always",
                linkAction: "current",
                dirAccordion: false,
                reopenSidebar: false,
                preventWindowed: false,
                rememberState: "openStatesAndPos",
                tooltipDelay: 0.5,
                tooltipContent: "all",
                tooltipAdditionalInfo: true,
                dndOpen: true,
                openChildrenWarnLimit: 10,
                dirOpenDuration: 0.5,
                scrollBarHide: 1.5,
                openDelay: 0,
                closeTimeout: 1
            },
            n: { // new tab -> synced across devices
                override: false,
                autoOpen: true,
                searchEngine: "google",
                topPagesType: "topPages",
                shortcuts: [{label: "Google", url: "https://google.com"}],
                website: ""
            },
            a: { // appearance -> synced across devices
                showIndicator: true,
                showIndicatorIcon: true,
                darkMode: false,
                highContrast: false,
                showBookmarkIcons: true,
                showDirectoryIcons: true,
                styles: {
                    colorScheme: defaultColors.colorScheme.light,
                    foregroundColor: defaultColors.foregroundColor.light,
                    textColor: defaultColors.textColor.light,
                    hoverColor: defaultColors.hoverColor.light,
                    indicatorWidth: "40px",
                    indicatorIconSize: "32px",
                    indicatorIconColor: "#ffffff",
                    indicatorColor: "rgba(0,0,0,0.5)",
                    sidebarWidth: "350px",
                    sidebarHeaderHeight: "50px",
                    sidebarMaskColor: defaultColors.sidebarMaskColor.light,
                    bookmarksFontSize: "14px",
                    directoriesIconSize: "16px",
                    bookmarksIconSize: "16px",
                    bookmarksLineHeight: "38px",
                    bookmarksDirIcon: "dir-1",
                    bookmarksDirColor: defaultColors.textColor.light,
                    bookmarksDirIndentation: "25px",
                    bookmarksHorizontalPadding: "16px",
                    scrollBarWidth: "11px",
                    tooltipFontSize: "9px",
                    overlayMaskColor: "rgba(0,0,0,0.5)",
                    overlayHeaderHeight: "50px",
                    fontFamily: "default",
                    iconShape: "bookmark",
                    iconColor: "#555555"
                }
            }
        };

        let data = {};
        let userType = null;
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

        /**
         * Initialises the port to the background script
         *
         * @returns {Promise}
         */
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
                let keys = ["utility", "behaviour", "appearance", "newtab", "licenseKey", "model"];
                let newData = {};

                let len = keys.length;
                let loaded = 0;
                keys.forEach((key) => {
                    chrome.storage[key === "utility" ? "local" : "sync"].get([key], (obj) => {
                        newData[key] = obj[key] || {};

                        if (++loaded === len) { // all data loaded from storage -> resolve promise
                            data = newData;

                            if (userType === null) {
                                userType = "default";

                                if (typeof data.licenseKey === "string" && data.licenseKey.length === 29) { // license key is available
                                    userType = "premium";
                                } else if (data.model && data.model.installationDate && data.model.installationDate < 1538352000000) { // installed before 01.10.2018
                                    userType = "legacy";
                                }
                            }

                            delete data.licenseKey;
                            delete data.model;

                            resolve();
                        }
                    });
                });
            });
        };

        /**
         * Returns the user type (default, legagy or premium)
         *
         * @returns {string}
         */
        this.getUserType = () => {
            return userType;
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
         * @param {boolean} defaultVal
         */
        this.getData = (keys, defaultVal = false) => {
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
                    case "n": {
                        dataSearchScope = data.newtab;
                        break;
                    }
                }

                if (dataSearchScope !== null) {
                    if (defaultVal === true || typeof dataSearchScope[key] === "undefined") {
                        if (typeof defaults[scope] !== "undefined" && typeof defaults[scope][key] !== "undefined") { // default values if undefined
                            value = defaults[scope][key];
                        }
                    } else {
                        value = dataSearchScope[key];
                    }
                }

                let isSettingsPage = location.href.search(/chrome-extension:\/\//) > -1 && location.pathname.search(/settings\.html$/) > -1;
                if (keyInfo === "b/toggleArea" && matchMedia("(min-resolution: 1.25dppx)").matches && isSettingsPage === false) { // hdpi monitor -> increase pixel tolerance by one -> Bugfix for right positioned sidebar
                    value = Object.assign({}, value);
                    Object.keys(value).forEach((k) => {
                        if (k.startsWith("width")) {
                            value[k]++;
                        }
                    });
                }

                if (keyInfo === "a/styles") {
                    value = Object.assign({}, defaults.a.styles, value);

                    if (ext.helper.font && ext.helper.font.isLoaded()) { // FontHelper is available and loaded -> extend object with detailed font information
                        let fontInfo = ext.helper.font.getFontInfo(defaultVal ? "default" : "config");
                        value.fontFamily = fontInfo.name;
                        Object.assign(value, fontInfo.fontWeights);
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
                            case "n": {
                                data.newtab[key] = value;
                                break;
                            }
                        }
                    });

                    let savedAmount = 0;
                    let saved = (amount = 1) => { // is getting called after data is saved in the storage
                        savedAmount += amount;
                        if (savedAmount >= 4) { // behaviour, appearance and utility has been saved -> resolve promise
                            resolve();
                        }
                    };

                    try { // can fail (e.g. MAX_WRITE_OPERATIONS_PER_MINUTE exceeded)
                        chrome.storage.local.set({utility: data.utility}, () => {
                            saved();
                        });

                        chrome.storage.sync.set({
                            behaviour: data.behaviour,
                            appearance: data.appearance,
                            newtab: data.newtab
                        }, () => {
                            chrome.runtime.lastError; // do nothing specific with the error -> is thrown if too many save attempts are triggered
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
         * @returns {Promise}
         */
        this.call = (key, opts = {}) => {
            return new Promise((resolve) => {
                opts.type = key;
                opts.uid = key + "_" + JSON.stringify(opts) + "_" + (+new Date()) + Math.random().toString(36).substr(2, 12);

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
