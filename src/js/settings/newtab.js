($ => {
    "use strict";

    window.NewtabHelper = function (s) {

        let inited = false;

        /**
         * Initialises the behaviour settings
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();
            s.opts.elm.newtab.content.find("div." + s.opts.classes.newtab.hideable).addClass(s.opts.classes.hidden);

            ["override", "initialOpen"].forEach((field) => {
                if (s.helper.model.getData("n/" + field) === true) {
                    s.opts.elm.checkbox[field].trigger("click");
                }
            });

            ["website"].forEach((field) => {
                s.opts.elm.field[field][0].value = s.helper.model.getData("n/" + field);
            });

            inited = true;
        };

        /**
         * Save the behaviour settings
         *
         * @returns {Promise}
         */
        this.save = () => {
            return new Promise((resolve) => {
                let config = {};

                ["override", "initialOpen"].forEach((field) => {
                    config[field] = s.helper.checkbox.isChecked(s.opts.elm.checkbox[field]);
                });

                ["website"].forEach((field) => {
                    config[field] = s.opts.elm.field[field][0].value.trim();
                });

                if (config.website && config.website.length && config.website.search(/^\w+\:\/\//) !== 0) { // prepend http if no protocol specified
                    config.website = "http://" + config.website;
                }

                chrome.storage.sync.set({newtab: config}, () => {
                    s.helper.model.call("reinitialize");
                    s.showSuccessMessage("saved_message");
                    resolve();
                });
            });
        };

        /**
         * Initialises the eventhandlers
         */
        let initEvents = () => {
            s.opts.elm.checkbox.override.children("input[type='checkbox']").on("change", () => {
                let override = s.helper.checkbox.isChecked(s.opts.elm.checkbox.override);
                let hideableBoxes = s.opts.elm.newtab.content.find("div." + s.opts.classes.newtab.hideable);

                if (override) {
                    if (inited === true) {
                        chrome.permissions.request({ // request additional permissions in order to override the new tab page
                            permissions: ['tabs', 'topSites']
                        }, function (granted) {
                            if (!granted) { // not granted -> no overriding
                                s.opts.elm.checkbox.override.trigger("click");
                                override = false;
                            }

                            if (override) {
                                hideableBoxes.removeClass(s.opts.classes.hidden);
                            } else {
                                hideableBoxes.addClass(s.opts.classes.hidden);
                            }
                        });
                    } else {
                        hideableBoxes.removeClass(s.opts.classes.hidden);
                    }
                } else {
                    hideableBoxes.addClass(s.opts.classes.hidden);
                }
            });
        };
    };

})(jsu);