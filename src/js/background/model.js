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

                    if (typeof data.premiumInfo === "undefined") { // no premium teaser displayed yet -> initialise with null
                        data.premiumInfo = null;
                    }

                    saveModelData().then(resolve);
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
         * Checks if there is any information the extension should display to the user and returns the name of this info
         *
         * @returns {Promise}
         */
        this.getInfoToDisplay = () => {
            return new Promise((resolve) => {
                if (data && data.installationDate) {
                    const daysSinceInstall = (+new Date() - data.installationDate) / 86400000;

                    if (shareInfo.config === null && shareInfo.activity === null && daysSinceInstall > 7) { // user has installed the extension for at least 7 days and has not set his tracking preferences
                        resolve({info: "shareInfo"});
                    } else {
                        this.getUserType().then((obj) => {
                            const daysSincePremiumInfo = data.premiumInfo === null ? 365 : (+new Date() - data.premiumInfo) / 86400000;

                            if (obj.userType !== "premium" && daysSincePremiumInfo > 200 && daysSinceInstall > 14) { // premium teaser hasn't been displayed for over 200 days and user has installed the extension for at least 14 days
                                this.setData("premiumInfo", +new Date()).then(() => {
                                    resolve({info: "premium"});
                                });
                            } else {
                                resolve({info: null});
                            }
                        });
                    }
                } else {
                    resolve({info: null});
                }
            });
        };

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
                saveModelData().then(resolve);
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
        const saveModelData = () => {
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