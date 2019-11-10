($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.ModelHelper = function (ext) {

        const defaults = {
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
                translationThanked: false,
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
                rememberOpenStatesSubDirectories: true,
                newEntryPosition: "append",
                tooltipDelay: 0.5,
                tooltipContent: "all",
                tooltipAdditionalInfo: true,
                dndCreationDialog: false,
                openChildrenWarnLimit: 10,
                dirOpenDuration: 0.4,
                scrollBarHide: 1.5,
                openDelay: 0,
                closeTimeout: 1,
                dndOpenDirDelay: 0.5
            },
            a: { // appearance -> synced across devices
                showIndicator: true,
                showIndicatorIcon: true,
                darkMode: false,
                highContrast: false,
                directoryArrows: false,
                showBookmarkIcons: true,
                showDirectoryIcons: true,
                devModeIconBadge: true,
                styles: {
                    colorScheme: $.opts.defaultColors.colorScheme.light,
                    foregroundColor: $.opts.defaultColors.foregroundColor.light,
                    textColor: $.opts.defaultColors.textColor.light,
                    hoverColor: $.opts.defaultColors.hoverColor.light,
                    indicatorWidth: "40px",
                    indicatorIconSize: "32px",
                    indicatorIconColor: "#ffffff",
                    indicatorColor: "rgba(0,0,0,0.5)",
                    sidebarWidth: "350px",
                    sidebarHeaderHeight: "50px",
                    sidebarMaskColor: $.opts.defaultColors.sidebarMaskColor.light,
                    bookmarksFontSize: "14px",
                    directoriesIconSize: "16px",
                    bookmarksIconSize: "16px",
                    bookmarksLineHeight: "38px",
                    bookmarksDirIcon: "dir-1",
                    bookmarksDirColor: $.opts.defaultColors.textColor.light,
                    bookmarksDirIndentation: "25px",
                    bookmarksHorizontalPadding: "16px",
                    scrollBarWidth: "11px",
                    tooltipFontSize: "9px",
                    overlayMaskColor: "rgba(0,0,0,0.5)",
                    overlayHeaderHeight: "50px",
                    fontFamily: "default",
                    iconShape: "bookmark",
                    iconColor: "auto"
                }
            },
            n: { // new tab -> synced across devices
                override: false,
                autoOpen: true,
                focusOmnibox: false,
                shortcutsPosition: "right",
                searchEngine: "google",
                searchEngineCustom: {
                    title: "",
                    homepage: "",
                    queryUrl: ""
                },
                topPagesType: "topPages",
                topPagesAppearance: "favicon",
                shortcuts: [{label: "Google", url: "https://google.com"}],
                website: ""
            }
        };

        let data = {};
        let userType = null;
        let port = null;
        const callbacks = {};

        /**
         * Initialises the model
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                userType = null;

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
        const initPort = () => {
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
        const refresh = () => {
            return new Promise((resolve) => {
                const keys = ["utility", "behaviour", "appearance", "newtab"];
                const newData = {};

                const len = keys.length;
                let loaded = 0;
                keys.forEach((key) => {
                    chrome.storage[key === "utility" ? "local" : "sync"].get([key], (obj) => {
                        newData[key] = obj[key] || {};

                        if (++loaded === len) { // all data loaded from storage -> resolve promise
                            data = newData;

                            if (userType === null) {
                                this.call("userType").then((obj) => {
                                    if (obj && obj.userType) {
                                        userType = obj.userType;
                                    }
                                    resolve();
                                });
                            } else {
                                resolve();
                            }
                        }
                    });
                });
            });
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
                const scope = keyInfo.split("/")[0];
                const key = keyInfo.split("/")[1];
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

                const isSettingsPage = location.href.search(/chrome-extension:\/\//) > -1 && location.pathname.search(/settings\.html$/) > -1;
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
                        const fontInfo = ext.helper.font.getFontInfo(defaultVal ? "default" : "config");
                        value.fontFamily = fontInfo.name;
                        Object.assign(value, fontInfo.fontWeights);
                    }
                }

                result[key] = value;
            });

            if (typeof keys === "string") {
                const key = keys.split("/")[1];
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
                        const scope = keyInfo.split("/")[0];
                        const key = keyInfo.split("/")[1];
                        const value = values[keyInfo];

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
                    const saved = (amount = 1) => { // is getting called after data is saved in the storage
                        savedAmount += amount;
                        if (savedAmount >= 4) { // behaviour, appearance and utility has been saved -> resolve promise
                            resolve();
                        }
                    };

                    try { // can fail (e.g. MAX_WRITE_OPERATIONS_PER_MINUTE exceeded)
                        chrome.storage.local.set({utility: data.utility}, () => {
                            chrome.runtime.lastError; // do nothing specific with the error -> is thrown if too many save attempts are triggered
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
    };

})(jsu);
