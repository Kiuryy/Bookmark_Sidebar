($ => {
    "use strict";

    $.NewtabHelper = function (s) {

        let overrideCheckboxInited = false;
        const faviconInputs = [];
        const faviconPadding = {regular: 18, transparent: 10};

        /**
         * Initialises the behaviour settings
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();
            s.elm.newtab.content.find("div." + $.cl.settings.newtab.hideable).addClass($.cl.hidden);

            ["override", "autoOpen", "focusOmnibox"].forEach((field) => {
                if (s.helper.model.getData("n/" + field) === true) {
                    if (field === "override") { // only enable override checkbox if the user granted permissions
                        $.api.permissions.contains({
                            permissions: ["tabs", "topSites"] // don't check the "history" permission, since in legacy versions of the extension this permission wasn't necessary
                        }, (result) => {
                            if (result) {
                                s.elm.checkbox[field].trigger("click");
                            }
                            overrideCheckboxInited = true;
                        });
                    } else {
                        s.elm.checkbox[field].trigger("click");
                    }
                } else if (field === "override") {
                    overrideCheckboxInited = true;
                }
            });

            ["faviconBackground", "faviconColor"].forEach((field) => {
                const value = s.helper.model.getData("n/" + field);
                s.helper.form.changeColorValue(s.elm.color[field], value);
                faviconInputs.push(s.elm.color[field]);
            });

            ["faviconShape"].forEach((field) => {
                const value = s.helper.model.getData("n/" + field);
                s.elm.radio[field][0].value = value;
                s.elm.radio[field].trigger("change");
                faviconInputs.push(s.elm.radio[field]);
            });

            ["website"].forEach((field) => {
                s.elm.field[field][0].value = s.helper.model.getData("n/" + field);
            });
        };

        /**
         * Save the behaviour settings
         *
         * @returns {Promise}
         */
        this.save = () => {
            return new Promise((resolve) => {
                $.api.storage.sync.get(["newtab"], (obj) => {
                    const config = obj.newtab || {};

                    ["override", "autoOpen", "focusOmnibox"].forEach((field) => {
                        config[field] = s.helper.checkbox.isChecked(s.elm.checkbox[field]);
                    });

                    ["faviconBackground", "faviconColor"].forEach((field) => {
                        const colorValue = s.helper.form.getColorValue(field, s.elm.color[field][0].value);
                        config[field] = colorValue.color;
                    });
                    config.faviconPadding = faviconPadding[config.faviconBackground === "transparent" ? "transparent" : "regular"]; // more padding, if the favicon is on a colored background

                    ["faviconShape"].forEach((field) => {
                        config[field] = s.elm.radio[field][0].value;
                    });

                    ["website"].forEach((field) => {
                        config[field] = s.elm.field[field][0].value.trim();
                    });

                    if (config.website && config.website.length && config.website.search(/^[\w-]+:\/\//) !== 0) { // prepend http if no protocol specified
                        config.website = "http://" + config.website;
                    }

                    $.api.storage.sync.set({newtab: config}, resolve);
                });
            });
        };

        /**
         * Initialises the eventhandlers
         */
        const initEvents = () => {
            s.elm.checkbox.override.children("input[type='checkbox']").on("change", () => {
                let override = s.helper.checkbox.isChecked(s.elm.checkbox.override);
                const hideableBoxes = s.elm.newtab.content.find("div." + $.cl.settings.newtab.hideable);

                if (override) {
                    if (overrideCheckboxInited === true) {
                        $.api.permissions.request({ // request additional permissions in order to override the new tab page
                            permissions: ["tabs", "topSites", "history"]
                        }, (granted) => {
                            if (!granted) { // not granted -> no overriding
                                s.elm.checkbox.override.trigger("click");
                                override = false;
                            }

                            if (override) {
                                hideableBoxes.removeClass($.cl.hidden);
                            } else {
                                hideableBoxes.addClass($.cl.hidden);
                            }
                        });
                    } else {
                        hideableBoxes.removeClass($.cl.hidden);
                    }
                } else {
                    hideableBoxes.addClass($.cl.hidden);
                }
            });

            const faviconPreviewCtx = s.elm.newtab.faviconPreview[0].getContext("2d");
            const previewImage = new Image();
            previewImage.onload = () => {
                faviconPreviewCtx.clearRect(0, 0, s.elm.newtab.faviconPreview[0].width, s.elm.newtab.faviconPreview[0].height);
                faviconPreviewCtx.drawImage(previewImage, 0, 0);
            };

            s.elm.newtab.content.find("input").on("change input", (e) => {
                if (faviconInputs.indexOf(e.currentTarget)) { // updated one of the favicon options -> update preview as well
                    const bgColor = s.helper.form.getColorValue("faviconBackground", s.elm.color.faviconBackground[0].value).color;

                    s.helper.model.call("iconImageData", {
                        name: s.elm.radio.faviconShape[0].value,
                        color: s.helper.form.getColorValue("faviconColor", s.elm.color.faviconColor[0].value).color,
                        background: bgColor,
                        padding: faviconPadding[bgColor === "transparent" ? "transparent" : "regular"],
                        asDataURL: true
                    }).then((imageData) => {
                        previewImage.src = imageData;
                    });
                }
            });
        };
    };

})(jsu);