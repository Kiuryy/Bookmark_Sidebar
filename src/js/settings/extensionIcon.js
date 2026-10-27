($ => {
    "use strict";

    $.SettingsExtensionIconHelper = function (s) {

        let renderPreview = null;

        /**
         * Binds the events of the extension icon fields and renders the preview of the icon
         */
        this.init = () => {
            const elements = s.helper.form.elements;

            renderPreview = s.helper.iconPreview.create("div.extension-icon-preview", () => ({
                shape: elements.radio.iconShape[0].value,
                color: getColor()
            }));

            [elements.color.iconColor, elements.radio.iconShape].forEach((elm) => {
                elm.on("change input", renderPreview);
            });

            initRestoreHandlers();

            elements.select.iconColorType.on("change input", (e) => {
                s.setConditionalClass($("div.extension-icon-color span.custom-color"), $.cl.hidden, e.currentTarget.value === "auto");
                s.helper.form.refreshRestoreButton("iconColor");
                renderPreview();
            }).trigger("input");
        };

        /**
         * Brings the color type field into the state matching the stored icon color
         *
         * @returns {Promise}
         */
        this.applyInitialState = async () => {
            const iconColor = await s.helper.model.getData("a/styles/iconColor");
            s.helper.form.setValue("select", "iconColorType", iconColor === "auto" ? "auto" : "custom");
        };

        /**
         * Returns the selected icon color, or "auto" if the color should follow the browser
         *
         * @returns {string}
         */
        const getColor = () => {
            if (s.helper.form.elements.select.iconColorType[0].value === "auto") {
                return "auto";
            }
            return s.helper.form.getColorValue("iconColor", s.helper.form.elements.color.iconColor[0].value).color;
        };

        /**
         * The iconColor field's real value is either "auto" (governed by iconColorType) or the color picker's value,
         * so its restore button needs to compare against and restore that combined state instead of raw DOM state
         */
        const initRestoreHandlers = () => {
            const iconColorType = s.helper.form.elements.select.iconColorType;

            s.helper.form.setCustomFieldHandlers("iconColor", {
                getState: () => {
                    if (iconColorType[0].value === "auto") {
                        return {value: "auto"};
                    }
                    return {value: s.helper.form.elements.color.iconColor[0].value};
                },
                applyState: (state) => {
                    const type = state.value === "auto" ? "auto" : "custom";
                    if (iconColorType[0].value !== type) {
                        s.helper.form.setValue("select", "iconColorType", type);
                    }

                    if (type === "custom") {
                        s.helper.form.changeColorValue(s.helper.form.elements.color.iconColor, state.value);
                    }
                }
            });
        };
    };

})(jsu);
