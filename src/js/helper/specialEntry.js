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
                let entries = ext.helper.model.getData("u/pinnedEntries");
                let idx = -1;
                Object.values(entries).forEach((entry) => { // determine the current highest index
                    idx = Math.max(idx, entry.index);
                });

                entries[data.id] = {index: idx + 1}; // add new entry at the last position

                ext.helper.model.call("trackEvent", {
                    category: "extension",
                    action: "pinnedEntry",
                    label: "pin"
                });

                savePinnedEntries(entries).then(resolve);
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
                let entries = ext.helper.model.getData("u/pinnedEntries");
                delete entries[data.id];

                ext.helper.model.call("trackEvent", {
                    category: "extension",
                    action: "pinnedEntry",
                    label: "unpin"
                });

                savePinnedEntries(entries).then(resolve);
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
                let entries = ext.helper.model.getData("u/pinnedEntries");

                let newIndex = 0;
                if (opts.prevId) {
                    let prevInfo = ext.helper.entry.getData(opts.prevId);
                    newIndex = prevInfo.pinnedIndex + 1;
                }

                Object.keys(entries).forEach((id) => { // iterate all entries
                    if (+id === +opts.id) { // changed element -> set index
                        entries[id].index = newIndex;
                        ext.helper.entry.addData(id, "pinnedIndex", newIndex);
                    } else if (entries[id].index >= newIndex) { // index of this entry is higher then the index of the changed entry -> increase
                        entries[id].index++;
                        ext.helper.entry.addData(id, "pinnedIndex", entries[id].index);
                    }
                });

                savePinnedEntries(entries).then(resolve);
            });
        };

        /**
         * Saves the given entries in the local storage,
         * Triggers an update of the entries object
         *
         * @param {object} entries
         * @returns {Promise}
         */
        let savePinnedEntries = (entries) => {
            return new Promise((resolve) => {
                Promise.all([
                    ext.helper.model.call("removeCache", {name: "html"}),
                    ext.helper.model.setData({"u/pinnedEntries": entries})
                ]).then(resolve);
            });
        };

        /**
         * Saves the separators in the local storage
         *
         * @param {object} separators
         * @returns {Promise}
         */
        let saveSeperators = (separators) => {
            return new Promise((resolve) => {
                Promise.all([
                    ext.helper.model.call("removeCache", {name: "html"}),
                    ext.helper.model.setData({"u/separators": separators})
                ]).then(resolve);
            });
        };

        /**
         * Saves the position of the separators for the given directory
         *
         * @param {Array} parentIds
         * @returns {Promise}
         */
        this.reorderSeparators = (parentIds) => {
            return new Promise((resolve) => {
                let separators = ext.helper.model.getData("u/separators");

                let processDir = (i = 0) => {
                    let parentId = parentIds[i];

                    if (typeof parentId !== "undefined") {
                        let parentEntry = ext.elements.bookmarkBox.all.find("a[data-id='" + parentId + "']");

                        if (parentEntry.length() > 0 && parentEntry.next("ul").length() > 0) {
                            let index = 0;
                            let infos = [];

                            parentEntry.next("ul").children("li").forEach((entry) => {
                                if (!$(entry).hasClass(ext.opts.classes.drag.dragInitial)) {
                                    if ($(entry).children("a." + ext.opts.classes.sidebar.separator).length() > 0) {
                                        infos.push({index: index});
                                    } else {
                                        index++;
                                    }
                                }
                            });

                            separators[parentId] = infos;
                        }

                        processDir(i + 1);
                    } else { // finished
                        saveSeperators(separators).then(resolve);
                    }
                };

                processDir();
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
                ext.helper.model.call("trackEvent", {
                    category: "extension",
                    action: "add",
                    label: "separator"
                });

                saveSeperators(separators).then(resolve);
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

                if (typeof separators[data.id] !== "undefined") {
                    separators[data.id].some((entry, i) => {
                        if (entry.index === data.index) {
                            separators[data.id].splice(i, 1);
                            return true;
                        }
                    });

                    ext.helper.model.call("trackEvent", {
                        category: "extension",
                        action: "remove",
                        label: "separator"
                    });

                    saveSeperators(separators).then(resolve);
                } else {
                    resolve();
                }
            });
        };
    };

})(jsu);