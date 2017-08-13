($ => {
    "use strict";

    window.EntryHelper = function (ext) {

        let entries = {};
        let amounts = {};

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                ext.helper.model.call("entries").then((result) => {
                    entries = result.entries;
                    amounts = result.amounts;
                    resolve();
                });
            });
        };

        /**
         * Returns the amount of entries for the given type
         *
         * @param {string} type
         * @returns {int|null}
         */
        this.getAmount = (type) => {
            return amounts[type] || null;
        };

        /**
         * Returns the information about all pinned entries
         *
         * @returns {Array}
         */
        this.getAllPinnedData = () => {
            return Object.values(entries.pinned);
        };

        /**
         * Returns the information about all bookmarks
         *
         * @returns {Array}
         */
        this.getAllBookmarkData = () => {
            return Object.values(entries.bookmarks);
        };

        /**
         * Returns the information of the given bookmark or directory
         *
         * @param {int} id
         * @returns {object|null}
         */
        this.getData = (id) => {
            let ret = null;

            if (typeof entries.bookmarks[id] === "object") {
                ret = entries.bookmarks[id];

                if (typeof entries.pinned[id] === "object") { // bookmark is pinned -> add info about the pinnedIndex
                    ret.pinnedIndex = entries.pinned[id].index;
                }
            } else if (typeof entries.directories[id] === "object") {
                ret = entries.directories[id];
            }

            return ret;
        };

        /**
         * Adds additional infos to the information object of the given entry
         *
         * @param {int} id
         * @param {string} key
         * @param {mixed} val
         */
        this.addData = (id, key, val) => {
            if (typeof entries.bookmarks[id] === "object") {
                if (key === "pinnedIndex" && typeof entries.pinned[id] === "object") { // change the index of the pinned entry
                    entries.pinned[id].index = val;
                }

                entries.bookmarks[id][key] = val;
            } else if (typeof entries.directories[id] === "object") {
                entries.directories[id][key] = val;
            }
        };

        /**
         * Returns false for all entries which are not in the entries object or have the hidden flag set to true
         *
         * @param {int} id
         * @returns {boolean}
         */
        this.isVisible = (id) => {
            let visible = false;

            if (typeof entries.bookmarks[id] === "object") {
                visible = entries.bookmarks[id].hidden === false;
            } else if (typeof entries.directories[id] === "object") {
                visible = entries.directories[id].hidden === false;
            }

            return visible;
        };

    };

})(jsu);