($ => {
    "use strict";

    $.BrowserActionHelper = function (b) {

        let timeout = null;
        let sidepanelLastReload = 0;
        let reason = null;

        /**
         * Determines what a click on the extension icon does, based on the configured mode:
         * overlay -> toggles the sidebar in the overlay of the current tab (see toggleSidebar), sidepanel and both -> opens the sidebar in the side panel,
         * called again whenever the settings are saved (reloadBrowserAction)
         *
         * @returns {Promise}
         */
        this.init = async () => {
            if ($.api.sidePanel) {
                const config = await $.api.storage.sync.get(["behaviour"]);
                const mode = (config && config.behaviour && config.behaviour.mode) || "sidepanel";

                // with openPanelOnActionClick the browser opens the side panel itself and action.onClicked is not fired, otherwise toggleSidebar is called
                await $.api.sidePanel.setPanelBehavior({openPanelOnActionClick: mode !== "overlay"});
            }

            await this.initContextmenus();
        };

        /**
         * Adds links to the settings, the knowledgebase and the changelog in the browser action contextmenu
         *
         * @returns {Promise}
         */
        this.initContextmenus = async () => {
            const lang = await b.helper.language.getLangVars();
            await $.api.contextMenus.removeAll();

            const uid = Math.random().toString(36).substring(2, 14);

            $.api.contextMenus.create({
                id: "bsSettings_" + uid,
                title: lang.vars.settings_title.message,
                contexts: ["action"]
            });

            $.api.contextMenus.create({
                id: "bsKnowledgebase_" + uid,
                title: lang.vars.settings_knowledgebase.message,
                contexts: ["action"]
            });

            $.api.contextMenus.create({
                id: "bsChangelog_" + uid,
                title: lang.vars.settings_info_changelog.message,
                contexts: ["action"]
            });

            $.api.contextMenus.onClicked.addListener((obj) => {
                if (obj.menuItemId === "bsSettings_" + uid) {
                    b.helper.utility.openLink({
                        href: $.api.runtime.getURL("html/settings.html"),
                        newTab: true
                    });
                } else if (obj.menuItemId === "bsKnowledgebase_" + uid) {
                    b.helper.utility.openLink({
                        href: $.opts.website.knowledgebase.overview,
                        newTab: true
                    });
                } else if (obj.menuItemId === "bsChangelog_" + uid) {
                    b.helper.utility.openLink({
                        hrefName: "changelog",
                        newTab: true,
                        params: {lang: b.helper.language.getUILanguage()}
                    });
                }
            });
        };

        /**
         * Sets the state of the sidebar (blacklisted or notWhitelisted),
         * this is important to know, because the reason why the sidebar is not working are the user defined url rules
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.setReason = async (opts) => {
            if (opts.reason) {
                reason = opts.reason;
            }
        };

        /**
         * Clears the timeout
         *
         * @returns {Promise}
         */
        this.clearTimeout = async () => {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
        };

        /**
         * Reloads the sidebar in the sidepanel by updating the url with an uid query string
         *
         * @returns {Promise<void>}
         */
        this.reloadSidepanel = async () => {
            const now = +new Date();
            if (now - sidepanelLastReload > 1000 && $.api.sidePanel) {
                sidepanelLastReload = now;
                await $.api.sidePanel.setOptions({
                    path: "html/sidepanel.html?uid=" + Math.random().toString(36).substring(2, 14),
                });
            }
        };

        /**
         * Sends a message to the currently active tab and tell it to toggle the sidebar
         *
         * @returns {Promise<void>}
         */
        this.toggleSidebar = async () => {
            const tabs = await $.api.tabs.query({active: true, currentWindow: true});

            if (tabs && tabs.length > 0) {
                const currrentTab = tabs[0];
                const url = currrentTab.url || "";

                $.api.tabs.sendMessage(currrentTab.id, {
                    action: "toggleSidebar",
                    reinitialized: b.reinitialized
                })["catch"](() => {
                    // cannot send message to tab
                });

                // only show fallback info when not already on the custom new tab page
                if (!url.includes($.api.runtime.getURL("html/newtab.html"))) {
                    const pageType = getNotWorkingPageInfo(url);
                    const ownPage = url.startsWith($.api.runtime.getURL("")); // pages of the extension itself can load the sidebar (e.g. the onboarding page), so they get the chance to clear the timeout
                    const delay = pageType && !ownPage ? 0 : 700; // don't delay if the page is a known url where the sidebar is not being loaded

                    timeout = setTimeout(() => { // if the timeout is not getting cleared by the content script, the sidebar is not working -> show notification
                        showFallbackPage(tabs[0]);
                    }, delay);
                }
            }
        };

        /**
         * Checks the given url and returns the type if the page, if it's an url where the sidebar is not being loaded, otherwise NULL
         *
         * @param url
         * @returns {*}
         */
        const getNotWorkingPageInfo = (url = "") => {
            let ret = null;
            let found = false;
            const types = {
                new_tab: [b.helper.utility.getParsedUrl("chrome://newtab/")],
                system: ["chrome://", "edge://", "about:blank"],
                extension_page: ["chrome\-extension://", "extension://"],
                webstore: ["https?://chrome\.google\.com/webstore/"]
            };

            Object.keys(types).some((key) => {
                types[key].some((str) => {
                    if (url && url.search(new RegExp(str, "gi")) === 0) {
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
        const showFallbackPage = (tab) => {
            let type = "fallback";

            if (reason) { // the content script set a reason why the sidebar is not opening (e.g. blacklisted/not whitelisted url)
                type = reason;
                reason = null;
            } else if (tab && tab.url) { // check whether the user tries to open the sidebar on urls where the sidebar is not working
                const pageType = getNotWorkingPageInfo(tab.url);

                if (pageType) {
                    type = pageType;
                }
            }

            b.helper.utility.openLink({
                href: $.api.runtime.getURL("html/newtab.html"),
                newTab: true,
                params: {type: type}
            });
        };

    };

})(jsu);