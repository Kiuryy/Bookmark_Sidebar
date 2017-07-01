($ => {
    "use strict";

    window.EntryHelper = function (ext) {

        let entries = {};

        /**
         * Updates the object with all bookmarks and directories,
         * stores the infos off all entries in a one dimensional object and marks the hidden bookmarks or directories with a flag
         *
         * @param {Array} bookmarkTree
         * @returns {Promise}
         */
        this.update = (bookmarkTree) => {
            return new Promise((resolve) => {
                ext.helper.model.call("viewAmounts").then((info) => {
                    let config = ext.helper.model.getData(["u/hiddenEntries", "u/pinnedEntries"]);
                    let showHidden = ext.elements.sidebar.hasClass(ext.opts.classes.sidebar.showHidden);

                    entries = {
                        bookmarks: {},
                        directories: {},
                        pinned: {}
                    };

                    let processEntries = (entriesList, parents = [], parentIsHidden = false) => {
                        entriesList.forEach((entry, idx) => {
                            if (showHidden || config.hiddenEntries[entry.id] !== true) {
                                let thisParents = [...parents];

                                if (entry.parentId !== "0") {
                                    thisParents.push(entry.parentId);
                                }

                                entry.hidden = parentIsHidden || config.hiddenEntries[entry.id] === true;
                                entry.parents = thisParents;

                                let viewAmountStartDate = new Date(Math.max(entry.dateAdded, info.counterStartDate));
                                let monthDiff = Math.max(1, Math.round((+new Date() - viewAmountStartDate) / (30.416666 * 24 * 60 * 60 * 1000)));

                                entry.views = {
                                    startDate: viewAmountStartDate,
                                    total: 0
                                };

                                if (entry.url) { // bookmark
                                    if (ext.opts.demoMode) {
                                        entry.title = ext.helper.i18n.get("overlay_label_bookmark") + " " + (idx + 1);
                                        entry.url = "https://example.com/";
                                    }

                                    let viewAmount = 0;
                                    let lastView = 0;

                                    if (info.viewAmounts[entry.id]) {
                                        viewAmount = info.viewAmounts[entry.id].c;
                                        lastView = info.viewAmounts[entry.id].d || 0;
                                    }

                                    entry.views.total = viewAmount;
                                    entry.views.lastView = lastView;
                                    entry.views.perMonth = Math.round(viewAmount / monthDiff * 100) / 100;

                                    thisParents.forEach((parentId) => {
                                        entries.directories[parentId].childrenAmount.bookmarks++; // increase children counter
                                        entries.directories[parentId].views.total += viewAmount; // add view amount to all parent directories counter
                                        entries.directories[parentId].views.lastView = Math.max(entries.directories[parentId].views.lastView || 0, lastView); // add lastView date
                                    });

                                    entry.pinned = false;
                                    entries.bookmarks[entry.id] = entry;

                                    if (config.pinnedEntries[entry.id]) { // pinned bookmark -> add entry to the respective object
                                        entry.pinned = true;

                                        let obj = Object.assign({}, entry);
                                        obj.index = config.pinnedEntries[entry.id].index;
                                        delete obj.parents;
                                        delete obj.parentId;
                                        entries.pinned[entry.id] = obj;
                                    }
                                } else if (entry.children) { // directory
                                    if (ext.opts.demoMode) {
                                        entry.title = ext.helper.i18n.get("overlay_label_dir") + " " + (idx + 1);
                                    }
                                    entry.childrenAmount = {
                                        bookmarks: 0,
                                        directories: 0,
                                        total: 0
                                    };

                                    thisParents.forEach((parentId) => {
                                        entries.directories[parentId].childrenAmount.directories++; // increase children counter
                                    });

                                    entries.directories[entry.id] = entry;
                                    processEntries(entry.children, thisParents, entry.hidden);

                                    entry.isDir = true;
                                    entry.childrenAmount.total = entry.childrenAmount.bookmarks + entry.childrenAmount.directories;
                                    entry.views.perMonth = Math.round(entry.views.total / monthDiff * 100) / 100;
                                }
                            }
                        });
                    };
                    processEntries(bookmarkTree);
                    resolve();
                });
            });
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
                    entries.bookmarks[id][key] = val;
                } else {
                    entries.bookmarks[id][key] = val;
                }
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