($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.ModelHelper = function (ext) {

        const defaultColors = {
            "default": {
                textColor: {
                    light: "#646464",
                    dark: "#c8c8c8"
                },
                bookmarksDirColor: {
                    light: "#646464",
                    dark: "#c8c8c8"
                },
                sidebarMaskColor: {
                    light: "rgba(255, 255, 255, 0.8)",
                    dark: "rgba(0, 0, 0, 0.6)"
                },
                overlayMaskColor: {
                    light: "rgba(0, 0, 0, 0.5)",
                    dark: "rgba(0, 0, 0, 0.5)"
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
                },
                icon: {
                    forLight: "#555555",
                    forDark: "#ffffff"
                }
            },
            glass: {
                sidebarMaskColor: {
                    light: "rgba(0, 0, 0, 0)",
                    dark: "rgba(0, 0, 0, 0)"
                },
                overlayMaskColor: {
                    light: "rgba(255, 255, 255, 0.5)",
                    dark: "rgba(0, 0, 0, 0.3)"
                },
                textColor: {
                    light: "#444444",
                    dark: "#dfdfdf"
                },
                bookmarksDirColor: {
                    light: "#444444",
                    dark: "#dfdfdf"
                },
                hoverColor: {
                    light: "rgba(0, 0, 0, 0.05)",
                    dark: "rgba(255, 255, 255, 0.1)"
                }
            }
        };

        const surfaceColorDependentStyles = [
            "textColor",
            "hoverColor",
            "sidebarMaskColor",
            "bookmarksDirColor",
            "overlayMaskColor"
        ];

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
                linkcheckerIgnored: {},
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
                    width: 2,
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
                preventWebapp: false,
                rememberState: "openStatesAndPos",
                rememberOpenStatesSubDirectories: true,
                newEntryPosition: "append",
                tooltipDelay: 0.5,
                tooltipContent: "all",
                tooltipAdditionalInfo: true,
                dndCreationDialog: false,
                closeOnTabChange: true,
                openChildrenWarnLimit: 10,
                dirOpenDuration: 0.4,
                scrollBarHide: 1.5,
                openDelay: 0,
                closeTimeout: 1,
                dndOpenDirDelay: 0.5
            },
            a: { // appearance -> synced across devices
                theme: "default",
                showIndicator: true,
                showIndicatorIcon: true,
                surface: "light",
                highContrast: false,
                directoryArrows: false,
                showBookmarkIcons: true,
                showDirectoryIcons: true,
                devModeIconBadge: true,
                styles: {
                    colorScheme: defaultColors["default"].colorScheme.light,
                    foregroundColor: defaultColors["default"].foregroundColor.light,
                    textColor: null,
                    hoverColor: null,
                    indicatorWidth: "24px",
                    indicatorIconSize: "24px",
                    indicatorIconColor: "#ffffff",
                    indicatorColor: "rgba(0,0,0,0.5)",
                    iconShape: "bookmark",
                    iconColor: "auto",
                    sidebarWidth: "350px",
                    sidebarHeaderHeight: "50px",
                    sidebarMaskColor: null,
                    bookmarksFontSize: "14px",
                    directoriesIconSize: "16px",
                    bookmarksIconSize: "16px",
                    bookmarksLineHeight: "38px",
                    bookmarksDirIcon: "dir-1",
                    bookmarksDirColor: null,
                    bookmarksDirIndentation: "25px",
                    bookmarksHorizontalPadding: "16px",
                    scrollBarWidth: "11px",
                    tooltipFontSize: "9px",
                    overlayMaskColor: null,
                    overlayHeaderHeight: "50px",
                    fontFamily: "default",
                    // styles for glass theme
                    backgroundTransparency: 0.8,
                    backgroundBlur: "7px"
                }
            },
            n: { // new tab -> synced across devices
                override: false,
                faviconShape: "new-1",
                faviconColor: "#646464",
                faviconBackground: "transparent",
                faviconPadding: 10,
                autoOpen: true,
                focusOmnibox: false,
                searchField: "show",
                searchEngine: "google",
                searchEngineCustom: {
                    title: "",
                    homepage: "",
                    queryUrl: ""
                },
                gridType: "topPages",
                gridMaxCols: 4,
                gridMaxRows: 2,
                customGridLinks: [],
                topLinks: [],
                topLinksPosition: "right",
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

                port = $.api.runtime.connect(null, {name: "background"});

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
                    $.api.storage[key === "utility" ? "local" : "sync"].get([key], (obj) => {
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
         * Returns all surface color dependent styles
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

                if (keyInfo === "a/styles") {
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

                    if (surface === "auto" && (
                        value.colorScheme === defaultColors["default"].colorScheme.light ||
                        value.colorScheme === defaultColors["default"].colorScheme.dark
                    )) { // change color scheme according to the system color, when automatical switch is enabled and the color scheme is the default value
                        value.colorScheme = defaultColors["default"].colorScheme[colorScheme];
                    }

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
