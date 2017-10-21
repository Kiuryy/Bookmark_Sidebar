($ => {
    "use strict";

    let background = function () {
        this.importRunning = false;
        this.manifest = chrome.runtime.getManifest();

        this.urls = {
            website: "https://extensions.blockbyte.de/",
            checkStatus: "https://extensions.blockbyte.de/ajax/status/bs",
            checkUrls: "https://4v1.de/u",
            uninstall: "https://extensions.blockbyte.de/uninstall/bs",
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
                    this.helper.cache.remove({name: "html"})
                ]).then(() => {
                    chrome.tabs.query({}, (tabs) => {
                        tabs.forEach((tab, i) => {
                            let delay = tab.active ? 0 : ((i * 100) + 1000); // stagger the reload event for all tabs which are not currently visible

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
                    this.helper.cache.remove({name: "html"})
                ]).then(() => {
                    chrome.tabs.query({}, (tabs) => {
                        tabs.forEach((tab, i) => {
                            if (typeof tab.url === "undefined" || (!tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://"))) {
                                let delay = tab.active ? 0 : ((i * 200) + 1000); // stagger script injection for all tabs which are not currently visible

                                $.delay(delay).then(() => {
                                    Object.entries(types).forEach(([type, func]) => {
                                        let files = this.manifest.content_scripts[0][type];

                                        files.forEach((file) => {
                                            chrome.tabs[func](tab.id, {file: file}, () => {
                                                chrome.runtime.lastError; // do nothing specific with the error -> is thrown if the tab cannot be accessed (like chrome:// urls)
                                            });
                                        });
                                    });
                                });
                            }
                        });

                        resolve();
                    });
                });
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
                this.reload({type: "Created"});
            });

            ["Changed", "Created", "Removed"].forEach((eventName) => { // trigger an event in all tabs after changing/creating/removing a bookmark
                chrome.bookmarks["on" + eventName].addListener(() => {
                    if (this.importRunning === false) { // don't refresh while import in running
                        this.reload({type: eventName});
                    }
                });
            });

            ["Moved", "ChildrenReordered"].forEach((eventName) => { // deleted the html cache after moving a bookmark
                chrome.bookmarks["on" + eventName].addListener(() => {
                    this.helper.cache.remove({name: "html"});
                });
            });
        };

        /**
         * Initialises the helper objects
         */
        let initHelpers = () => {
            this.helper = {
                model: new window.ModelHelper(this),
                bookmarkApi: new window.BookmarkApi(this),
                language: new window.LanguageHelper(this),
                upgrade: new window.UpgradeHelper(this),
                viewAmount: new window.ViewAmountHelper(this),
                newtab: new window.NewtabHelper(this),
                image: new window.ImageHelper(this),
                port: new window.PortHelper(this),
                icon: new window.IconHelper(this),
                browserAction: new window.BrowserActionHelper(this),
                cache: new window.CacheHelper(this),
                analytics: new window.AnalyticsHelper(this)
            };
        };

        /**
         *
         */
        this.run = () => {
            let start = +new Date();
            this.isDev = this.manifest.version_name === "Dev" || !('update_url' in this.manifest);

            chrome.runtime.setUninstallURL(this.urls[this.isDev ? "website" : "uninstall"]);
            initHelpers();

            Promise.all([
                this.helper.model.init(),
                this.helper.language.init(),
                this.helper.icon.init(),
                this.helper.analytics.init(),
                this.helper.browserAction.init(),
                this.helper.bookmarkApi.init()
            ]).then(() => {
                return Promise.all([
                    initEvents(),
                    this.helper.newtab.init(),
                    this.helper.image.init(),
                    this.helper.port.init(),
                    this.helper.upgrade.init()
                ]);
            }).then(() => {
                if (this.isDev) {
                    console.log("LOADED", +new Date() - start);
                }
            });
        };
    };

    new background().run();
})(jsu);