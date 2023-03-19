($ => {
    "use strict";

    $.Bookmarks = function (b) {

        /**
         * Returns all bookmarks under the given id
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.getById = async (opts) => {
            try {
                if (+opts.id === 0) {
                    const bookmarks = await $.api.bookmarks.getTree();
                    return {bookmarks: bookmarks};
                } else {
                    const bookmarks = await $.api.bookmarks.getSubTree("" + opts.id);
                    return {bookmarks: bookmarks};
                }
            } catch (err) {
                console.error(err, opts);
                return {error: err};
            }
        };

        /**
         * Returns all bookmarks where the title or url are matching the given search value
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.getBySearchVal = async (opts) => {
            try {
                const results = await $.api.bookmarks.search(opts.searchVal);
                return {bookmarks: results};
            } catch (err) {
                console.error(err);
                return {error: err};
            }
        };

        /**
         * Updates the given bookmark or directory with the given values (title, url)
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.update = async (opts) => {
            const values = {
                title: opts.title
            };

            if (opts.url) {
                values.url = opts.url;
            }

            if (opts.preventReload) {
                b.preventReload = true;
            }

            let ret = {updated: opts.id};
            try {
                await $.api.bookmarks.update("" + opts.id, values);
                await Promise.all([
                    b.helper.cache.remove({name: "htmlList"}),
                    b.helper.cache.remove({name: "htmlPinnedEntries"})
                ]);
            } catch (err) {
                console.error(err);
                ret = {error: err};
            }

            if (opts.preventReload) {
                b.preventReload = false;
            }

            return ret;
        };

        /**
         * Creates a bookmark or directory with the given values (title, url)
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.create = async (opts) => {
            const parentInfo = await this.getById({id: opts.parentId});

            const values = {
                parentId: opts.parentId,
                index: parentInfo.bookmarks ? Math.min(parentInfo.bookmarks[0].children.length, opts.index || 0) : 0,
                title: opts.title,
                url: opts.url ? opts.url : null
            };

            if (opts.preventReload) {
                b.preventReload = true;
            }

            let ret = {};
            try {
                ret = await $.api.bookmarks.create(values);
                await Promise.all([
                    b.helper.cache.remove({name: "htmlList"}),
                    b.helper.cache.remove({name: "htmlPinnedEntries"})
                ]);
            } catch (err) {
                console.error(err);
                ret = {error: err};
            }

            if (opts.preventReload) {
                b.preventReload = false;
            }

            return ret;
        };

        /**
         * Removes the given bookmark or directory recursively
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.remove = async (opts) => {
            if (opts.preventReload) {
                b.preventReload = true;
            }

            let ret = {deleted: opts.id};
            try {
                await $.api.bookmarks.removeTree("" + opts.id);
                await Promise.all([
                    b.helper.cache.remove({name: "htmlList"}),
                    b.helper.cache.remove({name: "htmlPinnedEntries"})
                ]);
            } catch (err) {
                console.error(err);
                ret = {error: err};
            }

            if (opts.preventReload) {
                b.preventReload = false;
            }

            return ret;
        };

        /**
         * Updates the position of the given bookmark
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.move = async (opts) => {
            const dest = {
                parentId: "" + opts.parentId,
                index: opts.index
            };

            await $.api.bookmarks.move("" + opts.id, dest);
            await Promise.all([
                b.helper.cache.remove({name: "htmlList"}),
                b.helper.cache.remove({name: "htmlPinnedEntries"})
            ]);
            return {moved: opts.id};
        };

        /**
         * Returns the data url of the favicon of the given url
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.getFavicon = async (opts) => {
            return $.api.runtime.getURL("_favicon") + "?pageUrl=" + encodeURIComponent(opts.url) + "&size=32";
        };
    };

})(jsu);