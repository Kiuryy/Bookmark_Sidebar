($ => {
    "use strict";

    $.AnalyticsHelper = function (b) {
        let trackUserDataRunning = false;
        let stack = [];

        const restrictedTypes = {
            config: ["configuration"],
            activity: ["installationDate", "bookmarks", "action"]
        };

        /**
         * @returns {Promise}
         */
        this.init = async () => {
            setInterval(() => {
                if (stack.length > 0) {
                    sendStackToServer();
                }
            }, 20000);
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
            const lastTrackDate = b.helper.model.getData("lastTrackDate");
            let today = +new Date().setHours(0, 0, 0, 0);

            try { // try not to use the user specific date, but a date with defined timezone
                today = new Date().toLocaleString("en", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    timeZone: "Europe/Berlin"
                });
            } catch (e) {
                //
            }

            if (trackUserDataRunning === false && lastTrackDate !== today) { // no configuration/userdata tracked today
                trackUserDataRunning = true;

                Promise.all([
                    b.helper.model.getUserType(),
                    b.helper.model.setData("lastTrackDate", today)
                ]).then(([response]) => {
                    if (lastTrackDate === null) { // not tracked yet -> don't track the first time, but set the lastTrackDate above -> this will prevent double tracking of users, where setting the lastTrackDate fails
                        return;
                    }

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

                    addToStack("version", b.manifest.version_name);
                    addToStack("system", navigator.userAgent);
                    addToStack("language", b.helper.language.getLanguage());
                    addToStack("shareInfo", shareState);
                    addToStack("userType", response.userType);

                    if (shareInfo.activity === true) { // user allowed to share activity
                        trackGeneralInfo();
                    }

                    if (shareInfo.config === true) { // user allowed to share configuration
                        trackConfiguration();
                    }

                    trackUserDataRunning = false;
                });
            }
        };

        /**
         * Tracks some general information, like the bookmark amount or installation date
         */
        const trackGeneralInfo = () => {
            const installationDate = b.helper.model.getData("installationDate");
            if (installationDate) { // track installation date
                addToStack("installationDate", new Date(installationDate).toISOString().slice(0, 10));
            }

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
            const categories = ["behaviour", "appearance", "newtab", "language"];
            const configArr = [];

            const proceedConfig = (baseName, obj) => {
                Object.entries(obj).forEach(([attr, val]) => {
                    if (baseName === "newtab" && attr === "shortcuts") { // don't track the exact websites, just the amount
                        val = val.length;
                    } else if (baseName === "utility" && attr === "pinnedEntries" && typeof val === "object") { // only track the amount of pinned entries
                        val = Object.keys(val).length;
                    } else if (baseName === "behaviour" && (attr === "blacklist" || attr === "whitelist")) { // only track the amount of url rules
                        val = val.length;
                    }

                    if (typeof val === "object") {
                        proceedConfig(baseName + "_" + attr, val);
                    } else {
                        if (typeof val !== "string") { // parse everything to string
                            val = JSON.stringify(val);
                        }

                        if (
                            (baseName === "newtab" && attr === "website") || // don't track the exact website, just true or false
                            (baseName === "utility" && attr === "customCss") ||  // only track whether the user uses a custom css or not
                            (baseName === "utility" && attr === "newtabBackground")  // only track whether the user set a wallpaper as new tab background or not
                        ) {
                            val = val && val.length > 0 ? "true" : "false";
                        }

                        configArr.push({
                            name: baseName + "_" + attr,
                            value: val
                        });
                    }
                });
            };

            new Promise((resolve) => {
                chrome.storage.sync.get(categories, (obj) => {
                    categories.forEach((category) => {
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
                    chrome.storage.local.get(["utility", "newtabBackground_1"], (obj) => {
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
            }).then(() => {
                addToStack("configuration", configArr);
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

            if (allowed === true && b.isDev === false) { // the current type may be tracked
                stack.push({type: type, value: value});
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
                $.xhr(b.urls.track, {
                    method: "POST",
                    responseType: "json",
                    timeout: 10000,
                    data: {stack: data}
                }).then((xhr) => {
                    if (xhr.response && xhr.response.success) {
                        resolve({success: xhr.response.success});
                    } else {
                        resolve({success: false});
                    }
                }, () => {
                    if (retry.count < 500) {
                        $.delay(15000 + (retry.count * 500)).then(() => { // could not send request -> try again later
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