($ => {
    "use strict";

    $.ViewAmountHelper = function (b) {

        /**
         * Returns the view amounts of all bookmarks
         *
         * @returns {Promise}
         */
        this.getAll = async () => {
            const clickCounter = await getClickCounter();
            return {
                viewAmounts: clickCounter,
                counterStartDate: b.helper.model.getData("installationDate")
            };
        };

        /**
         * Determines whether a bookmark to the given url exists and if so increases the view counter,
         * only if the tab was not previously opened or changed from the extension (these clicks are counted alreay)
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.addByUrl = async (opts) => {
            const openedByExtension = b.helper.model.getData("openedByExtension");

            if (openedByExtension === null) { // page was not opened by extension -> view was not counted yet
                const result = await b.helper.bookmarks.getBySearchVal({searchVal: {url: opts.url}});
                if (result && result.bookmarks) {
                    for (const bookmark of result.bookmarks) {
                        if (bookmark.url === opts.url) {
                            await this.addByEntry(bookmark);
                            break;
                        }
                    }
                }
            }

            await b.helper.model.setData("openedByExtension", null);
        };

        /**
         * Increases the Click Counter of the given bookmark
         *
         * @param {object} bookmark
         */
        this.addByEntry = async (bookmark) => {
            if (bookmark.id) {
                const clickCounter = await getClickCounter();
                if (typeof clickCounter[bookmark.id] === "undefined" || typeof clickCounter[bookmark.id] !== "object") {
                    clickCounter[bookmark.id] = {c: 0};
                }

                clickCounter[bookmark.id].c++;
                clickCounter[bookmark.id].d = +new Date();

                await $.api.storage.local.set({
                    clickCounter: clickCounter
                });
            }
        };

        /**
         * Retrieves infos about the views of the bookmarks
         *
         * @returns {Promise}
         */
        const getClickCounter = async () => {
            const obj = await $.api.storage.local.get(["clickCounter"]);
            let ret = {};

            if (typeof obj.clickCounter !== "undefined") { // data available
                ret = obj.clickCounter;
            }

            return ret;
        };
    };

})(jsu);