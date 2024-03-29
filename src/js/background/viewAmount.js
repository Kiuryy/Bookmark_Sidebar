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
         * only if the tab was not previously opened or changed from the extension (these clicks are counted already)
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.increaseByUrl = async (opts) => {
            const openedByExtension = b.helper.model.getData("openedByExtension");

            if (openedByExtension === null) { // page was not opened by extension -> view was not counted yet
                const result = await b.helper.bookmarks.getBySearchVal({searchVal: {url: opts.url}});
                if (result && result.bookmarks) {
                    for (const bookmark of result.bookmarks) {
                        if (bookmark.url === opts.url) {
                            await this.increaseById(bookmark.id);
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
         * @param {string} bookmarkId
         * @param {number} increment
         */
        this.increaseById = async (bookmarkId, increment = 1) => {
            bookmarkId = "" + bookmarkId;
            if (bookmarkId) {
                const clickCounter = await getClickCounter();
                if (typeof clickCounter[bookmarkId] === "undefined" || typeof clickCounter[bookmarkId] !== "object") {
                    clickCounter[bookmarkId] = {c: 0};
                }

                clickCounter[bookmarkId].c += increment;
                clickCounter[bookmarkId].d = +new Date();

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