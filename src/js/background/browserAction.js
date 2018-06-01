($ => {
    "use strict";

    window.BrowserActionHelper = function (b) {

        let timeout = null;
        let reason = null;

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                initEvents();
                this.initContextmenus();
                resolve();
            });
        };

        /**
         * Adds a link to the changelog page in the browser action contextmenu,
         * Adds an entry to the page contextmenu which toggles the sidebar (like the extension icon)
         *
         * @returns {Promise}
         */
        this.initContextmenus = async () => {
            return new Promise((resolve) => {
                b.helper.language.getLangVars().then((info) => {
                    chrome.contextMenus.removeAll(() => {
                        chrome.contextMenus.create({
                            id: "bsChangelog",
                            title: info.vars.changelog_title.message,
                            contexts: ["browser_action"]
                        });

                        chrome.contextMenus.create({
                            id: "bsToggle",
                            title: b.manifest.name,
                            contexts: ["page"],
                            documentUrlPatterns: ["https://*/*", "http://*/*"]
                        });

                        chrome.contextMenus.onClicked.addListener((obj) => {
                            if (obj.menuItemId === "bsChangelog") {
                                chrome.tabs.create({url: chrome.extension.getURL("html/changelog.html")});
                            } else if (obj.menuItemId === "bsToggle") {
                                toggleSidebar();
                            }
                        });

                        resolve();
                    });
                });
            });
        };

        /**
         * Sets the state of the sidebar (blacklisted or notWhitelisted),
         * this is important to know, because the reason why the sidebar is not working are the user defined url rules
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.setReason = (opts) => {
            return new Promise((resolve) => {
                if (opts.reason) {
                    reason = opts.reason;
                }

                resolve();
            });
        };

        /**
         * Clears the timeout
         *
         * @returns {Promise}
         */
        this.clearTimeout = () => {
            return new Promise((resolve) => {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                resolve();
            });
        };

        /**
         * Checks the given url and returns the type if the page, if it's an url where the sidebar is not being loaded, otherwise NULL
         *
         * @param url
         * @returns {*}
         */
        let getNotWorkingPageInfo = (url) => {
            let ret = null;
            let found = false;
            let types = {
                new_tab: ["chrome://newtab/"],
                system: ["chrome://", "about:blank"],
                extension_page: ["chrome\-extension://"],
                webstore: ["https?://chrome\.google\.com/webstore/"]
            };

            Object.keys(types).some((key) => {
                types[key].some((str) => {
                    if (url.search(new RegExp(str, "gi")) === 0) {
                        ret = key;
                        found = true;
                        return true;
                    }
                });
                if (found) {
                    return true;
                }
            });

            return ret;
        };

        /**
         * Opens the new tab page with a parameter to tell the page, why the sidebar could not be loaded on the actual tab
         *
         * @param {object} tab
         */
        let showFallbackPage = (tab) => {
            let type = "fallback";

            if (reason) { // the content script set a reason why the sidebar is not opening (e.g. blacklisted/not whitelisted url)
                type = reason;
                reason = null;
            } else if (tab && tab.url) { // check whether the user tries to open the sidebar on urls where the sidebar is not working
                let pageType = getNotWorkingPageInfo(tab.url);

                if (pageType) {
                    type = pageType;
                }
            }

            chrome.tabs.create({url: chrome.extension.getURL("html/newtab.html") + "?type=" + type});
        };

        /**
         * Initialises the eventhandler for the extension icon and the notification button
         *
         * @returns {Promise}
         */
        let initEvents = async () => {
            chrome.browserAction.onClicked.removeListener(toggleSidebar);
            chrome.browserAction.onClicked.addListener(toggleSidebar); // click on extension icon shall toggle the sidebar
        };

        /**
         * Sends a message to the currently active tab and tell it to toggle the sidebar
         */
        let toggleSidebar = () => {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "toggleSidebar",
                    reinitialized: b.reinitialized
                });

                let delay = 700;
                if (tabs[0] && tabs[0].url) { // don't delay if the page is a known url where the sidebar is not being loaded
                    let pageType = getNotWorkingPageInfo(tabs[0].url);
                    if (pageType) {
                        delay = 0;
                    }
                }

                timeout = setTimeout(() => { // if the timeout is not getting cleared by the content script, the sidebar is not working -> show notification
                    showFallbackPage(tabs[0]);
                }, delay);
            });
        };
    };

})(jsu);