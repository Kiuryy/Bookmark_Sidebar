($ => {
    "use strict";

    window.BookmarkHelper = function (ext) {

        /**
         * Deletes the given bookmark and creates creates markup to allow restoring or shows an overlay when trying to delete a directory
         *
         * @param {int} id
         * @returns {Promise}
         */
        this.removeEntry = (id) => {
            return new Promise((resolve) => {
                let data = ext.helper.entry.getData(id);

                if (data && data.url) { // delete without confirm dialog, but offer a undo option
                    Object.values(ext.elements.bookmarkBox).some((box) => {
                        if (box.hasClass(ext.opts.classes.sidebar.active)) {
                            let entry = box.find("a[" + ext.opts.attr.id + "='" + data.id + "']");
                            entry.data("restore", data);

                            let mask = $("<span />")
                                .addClass(ext.opts.classes.sidebar.removeMask)
                                .append("<em>" + ext.helper.i18n.get("sidebar_deleted") + "</em>")
                                .append("<span>" + ext.helper.i18n.get("sidebar_undo_deletion") + "</span>")
                                .appendTo(entry);

                            $.delay(100).then(() => {
                                entry.addClass(ext.opts.classes.sidebar.removed);

                                if (mask.children("span")[0].offsetTop > 0) { // undo button doesn't fit in one line -> remove the label
                                    mask.children("em").remove();
                                }
                            });

                            return true;
                        }
                    });

                    this.performDeletion(data).then(resolve);
                } else { // open overlay to confirm deletion
                    ext.helper.overlay.create("delete", ext.helper.i18n.get("contextmenu_delete_dir"), data);
                    resolve();
                }
            });
        };

        /**
         * Updates the given bookmark or directory (title, url and additional info)
         *
         * @param {object} data
         */
        this.editEntry = (data) => {
            return new Promise((resolve) => {
                let additionalInfoList = ext.helper.model.getData("u/additionalInfo");
                additionalInfoList[data.id] = {
                    desc: data.additionalInfo
                };

                Promise.all([
                    ext.helper.model.call("updateBookmark", {
                        id: data.id,
                        title: data.title,
                        url: data.url,
                        preventReload: true
                    }),
                    ext.helper.model.setData({"u/additionalInfo": additionalInfoList})
                ]).then(resolve);
            });
        };

        /**
         * Extracts the information from the given element and restores the entry
         *
         * @param {jsu} elm
         * @returns {Promise}
         */
        this.restoreEntry = (elm) => {
            return new Promise((resolve) => {
                if (elm && elm.length() > 0) {
                    let data = elm.data("restore");
                    elm.removeClass(ext.opts.classes.sidebar.removed).addClass(ext.opts.classes.sidebar.restored);

                    $.delay(500).then(() => {
                        elm.children("span." + ext.opts.classes.sidebar.removeMask).remove();
                        return ext.helper.specialEntry.reorderSeparators([data.parentId]);
                    }).then(() => {
                        return ext.helper.model.call("createBookmark", data);
                    }).then((result) => {
                        let promises = [];

                        if (result && result.created) {
                            elm.attr(ext.opts.attr.id, result.created);

                            let additionalInfoList = ext.helper.model.getData("u/additionalInfo");
                            if (additionalInfoList[data.id]) { // restore the additional information
                                additionalInfoList[result.created] = additionalInfoList[data.id];
                                promises.push(ext.helper.model.setData({"u/additionalInfo": additionalInfoList}));
                            }
                        }

                        promises.push(ext.helper.entry.init());
                        return Promise.all(promises);
                    }).then(() => {
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        };

        /**
         * Deletes the given entry
         *
         * @param {object} data
         * @returns {Promise}
         */
        this.performDeletion = (data) => {
            return new Promise((resolve) => {
                ext.helper.model.call("trackEvent", {
                    category: "extension",
                    action: "remove",
                    label: data.url ? "bookmark" : "directory"
                });

                ext.helper.specialEntry.reorderSeparators([data.parentId]).then(() => {
                    return ext.helper.model.call("deleteBookmark", {id: data.id});
                }).then(() => {
                    resolve();
                });
            });
        };

    };
})(jsu);