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
                            if (typeof obj.model.updateNotification === "undefined" || obj.model.updateNotification.search("1.10.") !== 0) { // @deprecated don't show changelog when upgrading from 1.10 to 1.11
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

                    // START UPGRADE // v1.11
                    delete obj.behaviour.initialOpenOnNewTab;
                    delete obj.behaviour.replaceNewTab;
                    delete obj.behaviour.language;
                    delete obj.appearance.language;
                    delete obj.appearance.sidebarPosition;

                    if (typeof obj.appearance.styles === "undefined") {
                        obj.appearance.styles = {};
                    }

                    if (typeof obj.shareUserdata !== "undefined" && obj.shareUserdata === true || obj.shareUserdata === false) {
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

                    // START UPGRADE // v1.10
                    chrome.storage.sync.remove(["utility", "nt_notice"]);

                    ["sidebarPosition"].forEach((f) => {
                        if (typeof obj.behaviour[f] === "undefined" && typeof obj.appearance[f] !== "undefined") {
                            obj.behaviour[f] = obj.appearance[f];
                        }

                        delete obj.appearance[f];
                    });

                    if (typeof obj.behaviour.initialOpenOnNewTab !== "undefined") {
                        obj.newtab.initialOpen = obj.behaviour.initialOpenOnNewTab;
                    }

                    if (typeof obj.behaviour.replaceNewTab !== "undefined") {
                        obj.newtab.override = obj.behaviour.replaceNewTab;
                    }

                    if (typeof obj.behaviour.rememberState === "undefined" || obj.behaviour.rememberState === "all") {
                        obj.behaviour.rememberState = "openStatesAndPos";
                    }

                    if (typeof obj.appearance.styles.iconShape === "undefined") {
                        obj.appearance.styles.iconShape = "logo";
                    }
                    // END UPGRADE // v1.10

                    // START UPGRADE // v1.9
                    if (typeof obj.utility !== "undefined") {
                        chrome.storage.local.set({utility: obj.utility});
                    }

                    delete obj.behaviour.scrollSensitivity;

                    if (typeof obj.appearance.styles.fontFamily !== "undefined" && obj.appearance.styles.fontFamily === "Roboto") {
                        obj.appearance.styles.fontFamily = "default";
                    }

                    if (typeof obj.appearance.styles.directoriesIconSize === "undefined" && typeof obj.appearance.styles.bookmarksIconSize !== "undefined") {
                        obj.appearance.styles.directoriesIconSize = obj.appearance.styles.bookmarksIconSize;
                    }

                    chrome.storage.sync.remove(["clickCounter"]);
                    // END UPGRADE // v1.9

                    chrome.storage.sync.set({behaviour: obj.behaviour}, savedValues);
                    chrome.storage.sync.set({newtab: obj.newtab}, savedValues);
                    chrome.storage.sync.set({appearance: obj.appearance}, savedValues);
                });
            });
        };
    };

})(jsu);