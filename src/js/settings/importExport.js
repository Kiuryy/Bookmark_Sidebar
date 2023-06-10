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
            s.addNoPremiumText(s.elm.importExport.content.find("div[" + $.attr.value + "='exportSettings']"));

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

                if (_self.files && _self.files[0] && _self.files[0].name.search(/\.bookmark_sidebar$/) > -1) {
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
                $.api.storage.sync.set({
                    behaviour: config.behaviour,
                    appearance: config.appearance,
                    newtab: config.newtab
                }, () => {
                    const currentConfig = Object.assign({}, s.helper.model.getAllData());
                    currentConfig.utility = currentConfig.utility || {};

                    ["customCss", "newtabBackground"].forEach((field) => {
                        let val = "";
                        if (config.utility && config.utility[field]) {
                            val = config.utility[field];
                        }
                        currentConfig.utility[field] = val;
                    });

                    $.api.storage.local.set({utility: currentConfig.utility}, () => {
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
            const config = JSON.stringify(this.getExportConfig(), null, 2);
            s.elm.buttons["export"].attr({
                href: "data:text/json;charset=utf-8," + encodeURIComponent(config),
                download: getExportFilename()
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