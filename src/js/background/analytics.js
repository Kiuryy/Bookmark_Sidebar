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
            await intervalCallback();
            setInterval(async () => {
                await intervalCallback();
            }, 25 * 1000);
        };

        const intervalCallback = async () => {
            try {
                const success = await sendStackToServer();
                if (success) {
                    await clearStack();
                } else {
                    console.error("Failed to send analytics data");
                    await clearStackIfTooLarge();
                }
            } catch (e) {
                console.error("Error while sending analytics data", e);
            }
        };

        /**
         * Tracks the given data for the given type by sending a request to the webserver
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.track = async (opts) => {
            await addToStack(opts.name, opts.value, opts.always);
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

                if (lastTrackDate && +b.helper.model.getData("lastTrackDate") === today) { // don't proceed when lastTrackDate is empty or the variable stored in the sync storage is empty -> prevent double tracking of users, where saving the lastTrackDate fails
                    const stack = await getStack();
                    if (stack.find((s) => s.type === "version")) {
                        console.error("Drop stack as it still has data from the day before");
                        await clearStack();
                    } else {
                        await clearStackIfTooLarge();
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

                    const ua = $.ua();
                    await addToStack("browser", ua.browser);
                    await addToStack("os", ua.os);
                    await addToStack("version", $.opts.manifest.version_name || $.opts.manifest.version);
                    await addToStack("language", b.helper.language.getLanguage());
                    await addToStack("shareInfo", shareState);
                    await addToStack("runtimeId", $.api.runtime.id);
                    await addToStack("userType", (await b.helper.model.getUserType()).userType);

                    const installationDate = b.helper.model.getData("installationDate");
                    if (installationDate) { // track the year of installation
                        await addToStack("installationYear", new Date(installationDate).getFullYear());
                    }

                    if (shareInfo.activity === true) { // user allowed to share activity
                        await trackBookmarkAmount();
                    }

                    if (shareInfo.config === true) { // user allowed to share configuration
                        await trackConfiguration();
                    }
                }

                trackUserDataRunning = false;
            }
        };

        /**
         * Tracks the amount of bookmarks
         */
        const trackBookmarkAmount = async () => {
            const response = await b.helper.bookmarks.getById({id: 0}); // track bookmark amount
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

            if (response && response.bookmarks && response.bookmarks[0] && response.bookmarks[0].children && response.bookmarks[0].children.length > 0) {
                processBookmarks(response.bookmarks[0].children);
            }

            await addToStack("bookmarks", bookmarkAmount);
        };

        /**
         * Tracks the configuration
         */
        const trackConfiguration = async () => {
            const proceedConfig = async (baseName, obj) => {
                for (const attr in obj) {
                    let val = obj[attr];

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
                    } else if (baseName === "appearance_styles" && attr === "fontFamily") {
                        if (val.split(",").length >= 3) { // font family consists of multiple fonts -> this is the default
                            val = "default";
                        }
                        val = val.replace(/(^'*)|('*$)/g, ""); // remove ticks
                    }

                    if (typeof val === "object") {
                        await proceedConfig(baseName + "_" + attr, val);
                    } else {
                        if (typeof val !== "string") { // parse everything to string
                            val = JSON.stringify(val);
                        }

                        if (
                            (baseName === "newtab" && attr === "website") || // don't track the exact website, just true or false TODO REMOVE, since this option no longer exists
                            (baseName === "utility" && attr === "customCss") || // only track whether the user uses a custom css or not
                            (baseName === "utility" && attr === "newtabBackground") // only track whether the user set a wallpaper as new tab background or not
                        ) {
                            val = val && val.length > 0 ? "true" : "false";
                        }

                        await addToStack("configuration", {
                            name: baseName + "_" + attr,
                            value: val
                        });
                    }
                }
            };

            let isOverrideNewtab = false;

            const configList = await $.api.storage.sync.get(configCategories);
            for (const category in configList) {
                if (category === "newtab") { // if the newtab page is not being overwritten, the other configurations are irrelevant
                    if (typeof configList[category] === "object" && typeof configList[category].override !== "undefined" && configList[category].override === true) {
                        isOverrideNewtab = true;
                    } else {
                        configList[category] = {
                            override: false
                        };
                    }
                }

                if (typeof configList[category] === "object") {
                    await proceedConfig(category, configList[category]);
                }
            }

            const obj = await $.api.storage.local.get(["utility", "newtabBackground_1"]);
            if (obj.utility) {
                const config = {};
                ["lockPinned", "pinnedEntries", "customCss"].forEach((field) => {
                    if (typeof obj.utility[field] !== "undefined") {
                        config[field] = obj.utility[field];
                    }
                });

                if (typeof obj.utility.sort !== "undefined") {
                    config.sortType = obj.utility.sort.name;
                    config.sortDetail = obj.utility.sort.name + "-" + obj.utility.sort.dir;
                }

                if (isOverrideNewtab) { // track if a custom newtab background is being used (only if isOverrideNewtab=true)
                    config.newtabBackground = obj.newtabBackground_1 || "";
                }

                await proceedConfig("utility", config);
            }
        };

        /**
         * Adds an entry to the stack
         *
         * @param {string} type
         * @param {*} value
         * @param {boolean} ignoreUserPreference
         */
        const addToStack = async (type, value, ignoreUserPreference = false) => {
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

            if (allowed) { // the current type may be tracked
                const obj = {type: type};

                if (typeof value === "object") {
                    obj.values = value;
                } else {
                    obj.value = "" + value;
                }

                const stack = await getStack();
                stack.push(obj);
                await $.api.storage.local.set({analytics_stack: stack});
            }
        };

        /**
         * Generates a numeric hash from the given data
         *
         * @param data
         * @returns {number}
         */
        const generateHash = (data) => {
            const dataStr = (JSON.stringify(data) || "").replace(/[\s\n\r\t]/g, "");
            let hash = 0;
            if (dataStr.length === 0) {
                return hash;
            }
            for (let i = 0; i < dataStr.length; i++) {
                const chr = dataStr.charCodeAt(i);
                hash = ((hash << 5) - hash) + chr;
                hash |= 0;
            }
            return Math.abs(hash);
        };

        /**
         * Clears the stack if it grew a certain amount of entries without being flushed yet,
         * The limit depends on what the user agreed to share, since this influences the potential stack size
         *
         * @returns {Promise<void>}
         */
        const clearStackIfTooLarge = async () => {
            const shareInfo = b.helper.model.getShareInfo();
            const stack = await getStack();

            let maxStackSize = 30;
            if (shareInfo.activity === true) {
                maxStackSize = 50;
            }
            if (shareInfo.config === true) {
                maxStackSize = 300;
            }
            if (stack.length > maxStackSize) {
                console.error("Drop stack as it grew too big already");
                await clearStack();
            }
        };

        const getStack = async () => {
            const storageData = await $.api.storage.local.get(["analytics_stack"]);
            return storageData.analytics_stack || [];
        };

        const clearStack = async () => {
            await $.api.storage.local.set({analytics_stack: []});
        };

        /**
         * Sends the stack to the server
         *
         * @returns {Promise<boolean>}
         */
        const sendStackToServer = async () => {
            const stack = await getStack();
            if (stack.length <= 0) {
                return true;
            }

            const formData = new FormData();
            formData.append("stack", JSON.stringify(stack));
            formData.append("uid", generateHash(stack));
            formData.append("tz", new Date().getTimezoneOffset());

            if ($.isDev) {
                // eslint-disable-next-line no-console
                console.log(`POST request to ${$.opts.website.api.evaluate}`, stack);
                return true;
            }

            const resp = await fetch($.opts.website.api.evaluate, {
                method: "POST",
                responseType: "json",
                timeout: 30000,
                body: formData
            });
            return !resp || resp.status < 500;
        };
    };

})(jsu);