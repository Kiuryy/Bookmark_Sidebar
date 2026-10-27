($ => {
    "use strict";

    $.SettingsImportExportHelper = function (s) {

        let dialog = null;

        /**
         * Initialises the export and import buttons of the import/export dialog
         */
        this.init = () => {
            dialog = $(`section#import-export-${$.cl.settings.dialog}`);

            if (s.helper.premium.hasAccess("importExport")) { // for other users the buttons are disabled and covered by the premium banner
                initExport();
                initImport();
            }

            dialog.find(`a[${$.attr.type}='syncSettings']`).on("click", (e) => {
                e.preventDefault();
                s.helper.model.call("openLink", {
                    href: "chrome://settings/syncSetup", // gets replaced with the matching url for other browsers by the background script
                    newTab: true,
                    active: true
                });
            });
        };

        /**
         * Returns the config which should be exported (also used by the content script to prefill the feedback form on the website)
         *
         * @returns {object}
         */
        this.getExportConfig = () => {
            const config = Object.assign({}, s.helper.model.getAllData());
            const utility = config.utility || {};

            config.utility = {
                customCss: utility.customCss || "",
                newtabBackground: utility.newtabBackground || ""
            };

            return config;
        };

        /**
         * Shows an alert popup with an error message that the import failed
         */
        const alertImportError = () => {
            window.alert(s.helper.i18n.get("settings_import_failed"));
        };

        /**
         * Initialises the export button, the file is generated when clicking the button, so it always contains the currently stored configuration
         */
        const initExport = () => {
            dialog.find(`a[${$.attr.type}='export']`).on("click", (e) => { // the href is read after the event handlers ran, so setting it here is enough
                const config = JSON.stringify(this.getExportConfig(), null, 2);
                $(e.currentTarget).attr({
                    href: "data:text/json;charset=utf-8," + encodeURIComponent(config),
                    download: getExportFilename()
                });
            });
        };

        /**
         * Initialises the import button
         */
        const initImport = () => {
            dialog.find(`a[${$.attr.type}='import'] > input[type='file']`).on("change", (e) => {
                e.preventDefault();
                const input = e.currentTarget;

                if (input.files && input.files[0] && input.files[0].name.search(/\.bookmark_sidebar$/) > -1) {
                    const reader = new FileReader();

                    reader.onload = (e) => {
                        try {
                            const config = JSON.parse(e.target.result);
                            saveConfig(config);
                        } catch (e) {
                            alertImportError();
                        }
                    };

                    reader.readAsText(input.files[0]);
                } else {
                    alertImportError();
                }

                input.value = ""; // allows choosing the same file again
            });
        };

        /**
         * Saves the given configuration and triggers a refresh of the extension
         *
         * @param {object} config
         * @returns {Promise}
         */
        const saveConfig = async (config) => {
            if (!config.behaviour || !config.appearance || !config.newtab) {
                alertImportError();
                return;
            }

            s.helper.dialog.setLoading("import-export", true);

            await $.api.storage.sync.set({
                behaviour: config.behaviour,
                appearance: config.appearance,
                newtab: config.newtab
            });

            const currentConfig = Object.assign({}, s.helper.model.getAllData());
            currentConfig.utility = currentConfig.utility || {};

            ["customCss", "newtabBackground"].forEach((field) => {
                let val = "";
                if (config.utility && config.utility[field]) {
                    val = config.utility[field];
                }
                currentConfig.utility[field] = val;
            });

            await $.api.storage.local.set({utility: currentConfig.utility});

            s.showMessage("import_saved", "success");

            await s.helper.model.call("reinitialize");
            await $.delay(1500);
            s.helper.model.call("reloadIcon");
            s.helper.model.call("reloadBrowserAction");

            s.reload();
        };

        /**
         * Generates a filename for the export file, based on the current date
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
