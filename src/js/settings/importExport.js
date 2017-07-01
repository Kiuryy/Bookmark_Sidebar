($ => {
    "use strict";

    window.ImportExportHelper = function (s) {

        /**
         *
         */
        this.init = async () => {
            initExport();
            initImport();
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
         */
        let initImport = async () => {

            s.opts.elm.menuContainer.find("> ul > li > a[" + s.opts.attr.name + "='import'] > input[type='file']").on("change", (e) => { // import config
                e.preventDefault();
                let _self = e.currentTarget;

                if (_self.files && _self.files[0] && _self.files[0].name.search(/\.config$/) > -1) {
                    let reader = new FileReader();

                    reader.onload = (e) => {
                        try {
                            let config = JSON.parse(e.target.result);
                            if (config.behaviour && config.appearance) {
                                chrome.storage.sync.set({
                                    behaviour: config.behaviour,
                                    appearance: config.appearance
                                }, () => {
                                    s.helper.model.call("trackEvent", {
                                        category: "settings",
                                        action: "import",
                                        label: "import"
                                    });
                                    s.helper.model.call("refreshAllTabs", {type: "Settings"});
                                    s.showSuccessMessage("import_saved");
                                    setTimeout(() => {
                                        location.reload(true);
                                    }, 1500);
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
         */
        let initExport = async () => {
            let config = Object.assign({}, s.helper.model.getAllData());
            delete config.utility;

            s.opts.elm.menuContainer.find("> ul > li > a[" + s.opts.attr.name + "='export']").attr({
                href: "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config)),
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