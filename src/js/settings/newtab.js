($ => {
    "use strict";

    $.NewtabHelper = function (s) {

        let overrideCheckboxInited = false;
        let overrideWithWebsite = false;
        const faviconInputs = [];
        const faviconPadding = {regular: 18, transparent: 10};
        const updateFaviconPreviewState = {running: false, awaitUpdate: false};

        /**
         * Initialises the behaviour settings
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();
            initFaviconOptions();

            s.elm.newtab.content.find("div." + $.cl.settings.newtab.hideable).addClass($.cl.hidden);
            s.elm.newtab.buttons.addClass($.cl.hidden);

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
                faviconInputs.push(s.elm.color[field][0]);
            });

            ["faviconShape"].forEach((field) => {
                const value = s.helper.model.getData("n/" + field);
                s.elm.radio[field][0].value = value;
                s.elm.radio[field].trigger("change");
                faviconInputs.push(s.elm.radio[field][0]);
            });

            ["website"].forEach((field) => {
                s.elm.field[field][0].value = s.helper.model.getData("n/" + field);
                overrideWithWebsite = s.elm.field[field][0].value.length > 0;
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

        const initFaviconOptions = () => {
            s.elm.newtab.faviconShapeWrapper.find("ul > li").forEach((option) => {
                s.helper.utility.getIconImageData({
                    shape: $(option).attr($.attr.value),
                    color: "#ffffff",
                    background: "transparent",
                    padding: 0
                }).then((faviconBase64) => {
                    $(option).find("> span > span").css("background-image", `url(${faviconBase64})`);
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
                                showHideButtons();
                            } else {
                                hideableBoxes.addClass($.cl.hidden);
                                s.elm.newtab.buttons.addClass($.cl.hidden);
                            }
                        });
                    } else {
                        hideableBoxes.removeClass($.cl.hidden);
                        showHideButtons();
                    }
                } else {
                    hideableBoxes.addClass($.cl.hidden);
                    s.elm.newtab.buttons.addClass($.cl.hidden);
                }
            });

            s.elm.newtab.content.find("input, select").on("change input", async (e) => {
                if (faviconInputs.indexOf(e.currentTarget) > -1) { // updated one of the favicon options -> update preview as well
                    await updateFaviconPreview();
                } else if (s.elm.field.website[0] === e.currentTarget) {
                    overrideWithWebsite = s.elm.field.website[0].value.length > 0;
                    await showHideButtons();
                }
            });

            s.elm.newtab.buttons.children("a").on("click", (e) => {
                e.preventDefault();
                s.helper.model.call("openLink", {
                    href: $.api.runtime.getURL("html/newtab.html") + ($(e.currentTarget).attr($.attr.name) === "styling" ? "#edit" : ""),
                    newTab: true,
                    active: true
                });
            });
        };

        /**
         * Shows the buttons to open the preview or edit mode of the custom new tab page in case newtabOverride = true and the user did not enter an URL as new tab replacement
         */
        const showHideButtons = async () => {
            if (overrideWithWebsite) {
                s.elm.newtab.buttons.addClass($.cl.hidden);
            } else {
                s.elm.newtab.buttons.removeClass($.cl.hidden);
                await updateFaviconPreview();
            }
        };

        /**
         * Updates the favicon preview,
         * this method does need a bit to finish. If you call the method while a previous call is still running, it will terminate immediately, but set updateFaviconPreviewState.awaitUpdate=true, so the method will call itself after finishing the first run
         */
        const updateFaviconPreview = async () => {
            if (updateFaviconPreviewState.running) { // already running -> tell the method it should run again, after the current execution is ready
                updateFaviconPreviewState.awaitUpdate = true;
            } else {
                updateFaviconPreviewState.awaitUpdate = false;
                updateFaviconPreviewState.running = true;

                const bgColor = s.helper.form.getColorValue("faviconBackground", s.elm.color.faviconBackground[0].value).color;
                const faviconPreviewCtx = s.elm.newtab.faviconPreview[0].getContext("2d");
                const previewImage = new Image();
                previewImage.onload = async () => {
                    faviconPreviewCtx.clearRect(0, 0, s.elm.newtab.faviconPreview[0].width, s.elm.newtab.faviconPreview[0].height);
                    faviconPreviewCtx.drawImage(previewImage, 0, 0);

                    updateFaviconPreviewState.running = false;
                    if (updateFaviconPreviewState.awaitUpdate) { // can this method again, if there was a call to this method will the current run was not ready yet
                        await updateFaviconPreview();
                    }
                };

                previewImage.src = await s.helper.utility.getIconImageData({
                    shape: s.elm.radio.faviconShape[0].value,
                    color: s.helper.form.getColorValue("faviconColor", s.elm.color.faviconColor[0].value).color,
                    background: bgColor,
                    padding: faviconPadding[bgColor === "transparent" ? "transparent" : "regular"]
                });
            }
        };
    };

})(jsu);