($ => {
    "use strict";

    $.UpgradeHelper = function (b) {

        this.loaded = false;

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            chrome.runtime.onUpdateAvailable.addListener(() => { // reload background script when an update is available
                chrome.runtime.reload();
            });

            this.loaded = true;
        };

        /**
         * Show onboarding page and reinitialize the content scripts after the extension was installed
         */
        this.onInstalled = () => {
            const installationDate = b.helper.model.getData("installationDate");

            if (installationDate === null || (+new Date() - installationDate < 60 * 1000)) { // no installation date yet, or installation date from the last minute -> show onboarding page
                b.helper.analytics.track({
                    name: "action",
                    value: {name: "install", value: 1},
                    always: true
                });

                chrome.tabs.create({url: chrome.extension.getURL("html/intro.html")});
            }

            b.reinitialize();
        };

        /**
         * Will be called after the extension was updated,
         * calls the upgrade method after a version jump (1.6 -> 1.7) and reinitializes the content scripts
         *
         * @param {object} details
         */
        this.onUpdated = (details) => {
            chrome.storage.local.remove(["languageInfos"]);
            const newVersion = b.manifest.version;

            const versionPartsOld = details.previousVersion.split(".");
            const versionPartsNew = newVersion.split(".");

            if (versionPartsOld[0] !== versionPartsNew[0] || versionPartsOld[1] !== versionPartsNew[1]) { // version jump (e.g. 2.1.x -> 2.2.x)
                handleVersionUpgrade().then(() => {
                    b.reinitialize();
                });
            } else {
                b.reinitialize();
            }
        };

        /**
         * Upgrades the stored settings and data to be compatible to the new version
         *
         * @returns {Promise}
         */
        const handleVersionUpgrade = () => {
            return new Promise((resolve) => {
                let savedCount = 0;

                const savedValues = () => {
                    savedCount++;
                    if (savedCount >= 3) { // newtab, behaviour and appearance
                        resolve();
                    }
                };

                chrome.storage.sync.get(null, (obj) => { // get all stored information
                    if (typeof obj.behaviour === "undefined") {
                        obj.behaviour = {};
                    }

                    if (typeof obj.appearance === "undefined") {
                        obj.appearance = {};
                    }

                    if (typeof obj.newtab === "undefined") {
                        obj.newtab = {};
                    }

                    try {
                        delete obj.behaviour.initialOpenOnNewTab;
                        delete obj.behaviour.rememberSearch;
                        delete obj.behaviour.rememberScroll;
                        delete obj.behaviour.autoOpen;
                        delete obj.behaviour.pxTolerance;
                        delete obj.behaviour.scrollSensitivity;
                        delete obj.behaviour.hideEmptyDirs;
                        delete obj.behaviour.replaceNewTab;
                        delete obj.behaviour.language;
                        delete obj.appearance.language;
                        delete obj.appearance.sidebarPosition;
                        delete obj.appearance.addVisual;
                        delete obj.newtab.initialOpen;
                    } catch (e) {
                        //
                    }

                    chrome.storage.sync.set({behaviour: obj.behaviour}, savedValues);
                    chrome.storage.sync.set({newtab: obj.newtab}, savedValues);
                    chrome.storage.sync.set({appearance: obj.appearance}, savedValues);
                });
            });
        };
    };

})(jsu);