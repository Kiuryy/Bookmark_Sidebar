($ => {
    "use strict";

    $.ModelHelper = function (b) {
        let data = {};
        let licenseKey = null;
        let systemColor = "light";
        let translationInfo = [];
        let shareInfo = {
            config: null,
            activity: null
        };

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            const config = await $.api.storage.sync.get(["model", "shareInfo", "translationInfo", "licenseKey", "systemColor"]);
            data = config.model || {};

            if (typeof config.shareInfo === "object") {
                shareInfo = config.shareInfo;
            }

            if (typeof config.licenseKey === "string" && config.licenseKey.length === 29) {
                licenseKey = config.licenseKey;
            }

            if (typeof config.systemColor !== "undefined") {
                systemColor = config.systemColor;
            }

            if (typeof config.translationInfo === "object") {
                translationInfo = config.translationInfo;
            }

            if (typeof data.installationDate === "undefined") { // no date yet -> save a start date in storage
                data.installationDate = +new Date();
            }

            if (typeof data.lastUpdateDate === "undefined") { // no date yet -> save a start date in storage
                data.lastUpdateDate = +new Date();
            }

            if (typeof data.premiumInfo === "undefined") { // no premium teaser displayed yet -> initialise with null
                data.premiumInfo = null;
            }

            if (typeof data.translationReminder === "undefined") { // no reminder of missing translation variables displayed yet -> initialise with null
                data.translationReminder = null;
            }

            await saveModelData();
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
         * @returns {Promise}
         */
        this.getLicenseKey = async () => {
            return {licenseKey: licenseKey};
        };

        /**
         * Checks if there is any information the extension should display to the user and returns the name of this info
         *
         * @returns {Promise}
         */
        this.getInfoToDisplay = async () => {
            if (data && data.installationDate) {
                const daysSinceInstall = (+new Date() - data.installationDate) / 86400000;
                const daysSinceTranslationReminder = data.translationReminder === null ? 365 : (+new Date() - data.translationReminder) / 86400000;

                if (shareInfo.config === null && shareInfo.activity === null && daysSinceInstall > 7) { // user has installed the extension for at least 7 days and has not set his tracking preferences
                    return {info: "shareInfo"};
                } else if (translationInfo.length > 0 && daysSinceTranslationReminder > 3) { // user has enabled translation reminder and didn't got one the last three days -> check whether a language the user wants to be notified about is incomplete
                    const langList = await b.helper.language.getIncompleteLanguages();
                    await this.setData("translationReminder", +new Date());

                    for (const lang of translationInfo) {
                        if (langList.indexOf(lang) !== -1) { // a language of the list is incomplete -> show info box
                            return {info: "translation"};
                        }
                    }
                } else {
                    const obj = await this.getUserType();
                    const daysSincePremiumInfo = data.premiumInfo === null ? 365 : (+new Date() - data.premiumInfo) / 86400000;

                    if (obj.userType !== "premium" && daysSincePremiumInfo > 200 && daysSinceInstall > 14) { // premium teaser hasn't been displayed for over 200 days and user has installed the extension for at least 14 days
                        await this.setData("premiumInfo", +new Date());
                        return {info: "premium"};
                    }
                }
            }

            return {info: null};
        };

        /**
         * Determines the user type (default, legacy or premium)
         *
         * @returns {Promise}
         */
        this.getUserType = async () => {
            let userType = "default";

            if (typeof licenseKey === "string" && licenseKey.length === 29) { // license key is available
                userType = "premium";
            } else if (data && data.installationDate && data.installationDate < 1538352000000) { // installed before 01.10.2018
                userType = "legacy";
            }

            return {userType: userType};
        };

        /**
         * Returns the prefered system surface color
         *
         * @returns {string}
         */
        this.getSystemColor = () => systemColor;

        /**
         * Sets the information about what the users wants to be tracked
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.setShareInfo = async (opts) => {
            try {
                shareInfo = {
                    config: opts.config || false,
                    activity: opts.activity || false
                };

                await $.api.storage.sync.set({
                    shareInfo: shareInfo
                });
            } catch (e) {
                // do nothing specific with the error -> is thrown if too many save attempts are triggered
                console.error(e);
            }
        };

        /**
         * Stores the given license key in the sync storage
         *
         * @param {string} key
         * @returns {Promise}
         */
        this.setLicenseKey = async (key) => {
            try {
                await $.api.storage.sync.set({licenseKey: key});
                licenseKey = key;
                return {success: true};
            } catch (e) {
                return {success: false, message: $.api.runtime.lastError.message};
            }
        };

        /**
         * Handles the system surface color change. If the surface color changed, the extension icon will be reinitialized
         *
         * @param opts
         * @returns {Promise<void>}
         */
        this.systemColorChanged = async (opts) => {
            if (systemColor !== opts.surface) {
                systemColor = opts.surface;
                await b.helper.icon.init();
                try {
                    await $.api.storage.sync.set({
                        systemColor: systemColor
                    });
                } catch (e) {
                    // do nothing specific with the error -> is thrown if too many save attempts are triggered
                    console.error(e);
                }
            }
        };

        /**
         * Saves the given value under the given name
         *
         * @param {string} key
         * @param {*} val
         * @returns {Promise}
         */
        this.setData = async (key, val) => {
            data[key] = val;
            await saveModelData();
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
        const saveModelData = async () => {
            if (Object.getOwnPropertyNames(data).length > 0) {
                try {
                    await $.api.storage.sync.set({model: data}); // save to sync storage
                } catch (e) {
                    // do nothing specific with the error -> is thrown if too many save attempts are triggered
                    console.error(e);
                }
            }
        };
    };

})(jsu);