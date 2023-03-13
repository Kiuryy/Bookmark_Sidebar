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
                await $.api.storage.local.set({["cache_" + opts.name]: opts.val});
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
            const result = await $.api.storage.local.get(["cache_" + opts.name]);
            return {val: result["cache_" + opts.name]};
        };

        /**
         * Removes the cached value for the given name
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.remove = async (opts) => {
            if (!b.importRunning) { // don't remove cache while import in running
                await $.api.storage.local.remove(["cache_" + opts.name]);
            }
        };
    };

})(jsu);