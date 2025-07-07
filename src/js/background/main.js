($ => {
    "use strict";

    $.Background = function () {
        this.importRunning = false;
        this.preventReload = false;
        this.reinitialized = null;

        /**
         * Sends a message to all tabs, so they are reloading the sidebar
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.reload = async (opts) => {
            await Promise.all([
                this.helper.cache.remove({name: "htmlList"}),
                this.helper.cache.remove({name: "htmlPinnedEntries"})
            ]);

            this.helper.browserAction.reloadSidepanel();
            const tabs = await $.api.tabs.query({});
            for (const tab of tabs) {
                await $.delay(70);
                await $.api.tabs.sendMessage(tab.id, {
                    action: "reload",
                    scrollTop: opts.scrollTop || false,
                    reinitialized: this.reinitialized,
                    type: opts.type
                })["catch"](() => {
                    // cannot send message to tab which is okay (e.g. chrome:// urls)
                });
            }
        };

        /**
         * Injects the content scripts to all tabs and because of this runs the extension there again
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.reinitialize = async (opts = {}) => {
            this.reinitialized = +new Date();

            await this.helper.language.init();
            await this.helper.cache.remove({name: "htmlList"});
            await this.helper.cache.remove({name: "htmlPinnedEntries"});

            const injectFuncs = {
                css: "insertCSS",
                js: "executeScript"
            };

            let type = null;
            if (opts && opts.type) {
                type = opts.type;
            }

            this.helper.browserAction.reloadSidepanel();
            const tabs = await $.api.tabs.query({});
            for (const tab of tabs) {
                if (typeof tab.url === "undefined" || tab.url.startsWith("http://") || tab.url.startsWith("https://") || tab.url.startsWith("file://")) {
                    await $.delay(70);

                    Object.entries(injectFuncs).forEach(([fileType, func]) => {
                        const files = $.opts.manifest.content_scripts[0][fileType];

                        $.api.scripting[func]({
                            target: {tabId: tab.id},
                            files: files
                        })["catch"](() => { // send a notification instead to let the page deal with it
                            notifyReinitialization(tab.id, type);
                        });
                    });
                } else { // send a notification instead of loading the scripts to let the page deal with the reinitialization
                    notifyReinitialization(tab.id, type);
                }
            }
        };

        /**
         * Sends a message to the given tab to notify it that a reinitialization needs to be performed,
         * will be called if script injection failed (like on the newtab replacement page)
         *
         * @param {int} tabId
         * @param {string} type
         */
        const notifyReinitialization = (tabId, type) => {
            this.helper.browserAction.reloadSidepanel();
            $.api.tabs.sendMessage(tabId, {
                action: "reinitialize",
                type: type
            })["catch"](() => {
                // cannot send message to tab
            });
        };

        /**
         * Initialises the eventhandlers
         */
        const initEvents = () => {
            $.api.runtime.onInstalled.addListener((details) => {
                callOnInstalledCallback(details);
            });

            $.api.runtime.setUninstallURL($.opts.website.info[$.isDev ? "landing" : "uninstall"]);

            $.api.action.onClicked.addListener(this.helper.browserAction.toggleSidebar);

            if ($.api.bookmarks.onImportBegan && $.api.bookmarks.onImportEnded) {
                $.api.bookmarks.onImportBegan.addListener(() => { // indicate that the import process started
                    this.importRunning = true;
                });
                $.api.bookmarks.onImportEnded.addListener(() => { // indicate that the import process finished
                    this.importRunning = false;
                });
            }

            ["Changed", "Created", "Removed"].forEach((eventName) => { // trigger an event in all tabs after changing/creating/removing a bookmark
                if ($.api.bookmarks["on" + eventName]) {
                    $.api.bookmarks["on" + eventName].addListener((id) => {
                        this.helper.viewAmount.increaseById(id, 0);
                        if (this.importRunning === false && this.preventReload === false) { // don't reload sidebar while import in running
                            this.reload({type: eventName});
                        }
                    });
                }
            });

            ["Moved", "ChildrenReordered"].forEach((eventName) => { // deleted the html cache after moving a bookmark
                if ($.api.bookmarks["on" + eventName]) {
                    $.api.bookmarks["on" + eventName].addListener(() => {
                        Promise.all([
                            this.helper.cache.remove({name: "htmlList"}),
                            this.helper.cache.remove({name: "htmlPinnedEntries"})
                        ]);
                    });
                }
            });
        };

        /**
         * Initialises the helper objects
         */
        const initHelpers = () => {
            this.helper = {
                model: new $.ModelHelper(this),
                bookmarks: new $.Bookmarks(this),
                language: new $.LanguageHelper(this),
                upgrade: new $.UpgradeHelper(this),
                viewAmount: new $.ViewAmountHelper(this),
                message: new $.MessageHelper(this),
                icon: new $.IconHelper(this),
                browserAction: new $.BrowserActionHelper(this),
                utility: new $.UtilityHelper(this),
                linkchecker: new $.Linkchecker(this),
                cache: new $.CacheHelper(this),
                analytics: new $.AnalyticsHelper(this)
            };
        };

        /**
         * Calls the according method of the upgrade helper after installing or updating the extension,
         * waits 500ms if the helper is not initialized yet and calls itself again
         *
         * @param {object} details
         * @param {int} i
         */
        const callOnInstalledCallback = (details, i = 0) => {
            if (this.helper && this.helper.upgrade && this.helper.upgrade.loaded) {
                if (details.reason === "install") { // extension was installed
                    this.helper.upgrade.onInstalled(details);
                } else if (details.reason === "update") { // extension was updated
                    this.helper.upgrade.onUpdated(details);
                }
            } else if (i < 100) {
                setTimeout(() => {
                    callOnInstalledCallback(details, i + 1);
                }, 500);
            }
        };

        /**
         *  Workaround to keep service worker alive.
         *  This prevents the new tab override to fail or flicker due to slow wake up of the service worker
         *  https://stackoverflow.com/a/66618269/1660305
         */
        const keepalive = async () => {
            const onMessage = (msg, port) => {
                // eslint-disable-next-line no-console
                console.log("keepalive message: ", msg, port.sender);
            };

            const deleteTimer = (port) => {
                if (port._timer) {
                    clearTimeout(port._timer);
                    delete port._timer;
                }
            };

            const forceReconnect = (port) => {
                deleteTimer(port);
                port.disconnect();
            };

            $.api.runtime.onConnect.addListener((port) => {
                if (port.name !== "keepalive") {
                    return;
                }
                port.onMessage.addListener(onMessage);
                port.onDisconnect.addListener(deleteTimer);
                // force reconnect after 250s. After 300s the browser would terminate the connection by itself
                port._timer = setTimeout(forceReconnect, 250 * 100, port);
            });
        };

        /**
         *
         */
        this.run = async () => {
            const start = +new Date();

            initHelpers();
            initEvents();
            keepalive();

            await this.helper.model.init();
            await this.helper.language.init();
            await this.helper.analytics.init();
            await this.helper.icon.init();
            await this.helper.browserAction.init();
            await this.helper.message.init();
            await this.helper.upgrade.init();

            await this.helper.analytics.trackUserData();

            const rnd = Math.floor(Math.random() * 100) + 1;
            if (rnd === 1) { // check if the license key is valid and if not, remove it from the sync storage (only perform this check for every x-th reload of the background script)
                const responseKey = await this.helper.model.getLicenseKey();
                if (responseKey.licenseKey) {
                    const responseCheck = await this.helper.utility.checkLicenseKey(responseKey.licenseKey);

                    if (responseCheck.valid === false) {
                        await this.helper.model.setLicenseKey(null);
                    }
                }
            }

            /* eslint-disable no-console */
            if ($.isDev && console && console.info) {
                console.info("Finished loading background script", +new Date() - start);
            }
        };
    };

})(jsu);