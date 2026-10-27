($ => {
    "use strict";

    $.SettingsFormHelper = function (s) {

        const initField = {};
        const readField = {};
        const restoreButtons = {};
        const initialStates = {};
        const defaultValues = {};
        const customFieldHandlers = {};
        const fontFields = {};

        this.elements = {
            checkbox: {},
            range: {},
            select: {},
            color: {},
            textarea: {},
            text: {},
            email: {},
            radio: {}
        };

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();
            await initFormElements();
        };

        this.getFormData = () => {
            const data = {};
            eachField((type, name, formField) => {
                const config = formField.attr("data-config");
                if (config) {
                    const value = type === "range" ? getRangeFormValue(name, config) : readField[type](name);
                    $.deepMerge(data, s.helper.model.toDataObject(config, value));
                }
            });
            return data;
        };

        /**
         * Returns the value of the given range field in the format the model expects:
         * -1 if the infinity checkbox is checked, a plain number if the default value is numeric (e.g. "b/triggerWidth"),
         * or the value including its unit otherwise (e.g. "a/styles/indicatorWidth" -> "24px")
         *
         * @param {string} name
         * @param {string} config
         * @returns {number|string}
         */
        const getRangeFormValue = (name, config) => {
            const elm = this.elements.range[name];
            const infinityCheckbox = elm.data("infinityCheckbox");
            if (infinityCheckbox && infinityCheckbox.length() > 0 && s.helper.checkbox.isChecked(infinityCheckbox)) {
                return -1;
            }

            if (typeof s.helper.model.getData(config, true) === "number") {
                return +elm[0].value;
            }

            return readField.range(name);
        };

        /**
         * Remembers the default values of all form fields as the values the restore buttons will revert to
         */
        this.updateInitialStates = () => {
            eachField((type, name, formField) => {
                initialStates[name] = getDefaultFieldState(type, name, formField.attr("data-config"));
                updateRestoreButton(type, name);
            });
        };

        /**
         * Sets the values the restore buttons of the given fields revert to instead of the defaults of the model,
         * for defaults depending on other fields (e.g. the sizes and colors of the selected theme), null removes the value again
         *
         * @param {object} values {<field name>: <value>|null}
         */
        this.setDefaultValues = (values) => {
            Object.entries(values).forEach(([name, value]) => {
                if (value === null) {
                    delete defaultValues[name];
                } else {
                    defaultValues[name] = value;
                }

                const type = getFieldType(name);
                if (type && typeof initialStates[name] !== "undefined") { // before updateInitialStates() ran, it picks up the value later
                    initialStates[name] = getDefaultFieldState(type, name, this.elements[type][name].attr("data-config"));
                    updateRestoreButton(type, name);
                }
            });
        };

        /**
         * Registers a custom getState()/applyState() pair for a field whose value is not held by a single DOM
         * element (e.g. a color field that is actually driven by a separate "auto vs custom" dropdown), so that
         * the restore button reflects and restores the field's actual meaning instead of raw DOM state.
         * Since nothing here triggers automatically when the driving control changes, callers are responsible for
         * calling refreshRestoreButton(name) whenever that happens.
         *
         * @param {string} name
         * @param {object} handlers {getState: function, applyState: function}
         */
        this.setCustomFieldHandlers = (name, handlers) => {
            customFieldHandlers[name] = handlers;
        };

        /**
         * Re-evaluates whether the restore button of the given field should be visible,
         * needed for fields with custom handlers whose state can change without the field itself firing an event
         *
         * @param {string} name
         */
        this.refreshRestoreButton = (name) => {
            const type = getFieldType(name);
            if (type) {
                updateRestoreButton(type, name);
            }
        };

        /**
         * Changes the value of the given select, range or textarea field and triggers its change event,
         * so the listeners of the field (e.g. the label of a range field or the preview) pick up the new value
         *
         * @param {string} type
         * @param {string} name
         * @param {string|number} value
         */
        this.setValue = (type, name, value) => {
            const elm = this.elements[type][name];
            elm[0].value = value;
            elm.trigger("change");
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
            const elm = this.elements.color[field];
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
         * Calls the given callback for every initialised form field
         *
         * @param {function} callback
         */
        const eachField = (callback) => {
            Object.entries(this.elements).forEach(([type, formFields]) => {
                Object.entries(formFields).forEach(([name, formField]) => {
                    callback(type, name, formField);
                });
            });
        };

        /**
         * Returns the type of the field with the given name,
         * which can differ from the type of the html element (e.g. 'font' and 'language' are rendered as select)
         *
         * @param {string} name
         * @returns {string|null}
         */
        const getFieldType = (name) => {
            for (const [type, formFields] of Object.entries(this.elements)) {
                if (formFields[name]) {
                    return type;
                }
            }

            return null;
        };

        /**
         * Initialises the button next to the given field,
         * which restores the value the field had when the settings page was loaded
         *
         * @param {string} type
         * @param {string} name
         * @param {jsu} button
         */
        const initRestoreButton = (type, name, button) => {
            restoreButtons[name] = button;

            button.on("click", (e) => {
                e.preventDefault();
                applyFieldState(type, name, initialStates[name]);
                updateRestoreButton(type, name);
            });

            const elm = this.elements[type][name];
            const eventElm = type === "checkbox" ? elm.children("input") : elm;

            eventElm.on("change input", () => {
                updateRestoreButton(type, name);
            });

            if (type === "range") {
                const infinityCheckbox = elm.data("infinityCheckbox");
                if (infinityCheckbox && infinityCheckbox.length() > 0) {
                    infinityCheckbox.children("input").on("change", () => {
                        updateRestoreButton(type, name);
                    });
                }
            }
        };

        /**
         * Returns the current state of the given field,
         * which is used to determine whether the value of the field has been changed and to restore the initial value
         *
         * @param {string} type
         * @param {string} name
         * @returns {object}
         */
        const getFieldState = (type, name) => {
            if (customFieldHandlers[name]) {
                return customFieldHandlers[name].getState();
            }

            const elm = this.elements[type][name];
            const state = {
                value: readField[type](name) // for color fields this maps a fully transparent color (written back by the picker as "rgba(0,0,0,0)") to "transparent", matching the model's default values
            };

            if (type === "range") {
                const infinityCheckbox = elm.data("infinityCheckbox");
                if (infinityCheckbox && infinityCheckbox.length() > 0) {
                    state.infinity = s.helper.checkbox.isChecked(infinityCheckbox);
                }
            }

            return state;
        };

        /**
         * Returns the state the given field should be reset to when its restore button is clicked,
         * which is the value set via setDefaultValues() or the value from the model's default configuration if the field is bound to one,
         * shaped the same way getFieldState() returns it, or the field's current state otherwise
         * (e.g. for fields without a data-config, like the language dropdown)
         *
         * @param {string} type
         * @param {string} name
         * @param {string} config
         * @returns {object}
         */
        const getDefaultFieldState = (type, name, config) => {
            if (!config) {
                return getFieldState(type, name);
            }

            const defaultValue = typeof defaultValues[name] !== "undefined" ? defaultValues[name] : s.helper.model.getData(config, true);
            if (defaultValue === null) {
                return getFieldState(type, name);
            }

            if (type === "checkbox") {
                return {value: defaultValue === true};
            }

            if (fontFields[name]) { // the default font stack is represented by the 'default' option
                return {value: getFontOptionValue(name, defaultValue)};
            }

            if (type === "color") { // strip whitespace to match the format the colorpicker writes back into the field (e.g. "rgba(0, 0, 0, 0.5)" -> "rgba(0,0,0,0.5)")
                const color = ("" + defaultValue).replace(/\s+/g, "");
                const fullyTransparent = /^(rgba|hsla)\(.*,0?\.?0*\)$/i.test(color) || /^#([0-9a-f]{3}0|[0-9a-f]{6}00)$/i.test(color);
                return {value: fullyTransparent ? "transparent" : color}; // like getColorValue(), which reads a fully transparent color as "transparent"
            }

            if (type === "range") {
                const elm = this.elements[type][name];
                const unit = elm.attr($.attr.settings.range.unit) || "";
                let value = "" + defaultValue;
                if (unit && value.endsWith(unit)) {
                    value = value.slice(0, -unit.length);
                }

                const state = {value: value + unit};

                const infinityCheckbox = elm.data("infinityCheckbox");
                if (infinityCheckbox && infinityCheckbox.length() > 0) {
                    state.infinity = value === "-1";
                }

                return state;
            }

            return {value: "" + defaultValue};
        };

        /**
         * Restores the given state of the given field
         *
         * @param {string} type
         * @param {string} name
         * @param {object} state
         */
        const applyFieldState = (type, name, state) => {
            if (typeof state === "undefined") {
                return;
            }

            if (customFieldHandlers[name]) {
                customFieldHandlers[name].applyState(state);
                return;
            }

            const elm = this.elements[type][name];

            if (type === "color") {
                this.changeColorValue(elm, state.value);
                return;
            } else if (type === "checkbox") {
                if (readField.checkbox(name) !== state.value) {
                    elm.trigger("click");
                }
                return;
            }

            let value = "" + state.value;

            if (type === "range") {
                const infinityCheckbox = elm.data("infinityCheckbox");
                if (infinityCheckbox && infinityCheckbox.length() > 0 && s.helper.checkbox.isChecked(infinityCheckbox) !== state.infinity) {
                    infinityCheckbox.trigger("click");
                }

                const unit = elm.attr($.attr.settings.range.unit) || "";
                if (unit && value.endsWith(unit)) {
                    value = value.slice(0, -unit.length);
                }
            }

            elm[0].value = value;
            elm.trigger("change");
        };

        /**
         * Shows the restore button of the given field, if its value differs from the initial value
         *
         * @param {string} type
         * @param {string} name
         */
        const updateRestoreButton = (type, name) => {
            const button = restoreButtons[name];
            if (!button) {
                return;
            }

            const initialState = initialStates[name];
            if (typeof initialState !== "undefined" && JSON.stringify(initialState) !== JSON.stringify(getFieldState(type, name))) {
                button.addClass($.cl.visible);
            } else {
                button.removeClass($.cl.visible);
            }
        };

        /**
         * Initialises the eventhandlers
         */
        const initEvents = () => {
            $(document).on("scroll", () => {
                Object.values(this.elements.color).forEach((elm) => {
                    const picker = elm.data("picker");
                    picker.reposition();
                });
            }, {passive: true});
        };

        /**
         * Initialises all form elements
         *
         * @returns {Promise}
         */
        const initFormElements = async () => {
            $("div.formElement").forEach(async (elm) => {
                // some fields (e.g. checkboxes) already have their own static label as the next sibling in the markup, instead of relying on the generated one
                const trailingLabel = $(elm).next("label");

                const opts = {
                    elm: elm,
                    type: $(elm).attr($.attr.type),
                    name: $(elm).attr($.attr.name),
                    config: $(elm).attr("data-config"),
                    placeholder: $(elm).attr($.attr.settings.field.placeholder),
                    initialValue: null,
                    i18n: $(elm).attr($.attr.i18n) || "",
                    labelClass: $(elm).attr($.attr.label)
                };

                opts.label = $("<label></label>")
                    .attr($.attr.i18n, opts.i18n)
                    .insertAfter(elm);

                if (!opts.i18n) { // field without a label of its own (hidden or labelled by the markup) -> the label is still needed as anchor, but gets removed silently when parsing the language variables
                    opts.label.attr($.attr.i18nOptional, "1");
                }

                if (opts.labelClass) {
                    opts.label.addClass(opts.labelClass);
                }

                const video = $(elm).attr($.attr.settings.video.name);
                if (video) { // inserted before the description and the field, so it ends up after the whole field group, the video helper opens the video when clicking it
                    $("<a></a>")
                        .addClass(["btn", "icon", "video", $.cl.settings.fieldVideo])
                        .attr($.attr.settings.video.name, video)
                        .attr($.attr.settings.video.title, $(elm).attr($.attr.settings.video.title) || opts.i18n)
                        .attr($.attr.i18n, "settings_details")
                        .insertAfter(opts.label);
                }

                $("<p></p>") // most fields have no description, so a missing variable is expected here
                    .addClass($.cl.settings.desc)
                    .attr($.attr.i18n, opts.i18n + "_desc")
                    .attr($.attr.i18nOptional, "1")
                    .insertAfter(opts.label);

                // the field is inserted after the label, so the restore button ends up right after the field
                opts.restoreButton = $("<a href='#'></a>")
                    .addClass($.cl.settings.revert)
                    .insertAfter(opts.label);

                if (opts.config) {
                    const value = await s.helper.model.getData(opts.config);
                    if (value !== null) {
                        opts.initialValue = value;
                    }
                }

                if (initField[opts.type]) {
                    await initField[opts.type](opts);
                }

                if (trailingLabel.length() > 0) { // move the restore button after the static label, instead of leaving it right after the field
                    opts.restoreButton = opts.restoreButton.insertAfter(trailingLabel);
                }

                const fieldType = getFieldType(opts.name);
                const premiumFeature = $(elm).attr($.attr.settings.premiumFeature);
                if (fieldType && premiumFeature) { // passed on to the field itself, so the premium helper can replace it with the premium banner
                    this.elements[fieldType][opts.name].attr($.attr.settings.premiumFeature, premiumFeature);
                }

                if (fieldType && !$(elm).attr($.attr.settings.field.noRestoreButton)) {
                    initRestoreButton(fieldType, opts.name, opts.restoreButton);
                } else { // the field was not created (e.g. font fields in browsers without the fontSettings api), or it opted out of having its own restore button (e.g. a field only steering another one)
                    opts.restoreButton.remove();
                }

                $(elm).remove();
            });
        };

        /**
         * Adds a colorpicker with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.color = async (opts) => {
            this.elements.color[opts.name] = $("<input type='text' />")
                .addClass($.cl.settings.color.field)
                .attr("data-config", opts.config || "")
                .insertAfter(opts.label);

            const picker = new window.Colorpicker(this.elements.color[opts.name][0], {
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
                let mask = $("div." + $.cl.settings.color.mask + "[" + $.attr.name + "='" + opts.name + "']");

                if (color && picker.visible && opts.name.search(/MaskColor$/) !== -1) { // add a mask over the page for every color field ending with "MaskColor"
                    if (mask.length() === 0) {
                        mask = $("<div></div>")
                            .addClass($.cl.settings.color.mask)
                            .attr($.attr.name, opts.name)
                            .appendTo($("body > main"));
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
                this.elements.color[opts.name].trigger("change");
                updateMask(obj.color);
            });

            this.elements.color[opts.name].data("picker", picker);

            if (opts.initialValue !== null) {
                this.changeColorValue(this.elements.color[opts.name], opts.initialValue);
            }
        };
        readField.color = (key) => {
            return this.getColorValue(key, this.elements.color[key][0].value).color;
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

            this.elements.select[opts.name] = $("<select></select>")
                .attr("data-config", opts.config || "")
                .insertAfter(opts.label);
            fontFields[opts.name] = true;

            await new Promise((resolve) => { // the options need to exist before the initial value can be selected
                $.api.fontSettings.getFontList(resolve);
            }).then((fontList) => {
                fontList.unshift({
                    fontId: "default",
                    i18n: "settings_font_family_default",
                    displayName: s.helper.i18n.get("settings_font_family_default")
                });

                fontList.forEach((font) => {
                    try {
                        if (this.elements.select[opts.name].children("option[value='" + font.fontId.replace(/'/g, "\\27") + "']").length() === 0) {
                            const option = $("<option></option>").attr("value", font.fontId).text(font.displayName);

                            if (font.i18n) { // keep the variable name, so the entry is translated again after a language switch
                                option.attr($.attr.i18n, font.i18n);
                            }

                            option.appendTo(this.elements.select[opts.name]);
                        }
                    } catch (err) {
                        console.error("Error adding font", font, err);
                    }
                });
            });

            if (opts.initialValue !== null) {
                this.elements.select[opts.name][0].value = getFontOptionValue(opts.name, opts.initialValue);
                this.elements.select[opts.name].trigger("change");
            }
        };

        /**
         * Returns the option of the given font dropdown matching the given configured font family,
         * stored fonts are wrapped in quotes, everything without a matching option (e.g. the default font stack) is 'default'
         *
         * @param {string} name
         * @param {string} fontFamily
         * @returns {string}
         */
        const getFontOptionValue = (name, fontFamily) => {
            const value = ("" + fontFamily).replace(/(^'*)|('*$)/g, "");
            const hasOption = Array.from(this.elements.select[name][0].options).some((option) => option.value === value);
            return hasOption ? value : "default";
        };

        readField.font = (key) => {
            return readField.select(key);
        };

        /**
         * Adds a language dropdown with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.language = async (opts) => {
            this.elements.select[opts.name] = $("<select></select>")
                .attr("data-config", opts.config || "")
                .insertAfter(opts.label);

            $("<option></option>")
                .attr("value", "default")
                .attr($.attr.i18n, "settings_language_default") // translate the text right away, but keep the variable name for later language switches
                .text(s.helper.i18n.get("settings_language_default"))
                .appendTo(this.elements.select[opts.name]);
            const obj = await s.helper.model.call("languageInfos");
            if (obj && obj.infos) {
                const langList = Object.values(obj.infos);
                langList.sort((a, b) => {
                    return a.label > b.label ? 1 : -1;
                });
                langList.forEach((lang) => {
                    if (lang.available) {
                        $("<option></option>").attr("value", lang.name).text(lang.label).appendTo(this.elements.select[opts.name]);
                    }
                });
            }

            // the language is not part of the behaviour/appearance config, so it cannot be retrieved with a config path
            this.elements.select[opts.name][0].value = s.helper.i18n.getLanguage();
            this.elements.select[opts.name].trigger("change");
        };
        readField.language = (key) => {
            return readField.select(key);
        };

        /**
         * Adds a textarea with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.textarea = async (opts) => {
            this.elements.textarea[opts.name] = $("<textarea></textarea>")
                .attr("data-config", opts.config || "")
                .attr($.attr.name, opts.name)
                .insertAfter(opts.label);

            if (opts.placeholder) {
                this.elements.textarea[opts.name].attr("placeholder", opts.placeholder);
            }

            if (opts.initialValue !== null) {
                this.elements.textarea[opts.name][0].value = opts.initialValue;
                this.elements.textarea[opts.name].trigger("change");
            }
        };
        readField.textarea = (key) => {
            return this.elements.textarea[key][0].value;
        };

        /**
         * Adds a input field with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.text = initField.email = async (opts) => {
            this.elements.text[opts.name] = $("<input type='" + opts.type + "' />")
                .attr("data-config", opts.config || "")
                .insertAfter(opts.label);

            if (opts.placeholder) {
                this.elements.text[opts.name].attr("placeholder", opts.placeholder);
            }

            if (opts.initialValue !== null) {
                this.elements.text[opts.name][0].value = opts.initialValue;
                this.elements.text[opts.name].trigger("change");
            }
        };
        readField.text = readField.email = (key) => {
            return this.elements.text[key][0].value;
        };

        initField.radio = async (opts) => {
            this.elements.radio[opts.name] = $("<select></select>")
                .addClass($.cl.hidden)
                .attr("data-config", opts.config || "")
                .insertAfter(opts.label);

            const wrapper = $("<ul></ul>").addClass($.cl.settings.radio.wrapper).insertAfter(this.elements.radio[opts.name]);

            $(opts.elm).children("span").forEach((span) => {
                const value = $(span).attr($.attr.value);
                const entry = $("<li></li>").attr($.attr.value, value).appendTo(wrapper);

                $(s.helper.checkbox.get($("body"), {
                    [$.attr.name]: opts.name,
                    [$.attr.value]: value
                }, "radio")).appendTo(entry);

                $(span).appendTo(entry);
                $("<option></option>").attr("value", value).text(value).appendTo(this.elements.radio[opts.name]);
            });

            this.elements.radio[opts.name].on("change", (e) => {
                if (typeof e.detail === "undefined" || e.detail !== "userAction") {
                    const checkbox = wrapper.find("input[type='checkbox'][" + $.attr.value + "='" + e.currentTarget.value + "']");
                    if (checkbox.length() > 0) {
                        checkbox.parent("div").trigger("click");
                    }
                }
            });

            wrapper.find("input[type='checkbox']").on("change", (e) => {
                this.elements.radio[opts.name][0].value = $(e.currentTarget).attr($.attr.value);
                this.elements.radio[opts.name].trigger("change", {detail: "userAction"});
            });

            if (opts.initialValue !== null) {
                this.elements.radio[opts.name][0].value = opts.initialValue;
                this.elements.radio[opts.name].trigger("change");
            }
        };
        readField.radio = (key) => {
            return this.elements.radio[key][0].value;
        };

        /**
         * Adds a range slider with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.range = async (opts) => {
            this.elements.range[opts.name] = $("<input type='range' />")
                .attr("data-config", opts.config || "")
                .insertAfter(opts.label);

            ["min", "max", "step"].forEach((attr) => {
                const elmAttr = $(opts.elm).attr($.attr.settings.range[attr]);
                if (elmAttr) {
                    this.elements.range[opts.name].attr(attr, elmAttr);
                }
            });

            this.elements.range[opts.name].attr("value", $(opts.elm).attr($.attr.value) || "");

            const valTooltip = $("<span></span>").insertAfter(this.elements.range[opts.name]);
            const unit = $(opts.elm).attr($.attr.settings.range.unit) || "";
            if (unit) {
                this.elements.range[opts.name].attr($.attr.settings.range.unit, unit);
            }

            this.elements.range[opts.name].on("input change", (e) => {
                const elm = e.currentTarget;
                const max = elm.max || 100;
                const min = elm.min || 0;
                const val = Math.round(100 * (elm.value - min) / (max - min));

                const background = this.elements.range[opts.name].css("background-image");

                if (background && background.indexOf("linear-gradient") === 0) {
                    let backgroundTemplate = $(elm).data("backgroundTemplate");

                    if (typeof backgroundTemplate === "undefined") {
                        backgroundTemplate = background.replace(/-1px/g, "{percent}");
                        $(elm).data("backgroundTemplate", backgroundTemplate);
                    }

                    this.elements.range[opts.name].css("background-image", backgroundTemplate.replace(/{percent}/g, val + "%"));
                }

                valTooltip.text(elm.value + unit);
            });

            if ($(opts.elm).attr($.attr.settings.range.infinity) === "1") { // add checkbox to disable range input
                const checkboxWrapper = $("<div></div>").addClass($.cl.settings.sub).insertAfter(opts.restoreButton || valTooltip); // below the restore button, so it stays on the same line as the slider
                const checkbox = s.helper.checkbox.get($("body")).appendTo(checkboxWrapper);
                $("<label></label>").attr($.attr.i18n, opts.i18n + "_infinity").appendTo(checkboxWrapper);

                checkbox.children("input[type='checkbox']").on("change", (e) => {
                    if (e.currentTarget.checked) {
                        this.elements.range[opts.name].addClass($.cl.settings.inactive);
                    } else {
                        this.elements.range[opts.name].removeClass($.cl.settings.inactive);
                    }
                });

                this.elements.range[opts.name].data("infinityCheckbox", checkbox);
            }

            await $.delay();

            if (opts.initialValue !== null) {
                const initialValue = ("" + opts.initialValue).replace("px", "");
                if (initialValue === "-1") {
                    const checkbox = this.elements.range[opts.name].data("infinityCheckbox");
                    if (checkbox && checkbox.length() > 0) {
                        checkbox.trigger("click");
                    }
                }
                this.elements.range[opts.name][0].value = initialValue;
            }

            this.elements.range[opts.name].trigger("change");
        };
        readField.range = (key) => {
            const unit = this.elements.range[key].attr($.attr.settings.range.unit) || "";
            return this.elements.range[key][0].value + unit;
        };

        /**
         * Adds a dropdown with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.select = async (opts) => {
            this.elements.select[opts.name] = $("<select></select>")
                .attr("data-config", opts.config || "")
                .insertAfter(opts.label);

            $(opts.elm).children("span").forEach((span) => {
                const i18n = $(span).attr($.attr.i18n);
                const value = $(span).attr($.attr.value);

                const option = $("<option></option>").attr({
                    value: value,
                }).html($(span).html()).appendTo(this.elements.select[opts.name]);

                if (i18n) {
                    option.attr($.attr.i18n, i18n);
                }
            });
            if (opts.initialValue !== null) {
                this.elements.select[opts.name][0].value = opts.initialValue;
                this.elements.select[opts.name].trigger("change");
            }
        };
        readField.select = (key) => {
            return this.elements.select[key][0].value;
        };

        /**
         * Adds a checkbox with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.checkbox = async (opts) => {
            const style = $(opts.elm).attr($.attr.style) || "default";
            this.elements.checkbox[opts.name] = s.helper.checkbox.get($("body"), {
                [$.attr.name]: opts.name
            }, "checkbox", style)
                .attr("data-config", opts.config || "")
                .insertAfter(opts.label);

            if (opts.initialValue !== null) {
                const checked = opts.initialValue === true;
                if (checked) {
                    this.elements.checkbox[opts.name].trigger("click");
                }
                this.elements.checkbox[opts.name].children("input").trigger("change");
            }
        };
        readField.checkbox = (key) => {
            return s.helper.checkbox.isChecked(this.elements.checkbox[key]);
        };
    };

})(jsu);