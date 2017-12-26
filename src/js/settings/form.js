($ => {
    "use strict";

    window.FormHelper = function (s) {

        let initField = {};

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                initEvents();
                initFormElements().then(resolve);
            });
        };

        /**
         * Initialises the eventhandlers
         */
        let initEvents = () => {
            s.opts.elm.content.on("scroll", () => {
                let path = s.helper.menu.getPath();
                if (path[0] === "appearance") {
                    Object.values(s.opts.elm.color).forEach((elm) => {
                        let picker = elm.data("picker");
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
        let initFormElements = () => {
            return new Promise((resolve) => {
                let waitingCounter = s.opts.elm.formElement.length();

                let elementLoaded = () => {
                    waitingCounter--;
                    if (waitingCounter === 0) { // all form elements loaded -> resolve
                        resolve();
                    }
                };

                s.opts.elm.formElement.forEach((elm) => {
                    let opts = {
                        elm: elm,
                        type: $(elm).attr(s.opts.attr.type),
                        name: $(elm).attr(s.opts.attr.name),
                        i18n: $(elm).attr(s.opts.attr.i18n) || ""
                    };

                    opts.label = $("<label />").attr(s.opts.attr.i18n, opts.i18n).insertAfter(elm);
                    $("<p />").addClass(s.opts.classes.desc).attr(s.opts.attr.i18n, opts.i18n + "_desc").insertAfter(opts.label);

                    if (initField[opts.type]) {
                        initField[opts.type](opts).then(elementLoaded);
                    } else {
                        elementLoaded();
                    }

                    elm.remove();
                });
            });
        };

        /**
         * Adds a colorpicker with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.color = (opts) => {
            return new Promise((resolve) => {
                s.opts.elm.color[opts.name] = $("<input type='text' />").addClass(s.opts.classes.color.field).insertAfter(opts.label);

                let picker = new window.Colorpicker(s.opts.elm.color[opts.name][0], {
                    alpha: !!$(opts.elm).attr(s.opts.attr.color.alpha)
                });

                let suggestionsRaw = $(opts.elm).attr(s.opts.attr.color.suggestions);
                if (suggestionsRaw) {
                    let suggestions = JSON.parse(suggestionsRaw);
                    let suggestionElm = [];
                    let preview = picker.getElements().preview;

                    suggestions.forEach((suggestion) => {
                        suggestionElm.push($("<span />").addClass(s.opts.classes.color.suggestion).css("background-color", suggestion).insertAfter(preview));
                    });

                    $(suggestionElm).on("click", (e) => {
                        e.stopPropagation();
                        let color = $(e.currentTarget).css("background-color");
                        picker.setColor(color);
                    });
                }

                let updateMask = (color) => {
                    let mask = s.opts.elm.body.children("div." + s.opts.classes.color.mask + "[" + s.opts.attr.name + "='" + opts.name + "']");

                    if (color && picker.visible && opts.name.search(/MaskColor$/) !== -1) { // add a mask over the page for every color field ending with "MaskColor"
                        if (mask.length() === 0) {
                            mask = $("<div />")
                                .addClass(s.opts.classes.color.mask)
                                .attr(s.opts.attr.name, opts.name)
                                .appendTo(s.opts.elm.body);
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
                    s.opts.elm.color[opts.name].trigger("change");
                    updateMask(obj.color);
                });

                s.opts.elm.color[opts.name].data("picker", picker);
                resolve();
            });
        };

        /**
         * Adds a font dropdown with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.font = (opts) => {
            return new Promise((resolve) => {
                s.opts.elm.select[opts.name] = $("<select />").insertAfter(opts.label);
                chrome.fontSettings.getFontList((fontList) => {
                    fontList.unshift({
                        fontId: "default",
                        displayName: s.helper.i18n.get("settings_font_family_default")
                    });

                    fontList.forEach((font) => {
                        if (s.opts.elm.select[opts.name].children("option[value='" + font.fontId.replace(/\'/g, "\\27") + "']").length() === 0) {
                            $("<option />").attr("value", font.fontId).text(font.displayName).appendTo(s.opts.elm.select[opts.name]);
                        }
                    });
                });

                resolve();
            });
        };

        /**
         * Adds a language dropdown with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.language = (opts) => {
            return new Promise((resolve) => {
                s.opts.elm.select[opts.name] = $("<select />").insertAfter(opts.label);
                $("<option />").attr("value", "default").text(s.helper.i18n.get("settings_language_default")).appendTo(s.opts.elm.select[opts.name]);
                s.helper.model.call("languageInfos").then((obj) => {
                    if (obj && obj.infos) {
                        let langList = Object.values(obj.infos);
                        langList.sort((a, b) => {
                            return a.label > b.label ? 1 : -1;
                        });
                        langList.forEach((lang) => {
                            if (lang.available) {
                                $("<option />").attr("value", lang.name).text(lang.label).appendTo(s.opts.elm.select[opts.name]);
                            }
                        });
                    }
                    resolve();
                });
            });
        };

        /**
         * Adds a textarea with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.textarea = (opts) => {
            return new Promise((resolve) => {
                s.opts.elm.textarea[opts.name] = $("<textarea />").attr(s.opts.attr.name, opts.name).insertAfter(opts.label);
                resolve();
            });
        };

        /**
         * Adds a input field with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.text = initField.email = (opts) => {
            return new Promise((resolve) => {
                s.opts.elm.field[opts.name] = $("<input type='" + opts.type + "' />").insertAfter(opts.label);
                ["placeholder"].forEach((attr) => {
                    let elmAttr = $(opts.elm).attr(s.opts.attr.field[attr]);
                    if (elmAttr) {
                        s.opts.elm.field[opts.name].attr(attr, elmAttr);
                    }
                });

                resolve();
            });
        };

        initField.radio = (opts) => {
            return new Promise((resolve) => {
                s.opts.elm.radio[opts.name] = $("<select />").addClass(s.opts.classes.hidden).insertAfter(opts.label);
                let wrapper = $("<ul />").addClass(s.opts.classes.radio.wrapper).insertAfter(s.opts.elm.radio[opts.name]);

                $(opts.elm).children("span").forEach((span) => {
                    let value = $(span).attr(s.opts.attr.value);
                    let entry = $("<li />").attr(s.opts.attr.value, value).appendTo(wrapper);

                    $(s.helper.checkbox.get(s.opts.elm.body, {
                        [s.opts.attr.name]: opts.name,
                        [s.opts.attr.value]: value
                    }, "radio")).appendTo(entry);

                    $(span).appendTo(entry);
                    $("<option />").attr("value", value).text(value).appendTo(s.opts.elm.radio[opts.name]);
                });

                s.opts.elm.radio[opts.name].on("change", (e) => {
                    if (typeof e.detail === "undefined" || e.detail !== "userAction") {
                        let checkbox = wrapper.find("input[type='checkbox'][" + s.opts.attr.value + "='" + e.currentTarget.value + "']");
                        if (checkbox.length() > 0) {
                            checkbox.parent("div").trigger("click");
                        }
                    }
                });

                wrapper.find("input[type='checkbox']").on("change", (e) => {
                    s.opts.elm.radio[opts.name][0].value = $(e.currentTarget).attr(s.opts.attr.value);
                    s.opts.elm.radio[opts.name].trigger("change", {detail: "userAction"});
                });

                resolve();
            });
        };

        /**
         * Adds a range slidear with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.range = (opts) => {
            return new Promise((resolve) => {
                s.opts.elm.range[opts.name] = $("<input type='range' />").insertAfter(opts.label);

                ["min", "max", "step"].forEach((attr) => {
                    let elmAttr = $(opts.elm).attr(s.opts.attr.range[attr]);
                    if (elmAttr) {
                        s.opts.elm.range[opts.name].attr(attr, elmAttr);
                    }
                });

                s.opts.elm.range[opts.name].attr("value", $(opts.elm).attr(s.opts.attr.value) || "");

                let unit = $(opts.elm).attr(s.opts.attr.range.unit) || "";
                let valTooltip = $("<span />").insertAfter(s.opts.elm.range[opts.name]);

                s.opts.elm.range[opts.name].on("input change", (e) => {
                    let elm = e.currentTarget;
                    let max = elm.max || 100;
                    let min = elm.min || 0;
                    let val = Math.round(100 * (elm.value - min) / (max - min));

                    let background = s.opts.elm.range[opts.name].css("background-image");

                    if (background.search("linear-gradient") === 0) {
                        let backgroundTemplate = $(elm).data("backgroundTemplate");

                        if (typeof backgroundTemplate === "undefined") {
                            backgroundTemplate = background.replace(/\-1px/g, "{percent}");
                            $(elm).data("backgroundTemplate", backgroundTemplate);
                        }

                        s.opts.elm.range[opts.name].css("background-image", backgroundTemplate.replace(/\{percent\}/g, val + "%"));
                    }

                    valTooltip.text(elm.value + unit);
                });
                s.opts.elm.range[opts.name].trigger("input");

                if ($(opts.elm).attr(s.opts.attr.range.infinity) === "1") { // add checkbox to disable range input
                    let checkbox = s.helper.checkbox.get(s.opts.elm.body).insertAfter(valTooltip);
                    $("<label />").attr(s.opts.attr.i18n, opts.i18n + "_infinity").insertAfter(checkbox);
                    $("<br />").insertBefore(checkbox);

                    checkbox.children("input[type='checkbox']").on("change", (e) => {
                        if (e.currentTarget.checked) {
                            s.opts.elm.range[opts.name].addClass(s.opts.classes.range.inactive);
                        } else {
                            s.opts.elm.range[opts.name].removeClass(s.opts.classes.range.inactive);
                        }
                    });

                    s.opts.elm.range[opts.name].data("infinityCheckbox", checkbox);
                }
                resolve();
            });
        };

        /**
         * Adds a dropdown with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.select = (opts) => {
            return new Promise((resolve) => {
                s.opts.elm.select[opts.name] = $("<select />").insertAfter(opts.label);
                $(opts.elm).children("span").forEach((span) => {
                    let i18n = $(span).attr(s.opts.attr.i18n);

                    let option = $("<option />").attr({
                        value: $(span).attr(s.opts.attr.value),
                    }).html($(span).html()).appendTo(s.opts.elm.select[opts.name]);

                    if (i18n) {
                        option.attr(s.opts.attr.i18n, i18n);
                    }
                });
                resolve();
            });
        };

        /**
         * Adds a checkbox with the given information
         *
         * @param opts
         * @returns {Promise}
         */
        initField.checkbox = (opts) => {
            return new Promise((resolve) => {
                let style = $(opts.elm).attr(s.opts.attr.style) || "default";
                s.opts.elm.checkbox[opts.name] = s.helper.checkbox.get(s.opts.elm.body, {
                    [s.opts.attr.name]: opts.name
                }, "checkbox", style).insertAfter(opts.label);

                resolve();
            });
        };
    };

})(jsu);