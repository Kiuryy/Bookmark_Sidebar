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
                    forDark: "#eeeeee"
                }
            },
            glass: {
                sidebarMaskColor: {
                    light: "rgba(0, 0, 0, 0)",
                    dark: "rgba(0, 0, 0, 0)"
                },
                overlayMaskColor: {
                    light: "rgba(255, 255, 255, 0.5)",
                    dark: "rgba(0, 0, 0, 0.5)"
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
            },
            soft: {
                colorScheme: { // the counter in the header uses the color scheme as text color, the dark blue is hard to read on the dark background
                    light: "#1b82f1",
                    dark: "#1b82f1"
                },
                overlayMaskColor: {
                    light: "rgba(170, 180, 195, 0.5)",
                    dark: "rgba(10, 12, 15, 0.6)"
                },
                textColor: {
                    light: "#5a6474",
                    dark: "#c9ced6"
                },
                bookmarksDirColor: {
                    light: "#5a6474",
                    dark: "#c9ced6"
                },
                hoverColor: {
                    light: "rgba(0, 0, 0, 0.05)",
                    dark: "rgba(255, 255, 255, 0.08)"
                }
            }
        };

        const surfaceColorDependentStyles = [
            "textColor",
            "hoverColor",
            "sidebarMaskColor",
            "overlayMaskColor",
            "bookmarksDirColor"
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
                translationHelp: true,
                translationThanked: false,
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
                triggerWidth: 2,
                triggerWidthWindowed: 20,
                triggerHeight: 100,
                triggerOffsetTop: 0,
                blacklist: [],
                whitelist: [],
                mode: "sidepanel",
                sidebarPosition: "left",
                openAction: "mousedown",
                newTab: "foreground",
                newTabPosition: "afterCurrent",
                visibility: "always",
                linkAction: "current",
                dirAccordion: false,
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
                dirOpenDuration: 0.35,
                scrollBarHide: 1.5,
                openDelay: 0,
                closeTimeout: 1,
                dndOpenDirDelay: 0.5,
                lockPinned: true,
                refocusWebsite: false
            },
            a: { // appearance -> synced across devices
                theme: "default",
                surface: "light",
                highContrast: false,
                directoryArrows: false,
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
                    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif",
                    // styles for glass theme
                    backgroundTransparency: 0.8,
                    backgroundBlur: "7px"
                }
            },
            n: { // new tab -> synced across devices
                faviconShape: "new-1",
                faviconColor: "#545454",
                faviconBackground: "transparent",
                faviconPadding: 10,
                autoOpen: true,
                focusOmnibox: false,
                searchSuggestQueries: true,
                searchSuggestBookmarks: true,
                searchSuggestHistory: false,
                searchField: "show",
                searchEngine: "google",
                searchEngineCustom: {
                    title: "",
                    homepage: "",
                    queryUrl: ""
                },
                gridType: "recentlyUsed",
                gridMaxCols: 4,
                gridMaxRows: 2,
                customGridLinks: [],
                topLinks: [],
                topLinksPosition: "right",
                website: "",
                searchSuggestionNextKeys: ["ArrowDown", "Tab"],
                searchSuggestionPrevKeys: ["ArrowUp", "Tab"]
            }
        };

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
