($ => {
    "use strict";

    window.UpgradeHelper = function (b) {


        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                initListener();
                resolve();
            });
        };

        /**
         * Initialises the eventlisteners
         */
        let initListener = () => {
            chrome.runtime.onUpdateAvailable.addListener(() => { // reload background script when an update is available
                chrome.runtime.reload();
            });

            chrome.runtime.onInstalled.addListener((details) => {
                if (details.reason === 'install') { // extension was installed newly -> show onboarding page
                    chrome.tabs.create({url: chrome.extension.getURL('html/intro.html')});
                    b.reinitialize();
                } else if (details.reason === 'update') { // extension was updated
                    chrome.storage.local.remove(["languageInfos"]);
                    let newVersion = chrome.runtime.getManifest().version;

                    if (details.previousVersion !== newVersion) {
                        b.helper.analytics.trackEvent({
                            category: "extension",
                            action: "update",
                            label: details.previousVersion + " -> " + newVersion,
                            always: true
                        });
                    }

                    let versionPartsOld = details.previousVersion.split('.');
                    let versionPartsNew = newVersion.split('.');

                    if (versionPartsOld[0] !== versionPartsNew[0] || versionPartsOld[1] !== versionPartsNew[1]) { // version jump (e.g. 2.1.x -> 2.2.x)
                        handleVersionUpgrade(newVersion).then(() => {
                            b.reinitialize();
                        });
                    } else {
                        b.reinitialize();
                    }
                }
            });
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
                        b.helper.icon.init(); // @deprecated only for upgrade to v1.0
                        resolve();
                    }
                };

                chrome.storage.sync.get(["model"], (obj) => {
                    if (typeof obj.model !== "undefined" && (typeof obj.model.updateNotification === "undefined" || obj.model.updateNotification !== newVersion)) { // show changelog only one time for this update
                        b.helper.model.setData("updateNotification", newVersion).then(() => {
                            chrome.tabs.create({url: chrome.extension.getURL('html/changelog.html')});
                        });
                    }
                });

                chrome.storage.sync.get(null, (obj) => {  // upgrade configuration
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
                    //delete obj.behaviour.initialOpenOnNewTab;
                    //delete obj.behaviour.replaceNewTab;
                    // END UPGRADE // v1.11

                    // START UPGRADE // v1.10
                    chrome.storage.sync.remove(["utility", "nt_notice"]);

                    ["sidebarPosition", "language"].forEach((f) => {
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

                        if (obj.newtab.override === true && newVersion.startsWith("1.10.")) {
                            obj.newtab.shortcuts = [
                                {label: "Chrome Apps", url: "chrome://apps"},
                                {label: "Gmail", url: "https://mail.google.com/mail/"},
                                {label: "YouTube", url: "https://www.youtube.com/"},
                                {label: "Facebook", url: "https://www.facebook.com/"}
                            ];
                        }
                    }

                    if (typeof obj.behaviour.rememberState === "undefined" || obj.behaviour.rememberState === "all") {
                        obj.behaviour.rememberState = "openStatesAndPos";
                    }

                    if (typeof obj.appearance.styles === "undefined") {
                        obj.appearance.styles = {};
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