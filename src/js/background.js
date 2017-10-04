($ => {
    "use strict";

    let background = function () {
        let bookmarkImportRunning = false;

        this.urls = {
            checkStatus: "https://extensions.blockbyte.de/",
            checkUrls: "https://4v1.de/u",
            uninstall: "https://extensions.blockbyte.de/bs/uninstall",
            thumbnail: "https://4v1.de/t"
        };

        this.dev = false;
        let reinitialized = null;

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
                        tabs.forEach((tab) => {
                            chrome.tabs.sendMessage(tab.id, {
                                action: "reload",
                                scrollTop: opts.scrollTop || false,
                                reinitialized: reinitialized,
                                type: opts.type
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
                let manifest = chrome.runtime.getManifest();
                reinitialized = +new Date();

                let types = {
                    css: "insertCSS",
                    js: "executeScript"
                };

                Promise.all([
                    this.helper.newtab.updateConfig(),
                    this.helper.cache.remove({name: "html"})
                ]).then(() => {
                    chrome.tabs.query({}, (tabs) => {
                        tabs.forEach((tab) => {
                            if (typeof tab.url === "undefined" || (!tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://"))) {
                                Object.entries(types).forEach(([type, func]) => {
                                    let files = manifest.content_scripts[0][type];

                                    files.forEach((file) => {
                                        chrome.tabs[func](tab.id, {file: file}, function () {
                                            chrome.runtime.lastError; // do nothing specific with the error -> is thrown if the tab cannot be accessed (like chrome:// urls)
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
            chrome.browserAction.onClicked.addListener(() => { // click on extension icon shall open the sidebar
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {action: "toggleSidebar"});
                });
            });

            chrome.bookmarks.onImportBegan.addListener(() => { // indicate that the import process started
                bookmarkImportRunning = true;
            });

            chrome.bookmarks.onImportEnded.addListener(() => { // indicate that the import process finished
                bookmarkImportRunning = false;
                this.reload({type: "Created"});
            });

            ["Changed", "Created", "Removed"].forEach((eventName) => { // trigger an event in all tabs after changing/creating/removing a bookmark
                chrome.bookmarks["on" + eventName].addListener(() => {
                    if (bookmarkImportRunning === false || eventName !== "Created") { // only refresh tabs when the bookmark was not created by the import process
                        this.reload({type: eventName});
                    }
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
                cache: new window.CacheHelper(this),
                analytics: new window.AnalyticsHelper(this)
            };
        };

        /**
         *
         */
        this.run = () => {
            let manifest = chrome.runtime.getManifest();
            this.isDev = manifest.version_name === "Dev" || !('update_url' in manifest);

            chrome.runtime.setUninstallURL(this.urls[this.isDev ? "checkStatus" : "uninstall"]);

            initHelpers();
            let start = +new Date();

            Promise.all([
                this.helper.model.init(),
                this.helper.icon.init(),
                this.helper.newtab.init(),
                this.helper.analytics.init(),
                this.helper.image.init(),
                this.helper.bookmarkApi.init()
            ]).then(() => {
                return Promise.all([
                    initEvents(),
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