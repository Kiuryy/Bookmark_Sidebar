($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.EntryHelper = function (ext) {

        let inited = false;

        let amounts = {};
        let config = {};
        let info = {};
        let entries = {
            bookmarks: {},
            directories: {},
            pinned: {}
        };

        /**
         *
         * @returns {Promise}
         */
        this.init = async (entries = null) => {
            await this.update(entries);
            inited = true;
        };

        /**
         * Initialises the helper if not already initialised
         *
         * @returns {Promise}
         */
        this.initOnce = async () => {
            if (!inited) {
                await this.init();
            }
        };

        /**
         * Returns the amount of entries for the given type
         *
         * @param {string} type
         * @returns {int|null}
         */
        this.getAmount = (type) => {
            updateConfigObj();

            if (Object.keys(amounts).length === 0) {
                amounts = ext.helper.model.getData("u/entryAmounts");
            }

            if (amounts && amounts[type]) {
                let amount = amounts[type].visible;
                if (config.showHidden) { // hidden entries are visible -> add them to the counter
                    amount += amounts[type].hidden;
                }
                return amount;
            } else {
                return null;
            }
        };

        /**
         * Returns the information about all entries of the given type (pinned, bookmarks, directories)
         *
         * @param {string} type
         * @returns {Array}
         */
        this.getAllDataByType = (type) => {
            return Object.values(entries[type] || {});
        };

        /**
         * Returns the information of the given bookmark or directory
         *
         * @param {int} id
         * @returns {object|null}
         */
        this.getDataById = (id) => {
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
         * Returns the parents of the given element
         *
         * @param {int} id
         * @returns {array}
         */
        this.getParentsById = (id) => {
            const ret = [];

            try {
                let parentId = this.getDataById(id).parentId;

                while (parentId) {
                    const parentInfo = this.getDataById(parentId);
                    if (parentInfo) {
                        ret.push(parentInfo);
                    }

                    parentId = parentInfo && parentInfo.parentId ? parentInfo.parentId : null;
                }
            } catch (e) {
                //
            }

            return ret;
        };

        /**
         * Adds additional infos to the information object of the given entry
         *
         * @param {int} id
         * @param {string} key
         * @param {*} val
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
         * Returns whether the given entry is a separator,
         * if the url is 'about:blank' and the title begins and ends with at least 3 dashes or underscores, the method will return true
         *
         * @param {int} id
         * @returns {boolean}
         */
        this.isSeparator = (id) => {
            let ret = false;
            if (typeof entries.bookmarks[id] === "object") {
                ret = entries.bookmarks[id].url.startsWith("about:blank") && /^[-_]{3,}/.test(entries.bookmarks[id].title) && /[-_]{3,}$/.test(entries.bookmarks[id].title);
            }
            return ret;
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

        /**
         * Updates the object with all bookmarks and directories,
         * stores the infos of all entries in a one dimensional object and marks the hidden bookmarks or directories with a flag
         *
         * @returns {Promise}
         */
        this.update = (bookmarkTree = null) => {
            return new Promise((resolve) => {
                updateConfigObj();

                const promises = [
                    ext.helper.model.call("viewAmounts")
                ];

                if (bookmarkTree === null) {
                    promises.push(ext.helper.model.call("bookmarks", {id: 0}));
                }

                Promise.all(promises).then((values) => {
                    info = values[0];

                    if (bookmarkTree === null && values[1] && values[1].bookmarks && values[1].bookmarks[0] && values[1].bookmarks[0].children) { // children are existing
                        bookmarkTree = values[1].bookmarks[0].children;
                    }

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

                    ext.helper.model.setData({"u/entryAmounts": amounts});
                    resolve();
                });
            });
        };

        /**
         * Updates the config object with the newest data from the model
         */
        const updateConfigObj = () => {
            config = ext.helper.model.getData(["u/hiddenEntries", "u/additionalInfo", "u/pinnedEntries", "u/showHidden"]);
        };

        /**
         *
         * @param {Array} entriesList
         * @param {Array} parents
         * @param {boolean} parentIsHidden
         */
        const processEntries = (entriesList, parents = [], parentIsHidden = false) => {
            if (!entriesList) {
                return;
            }

            entriesList.forEach((entry) => {
                const thisParents = [...parents];

                if (entry.parentId !== "0") {
                    thisParents.push(entry.parentId);
                }

                entry.additionalInfo = config.additionalInfo[entry.id] || {};
                entry.hidden = parentIsHidden || config.hiddenEntries[entry.id] === true;
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
        const handleDirectoryEntry = (entry) => {
            entry.childrenAmount = {
                bookmarks: 0,
                directories: 0,
                total: 0
            };

            entry.parents.forEach((parentId) => {
                if (parentId !== "root________") { // ignore Firefox imaginary root folder
                    entries.directories[parentId].childrenAmount.directories++; // increase children counter
                }
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
        const handleBookmarkEntry = (entry) => {
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

            if (this.isSeparator(entry.id) === false) {
                amounts.bookmarks[entry.hidden ? "hidden" : "visible"]++;
            }

            if (config.pinnedEntries[entry.id]) { // pinned bookmark -> add entry to the respective object
                entry.pinned = true;

                const obj = Object.assign({}, entry);
                obj.index = config.pinnedEntries[entry.id].index;
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
        const getMonthDiff = (startDate) => {
            return Math.max(1, Math.round((+new Date() - startDate) / (30.416666 * 24 * 60 * 60 * 1000)));
        };

    };

})(jsu);