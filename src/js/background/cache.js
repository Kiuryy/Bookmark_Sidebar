($ => {
    "use strict";

    $.CacheHelper = function (b) {

        /**
         * Caches the given value under the given name in the local storage
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.set = async (opts) => {
            try {
                const key = "cache_" + opts.name + "_" + $.ua.browser;
                await $.api.storage.local.set({[key]: opts.val});
            } catch (e) {
                // can fail (e.g. MAX_WRITE_OPERATIONS_PER_MINUTE exceeded)
            }
        };

        /**
         * Returns the cached value with the given name
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.get = async (opts) => {
            const key = "cache_" + opts.name + "_" + $.ua.browser;
            const result = await $.api.storage.local.get([key]);
            return {val: result[key]};
        };

        /**
         * Removes the cached value for the given name
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.remove = async (opts) => {
            if (!b.importRunning) { // don't remove cache while import is running
                const key = "cache_" + opts.name + "_" + $.ua.browser;
                await $.api.storage.local.remove([key]);
            }
        };
    };

})(jsu);