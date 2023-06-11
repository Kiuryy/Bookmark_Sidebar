($ => {
    "use strict";

    $.UpgradeHelper = function (b) {

        this.loaded = false;

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            $.api.runtime.onUpdateAvailable.addListener(() => { // reload background script when an update is available
                $.api.runtime.reload();
            });

            this.loaded = true;
        };

        /**
         * Show onboarding page and reinitialize the content scripts after the extension was installed
         */
        this.onInstalled = async () => {
            const installationDate = b.helper.model.getData("installationDate");

            if (installationDate === null || (+new Date() - installationDate < 60 * 1000)) { // no installation date yet, or installation date from the last minute -> show onboarding page
                b.helper.analytics.track({
                    name: "action",
                    value: {name: "install", value: "true"},
                    always: true
                });

                updateOptions("install");
                b.helper.utility.openLink({
                    href: $.api.runtime.getURL("html/intro.html"),
                    newTab: true
                });
            }

            b.reinitialize();
        };

        /**
         * Will be called after the extension was updated,
         * calls the upgrade method after a version jump (1.6 -> 1.7) and reinitializes the content scripts
         *
         * @param {object} details
         */
        this.onUpdated = async (details) => {
            await $.api.storage.local.remove(["languageInfos"]);
            await b.helper.model.setData("lastUpdateDate", +new Date());
            const newVersion = $.opts.manifest.version;

            const versionPartsOld = details.previousVersion.split(".");
            const versionPartsNew = newVersion.split(".");

            if (versionPartsOld[0] !== versionPartsNew[0] || versionPartsOld[1] !== versionPartsNew[1]) { // version jump (e.g. 2.1.x -> 2.2.x)
                await updateOptions("upgrade");
            }

            await b.reinitialize();
        };

        /**
         * Updates the stored settings and data after installing or upgrading
         *
         * @param {string} type
         * @returns {Promise}
         */
        const updateOptions = async (type) => {
            const obj = await $.api.storage.sync.get(null); // get all stored information
            if (typeof obj.behaviour === "undefined") {
                obj.behaviour = {};
            }

            if (typeof obj.appearance === "undefined") {
                obj.appearance = {};
            }

            if (typeof obj.appearance.styles === "undefined") {
                obj.appearance.styles = {};
            }

            if (typeof obj.newtab === "undefined") {
                obj.newtab = {};
            }

            if (type === "upgrade") {
                updateOptionsAfterUpgrade(obj);
            } else if (type === "install") {
                updateOptionsAfterInstall(obj);
            }

            await $.api.storage.sync.set({behaviour: obj.behaviour});
            await $.api.storage.sync.set({newtab: obj.newtab});
            await $.api.storage.sync.set({appearance: obj.appearance});
        };

        /**
         * Sets some settings of the extension after the installation
         *
         * @param {object} obj
         */
        const updateOptionsAfterInstall = (obj) => {
            if (b.helper.language.getUILanguage() === "zh_CN") {
                obj.newtab.searchEngine = "baidu";
                obj.newtab.topLinks = [{title: "百度", url: "https://www.baidu.com/"}];
            } else {
                obj.newtab.topLinks = [{title: "Google", url: "https://google.com"}];
            }
        };

        /**
         * Upgrades the stored settings and data to be compatible to the new version
         *
         * @param {object} obj
         */
        const updateOptionsAfterUpgrade = (obj) => {
            try {
                delete obj.appearance.darkMode;
                delete obj.behaviour.contextmenu;
                delete obj.behaviour.dndOpen;
                delete obj.behaviour.initialOpenOnNewTab;
                delete obj.behaviour.rememberSearch;
                delete obj.behaviour.rememberScroll;
                delete obj.behaviour.autoOpen;
                delete obj.behaviour.reopenSidebar;
                delete obj.behaviour.pxTolerance;
                delete obj.behaviour.scrollSensitivity;
                delete obj.behaviour.hideEmptyDirs;
                delete obj.behaviour.replaceNewTab;
                delete obj.behaviour.language;
                delete obj.behaviour.model;
                delete obj.appearance.language;
                delete obj.appearance.sidebarPosition;
                delete obj.appearance.addVisual;
                delete obj.appearance.indicatorWidth;
                delete obj.appearance.indicatorIconSize;
                delete obj.newtab.initialOpen;
                delete obj.newtab.topPagesType;
                delete obj.newtab.topPagesMaxCols;
                delete obj.newtab.topPagesMaxRows;
                delete obj.newtab.shortcutsPosition;
                delete obj.newtab.shortcuts;

                const installationDate = b.helper.model.getData("installationDate");
                if (installationDate && installationDate < +new Date("2023-06-12")) {
                    if (!obj.behaviour.iconAction) {
                        obj.behaviour.iconAction = "overlay";
                    }
                    if (typeof obj.behaviour.refocusWebsite === "undefined") {
                        obj.behaviour.refocusWebsite = true;
                    }
                }

                if (obj.appearance.styles && obj.appearance.styles.fontFamily && obj.appearance.styles.fontFamily.toUpperCase() === "DEFAULT") {
                    const existingFontFamily = obj.appearance.styles.fontFamily.toUpperCase();

                    if (existingFontFamily === "DEFAULT"
                        || existingFontFamily === "ROBOTO"
                        || existingFontFamily === "NOTO SANS SC"
                        || existingFontFamily === "NOTO SANS TC"
                        || existingFontFamily === "NOTO SANS JAPANESE") {
                        obj.appearance.styles.fontFamily = "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif";
                    }
                }
            } catch (e) {
                //
            }
        };
    };

})(jsu);