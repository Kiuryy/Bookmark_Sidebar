($ => {
    "use strict";

    window.ImportExportHelper = function (s) {

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initExport();
            initImport();
        };

        /**
         * Returns the config which should be exported
         *
         * @returns {object}
         */
        this.getExportConfig = () => {
            let config = Object.assign({}, s.helper.model.getAllData());
            delete config.utility;
            return config;
        };

        /**
         * Shows an alert popup with an error message that the import failed
         */
        let alertImportError = () => {
            s.helper.model.call("trackEvent", {
                category: "settings",
                action: "import",
                label: "failed"
            });
            alert(s.helper.i18n.get("settings_import_failed"));
        };

        /**
         * Initialises the import function
         *
         * @returns {Promise}
         */
        let initImport = async () => {

            s.opts.elm.buttons.import.on("change", (e) => { // import config
                e.preventDefault();
                let _self = e.currentTarget;

                if (_self.files && _self.files[0] && _self.files[0].name.search(/\.config$/) > -1) {
                    let reader = new FileReader();

                    reader.onload = (e) => {
                        try {
                            let config = JSON.parse(e.target.result);
                            if (config.behaviour && config.appearance) {
                                $.api.storage.sync.set({
                                    behaviour: config.behaviour,
                                    appearance: config.appearance
                                }, () => {
                                    s.helper.model.call("trackEvent", {
                                        category: "settings",
                                        action: "import",
                                        label: "import"
                                    });
                                    s.helper.model.call("reinitialize");
                                    s.showSuccessMessage("import_saved");
                                    $.delay(1500).then(() => {
                                        location.reload(true);
                                    });
                                });
                            } else {
                                alertImportError();
                            }
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
         * Initialises the export function
         *
         * @returns {Promise}
         */
        let initExport = async () => {
            s.opts.elm.buttons.export.attr({
                href: "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.getExportConfig())),
                download: "bookmark-sidebar.config"
            }).on("click", () => {
                s.helper.model.call("trackEvent", {
                    category: "settings",
                    action: "export",
                    label: "export"
                });
            });
        };

    };

})(jsu);