($ => {
    "use strict";

    window.EntryHelper = function (ext) {

        let entries = {};

        /**
         * Updates the object with all bookmarks and directories,
         * stores the infos off all entries in a one dimensional object and marks the hidden bookmarks or directories with a flag
         *
         * @param {Array} bookmarkTree
         * @param {function} callback
         */
        this.update = (bookmarkTree, callback) => {
            ext.helper.model.call("viewAmounts", (info) => {
                let hiddenEntries = ext.helper.model.getData("u/hiddenEntries");
                let showHidden = ext.elements.sidebar.hasClass(ext.opts.classes.sidebar.showHidden);

                entries = {
                    bookmarks: {},
                    directories: {}
                };

                let processEntries = (entriesList, parents = [], parentIsHidden = false) => {
                    entriesList.forEach((entry) => {
                        if (showHidden || hiddenEntries[entry.id] !== true) {
                            let thisParents = [...parents];

                            if (entry.parentId !== "0") {
                                thisParents.push(entry.parentId);
                            }

                            entry.hidden = parentIsHidden || hiddenEntries[entry.id] === true;
                            entry.parents = thisParents;

                            let viewAmountStartDate = new Date(Math.max(entry.dateAdded, info.counterStartDate));
                            let monthDiff = Math.max(1, Math.round((+new Date() - viewAmountStartDate) / (30.416666 * 24 * 60 * 60 * 1000)));

                            entry.views = {
                                startDate: viewAmountStartDate,
                                total: 0
                            };

                            if (entry.url) { // bookmark
                                let viewAmount = info.viewAmounts[entry.id] || info.viewAmounts["node_" + entry.id] || 0; // @deprecated info.views["node_123"] is now info.views["123"]

                                entry.views.total = viewAmount;
                                entry.views.perMonth = Math.round(viewAmount / monthDiff * 100) / 100;

                                thisParents.forEach((parentId) => {
                                    entries.directories[parentId].childrenAmount.bookmarks++; // increase children counter
                                    entries.directories[parentId].views.total += viewAmount; // add view amount to all parent directories counter
                                });

                                entries.bookmarks[entry.id] = entry;
                            } else if (entry.children) { // directory
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

                if (typeof callback === "function") {
                    callback();
                }
            });
        };

        /**
         * Returns the information about all directories
         *
         * @returns {Array}
         */
        this.getAllDirectoryData = () => {
            return Object.values(entries.directories);
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