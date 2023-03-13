try {
    if (!self.window) { // required for jsu
        self.window = self;
    }
    if (!self.document) {
        self.document = {};
    }

    importScripts(
        "lib/jsu.js",
        "opts.js",
        "background/analytics.js",
        "background/language.js",
        "background/model.js",
        "background/upgrade.js",
        "background/bookmarks.js",
        "background/viewAmount.js",
        "background/newtab.js",
        "background/cache.js",
        "background/icon.js",
        "background/browserAction.js",
        "background/linkchecker.js",
        "background/utility.js",
        "background/message.js",
        "background/main.js"
    );

    new jsu.Background().run();
} catch (e) {
    console.error("Failed to load service worker");
    console.error(e);
}