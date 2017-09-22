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
        this.init = () => {
            return new Promise((resolve) => {
                window['GoogleAnalyticsObject'] = 'ga';
                window.ga = window.ga || function () {
                    (window.ga.q = window.ga.q || []).push(arguments)
                };
                window.ga.l = +new Date();
                let script = document.createElement('script');
                script.async = 1;
                script.src = url;
                let m = document.getElementsByTagName('script')[0];
                m.parentNode.insertBefore(script, m);

                window.ga('create', 'UA-' + (trackingCode[b.isDev ? "dev" : "live"]), 'auto');
                window.ga('set', 'checkProtocolTask', null);
                window.ga('set', 'transport', 'beacon');

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
        this.trackEvent = (opts) => {
            return new Promise((resolve) => {
                addObjectToTrackingQueue({
                    hitType: 'event',
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
                    hitType: 'pageview',
                    page: opts.page
                }, opts.always || false);
                resolve();
            });
        };


        /**
         * Send a sign of life and all configuration once per day to Google Analytics
         */
        this.trackUserData = () => {
            let manifest = chrome.runtime.getManifest();
            let shareState = "not_set";
            let shareUserdata = b.helper.model.shareUserdata();

            if (shareUserdata === true) {
                shareState = "allowed";
            } else if (shareUserdata === false) {
                shareState = "not_allowed";
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
                label: manifest.version,
                always: true
            });

            if (shareUserdata === true) {
                // track installation date
                let installationDate = b.helper.model.getData("installationDate");
                if (installationDate) {
                    this.trackEvent({
                        category: "extension",
                        action: "installationDate",
                        label: new Date(installationDate).toISOString().slice(0, 10)
                    });
                }

                // track bookmark amount
                b.helper.bookmarkApi.func.getSubTree(0).then((response) => {
                    let bookmarkAmount = 0;
                    let processBookmarks = (bookmarks) => {
                        for (let i = 0; i < bookmarks.length; i++) {
                            let bookmark = bookmarks[i];
                            if (bookmark.url) {
                                bookmarkAmount++
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

                // track configuration values
                let categories = ["behaviour", "appearance"];

                let proceedConfig = (baseName, obj) => {
                    Object.keys(obj).forEach((attr) => {
                        if (typeof obj[attr] === "object") {
                            proceedConfig(baseName + "_" + attr, obj[attr])
                        } else {
                            if (typeof obj[attr] !== "string") { // parse everything to string
                                obj[attr] = JSON.stringify(obj[attr]);
                            }

                            this.trackEvent({
                                category: "configuration",
                                action: baseName + "_" + attr,
                                label: obj[attr]
                            });
                        }
                    });
                };

                chrome.storage.sync.get(categories, (obj) => {
                    categories.forEach((category) => {
                        if (typeof obj[category] === "object") {
                            proceedConfig(category, obj[category]);
                        }
                    });
                });
            }
        };

        /**
         * Adds the given object to the tracking queue and processes the queue if it is not already processing,
         * only works if user allows userdata sharing or if the parameter is specified
         *
         * @param {object} obj
         * @param {boolean} ignoreShareUserdata
         */
        let addObjectToTrackingQueue = (obj, ignoreShareUserdata) => {
            if (b.helper.model.shareUserdata() === true || ignoreShareUserdata === true) {
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
                    window.ga('send', entry);
                    processTrackingQueue();
                } else {
                    trackingQueueProceeding = false;
                }
            });
        };

    };

})(jsu);