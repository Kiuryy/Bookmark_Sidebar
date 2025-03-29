($ => {
    "use strict";

    $.FormHelper = function (s) {

        const initField = {};

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();
            await initFormElements();
        };

        /**
         * Changes the value of the color picker
         *
         * @param elm
         * @param value
         */
        this.changeColorValue = (elm, value) => {
            const picker = elm.data("picker");
            if (picker) {
                picker.setColor(value);
            }
        };

        /**
         * Returns information about the color of the given field
         *
         * @param {string} field
         * @param {string} val
         * @returns {object}
         */
        this.getColorValue = (field, val) => {
            let luminance = null;
            const elm = s.elm.color[field];
            const picker = elm.data("picker");

            if (picker) {
                const colorObj = picker.getColorObj();
                if (colorObj.a === 0) {
                    val = "transparent";
                }
                luminance = 0.299 * colorObj.r + 0.587 * colorObj.g + 0.114 * colorObj.b; // based on https://www.w3.org/TR/AERT#color-contrast
            }

            return {
                color: val,
                luminance: luminance
            };
        };


        /**
         * Initialises the eventhandlers
         */
        const initEvents = () => {
            s.elm.content.on("scroll", () => {
                const path = s.helper.menu.getPath();
                if (path[0] === "appearance") {
                    Object.values(s.elm.color).forEach((elm) => {
                        const picker = elm.data("picker");
                        picker.reposition();
                    });
                }
            });
        };

        /**
         * Initialises all form elements
         *
         * @returns {Promise}
         */
        const initFormElements = async () => {
            const formElements = s.elm.formElement.length();

            for (let i = 0; i <= formElements; i++) {
                const elm = s.elm.formElement[i];

                const opts = {
                    elm: elm,
                    type: $(elm).attr($.attr.type),
                    name: $(elm).attr($.attr.name),
                    i18n: $(elm).attr($.attr.i18n) || ""
                };

                opts.label = $("<label></label>").attr($.attr.i18n, opts.i18n).insertAfter(elm);
                $("<p></p>").addClass($.cl.settings.desc).attr($.attr.i18n, opts.i18n + "_desc").insertAfter(opts.label);

                if (initField[opts.type]) {
                    await initField[opts.type](opts);
                }

                $(elm).remove();
            }
        };

        /**
         * Adds a colorpicker with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.color = async (opts) => {
            s.elm.color[opts.name] = $("<input type='text' />").addClass($.cl.settings.color.field).insertAfter(opts.label);

            const picker = new window.Colorpicker(s.elm.color[opts.name][0], {
                alpha: !!$(opts.elm).attr($.attr.settings.color.alpha)
            });

            const suggestionsRaw = $(opts.elm).attr($.attr.settings.color.suggestions);
            if (suggestionsRaw) {
                const suggestions = JSON.parse(suggestionsRaw);
                const preview = picker.getElements().preview;
                const suggestionElm = [];

                suggestions.forEach((suggestion) => {
                    suggestionElm.push(
                        $("<span></span>")
                            .addClass($.cl.settings.suggestion)
                            .attr($.attr.value, suggestion)
                            .css("background-color", suggestion)
                            .insertAfter(preview)
                    );
                });

                $(suggestionElm).on("click", (e) => {
                    e.stopPropagation();
                    const color = $(e.currentTarget).attr($.attr.value);
                    picker.setColor(color);
                    picker.show();
                });
            }

            const updateMask = (color) => {
                let mask = s.elm.body.children("div." + $.cl.settings.color.mask + "[" + $.attr.name + "='" + opts.name + "']");

                if (color && picker.visible && opts.name.search(/MaskColor$/) !== -1) { // add a mask over the page for every color field ending with "MaskColor"
                    if (mask.length() === 0) {
                        mask = $("<div></div>")
                            .addClass($.cl.settings.color.mask)
                            .attr($.attr.name, opts.name)
                            .appendTo(s.elm.body);
                    }

                    mask.css("background-color", color);
                } else if (mask.length() > 0) { // remove existing mask
                    mask.remove();
                }
            };

            picker.on("show", (obj) => {
                picker.visible = true;
                updateMask(obj.color);
            });

            picker.on("hide", () => {
                picker.visible = false;
                updateMask();
            });

            picker.on("change", (obj) => { // change preview and gradient of the opacity slider
                s.elm.color[opts.name].trigger("change");
                updateMask(obj.color);
            });

            s.elm.color[opts.name].data("picker", picker);
        };

        /**
         * Adds a font dropdown with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.font = async (opts) => {
            if (!$.api.fontSettings) { // e.g. firefox
                $(opts.elm).remove();
                return;
            }

            s.elm.select[opts.name] = $("<select></select>").insertAfter(opts.label);
            $.api.fontSettings.getFontList((fontList) => {
                fontList.unshift({
                    fontId: "default",
                    displayName: s.helper.i18n.get("settings_font_family_default")
                });

                fontList.forEach((font) => {
                    try {
                        if (s.elm.select[opts.name].children("option[value='" + font.fontId.replace(/'/g, "\\27") + "']").length() === 0) {
                            $("<option></option>").attr("value", font.fontId).text(font.displayName).appendTo(s.elm.select[opts.name]);
                        }
                    } catch (err) {
                        console.error("Error adding font", font, err);
                    }
                });
            });
        };

        /**
         * Adds a language dropdown with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.language = async (opts) => {
            s.elm.select[opts.name] = $("<select></select>").insertAfter(opts.label);
            $("<option></option>").attr("value", "default").text(s.helper.i18n.get("settings_language_default")).appendTo(s.elm.select[opts.name]);
            const obj = await s.helper.model.call("languageInfos");
            if (obj && obj.infos) {
                const langList = Object.values(obj.infos);
                langList.sort((a, b) => {
                    return a.label > b.label ? 1 : -1;
                });
                langList.forEach((lang) => {
                    if (lang.available) {
                        $("<option></option>").attr("value", lang.name).text(lang.label).appendTo(s.elm.select[opts.name]);
                    }
                });
            }
        };

        /**
         * Adds a textarea with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.textarea = async (opts) => {
            s.elm.textarea[opts.name] = $("<textarea></textarea>").attr($.attr.name, opts.name).insertAfter(opts.label);
        };

        /**
         * Adds a input field with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.text = initField.email = async (opts) => {
            s.elm.field[opts.name] = $("<input type='" + opts.type + "' />").insertAfter(opts.label);
            ["placeholder"].forEach((attr) => {
                const elmAttr = $(opts.elm).attr($.attr.settings.field[attr]);
                if (elmAttr) {
                    s.elm.field[opts.name].attr(attr, elmAttr);
                }
            });
        };

        initField.radio = async (opts) => {
            s.elm.radio[opts.name] = $("<select></select>").addClass($.cl.hidden).insertAfter(opts.label);
            const wrapper = $("<ul></ul>").addClass($.cl.settings.radio.wrapper).insertAfter(s.elm.radio[opts.name]);

            $(opts.elm).children("span").forEach((span) => {
                const value = $(span).attr($.attr.value);
                const entry = $("<li></li>").attr($.attr.value, value).appendTo(wrapper);

                $(s.helper.checkbox.get(s.elm.body, {
                    [$.attr.name]: opts.name,
                    [$.attr.value]: value
                }, "radio")).appendTo(entry);

                $(span).appendTo(entry);
                $("<option></option>").attr("value", value).text(value).appendTo(s.elm.radio[opts.name]);
            });

            s.elm.radio[opts.name].on("change", (e) => {
                if (typeof e.detail === "undefined" || e.detail !== "userAction") {
                    const checkbox = wrapper.find("input[type='checkbox'][" + $.attr.value + "='" + e.currentTarget.value + "']");
                    if (checkbox.length() > 0) {
                        checkbox.parent("div").trigger("click");
                    }
                }
            });

            wrapper.find("input[type='checkbox']").on("change", (e) => {
                s.elm.radio[opts.name][0].value = $(e.currentTarget).attr($.attr.value);
                s.elm.radio[opts.name].trigger("change", {detail: "userAction"});
            });
        };

        /**
         * Adds a range slider with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.range = async (opts) => {
            s.elm.range[opts.name] = $("<input type='range' />").insertAfter(opts.label);

            ["min", "max", "step"].forEach((attr) => {
                const elmAttr = $(opts.elm).attr($.attr.settings.range[attr]);
                if (elmAttr) {
                    s.elm.range[opts.name].attr(attr, elmAttr);
                }
            });

            s.elm.range[opts.name].attr("value", $(opts.elm).attr($.attr.value) || "");

            const valTooltip = $("<span></span>").insertAfter(s.elm.range[opts.name]);
            const unit = $(opts.elm).attr($.attr.settings.range.unit) || "";
            if (unit) {
                s.elm.range[opts.name].attr($.attr.settings.range.unit, unit);
            }

            s.elm.range[opts.name].on("input change", (e) => {
                const elm = e.currentTarget;
                const max = elm.max || 100;
                const min = elm.min || 0;
                const val = Math.round(100 * (elm.value - min) / (max - min));

                const background = s.elm.range[opts.name].css("background-image");

                if (background && background.indexOf("linear-gradient") === 0) {
                    let backgroundTemplate = $(elm).data("backgroundTemplate");

                    if (typeof backgroundTemplate === "undefined") {
                        backgroundTemplate = background.replace(/-1px/g, "{percent}");
                        $(elm).data("backgroundTemplate", backgroundTemplate);
                    }

                    s.elm.range[opts.name].css("background-image", backgroundTemplate.replace(/{percent}/g, val + "%"));
                }

                valTooltip.text(elm.value + unit);
            });

            $.delay().then(() => {
                s.elm.range[opts.name].trigger("input");
            });

            if ($(opts.elm).attr($.attr.settings.range.infinity) === "1") { // add checkbox to disable range input
                const checkboxWrapper = $("<div></div>").addClass($.cl.settings.sub).insertAfter(valTooltip);
                const checkbox = s.helper.checkbox.get(s.elm.body).appendTo(checkboxWrapper);
                $("<label></label>").attr($.attr.i18n, opts.i18n + "_infinity").appendTo(checkboxWrapper);

                checkbox.children("input[type='checkbox']").on("change", (e) => {
                    if (e.currentTarget.checked) {
                        s.elm.range[opts.name].addClass($.cl.settings.inactive);
                    } else {
                        s.elm.range[opts.name].removeClass($.cl.settings.inactive);
                    }
                });

                s.elm.range[opts.name].data("infinityCheckbox", checkbox);
            }
        };

        /**
         * Adds a dropdown with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.select = async (opts) => {
            s.elm.select[opts.name] = $("<select></select>").insertAfter(opts.label);
            $(opts.elm).children("span").forEach((span) => {
                const i18n = $(span).attr($.attr.i18n);

                const option = $("<option></option>").attr({
                    value: $(span).attr($.attr.value),
                }).html($(span).html()).appendTo(s.elm.select[opts.name]);

                if (i18n) {
                    option.attr($.attr.i18n, i18n);
                }
            });
        };

        /**
         * Adds a checkbox with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.checkbox = async (opts) => {
            const style = $(opts.elm).attr($.attr.style) || "default";
            s.elm.checkbox[opts.name] = s.helper.checkbox.get(s.elm.body, {
                [$.attr.name]: opts.name
            }, "checkbox", style).insertAfter(opts.label);
        };
    };

})(jsu);