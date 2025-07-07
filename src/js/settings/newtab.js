($ => {
    "use strict";

    $.NewtabHelper = function (s) {

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

            ["autoOpen"].forEach((field) => {
                if (s.helper.model.getData("n/" + field) === true) {
                    s.elm.checkbox[field].trigger("click");
                }
                s.elm.checkbox[field].children("input").trigger("change");
            });

            ["faviconBackground", "faviconColor"].forEach((field) => {
                const value = s.helper.model.getData("n/" + field);
                s.helper.form.changeColorValue(s.elm.color[field], value);
                faviconInputs.push(s.elm.color[field][0]);
            });

            ["faviconShape"].forEach((field) => {
                s.elm.radio[field][0].value = s.helper.model.getData("n/" + field);
                s.elm.radio[field].trigger("change");
                faviconInputs.push(s.elm.radio[field][0]);
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

                    ["autoOpen"].forEach((field) => {
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
            s.elm.newtab.content.find("input, select").on("change input", async (e) => {
                if (faviconInputs.indexOf(e.currentTarget) > -1) { // updated one of the favicon options -> update preview as well
                    await updateFaviconPreview();
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
         * Updates the favicon preview
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