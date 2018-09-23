($ => {
    "use strict";

    $.ImportExportHelper = function (s) {

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            if (s.helper.model.getUserType() !== "default") {
                initExport();
                initImport();
            } else {
                initNoPremium();
            }
        };

        /**
         * Returns the config which should be exported
         *
         * @returns {object}
         */
        this.getExportConfig = () => {
            const config = Object.assign({}, s.helper.model.getAllData());

            if (s.helper.model.getUserType() !== "default") {
                config.utility = {
                    customCss: config.utility.customCss || "",
                    newtabBackground: config.utility.newtabBackground || ""
                };
            } else {
                delete config.utility;
            }

            return config;
        };

        /**
         * Shows an alert popup with an error message that the import failed
         */
        const alertImportError = () => {
            window.alert(s.helper.i18n.get("settings_import_failed"));
        };

        /**
         *
         */
        const initNoPremium = () => {
            s.addNoPremiumText(s.elm.importExport.content.children("div"));

            ["import", "export"].forEach((field) => {
                s.elm.buttons[field].addClass($.cl.settings.inactive);
            });
        };

        /**
         * Initialises the import function
         *
         * @returns {Promise}
         */
        const initImport = async () => {
            s.elm.buttons["import"].children("input[type='file']").on("change", (e) => { // import config
                e.preventDefault();
                const _self = e.currentTarget;

                if (_self.files && _self.files[0] && (_self.files[0].name.search(/\.bookmark_sidebar$/) > -1 || _self.files[0].name.search(/\.config$/) > -1)) { // @deprecated '.config' is not used anymore to avoid conflicts (01-2018)
                    const reader = new FileReader();

                    reader.onload = (e) => {
                        try {
                            const config = JSON.parse(e.target.result);
                            saveConfig(config);
                        } catch (e) {
                            alertImportError();
                        }
                    };

                    reader.readAsText(_self.files[0]);
                } else {
                    alertImportError();
                }
            });
        };

        /**
         * Saves the given configuration and triggers a refresh of the extension
         *
         * @param {object} config
         */
        const saveConfig = (config) => {
            if (config.behaviour && config.appearance && config.newtab) {
                chrome.storage.sync.set({
                    behaviour: config.behaviour,
                    appearance: config.appearance,
                    newtab: config.newtab
                }, () => {
                    const currentConfig = Object.assign({}, s.helper.model.getAllData());
                    currentConfig.utility = currentConfig.utility || {};

                    ["customCss", "newtabBackground"].forEach((field) => {
                        let val = "";
                        if (s.helper.model.getUserType() !== "default" && config.utility && config.utility[field]) { // only import custom css and new tab background when the user has premium
                            val = config.utility[field];
                        }
                        currentConfig.utility[field] = val;
                    });

                    chrome.storage.local.set({utility: currentConfig.utility}, () => {
                        s.helper.model.call("reinitialize");
                        s.showSuccessMessage("import_saved");
                        $.delay(1500).then(() => {
                            location.reload(true);
                        });
                    });
                });
            } else {
                alertImportError();
            }
        };

        /**
         * Initialises the export function
         *
         * @returns {Promise}
         */
        const initExport = async () => {
            s.elm.buttons["export"].on("click", (e) => {
                e.preventDefault();

                chrome.permissions.request({ // request additional permissions in order to trigger a download with the configuration
                    permissions: ["downloads"]
                }, (granted) => {
                    if (granted) { // not granted -> no download
                        const blob = new Blob([JSON.stringify(this.getExportConfig())], {type: "application/json"});

                        chrome.downloads.download({
                            url: URL.createObjectURL(blob),
                            filename: getExportFilename(),
                            saveAs: true
                        });
                    }
                });
            });
        };

        /**
         * Generates a filename for the export file, based on the current date and time
         *
         * @returns {string}
         */
        const getExportFilename = () => {
            const monthNames = [
                "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"
            ];

            const now = new Date();
            const dateStr = now.getDate() + "-" + monthNames[now.getMonth()] + "-" + now.getFullYear();

            return "config_" + dateStr + ".bookmark_sidebar";
        };
    };

})(jsu);