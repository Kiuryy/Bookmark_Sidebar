($ => {
    "use strict";

    let background = function () {
        this.importRunning = false;
        this.preventReload = false;
        this.manifest = chrome.runtime.getManifest();

        this.urls = {
            website: "https://extensions.blockbyte.de/",
            checkStatus: "https://extensions.blockbyte.de/ajax/status/bs",
            uninstall: "https://extensions.blockbyte.de/uninstall/bs",
            checkUrls: "https://4v1.de/u",
            thumbnail: "https://4v1.de/t"
        };

        this.isDev = false;
        this.reinitialized = null;

        /**
         * Sends a message to all tabs, so they are reloading the sidebar
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.reload = (opts) => {
            return new Promise((resolve) => {
                Promise.all([
                    this.helper.newtab.updateConfig(),
                    this.helper.cache.remove({name: "htmlList"}),
                    this.helper.cache.remove({name: "htmlPinnedEntries"})
                ]).then(() => {
                    chrome.tabs.query({}, (tabs) => {
                        tabs.forEach((tab, i) => {
                            let delay = tab.active ? 0 : (i * 100); // stagger the reload event for all tabs which are not currently visible

                            $.delay(delay).then(() => {
                                chrome.tabs.sendMessage(tab.id, {
                                    action: "reload",
                                    scrollTop: opts.scrollTop || false,
                                    reinitialized: this.reinitialized,
                                    type: opts.type
                                });
                            });
                        });

                        resolve();
                    });
                });
            });
        };

        /**
         * Injects the content scripts to all tabs and because of this runs the extension there again
         */
        this.reinitialize = () => {
            return new Promise((resolve) => {
                this.reinitialized = +new Date();

                let types = {
                    css: "insertCSS",
                    js: "executeScript"
                };

                Promise.all([
                    this.helper.newtab.updateConfig(),
                    this.helper.language.init(),
                    this.helper.cache.remove({name: "htmlList"}),
                    this.helper.cache.remove({name: "htmlPinnedEntries"})
                ]).then(() => {
                    chrome.tabs.query({}, (tabs) => {
                        tabs.forEach((tab, i) => {
                            if (typeof tab.url === "undefined" || (!tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://"))) {
                                let delay = tab.active ? 0 : (i * 100); // stagger script injection for all tabs which are not currently visible

                                $.delay(delay).then(() => {
                                    Object.entries(types).forEach(([type, func]) => {
                                        let files = this.manifest.content_scripts[0][type];
                                        let failed = false;

                                        files.forEach((file) => {
                                            chrome.tabs[func](tab.id, {file: file}, () => {
                                                let error = chrome.runtime.lastError; // do nothing specific with the error -> is thrown if the tab cannot be accessed (like chrome:// urls)
                                                if (error && error.message && failed === false) { // send a notification instead to let the page deal with it
                                                    failed = true;
                                                    notifyReinitialization(tab.id);
                                                }
                                            });
                                        });
                                    });
                                });
                            } else { // send a notification instead of loading the scripts to let the page deal with the reinitialization
                                notifyReinitialization(tab.id);
                            }
                        });

                        resolve();
                    });
                });
            });
        };

        /**
         * Sends a message to the given tab to notify it that a reinitialization needs to be performed,
         * will be called if script injection failed (like on the newtab replacement page)
         *
         * @param {int} tabId
         */
        let notifyReinitialization = (tabId) => {
            chrome.tabs.sendMessage(tabId, {
                action: "reinitialize"
            });
        };

        /**
         * Initialises the eventhandlers
         *
         * @returns {Promise}
         */
        let initEvents = async () => {
            chrome.bookmarks.onImportBegan.addListener(() => { // indicate that the import process started
                this.importRunning = true;
            });

            chrome.bookmarks.onImportEnded.addListener(() => { // indicate that the import process finished
                this.importRunning = false;
                $.delay(1000).then(() => {
                    this.reload({type: "Created"});
                });
            });

            ["Changed", "Created", "Removed"].forEach((eventName) => { // trigger an event in all tabs after changing/creating/removing a bookmark
                chrome.bookmarks["on" + eventName].addListener(() => {
                    if (this.importRunning === false && this.preventReload === false) { // don't reload sidebar while import in running
                        this.reload({type: eventName});
                    }
                });
            });

            ["Moved", "ChildrenReordered"].forEach((eventName) => { // deleted the html cache after moving a bookmark
                chrome.bookmarks["on" + eventName].addListener(() => {
                    Promise.all([
                        this.helper.cache.remove({name: "htmlList"}),
                        this.helper.cache.remove({name: "htmlPinnedEntries"})
                    ]);
                });
            });
        };

        /**
         * Initialises the helper objects
         */
        let initHelpers = () => {
            this.helper = {
                model: new $.ModelHelper(this),
                bookmarkApi: new $.BookmarkApi(this),
                language: new $.LanguageHelper(this),
                upgrade: new $.UpgradeHelper(this),
                viewAmount: new $.ViewAmountHelper(this),
                newtab: new $.NewtabHelper(this),
                image: new $.ImageHelper(this),
                port: new $.PortHelper(this),
                icon: new $.IconHelper(this),
                browserAction: new $.BrowserActionHelper(this),
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
        let callOnInstalledCallback = (details, i = 0) => {
            if (this.helper && this.helper.upgrade && this.helper.upgrade.loaded) {
                if (details.reason === "install") { // extension was installed
                    this.helper.upgrade.onInstalled(details);
                } else if (details.reason === "update") { // extension was updated
                    this.helper.upgrade.onUpdated(details);
                }
            } else if (i < 100) {
                $.delay(500).then(() => {
                    callOnInstalledCallback(details, i + 1);
                });
            }
        };

        /**
         *
         */
        this.run = () => {
            let start = +new Date();
            this.isDev = this.manifest.version_name === "Dev" || !("update_url" in this.manifest);

            chrome.runtime.onInstalled.addListener((details) => {
                callOnInstalledCallback(details);
            });

            chrome.runtime.setUninstallURL(this.urls[this.isDev ? "website" : "uninstall"]);

            initHelpers();

            Promise.all([
                this.helper.model.init(),
                this.helper.language.init(),
                this.helper.analytics.init(),
                this.helper.bookmarkApi.init()
            ]).then(() => {
                return this.helper.icon.init();
            }).then(() => {
                return Promise.all([
                    initEvents(),
                    this.helper.browserAction.init(),
                    this.helper.newtab.init(),
                    this.helper.image.init(),
                    this.helper.port.init(),
                    this.helper.upgrade.init()
                ]);
            }).then(() => {
                if (this.isDev && console && console.log) {
                    console.log("Finished loading background script", +new Date() - start);
                }
            });
        };
    };

    new background().run();
})(jsu);