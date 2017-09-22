($ => {
    "use strict";

    window.EntriesHelper = function (b) {

        let data = {};
        let entries = {};
        let amounts = {};
        let info = {};
        let hiddenEntries = [];
        let pinnedEntries = [];
        let isUpdating = false;
        let rescheduledUpdate = false;

        /**
         * Updates the object with all bookmarks and directories,
         * stores the infos of all entries in a one dimensional object and marks the hidden bookmarks or directories with a flag
         *
         * @returns {Promise}
         */
        this.update = () => {
            return new Promise((resolve) => {
                if (isUpdating === false) { // update is not running at the moment
                    isUpdating = true;

                    Promise.all([
                        b.helper.bookmarkApi.func.getSubTree(0),
                        b.helper.viewAmount.getAll()
                    ]).then((values) => {
                        info = values[1];
                        let bookmarkTree = [];

                        if (values[0] && values[0][0] && values[0][0].children) { // children are existing
                            bookmarkTree = values[0][0].children;
                        }

                        chrome.storage.local.get(["utility"], (result) => {
                            hiddenEntries = result.utility ? (result.utility.hiddenEntries || []) : [];
                            pinnedEntries = result.utility ? (result.utility.pinnedEntries || []) : [];

                            entries = {
                                bookmarks: {},
                                directories: {},
                                pinned: {}
                            };

                            amounts = {
                                bookmarks: {
                                    visible: 0,
                                    hidden: 0
                                },
                                directories: {
                                    visible: 0,
                                    hidden: 0
                                },
                                pinned: {
                                    visible: 0,
                                    hidden: 0
                                }
                            };

                            processEntries(bookmarkTree);

                            data = {
                                entries: entries,
                                amounts: amounts
                            };

                            isUpdating = false;
                            resolve();
                        });
                    });
                } else if (rescheduledUpdate === false) { // update method is called while it's still running -> reschedule call and update in 5s again
                    rescheduledUpdate = true;
                    $.delay(5000).then(() => {
                        rescheduledUpdate = false;
                        this.update();
                    });
                    resolve();
                } else {
                    resolve();
                }
            });
        };

        /**
         * Returns the information about all entries
         *
         * @returns {Promise}
         */
        this.getEntries = () => {
            return new Promise((resolve) => {
                resolve(data);
            });
        };

        /**
         *
         * @param {Array} entriesList
         * @param {Array} parents
         * @param {bool} parentIsHidden
         */
        let processEntries = (entriesList, parents = [], parentIsHidden = false) => {
            // entriesList = entriesList.concat(entriesList).concat(entriesList).concat(entriesList).concat(entriesList).concat(entriesList).concat(entriesList).concat(entriesList).concat(entriesList);

            // let usedIds = {};

            entriesList.forEach((entry) => {
                // if (usedIds["xxx" + entry.id]) {
                //     entry.id = Math.floor(1+Math.random() * 999999);
                // }
                //
                // usedIds["xxx" + entry.id] = true;

                let thisParents = [...parents];

                if (entry.parentId !== "0") {
                    thisParents.push(entry.parentId);
                }

                entry.hidden = parentIsHidden || hiddenEntries[entry.id] === true;
                entry.parents = thisParents;

                entry.views = {
                    startDate: +new Date(Math.max(entry.dateAdded, info.counterStartDate)),
                    total: 0
                };

                if (entry.url) { // bookmark
                    handleBookmarkEntry(entry);
                } else if (entry.children) { // directory
                    handleDirectoryEntry(entry);
                }
            });
        };

        /**
         * Adds the information about the given entry to the directories object
         *
         * @param entry
         */
        let handleDirectoryEntry = (entry) => {
            entry.childrenAmount = {
                bookmarks: 0,
                directories: 0,
                total: 0
            };

            entry.parents.forEach((parentId) => {
                entries.directories[parentId].childrenAmount.directories++; // increase children counter
            });

            entries.directories[entry.id] = entry;
            processEntries(entry.children, entry.parents, entry.hidden);

            entry.isDir = true;
            entry.childrenAmount.total = entry.childrenAmount.bookmarks + entry.childrenAmount.directories;
            entry.views.perMonth = Math.round(entry.views.total / getMonthDiff(entry.views.startDate) * 100) / 100;

            amounts.directories[entry.hidden ? "hidden" : "visible"]++;
        };

        /**
         * Adds the information about the given entry to the bookmarks object
         *
         * @param entry
         */
        let handleBookmarkEntry = (entry) => {
            let viewAmount = 0;
            let lastView = 0;

            if (info.viewAmounts[entry.id]) {
                viewAmount = info.viewAmounts[entry.id].c;
                lastView = info.viewAmounts[entry.id].d || 0;
            }

            entry.views.total = viewAmount;
            entry.views.lastView = lastView;
            entry.views.perMonth = Math.round(viewAmount / getMonthDiff(entry.views.startDate) * 100) / 100;

            entry.parents.forEach((parentId) => {
                if (entries.directories[parentId]) {
                    entries.directories[parentId].childrenAmount.bookmarks++; // increase children counter
                    entries.directories[parentId].views.total += viewAmount; // add view amount to all parent directories counter
                    entries.directories[parentId].views.lastView = Math.max(entries.directories[parentId].views.lastView || 0, lastView); // add lastView date
                }
            });

            entry.pinned = false;
            entries.bookmarks[entry.id] = entry;
            amounts.bookmarks[entry.hidden ? "hidden" : "visible"]++;

            if (pinnedEntries[entry.id]) { // pinned bookmark -> add entry to the respective object
                entry.pinned = true;

                let obj = Object.assign({}, entry);
                obj.index = pinnedEntries[entry.id].index;
                delete obj.parents;
                delete obj.parentId;
                entries.pinned[entry.id] = obj;

                amounts.pinned[entry.hidden ? "hidden" : "visible"]++;
            }
        };

        /**
         * Returns the difference in months between the given timestamp and now
         *
         * @param {int} startDate
         * @returns {int}
         */
        let getMonthDiff = (startDate) => {
            return Math.max(1, Math.round((+new Date() - startDate) / (30.416666 * 24 * 60 * 60 * 1000)));
        };
    };

})(jsu);