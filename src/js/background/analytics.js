($ => {
    "use strict";

    window.AnalyticsHelper = function (b) {
        let trackingQueue = [];
        let trackingQueueProceeding = false;

        let url = "https://www.google-analytics.com/analytics.js";
        let trackingCode = {
            dev: "100595538-3",
            live: "100595538-2"
        };

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            window.GoogleAnalyticsObject = "ga";
            window.ga = window.ga || function () {
                (window.ga.q = window.ga.q || []).push(arguments);
            };
            window.ga.l = +new Date();
            let script = document.createElement("script");
            script.async = 1;
            script.src = url;
            let m = document.getElementsByTagName("script")[0];
            m.parentNode.insertBefore(script, m);

            window.ga("create", "UA-" + (trackingCode[b.isDev ? "dev" : "live"]), "auto");
            window.ga("set", "checkProtocolTask", null);
            window.ga("set", "transport", "beacon");
        };


        /**
         * Tracks an event in Google Analytics with the given values,
         * only do if user allows userdata sharing or if the parameter is specified
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.trackEvent = (opts) => {
            return new Promise((resolve) => {
                addObjectToTrackingQueue({
                    hitType: "event",
                    eventCategory: opts.category,
                    eventAction: opts.action,
                    eventLabel: opts.label,
                    eventValue: opts.value || 1
                }, opts.always || false);
                resolve();
            });
        };

        /**
         * Tracks an event in Google Analytics with the given values,
         * only do if user allows userdata sharing or if the parameter is specified
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.trackPageView = (opts) => {
            return new Promise((resolve) => {
                addObjectToTrackingQueue({
                    hitType: "pageview",
                    page: opts.page
                }, opts.always || false);
                resolve();
            });
        };


        /**
         * Send a sign of life and all configuration once per day to Google Analytics
         */
        this.trackUserData = () => {
            let shareInfo = b.helper.model.getShareInfo();
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

            this.trackEvent({ // sign of life
                category: "extension",
                action: "user",
                label: "share_" + shareState,
                always: true
            });

            this.trackEvent({ // extension version
                category: "extension",
                action: "version",
                label: b.manifest.version_name,
                always: true
            });

            if (shareInfo.activity === true) {
                let installationDate = b.helper.model.getData("installationDate");
                if (installationDate) { // track installation date
                    this.trackEvent({
                        category: "extension",
                        action: "installationDate",
                        label: new Date(installationDate).toISOString().slice(0, 10)
                    });
                }

                b.helper.bookmarkApi.func.getSubTree(0).then((response) => { // track bookmark amount
                    let bookmarkAmount = 0;
                    let processBookmarks = (bookmarks) => {
                        for (let i = 0; i < bookmarks.length; i++) {
                            let bookmark = bookmarks[i];
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

                    this.trackEvent({
                        category: "extension",
                        action: "bookmarks",
                        label: "amount",
                        value: bookmarkAmount
                    });
                });
            }

            if (shareInfo.config === true) { // track configuration values
                let categories = ["behaviour", "appearance", "newtab", "language"];

                let proceedConfig = (baseName, obj) => {
                    Object.keys(obj).forEach((attr) => {
                        if (baseName === "newtab" && attr === "shortcuts") { // don't track the exact websites, just the amount
                            obj[attr] = obj[attr].length;
                        } else if (baseName === "utility" && attr === "pinnedEntries" && typeof obj[attr] === "object") { // only track the amount of pinned entries
                            obj[attr] = Object.keys(obj[attr]).length;
                        }

                        if (typeof obj[attr] === "object") {
                            proceedConfig(baseName + "_" + attr, obj[attr]);
                        } else {
                            if (typeof obj[attr] !== "string") { // parse everything to string
                                obj[attr] = JSON.stringify(obj[attr]);
                            }

                            if (baseName === "newtab" && attr === "website") { // don't track the exact website, just true or false
                                obj[attr] = obj[attr] && obj[attr].length > 0 ? "true" : "false";
                            }

                            let value = 1;

                            if (!isNaN(parseFloat(obj[attr])) && isFinite(obj[attr])) {
                                value = parseFloat(obj[attr]);
                            } else if (obj[attr].search(/^\d+px$/i) === 0) {
                                value = parseFloat(obj[attr].replace(/px$/i, ""));
                            }

                            this.trackEvent({
                                category: "configuration",
                                action: baseName + "_" + attr,
                                label: obj[attr],
                                value: value
                            });
                        }
                    });
                };

                chrome.storage.sync.get(categories, (obj) => {
                    categories.forEach((category) => {
                        if (category === "language" && typeof obj[category] === "string") { // proceed with the actual language of the extension
                            if (obj[category] === "default") {
                                obj[category] = chrome.i18n.getUILanguage();
                            }
                            obj[category] = {ui: obj[category]};
                        }

                        if (typeof obj[category] === "object") {
                            proceedConfig(category, obj[category]);
                        }
                    });
                });

                chrome.storage.local.get(["utility"], (obj) => {
                    if (obj.utility) {
                        let config = {};
                        ["lockPinned", "pinnedEntries"].forEach((field) => {
                            if (typeof obj.utility[field] !== "undefined") {
                                config[field] = obj.utility[field];
                            }
                        });

                        proceedConfig("utility", config);
                    }
                });
            }
        };

        /**
         * Adds the given object to the tracking queue and processes the queue if it is not already processing,
         * only works if user allows userdata sharing or if the parameter is specified
         *
         * @param {object} obj
         * @param {boolean} ignoreShareInfo
         */
        let addObjectToTrackingQueue = (obj, ignoreShareInfo) => {
            let shareInfo = b.helper.model.getShareInfo();
            let allowed = true;

            if (ignoreShareInfo !== true) {
                if (obj.eventCategory && obj.eventCategory === "configuration") {
                    allowed = shareInfo.config;
                } else {
                    allowed = shareInfo.activity;
                }
            }

            if (allowed) {
                trackingQueue.push(obj);
                if (trackingQueueProceeding === false) {
                    processTrackingQueue();
                }
            }
        };

        /**
         * Processes the tracking queue,
         * sends every 1000ms the oldest entry of the queue to Google Analytics
         */
        let processTrackingQueue = () => {
            trackingQueueProceeding = true;
            $.delay(1000).then(() => {
                if (trackingQueue.length > 0 && window.ga && window.ga.loaded) {
                    let entry = trackingQueue.shift();
                    window.ga("send", entry);
                    processTrackingQueue();
                } else {
                    trackingQueueProceeding = false;
                }
            });
        };

    };

})(jsu);