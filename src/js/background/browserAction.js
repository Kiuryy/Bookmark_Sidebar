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
         * Initialises the eventhandler
         */
        let initEvents = () => {
            chrome.browserAction.onClicked.addListener(() => { // click on extension icon shall open the sidebar
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {

                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "toggleSidebar",
                        reinitialized: b.reinitialized
                    });

                    timeout = setTimeout(() => { // if the timeout is not getting cleared by the content script, the sidebar is not working -> show notification
                        showNotification(tabs[0]);
                    }, 750);
                });
            });

            chrome.notifications.onButtonClicked.addListener(openNotWorkingInfoPage);
            chrome.notifications.onClicked.addListener(openNotWorkingInfoPage);
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