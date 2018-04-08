($ => {
    "use strict";

    window.BrowserActionHelper = function (b) {

        let timeout = null;
        let reason = null;
        let type = "unknown";

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                initEvents();
                initContextmenus();
                resolve();
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
         * Shows a notification why the sidebar could not be opened
         *
         * @param {object} tab
         */
        let showNotification = (tab) => {
            let canvas = document.createElement("canvas");
            let size = 128;

            canvas.width = size;
            canvas.height = size;
            let ctx = canvas.getContext("2d");

            b.helper.icon.getInfo().then((result) => {
                return Promise.all([
                    b.helper.language.getLangVars(),
                    b.helper.icon.getSvgImage(result.name, "#555555")
                ]);
            }).then(([info, svg]) => {
                let img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, size / 4, size / 4, size / 2, size / 2);

                    let texts = getNotificationText(tab.url);

                    chrome.notifications.create("browserAction", {
                        type: "basic",
                        title: info.vars[texts.title].message,//"Sidebar could not be opened",
                        message: info.vars[texts.desc].message,//"On the Chrome Webstore and the New Tab page the sidebar is not working.",
                        isClickable: true,
                        buttons: [{
                            title: info.vars[texts.link].message
                        }],
                        iconUrl: canvas.toDataURL()
                    });
                };
                img.src = svg;
            });
        };

        /**
         * Returns the language variable names for the notification why the sidebar is not working for the given url
         *
         * @param {string} url
         * @returns {object}
         */
        let getNotificationText = (url) => {
            type = "unknown";

            let ret = {
                title: "notification_sidebar_not_working_headline",
                link: "notification_sidebar_not_working_link",
                desc: "notification_sidebar_not_working_general"
            };

            if (reason) { // the sidebar is not working because it's blacklisted for the current url (or not whitelisted)

                if (reason === "blacklisted") {
                    ret.desc = "notification_sidebar_blacklisted";
                    type = "filter";
                } else if (reason === "notWhitelisted") {
                    ret.desc = "notification_sidebar_not_whitelisted";
                    type = "filter";
                }

                reason = null;
            } else if (url) { // check whether the user tries to open the sidebar on urls where the sidebar is not working
                ret.desc = "notification_sidebar_not_working_unknown";

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
                            type = key;
                            ret.desc = "notification_sidebar_not_working_" + key;
                            found = true;
                            return true;
                        }
                    });
                    if (found) {
                        return true;
                    }
                });
            }

            return ret;
        };

        /**
         * Adds a link to the changelog page in the browser action contextmenu,
         * Adds an entry to the page contextmenu which toggles the sidebar (like the extension icon)
         *
         * @returns {Promise}
         */
        let initContextmenus = async () => {
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
                });
            });
        };

        /**
         * Initialises the eventhandler for the extension icon and the notification button
         *
         * @returns {Promise}
         */
        let initEvents = async () => {
            chrome.browserAction.onClicked.removeListener(toggleSidebar);
            chrome.browserAction.onClicked.addListener(toggleSidebar); // click on extension icon shall toggle the sidebar
            chrome.notifications.onButtonClicked.addListener(openNotWorkingInfoPage);
            chrome.notifications.onClicked.addListener(openNotWorkingInfoPage);
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

                timeout = setTimeout(() => { // if the timeout is not getting cleared by the content script, the sidebar is not working -> show notification
                    showNotification(tabs[0]);
                }, 750);
            });
        };

        /**
         * Opens an info page depending on the reason why the sidebar could not be opened
         */
        let openNotWorkingInfoPage = () => {
            let url = "html/settings.html#feedback_error_general";

            if (type === "new_tab") {
                url = "html/settings.html#newtab";
            } else if (type === "filter") {
                url = "html/settings.html#feedback_error_filter";
            }

            chrome.tabs.create({url: chrome.extension.getURL(url)});
            chrome.notifications.clear("browserAction");
        };
    };

})(jsu);