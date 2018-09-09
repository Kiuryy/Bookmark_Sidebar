($ => {
    "use strict";

    $.ModelHelper = function (b) {
        let data = {};
        let licenseKey = null;
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
                chrome.storage.sync.get(["model", "shareInfo", "licenseKey"], (obj) => {
                    data = obj.model || {};
                    if (typeof obj.shareInfo === "object") {
                        shareInfo = obj.shareInfo;
                    }

                    if (typeof obj.licenseKey === "string" && obj.licenseKey.length === 29) {
                        licenseKey = obj.licenseKey;
                    }

                    if (typeof data.installationDate === "undefined") { // no date yet -> save a start date in storage
                        data.installationDate = +new Date();
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
         * Returns the stored license key
         *
         * @returns {object}
         */
        this.getLicenseKey = () => licenseKey;

        /**
         * Determines the user type (default, legacy or premium)
         *
         * @returns {Promise}
         */
        this.getUserType = () => {
            return new Promise((resolve) => {
                let userType = "default";

                if (typeof licenseKey === "string" && licenseKey.length === 29) { // license key is available
                    userType = "premium";
                } else if (data && data.installationDate && data.installationDate < 1538352000000) { // installed before 01.10.2018
                    userType = "legacy";
                }

                resolve({userType: userType});
            });
        };

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
         * Stores the given license key in the sync storage
         *
         * @param {string} key
         * @returns {Promise}
         */
        this.setLicenseKey = (key) => {
            return new Promise((resolve) => {

                chrome.storage.sync.set({
                    licenseKey: key
                }, () => {
                    chrome.runtime.lastError; // do nothing specific with the error -> is thrown if too many save attempts are triggered
                    licenseKey = key;
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