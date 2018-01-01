($ => {
    "use strict";

    window.UpgradeHelper = function (b) {

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
            chrome.tabs.create({url: chrome.extension.getURL("html/intro.html")});
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
            let newVersion = b.manifest.version;

            if (details.previousVersion !== newVersion) {
                b.helper.analytics.trackEvent({
                    category: "extension",
                    action: "update",
                    label: details.previousVersion + " -> " + newVersion,
                    always: true
                });
            }

            let versionPartsOld = details.previousVersion.split(".");
            let versionPartsNew = newVersion.split(".");

            if (versionPartsOld[0] !== versionPartsNew[0] || versionPartsOld[1] !== versionPartsNew[1]) { // version jump (e.g. 2.1.x -> 2.2.x)
                handleVersionUpgrade(newVersion).then(() => {
                    b.reinitialize();
                });
            } else {
                b.reinitialize();
            }
        };

        /**
         * Upgrade the stored data for the new version, show the changelog page if user hasn't seen it for the new version before
         *
         * @param {int} newVersion
         * @returns {Promise}
         */
        let handleVersionUpgrade = (newVersion) => {
            return new Promise((resolve) => {
                let savedCount = 0;

                let savedValues = () => {
                    savedCount++;
                    if (savedCount >= 3) { // newtab, behaviour and appearance
                        resolve();
                    }
                };

                chrome.storage.sync.get(null, (obj) => { // get all stored information
                    if (typeof obj.model !== "undefined" && (typeof obj.model.updateNotification === "undefined" || obj.model.updateNotification !== newVersion)) { // show changelog only one time for this update
                        b.helper.model.setData("updateNotification", newVersion).then(() => {
                            if (newVersion.search("1.11.") !== 0) { // @deprecated don't show changelog when upgrading to 1.11
                                chrome.tabs.create({url: chrome.extension.getURL("html/changelog.html")});
                            }
                        });
                    }

                    if (typeof obj.behaviour === "undefined") {
                        obj.behaviour = {};
                    }

                    if (typeof obj.appearance === "undefined") {
                        obj.appearance = {};
                    }

                    if (typeof obj.newtab === "undefined") {
                        obj.newtab = {};
                    }

                    // START UPGRADE // v1.12 -> released [...]
                    if (typeof obj.behaviour.reopenSidebar === "undefined" && typeof obj.behaviour.autoOpen !== "undefined") {
                        obj.behaviour.reopenSidebar = obj.behaviour.autoOpen;
                        delete obj.behaviour.autoOpen;
                        delete obj.utility.autoOpen;
                        if (typeof obj.utility !== "undefined") {
                            chrome.storage.local.set({utility: obj.utility});
                        }
                    }

                    if (typeof obj.newtab.autoOpen === "undefined" && typeof obj.newtab.initialOpen !== "undefined") {
                        obj.newtab.autoOpen = obj.newtab.initialOpen;
                        delete obj.newtab.initialOpen;
                    }

                    chrome.storage.sync.remove(["shareUserdata"]);
                    // END UPGRADE // v1.12

                    // START UPGRADE // v1.11 -> released 01-2018
                    delete obj.behaviour.initialOpenOnNewTab;
                    delete obj.behaviour.replaceNewTab;
                    delete obj.behaviour.language;
                    delete obj.appearance.language;
                    delete obj.appearance.sidebarPosition;

                    if (typeof obj.appearance.styles === "undefined") {
                        obj.appearance.styles = {};
                    }

                    if (typeof obj.shareInfo === "undefined" && typeof obj.shareUserdata !== "undefined" && (obj.shareUserdata === true || obj.shareUserdata === false)) {
                        chrome.storage.sync.set({
                            shareInfo: {
                                config: obj.shareUserdata,
                                activity: obj.shareUserdata
                            }
                        });
                    }

                    if (typeof obj.appearance.styles.hoverColor === "undefined") {
                        obj.appearance.styles.hoverColor = obj.appearance.darkMode ? "#555555" : "#f5f5f5";
                    }
                    // END UPGRADE // v1.11

                    chrome.storage.sync.set({behaviour: obj.behaviour}, savedValues);
                    chrome.storage.sync.set({newtab: obj.newtab}, savedValues);
                    chrome.storage.sync.set({appearance: obj.appearance}, savedValues);
                });
            });
        };
    };

})(jsu);