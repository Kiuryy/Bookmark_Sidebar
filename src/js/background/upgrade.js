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
                await updateOptions("upgrade", details.previousVersion);
            }

            await b.reinitialize();
        };

        /**
         * Updates the stored settings and data after installing or upgrading
         *
         * @param {string} type
         * @param {string} previousVersion only set for type=upgrade
         * @returns {Promise}
         */
        const updateOptions = async (type, previousVersion = null) => {
            const obj = await $.api.storage.sync.get(null); // get all stored information
            const {utility} = await $.api.storage.local.get(["utility"]);
            obj.utility = utility || {};

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
                updateOptionsAfterUpgrade(obj, previousVersion);
            } else if (type === "install") {
                updateOptionsAfterInstall(obj);
            }

            await $.api.storage.sync.set({behaviour: obj.behaviour});
            await $.api.storage.sync.set({newtab: obj.newtab});
            await $.api.storage.sync.set({appearance: obj.appearance});
            await $.api.storage.local.set({utility: obj.utility});
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
         * @param {string} previousVersion
         */
        const updateOptionsAfterUpgrade = (obj, previousVersion) => {
            if (parseInt(previousVersion, 10) < 3 && typeof obj.behaviour.mode === "undefined") { // upgrade from v1/v2 to v3+
                if (obj.behaviour.overlayEnabled === false) {
                    obj.behaviour.mode = "sidepanel";
                } else if (obj.behaviour.openAction === "icon" || (obj.behaviour.iconAction && obj.behaviour.iconAction !== "sidepanel")) { // extension icon toggled the overlay
                    obj.behaviour.mode = "overlay";
                } else {
                    obj.behaviour.mode = "both";
                }
            }

            if (obj.behaviour.toggleArea && typeof obj.behaviour.toggleArea === "object") { // toggleArea was split into separate trigger* options
                Object.entries({
                    width: "triggerWidth",
                    widthWindowed: "triggerWidthWindowed",
                    height: "triggerHeight",
                    top: "triggerOffsetTop"
                }).forEach(([oldKey, newKey]) => {
                    if (typeof obj.behaviour.toggleArea[oldKey] !== "undefined" && typeof obj.behaviour[newKey] === "undefined") {
                        obj.behaviour[newKey] = +obj.behaviour.toggleArea[oldKey];
                    }
                });
            }

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
                delete obj.behaviour.overlayEnabled;
                delete obj.behaviour.iconAction;
                delete obj.behaviour.toggleArea;
                delete obj.appearance.showIndicator;
                delete obj.appearance.showIndicatorIcon;
                delete obj.appearance.showBookmarkIcons;
                delete obj.appearance.showDirectoryIcons;
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
                delete obj.newtab.override;
                delete obj.newtab.focusOmnibox;
                delete obj.newtab.website;

                if (typeof obj.utility.lockPinned !== "undefined") { // lockPinned moved from utility to behaviour
                    if (typeof obj.behaviour.lockPinned === "undefined") {
                        obj.behaviour.lockPinned = obj.utility.lockPinned;
                    }
                    delete obj.utility.lockPinned;
                }
            } catch (e) {
                //
            }
        };
    };

})(jsu);