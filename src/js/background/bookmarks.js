($ => {
    "use strict";

    $.Bookmarks = function (b) {
        this.api = {};

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                ["get", "getSubTree", "removeTree"].forEach((key) => {
                    this.api[key] = (id) => funcCallback(key, typeof id === "object" ? [id] : ["" + id]); // don't cast to str if parameter is already an object
                });

                ["update", "move"].forEach((key) => {
                    this.api[key] = (id, obj) => funcCallback(key, ["" + id, obj]);
                });

                ["create", "search"].forEach((key) => {
                    this.api[key] = (obj) => funcCallback(key, [obj]);
                });

                resolve();
            });
        };

        let funcCallback = (key, params) => {
            return new Promise((resolve, reject) => {
                chrome.bookmarks[key](...params, (result) => {
                    let lastError = chrome.runtime.lastError;
                    if (typeof lastError === "undefined") {
                        if (["update", "move", "create", "removeTree"].indexOf(key) !== -1) {
                            Promise.all([
                                b.helper.cache.remove({name: "htmlList"}),
                                b.helper.cache.remove({name: "htmlPinnedEntries"})
                            ]).then(() => {
                                resolve(result);
                            });
                        } else {
                            resolve(result);
                        }
                    } else { // reject with error
                        reject(lastError.message);
                    }
                });
            });
        };

        /**
         * Returns all bookmarks under the given id
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.getById = (opts) => {
            return new Promise((resolve) => {
                this.api.getSubTree(opts.id).then((bookmarks) => {
                    resolve({bookmarks: bookmarks});
                });
            });
        };

        /**
         * Returns all bookmarks where the title or url are matching the given search value
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.getBySearchVal = (opts) => {
            return new Promise((resolve) => {
                this.api.search(opts.searchVal).then((results) => {
                    resolve({bookmarks: results});
                });
            });
        };

        /**
         * Updates the given bookmark or directory with the given values (title, url)
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.update = (opts) => {
            return new Promise((resolve) => {
                new Promise((rslv) => {
                    let values = {
                        title: opts.title
                    };

                    if (opts.url) {
                        values.url = opts.url;
                    }

                    if (opts.preventReload) {
                        b.preventReload = true;
                    }

                    this.api.update(opts.id, values).then(() => {
                        rslv({updated: opts.id});
                    }, (error) => {
                        rslv({error: error});
                    });
                }).then((obj) => {
                    if (opts.preventReload) {
                        b.preventReload = false;
                    }
                    resolve(obj);
                });
            });
        };

        /**
         * Creates a bookmark or directory with the given values (title, url)
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.create = (opts) => {
            return new Promise((resolve) => {
                new Promise((rslv) => {
                    let values = {
                        parentId: opts.parentId,
                        index: opts.index || 0,
                        title: opts.title,
                        url: opts.url ? opts.url : null
                    };

                    if (opts.preventReload) {
                        b.preventReload = true;
                    }

                    this.api.create(values).then((obj) => {
                        rslv({created: obj.id});
                    }, (error) => {
                        rslv({error: error});
                    });
                }).then((obj) => {
                    if (opts.preventReload) {
                        b.preventReload = false;
                    }
                    resolve(obj);
                });
            });
        };

        /**
         * Removes the given bookmark or directory recursively
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.remove = (opts) => {
            return new Promise((resolve) => {
                new Promise((rslv) => {
                    if (opts.preventReload) {
                        b.preventReload = true;
                    }

                    this.api.removeTree(opts.id).then(() => {
                        rslv({deleted: opts.id});
                    }, (error) => {
                        rslv({error: error});
                    });
                }).then((obj) => {
                    if (opts.preventReload) {
                        b.preventReload = false;
                    }
                    resolve(obj);
                });
            });
        };

        /**
         * Updates the position of the given bookmark
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.move = (opts) => {
            return new Promise((resolve) => {
                let dest = {
                    parentId: "" + opts.parentId,
                    index: opts.index
                };

                this.api.move(opts.id, dest).then(() => {
                    resolve({moved: opts.id});
                });
            });
        };
    };

})(jsu);