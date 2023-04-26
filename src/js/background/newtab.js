($ => {
    "use strict";

    $.NewtabHelper = function (b) {

        const newtabUrl = $.api.runtime.getURL("html/newtab.html");
        let inited = false;
        let config = {};

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            await this.updateConfig();
            inited = true;
        };

        /**
         * Reloads all extension new tab pages,
         * only works, if the user granted the 'tabs' permission
         */
        this.reload = async () => {
            const result = await $.api.permissions.contains({permissions: ["tabs"]});
            if (result) { // user granted the 'tabs' permission -> reload all extension new tab pages
                const tabs = await $.api.tabs.query({url: newtabUrl});
                for (const tab of tabs) {
                    $.api.tabs.reload(tab.id);
                }
            }
        };

        /**
         * Retrieves the configuration about the new tab replacement from the storage
         */
        this.updateConfig = async () => {
            const obj = await $.api.storage.sync.get(["newtab"]);
            if (typeof obj.newtab === "undefined") {
                config = {};
            } else {
                config = obj.newtab;
            }
        };

        /**
         * Handle tab creation event
         */
        this.onTabCreated = (tab, retry = 0) => {
            if (!inited) { // not initialized yet -> try again
                if (retry < 200) {
                    setTimeout(() => {
                        this.onTabCreated(tab, retry + 1);
                    }, 5);
                } else {
                    console.error("Failed to handle tab creation");
                }
                return;
            }

            if (typeof config.override === "undefined" || !config.override) {
                return;
            }

            const tabUrl = tab.url || tab.pendingUrl;
            if (tabUrl && (tabUrl === b.helper.utility.getParsedUrl("chrome://newtab/") || tabUrl === b.helper.utility.getParsedUrl("chrome://startpage/"))) {
                let url = newtabUrl;
                if (config.website && config.website.length > 0) {
                    url = addParameterToUrl(config.website, "bs_nt", 1);
                }

                if (config.focusOmnibox || tab.index === 0) {
                    updateTab(tab.id, url);
                } else {
                    $.api.tabs.remove(tab.id, () => {
                        $.api.runtime.lastError; // do nothing specific with the error -> is thrown if the tab with the id is already closed
                    });
                    $.api.tabs.create({url: url, active: true});
                }
            }
        };

        /**
         * Load the given url for the given tab
         *
         * @param tabId
         * @param url
         * @param retry
         */
        const updateTab = (tabId, url, retry = 0) => {
            $.api.tabs.update(tabId, {url: url, active: true}, async () => {
                const tab = await $.api.tabs.get(tabId);
                const actualUrl = tab.pendingUrl || tab.url;
                if (!actualUrl || !actualUrl.startsWith(url)) {
                    // workaround since mv3 (for some reason) does not always update the url
                    if (retry < 200) {
                        setTimeout(() => {
                            updateTab(tabId, url, retry + 1);
                        }, 20);
                    } else {
                        console.error("Failed to override new tab");
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