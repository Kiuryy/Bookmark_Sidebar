($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.BookmarkHelper = function (ext) {

        /**
         * Deletes the given bookmark and creates markup to allow restoring or shows an overlay when trying to delete a directory
         *
         * @param {int} id
         * @returns {Promise}
         */
        this.removeEntry = async (id) => {
            const data = ext.helper.entry.getDataById(id);

            if (data && data.url) { // delete without confirm dialog, but offer a undo option
                const box = ext.helper.list.getActiveBookmarkBox();
                const entry = box.find("a[" + $.attr.id + "='" + data.id + "']");
                entry.data("restore", data);

                const mask = $("<span></span>")
                    .addClass($.cl.sidebar.removeMask)
                    .append("<em>" + ext.helper.i18n.get("sidebar_deleted") + "</em>")
                    .append("<span>" + ext.helper.i18n.get("sidebar_undo_deletion") + "</span>")
                    .appendTo(entry);

                $.delay(100).then(() => {
                    entry.addClass($.cl.sidebar.removed);

                    if (mask.children("span")[0].offsetTop > 0) { // undo button doesn't fit in one line -> remove the label
                        mask.children("em").remove();
                    }
                });

                ext.helper.selection.deselect(data.id);
                await this.performDeletion(data.id, true);
            } else { // open overlay to confirm deletion
                ext.helper.overlay.create("delete", ext.helper.i18n.get("contextmenu_delete_dir"), data);
            }
        };

        /**
         * Updates the given bookmark or directory (title, url and additional info)
         *
         * @param {object} data
         */
        this.editEntry = async (data) => {
            const additionalInfoList = ext.helper.model.getData("u/additionalInfo");
            additionalInfoList[data.id] = {
                desc: data.additionalInfo
            };

            const resp = await ext.helper.model.call("updateBookmark", {
                id: data.id,
                title: data.title,
                url: data.url,
                preventReload: true
            });
            await ext.helper.model.setData({"u/additionalInfo": additionalInfoList});

            return resp;
        };

        /**
         * Extracts the information from the given element and restores the entry
         *
         * @param {jsu} elm
         * @returns {Promise}
         */
        this.restoreEntry = async (elm) => {
            if (elm && elm.length() > 0) {
                const data = elm.data("restore");
                elm.removeClass($.cl.sidebar.removed).addClass($.cl.sidebar.restored);

                await $.delay(500);
                elm.children("span." + $.cl.sidebar.removeMask).remove();

                const result = await ext.helper.model.call("createBookmark", data);

                const promises = [];
                if (result && result.created) {
                    elm.attr($.attr.id, result.created);

                    const additionalInfoList = ext.helper.model.getData("u/additionalInfo");
                    if (additionalInfoList[data.id]) { // restore the additional information
                        additionalInfoList[result.created] = additionalInfoList[data.id];
                        promises.push(ext.helper.model.setData({"u/additionalInfo": additionalInfoList}));
                    }
                }

                promises.push(ext.helper.entry.init());
                await Promise.all(promises);
            }
        };

        /**
         * Deletes the given entry
         *
         * @param {number} id
         * @param {boolean} preventReload
         * @returns {Promise}
         */
        this.performDeletion = async (id, preventReload = false) => {
            await ext.helper.model.call("deleteBookmark", {
                id: id,
                preventReload: preventReload
            });
        };

        /**
         * Pins the given bookmarks
         *
         * @param {object} data
         * @returns {Promise}
         */
        this.pinEntry = async (data) => {
            const entries = ext.helper.model.getData("u/pinnedEntries");
            let idx = -1;
            Object.values(entries).forEach((entry) => { // determine the current highest index
                idx = Math.max(idx, entry.index);
            });

            entries[data.id] = {index: idx + 1}; // add new entry at the last position

            await savePinnedEntries(entries);
        };

        /**
         * Unpins the given bookmarks
         *
         * @param {object} data
         * @returns {Promise}
         */
        this.unpinEntry = async (data) => {

            const entries = ext.helper.model.getData("u/pinnedEntries");
            delete entries[data.id];

            await savePinnedEntries(entries);
        };

        /**
         * Returns the Index the given bookmark would be placed at with the current sorting in the given folder
         *
         * @param bookmarkId
         * @param dirId
         * @returns {Promise<number>}
         */
        this.getBookmarkIndexInDirectory = async (bookmarkId, dirId) => {
            const response = await ext.helper.model.call("bookmarks", {id: dirId});
            if (response.bookmarks && response.bookmarks[0] && response.bookmarks[0].children) { // children are existing
                const sort = ext.helper.model.getData("u/sort");
                const bookmarkData = ext.helper.entry.getDataById(bookmarkId);
                const entries = response.bookmarks[0].children;

                if (dirId !== bookmarkData.parentId) {
                    entries.push(bookmarkData);
                    bookmarkData.parentId = dirId;
                }

                ext.helper.utility.sortEntries(entries, sort);
                const index = entries.findIndex((entry) => {
                    return bookmarkId === entry.id;
                });

                return index;
            } else {
                return -1;
            }
        };

        /**
         * Changes the index of the given entry,
         * iterates over the other entries and adapts their index if needed
         *
         * @returns {Promise}
         */
        this.reorderPinnedEntries = async (opts) => {
            const entries = ext.helper.model.getData("u/pinnedEntries");

            let newIndex = 0;
            if (opts.prevId) {
                const prevInfo = ext.helper.entry.getDataById(opts.prevId);
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

            await savePinnedEntries(entries);
        };

        /**
         * Saves the given entries in the local storage,
         * Triggers an update of the entries object
         *
         * @param {object} entries
         * @returns {Promise}
         */
        const savePinnedEntries = async (entries) => {
            await Promise.all([
                ext.helper.model.call("removeCache", {name: "htmlList"}),
                ext.helper.model.call("removeCache", {name: "htmlPinnedEntries"}),
                ext.helper.model.setData({"u/pinnedEntries": entries})
            ]);
        };
    };
})(jsu);