($ => {
    "use strict";

    window.ModelHelper = function (b) {
        let data = {};
        let shareInfo = {
            config: null,
            activity: null
        };

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                chrome.storage.sync.get(["model", "shareInfo"], (obj) => {
                    data = obj.model || {};
                    if (typeof obj.shareInfo === "object") {
                        shareInfo = obj.shareInfo;
                    }

                    if (typeof data.installationDate === "undefined") { // no date yet -> save a start date in storage
                        data.installationDate = +new Date();
                    }

                    let today = +new Date().setHours(0, 0, 0, 0);
                    if (typeof data.lastTrackDate === "undefined" || data.lastTrackDate !== today) {
                        data.lastTrackDate = today;
                        b.helper.analytics.trackUserData();
                    }

                    saveData().then(resolve);
                });
            });
        };

        /**
         * Returns information about what the user allows to be tracked
         *
         * @returns {object}
         */
        this.getShareInfo = () => shareInfo;

        /**
         * Sets the information about what the users wants to be tracked
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.setShareInfo = (opts) => {
            return new Promise((resolve) => {
                shareInfo = {
                    config: opts.config || false,
                    activity: opts.activity || false
                };

                chrome.storage.sync.set({
                    shareInfo: shareInfo
                }, () => {
                    chrome.runtime.lastError; // do nothing specific with the error -> is thrown if too many save attempts are triggered
                    resolve();
                });
            });
        };

        /**
         * Saves the given value under the given name
         *
         * @param {string} key
         * @param {*} val
         * @returns {Promise}
         */
        this.setData = (key, val) => {
            return new Promise((resolve) => {
                data[key] = val;
                saveData().then(resolve);
            });
        };

        /**
         * Returns the value to the given name
         *
         * @param {string} key
         * @returns {*|null}
         */
        this.getData = (key) => {
            return data[key] || null;
        };

        /**
         * Saves the data object into the synced storage
         *
         * @returns {Promise}
         */
        let saveData = () => {
            return new Promise((resolve) => {
                if (Object.getOwnPropertyNames(data).length > 0) {
                    chrome.storage.sync.set({
                        model: data
                    }, () => {
                        chrome.runtime.lastError; // do nothing specific with the error -> is thrown if too many save attempts are triggered
                        resolve();
                    });
                }
            });
        };
    };

})(jsu);