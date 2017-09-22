($ => {
    "use strict";

    window.NewtabHelper = function (b) {

        let config = {};

        this.init = () => {
            return new Promise((resolve) => {
                this.updateConfig().then(() => {
                    initEvents();
                    resolve();
                });
            });
        };

        /**
         * Retrieves the configuration about the new tab replacement from the storage
         */
        this.updateConfig = () => {
            return new Promise((resolve) => {
                chrome.storage.sync.get(["newtab"], (obj) => {
                    if (typeof obj.newtab === "undefined") {
                        config = {};
                    } else {
                        config = obj.newtab;
                    }
                    resolve();
                });
            });
        };

        /**
         * Initialises eventlistener for the new tab replacement
         *
         * @returns {Promise}
         */
        let initEvents = async () => {
            chrome.tabs.onCreated.addListener((tab) => {
                if (tab.url && tab.url === 'chrome://newtab/') {
                    if (typeof config.override !== "undefined" && config.override === true) {
                        let func = "create";
                        if (tab.index === 0) {
                            func = "update";
                        } else {
                            chrome.tabs.remove(tab.id);
                        }

                        if (config.website && config.website.length > 0) {
                            overrideWithUrl(func);
                        } else {
                            overrideWithNewTabReplacement(func);
                        }
                    }
                }
            });
        };

        /**
         * Overrides the current tab with the new tab replacement,
         * removes the current tab and reopens it to prevent the cursor to focus the omnibox, but focus the search field
         *
         * @param {string} func
         */
        let overrideWithNewTabReplacement = (func) => {
            chrome.tabs[func]({
                url: chrome.extension.getURL('html/newtab.html'),
                active: true
            });
        };

        /**
         * Overrides the current tab with a redirection to the configured url
         *
         * @param {string} func
         */
        let overrideWithUrl = (func) => {
            chrome.tabs[func]({
                url: addParameterToUrl(config.website, "bs_nt", 1),
                active: true
            });
        };

        /**
         * Adds a parameter to the given url,
         * maintains existing querystring and anchors
         *
         * @param {string} url
         * @param {string} key
         * @param {string|int} value
         * @returns {string}
         */
        let addParameterToUrl = (url, key, value) => {
            let re = new RegExp("([?&])" + key + "=.*?(&|#|$)", "i");
            if (url.match(re)) {
                return url.replace(re, '$1' + key + "=" + value + '$2');
            } else {
                let hash = '';
                if (url.indexOf('#') !== -1) {
                    hash = url.replace(/.*#/, '#');
                    url = url.replace(/#.*/, '');
                }
                let separator = url.indexOf('?') !== -1 ? "&" : "?";
                return url + separator + key + "=" + value + hash;
            }
        }
    };

})(jsu);