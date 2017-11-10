($ => {
    "use strict";

    window.BookmarkApi = function (b) {
        this.func = {};

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                ["get", "getSubTree", "removeTree"].forEach((key) => {
                    this.func[key] = (id) => callback(key, ["" + id]);
                });

                ["update", "move"].forEach((key) => {
                    this.func[key] = (id, obj) => callback(key, ["" + id, obj]);
                });

                ["create", "search"].forEach((key) => {
                    this.func[key] = (obj) => callback(key, [obj]);
                });

                resolve();
            });
        };

        let callback = (key, params) => {
            return new Promise((resolve, reject) => {
                chrome.bookmarks[key](...params, (result) => {
                    let lastError = chrome.runtime.lastError;
                    if (typeof lastError === "undefined") {
                        if (["update", "move", "create", "removeTree"].indexOf(key) !== -1) {
                            Promise.all([
                                b.helper.cache.remove({name: "htmlList"}),
                                b.helper.cache.remove({name: "htmlPinnedEntries"})
                            ]).then(() => {
                                resolve(result);
                            });
                        } else {
                            resolve(result);
                        }
                    } else { // reject with error
                        reject(lastError.message);
                    }
                });
            });
        };
    };

})(jsu);