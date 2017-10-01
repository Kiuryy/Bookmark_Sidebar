($ => {
    "use strict";

    window.ViewAmountHelper = function (b) {

        /**
         * Returns the view amounts of all bookmarks
         *
         * @returns {Promise}
         */
        this.getAll = () => {
            return new Promise((resolve) => {
                getClickCounter().then((clickCounter) => {
                    resolve({
                        viewAmounts: clickCounter,
                        counterStartDate: b.helper.model.getData("installationDate")
                    });
                });
            });
        };

        /**
         * Determines whether a bookmark to the given url exists and if so increases the view counter,
         * only if the tab was not previously opened or changed from the extension (these clicks are counted alreay)
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.addByUrl = (opts) => {
            return new Promise((resolve) => {
                let openedByExtension = b.helper.model.getData("openedByExtension");

                if (openedByExtension === null) { // page was not opened by extension -> view was not counted yet
                    b.helper.bookmarkApi.func.search({url: opts.url}).then((bookmarks) => {
                        bookmarks.some((bookmark) => {
                            if (bookmark.url === opts.url) {
                                this.addByEntry(bookmark);
                                return true;
                            }
                            return false;
                        });
                        resolve();
                    });
                }

                b.helper.model.setData("openedByExtension", null);
            });
        };

        /**
         * Increases the Click Counter of the given bookmark
         *
         * @param {object} bookmark
         */
        this.addByEntry = (bookmark) => {
            if (bookmark["id"]) {
                getClickCounter().then((clickCounter) => {
                    if (typeof clickCounter[bookmark["id"]] === "undefined") {
                        clickCounter[bookmark["id"]] = {c: 0};
                    }

                    if (typeof clickCounter[bookmark["id"]] !== "object") { // @deprecated
                        clickCounter[bookmark["id"]] = {
                            c: clickCounter[bookmark["id"]]
                        };
                    }

                    clickCounter[bookmark["id"]].c++;
                    clickCounter[bookmark["id"]].d = +new Date();
                    delete clickCounter["node_" + bookmark["id"]]; // @deprecated

                    chrome.storage.local.set({
                        clickCounter: clickCounter
                    });
                });
            }
        };

        /**
         * Retrieves infos about the views of the bookmarks
         *
         * @returns {Promise}
         */
        let getClickCounter = () => {
            return new Promise((resolve) => {
                chrome.storage.local.get(["clickCounter"], (obj) => {
                    let ret = {};

                    if (typeof obj.clickCounter !== "undefined") { // data available
                        ret = obj.clickCounter;
                    }

                    resolve(ret);
                });
            });
        };
    };

})(jsu);