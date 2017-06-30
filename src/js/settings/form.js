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
            s.opts.elm.tab.children("div").on("scroll", () => {
                Object.values(s.opts.elm.color).forEach((elm) => {
                    let picker = elm.data("picker");
                    picker.fit();
                });
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

                    $("<br />").insertAfter(elm);
                    opts.label = $("<label />").attr(s.opts.attr.i18n, opts.i18n).insertAfter(elm);
                    $("<p />").attr(s.opts.attr.i18n, opts.i18n + "_desc").insertAfter(opts.label);

                    if (initField[opts.type]) {
                        initField[opts.type](opts).then(elementLoaded);
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
                let colorInfo = $("<span />").insertAfter(s.opts.elm.color[opts.name]);
                let picker = new CP(s.opts.elm.color[opts.name][0]);

                if ($(opts.elm).attr(s.opts.attr.color.alpha)) {
                    picker.alpha = $("<input type='range' />").attr({
                        min: 0,
                        max: 1,
                        step: 0.01,
                        value: 1
                    }).appendTo(picker.picker);

                    picker.alpha.on("change input", () => picker.trigger("change"));
                }

                picker.on("change", (color) => {
                    let v = CP._HSV2RGB(picker.set());

                    if (color) {
                        v = CP.HEX2RGB(color);
                    }

                    picker.alpha && picker.alpha.css("background-image", "linear-gradient(to right, transparent 0%, rgb(" + v.join(',') + ") 100%),url(" + chrome.extension.getURL("img/settings/alpha.webp") + ")");

                    if (picker.alpha && +picker.alpha[0].value < 1) {
                        v = 'rgba(' + v.join(',') + ',' + picker.alpha[0].value + ')';
                    } else {
                        v = 'rgb(' + v.join(',') + ')';
                    }

                    s.opts.elm.color[opts.name][0].value = v;
                    s.opts.elm.color[opts.name].trigger("change");
                    colorInfo.css("background-color", v);
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
                        if (s.opts.elm.select[opts.name].children("option[value='" + font.fontId + "']").length() === 0) {
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
                s.opts.elm.textarea[opts.name] = $("<textarea />").insertAfter(opts.label);
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

                s.opts.elm.range[opts.name].on('input change', (e) => {
                    let elm = e.currentTarget;
                    let max = elm.max || 100;
                    let min = elm.min || 0;
                    let val = Math.round(100 * (elm.value - min) / (max - min));

                    let background = s.opts.elm.range[opts.name].css('background-image');

                    if (background.search("linear-gradient") === 0) {
                        let backgroundTemplate = $(elm).data("backgroundTemplate");

                        if (typeof backgroundTemplate === "undefined") {
                            backgroundTemplate = background.replace(/\-1px/g, "{percent}");
                            $(elm).data("backgroundTemplate", backgroundTemplate);
                        }

                        s.opts.elm.range[opts.name].css('background-image', backgroundTemplate.replace(/\{percent\}/g, val + "%"));
                    }

                    valTooltip.text(elm.value + unit);
                });
                s.opts.elm.range[opts.name].trigger("input");


                if (!!($(opts.elm).attr(s.opts.attr.range.infinity)) === true) { // add checkbox to disable range input
                    let checkbox = s.helper.checkbox.get(s.opts.elm.body).insertAfter(valTooltip);
                    $("<label />").attr(s.opts.attr.i18n, opts.i18n + "_infinity").insertAfter(checkbox);

                    checkbox.children("input[type='checkbox'").on("change", (e) => {
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
                $(opts.elm).children("span").forEach((option) => {
                    $("<option />").attr({
                        value: $(option).attr(s.opts.attr.value),
                        [s.opts.attr.i18n]: $(option).attr(s.opts.attr.i18n)
                    }).appendTo(s.opts.elm.select[opts.name]);
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
                s.opts.elm.checkbox[opts.name] = s.helper.checkbox.get(s.opts.elm.body).insertAfter(opts.label);
                resolve();
            });
        };
    };

})(jsu);