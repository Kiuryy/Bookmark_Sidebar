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
            $.api.permissions.contains({
                permissions: ["tabs"]
            }, (result) => {
                if (result) { // user granted the 'tabs' permission -> reload all extension new tab pages
                    $.api.tabs.query({url: "chrome-extension://*/html/newtab.html"}, (tabs) => {
                        tabs.forEach((tab) => {
                            $.api.tabs.reload(tab.id);
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
                $.api.storage.sync.get(["newtab"], (obj) => {
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
            $.api.tabs.onCreated.addListener((tab) => {
                const url = tab.url || tab.pendingUrl;
                if (url && (url === b.helper.utility.getParsedUrl("chrome://newtab/") || url === b.helper.utility.getParsedUrl("chrome://startpage/"))) {
                    if (typeof config.override !== "undefined" && config.override === true) {
                        let url = $.api.extension.getURL("html/newtab.html");
                        if (config.website && config.website.length > 0) {
                            url = addParameterToUrl(config.website, "bs_nt", 1);
                        }

                        if (config.focusOmnibox || tab.index === 0) {
                            $.api.tabs.update(tab.id, {url: url, active: true});
                        } else {
                            $.api.tabs.remove(tab.id, () => {
                                $.api.runtime.lastError; // do nothing specific with the error -> is thrown if the tab with the id is already closed
                            });
                            $.api.tabs.create({url: url, active: true});
                        }
                    }
                }
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