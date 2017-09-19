($ => {
    "use strict";

    $.api = $.api || window.browser || window.chrome;

    let background = function () {
        let bookmarkImportRunning = false;

        this.urls = {
            check404: "https://extensions.blockbyte.de/",
            updateUrls: "https://extensions.blockbyte.de/ajax/updateUrls",
            uninstall: "https://extensions.blockbyte.de/bs/uninstall"
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
                    this.helper.cache.remove({name: "html"}),
                    this.helper.entries.update()
                ]).then(() => {
                    $.api.tabs.query({}, (tabs) => {
                        tabs.forEach((tab) => {
                            $.api.tabs.sendMessage(tab.id, {
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
            let manifest = $.api.runtime.getManifest();
            reinitialized = +new Date();

            let types = {
                css: "insertCSS",
                js: "executeScript"
            };

            $.api.tabs.query({}, (tabs) => {
                tabs.forEach((tab) => {
                    Object.entries(types).forEach(([type, func]) => {
                        let files = manifest.content_scripts[0][type];

                        files.forEach((file) => {
                            $.api.tabs[func](tab.id, {file: file}, function () {
                                let lastError = $.api.runtime.lastError;
                                console.log(lastError);
                            });
                        });
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
            $.api.browserAction.onClicked.addListener(() => { // click on extension icon shall open the sidebar
                $.api.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    $.api.tabs.sendMessage(tabs[0].id, {action: "toggleSidebar"});
                });
            });

            $.api.bookmarks.onImportBegan.addListener(() => { // indicate that the import process started
                bookmarkImportRunning = true;
            });

            $.api.bookmarks.onImportEnded.addListener(() => { // indicate that the import process finished
                bookmarkImportRunning = false;
                this.reload({type: "Created"});
            });

            ["Changed", "Created", "Removed"].forEach((eventName) => { // trigger an event in all tabs after changing/creating/removing a bookmark
                $.api.bookmarks["on" + eventName].addListener(() => {
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
                entries: new window.EntriesHelper(this),
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
            let manifest = $.api.runtime.getManifest();
            this.isDev = manifest.version_name === "Dev" || !('update_url' in manifest);

            if (this.isDev === false) {
                $.api.runtime.setUninstallURL(this.urls.uninstall);
            }

            initHelpers();
            let start = +new Date();

            Promise.all([
                this.helper.model.init(),
                this.helper.icon.init(),
                this.helper.newtab.init(),
                this.helper.analytics.init(),
                this.helper.bookmarkApi.init()
            ]).then(() => {
                return Promise.all([
                    initEvents(),
                    this.helper.port.init(),
                    this.helper.upgrade.init(),
                    this.helper.entries.update()
                ]);
            }).then(() => {
                console.log("LOADED", +new Date() - start)
            });
        };
    };

    new background().run();
})(jsu);