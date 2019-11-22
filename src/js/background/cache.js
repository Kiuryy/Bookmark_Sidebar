($ => {
    "use strict";

    $.CacheHelper = function (b) {

        /**
         * Caches the given value under the given name in the local storage
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.set = (opts) => {
            return new Promise((resolve) => {
                try { // can fail (e.g. MAX_WRITE_OPERATIONS_PER_MINUTE exceeded)
                    $.api.storage.local.set({["cache_" + opts.name]: opts.val}, () => {
                        resolve();
                    });
                } catch (e) {
                    resolve();
                }
            });
        };

        /**
         * Returns the cached value with the given name
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.get = (opts) => {
            return new Promise((resolve) => {
                $.api.storage.local.get(["cache_" + opts.name], (result) => {
                    resolve({val: result["cache_" + opts.name]});
                });
            });
        };

        /**
         * Removes the cached value for the given name
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.remove = (opts) => {
            return new Promise((resolve) => {
                if (b.importRunning) { // don't remove cache while import in running
                    resolve();
                } else {
                    $.api.storage.local.remove(["cache_" + opts.name], () => {
                        resolve();
                    });
                }
            });
        };
    };

})(jsu);