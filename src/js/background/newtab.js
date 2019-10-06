($ => {
    "use strict";

    $.NewtabHelper = function (b) {

        let config = {};

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                this.updateConfig().then(() => {
                    initEvents();
                    resolve();
                });
            });
        };

        /**
         * Reloads all extension new tab pages,
         * only works, if the user granted the 'tabs' permission
         */
        this.reload = () => {
            chrome.permissions.contains({
                permissions: ["tabs"]
            }, (result) => {
                if (result) { // user granted the 'tabs' permission -> reload all extension new tab pages
                    chrome.tabs.query({url: "chrome-extension://*/html/newtab.html"}, (tabs) => {
                        tabs.forEach((tab) => {
                            chrome.tabs.reload(tab.id);
                        });
                    });
                }
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
        const initEvents = async () => {
            chrome.tabs.onCreated.addListener((tab) => {
                const url = tab.url || tab.pendingUrl;
                if (url && url === "chrome://newtab/") {
                    if (typeof config.override !== "undefined" && config.override === true) {
                        let func = "create";
                        if (tab.index === 0) {
                            func = "update";
                        } else {
                            chrome.tabs.remove(tab.id, () => {
                                chrome.runtime.lastError; // do nothing specific with the error -> is thrown if the tab with the id is already closed
                            });
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
        const overrideWithNewTabReplacement = (func) => {
            chrome.tabs[func]({
                url: chrome.extension.getURL("html/newtab.html"),
                active: true
            });
        };

        /**
         * Overrides the current tab with a redirection to the configured url
         *
         * @param {string} func
         */
        const overrideWithUrl = (func) => {
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
        const addParameterToUrl = (url, key, value) => {
            const re = new RegExp("([?&])" + key + "=.*?(&|#|$)", "i");
            if (url.match(re)) {
                return url.replace(re, "$1" + key + "=" + value + "$2");
            } else {
                let hash = "";
                if (url.indexOf("#") !== -1) {
                    hash = url.replace(/.*#/, "#");
                    url = url.replace(/#.*/, "");
                }
                const separator = url.indexOf("?") !== -1 ? "&" : "?";
                return url + separator + key + "=" + value + hash;
            }
        };
    };

})(jsu);