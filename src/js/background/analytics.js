($ => {
    "use strict";

    $.AnalyticsHelper = function (b) {
        /**
         *
         * @type {boolean}
         */
        let trackUserDataRunning = false;

        /**
         *
         * @type {Array}
         */
        let stack = [];

        /**
         *
         * @type {Array}
         */
        const restrictedTypes = {
            config: ["configuration"],
            activity: ["bookmarks", "action"]
        };

        /**
         *
         * @type {Array}
         */
        const configCategories = ["behaviour", "appearance", "newtab", "language"];

        /**
         * @returns {Promise}
         */
        this.init = async () => {
            setInterval(() => {
                if (stack.length > 0) {
                    sendStackToServer();
                }
            }, 60000);
        };

        /**
         * Tracks the given data for the given type by sending a request to the webserver
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.track = (opts) => {
            return new Promise((resolve) => {
                addToStack(opts.name, opts.value, opts.always);
                resolve();
            });
        };

        /**
         * Send a sign of life, some general information and all configuration once per day
         *
         * @returns {Promise}
         */
        this.trackUserData = async () => {
            const lastTrackDate = +b.helper.model.getData("lastTrackDate");
            const today = +new Date().setHours(0, 0, 0, 0);

            if (trackUserDataRunning === false && today > lastTrackDate) { // no configuration/userdata tracked today
                trackUserDataRunning = true;

                await b.helper.model.setData("lastTrackDate", today);
                await b.helper.model.init(); // re-init model to see, if the lastTrackDate is really saved or whether it's gone when fetching the date freshly from the sync storage

                if (lastTrackDate && b.helper.model.getData("lastTrackDate")) { // don't proceed when lastTrackDate is empty or the variable stored in the sync storage is empty -> prevent double tracking of users, where saving the lastTrackDate fails
                    const shareInfo = b.helper.model.getShareInfo();
                    let shareState = "not_set";

                    if (shareInfo.config === true && shareInfo.activity === true) {
                        shareState = "all";
                    } else if (shareInfo.config === true && shareInfo.activity === false) {
                        shareState = "config";
                    } else if (shareInfo.config === false && shareInfo.activity === true) {
                        shareState = "activity";
                    } else if (shareInfo.config === false && shareInfo.activity === false) {
                        shareState = "nothing";
                    }

                    addToStack("version", $.opts.manifest.version_name);
                    addToStack("system", navigator.userAgent);
                    addToStack("language", b.helper.language.getLanguage());
                    addToStack("shareInfo", shareState);
                    addToStack("runtimeId", $.api.runtime.id);
                    addToStack("userType", (await b.helper.model.getUserType()).userType);

                    const installationDate = b.helper.model.getData("installationDate");
                    if (installationDate) { // track the year of installation
                        addToStack("installationYear", new Date(installationDate).getFullYear());
                    }

                    if (shareInfo.activity === true) { // user allowed to share activity
                        trackBookmarkAmount();
                    }

                    if (shareInfo.config === true) { // user allowed to share configuration
                        trackConfiguration();
                    }
                }

                trackUserDataRunning = false;
            }
        };

        /**
         * Tracks the amount of bookmarks
         */
        const trackBookmarkAmount = () => {
            b.helper.bookmarks.api.getSubTree(0).then((response) => { // track bookmark amount
                let bookmarkAmount = 0;
                const processBookmarks = (bookmarks) => {
                    for (let i = 0; i < bookmarks.length; i++) {
                        const bookmark = bookmarks[i];
                        if (bookmark.url) {
                            bookmarkAmount++;
                        } else if (bookmark.children) {
                            processBookmarks(bookmark.children);
                        }
                    }
                };

                if (response && response[0] && response[0].children && response[0].children.length > 0) {
                    processBookmarks(response[0].children);
                }

                addToStack("bookmarks", bookmarkAmount);
            });
        };

        /**
         * Tracks the configuration
         */
        const trackConfiguration = () => {
            const proceedConfig = (baseName, obj) => {
                Object.entries(obj).forEach(([attr, val]) => {
                    if (baseName === "newtab_searchEngineCustom") { // don't track information about the custom search engine
                        return;
                    } else if (baseName === "newtab" && attr === "topLinks") { // don't track the exact websites, just the amount
                        val = val.length;
                    } else if (baseName === "newtab" && attr === "shortcuts") { // @deprecated 03/2021 the attribute is now called 'topLinks'
                        val = val.length;
                    } else if (baseName === "newtab" && attr === "customGridLinks") { // don't track information about the amount of links in the custom grid
                        return;
                    } else if (baseName === "utility" && attr === "pinnedEntries" && typeof val === "object") { // only track the amount of pinned entries
                        val = Object.keys(val).length;
                    } else if (baseName === "behaviour" && (attr === "blacklist" || attr === "whitelist")) { // only track the amount of url rules
                        val = val.length;
                    } else if (baseName === "appearance_styles" && attr === "fontFamily") { // remove ticks around fontFamily
                        val = val.replace(/(^'*)|('*$)/g, "");
                    }

                    if (typeof val === "object") {
                        proceedConfig(baseName + "_" + attr, val);
                    } else {
                        if (typeof val !== "string") { // parse everything to string
                            val = JSON.stringify(val);
                        }

                        if (
                            (baseName === "newtab" && attr === "website") || // don't track the exact website, just true or false
                            (baseName === "utility" && attr === "customCss") || // only track whether the user uses a custom css or not
                            (baseName === "utility" && attr === "newtabBackground") // only track whether the user set a wallpaper as new tab background or not
                        ) {
                            val = val && val.length > 0 ? "true" : "false";
                        }

                        addToStack("configuration", {
                            name: baseName + "_" + attr,
                            value: val
                        });
                    }
                });
            };

            new Promise((resolve) => {
                $.api.storage.sync.get(configCategories, (obj) => {
                    configCategories.forEach((category) => {
                        if (category === "newtab") { // if the newtab page is not being overwritten, the other configurations are irrelevant
                            if (typeof obj[category] === "object" && typeof obj[category].override !== "undefined" && obj[category].override === false) {
                                obj[category] = {
                                    override: false
                                };
                            }
                        }

                        if (typeof obj[category] === "object") {
                            proceedConfig(category, obj[category]);
                        }
                    });

                    resolve();
                });
            }).then(() => {
                return new Promise((resolve) => {
                    $.api.storage.local.get(["utility", "newtabBackground_1"], (obj) => {
                        if (obj.utility) {
                            const config = {};
                            ["lockPinned", "pinnedEntries", "customCss"].forEach((field) => {
                                if (typeof obj.utility[field] !== "undefined") {
                                    config[field] = obj.utility[field];
                                }
                            });

                            if (obj.newtabBackground_1) {
                                config.newtabBackground = obj.newtabBackground_1;
                            }

                            proceedConfig("utility", config);
                        }

                        resolve();
                    });
                });
            });
        };

        /**
         * Adds an entry to the stack
         *
         * @param {string} type
         * @param {*} value
         * @param {boolean} ignoreUserPreference
         */
        const addToStack = (type, value, ignoreUserPreference = false) => {
            let allowed = true;

            if (ignoreUserPreference === false) {
                const shareInfo = b.helper.model.getShareInfo();

                Object.entries(restrictedTypes).some(([key, types]) => { // check whether the category can be restricted by the user and whether it is
                    if (types.indexOf(type) > -1) {
                        allowed = shareInfo[key] === true;
                        return true;
                    }
                });
            }

            if (allowed === true && $.isDev === false) { // the current type may be tracked
                const obj = {type: type};

                if (typeof value === "object") {
                    obj.values = value;
                } else {
                    obj.value = "" + value;
                }
                stack.push(obj);
            }
        };

        /**
         * Sends the stack to the server and flushes its stored values
         *
         * @param {object} retry
         * @returns {Promise}
         */
        const sendStackToServer = (retry = {}) => {
            let data = [];

            if (retry && retry.stack && retry.count) { // recall of the method -> fill with previous stack
                data = retry.stack;
            } else { // new date to transfer
                data = [...stack];
                stack = [];
                retry = {stack: data, count: 0};
            }

            return new Promise((resolve) => {
                $.xhr($.opts.website.api.evaluate, {
                    method: "POST",
                    responseType: "json",
                    timeout: 30000,
                    data: {
                        stack: data,
                        tz: new Date().getTimezoneOffset()
                    }
                }).then((xhr) => {
                    if (xhr.response && xhr.response.success) {
                        resolve({success: xhr.response.success});
                    } else {
                        resolve({success: false});
                    }
                }, () => {
                    if (retry.count < 50) {
                        $.delay((retry.count + 1) * 30000).then(() => { // could not send request -> try again later
                            retry.count++;
                            return sendStackToServer(retry);
                        }).then(resolve);
                    } else {
                        resolve({success: false});
                    }
                });
            });
        };
    };

})(jsu);