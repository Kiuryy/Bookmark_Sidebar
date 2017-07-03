($ => {
    "use strict";

    window.SpecialEntryHelper = function (ext) {

        /**
         * Pins the given bookmarks
         *
         * @param {object} data
         * @returns {Promise}
         */
        this.pinEntry = (data) => {
            return new Promise((resolve) => {
                let pinnedEntries = ext.helper.model.getData("u/pinnedEntries");
                let idx = -1;
                Object.values(pinnedEntries).forEach((entry) => { // determine the current highest index
                    idx = Math.max(idx, entry.index);
                });

                pinnedEntries[data.id] = {index: idx + 1}; // add new entry at the last position

                ext.helper.model.setData({
                    "u/pinnedEntries": pinnedEntries
                }).then(resolve);
            });
        };

        /**
         * Unpins the given bookmarks
         *
         * @param {object} data
         * @returns {Promise}
         */
        this.unpinEntry = (data) => {
            return new Promise((resolve) => {
                let pinnedEntries = ext.helper.model.getData("u/pinnedEntries");
                delete pinnedEntries[data.id];

                ext.helper.model.setData({
                    "u/pinnedEntries": pinnedEntries
                }).then(resolve);
            });
        };

        /**
         * Changes the index of the given entry,
         * iterates over the other entries and adapts their index if needed
         *
         * @returns {Promise}
         */
        this.reorderPinnedEntries = (opts) => {
            return new Promise((resolve) => {
                let pinnedEntries = ext.helper.model.getData("u/pinnedEntries");

                let newIndex = 0;
                if (opts.prevId) {
                    let prevInfo = ext.helper.entry.getData(opts.prevId);
                    newIndex = prevInfo.pinnedIndex + 1;
                }

                Object.keys(pinnedEntries).forEach((id) => { // iterate all entries
                    if (+id === +opts.id) { // changed element -> set index
                        pinnedEntries[id].index = newIndex;
                        ext.helper.entry.addData(id, "pinnedIndex", newIndex);
                    } else if (pinnedEntries[id].index >= newIndex) { // index of this entry is higher then the index of the changed entry -> increase
                        pinnedEntries[id].index++;
                        ext.helper.entry.addData(id, "pinnedIndex", pinnedEntries[id].index);
                    }
                });

                ext.helper.model.setData({
                    "u/pinnedEntries": pinnedEntries
                }).then(resolve);
            });
        };

        /**
         * Adds a separator to the given directory
         *
         * @param {object} data
         * @returns {Promise}
         */
        this.addSeparator = (data) => {
            return new Promise((resolve) => {
                let separators = ext.helper.model.getData("u/separators");

                if (typeof separators[data.id] === "undefined") {
                    separators[data.id] = [];
                }

                separators[data.id].push({index: (data.index || 0)});

                ext.helper.model.setData({
                    "u/separators": separators
                }).then(resolve);
            });
        };

        /**
         * Removes the separator from the given directory
         *
         * @param {object} data
         */
        this.removeSeparator = (data) => {
            return new Promise((resolve) => {
                let separators = ext.helper.model.getData("u/separators");

                separators[data.id].some((entry, i) => {
                    if (entry.index === data.index) {
                        separators[data.id].splice(i, 1);
                        return true;
                    }
                });

                ext.helper.model.setData({
                    "u/separators": separators
                }).then(resolve);
            });
        };
    };

})(jsu);