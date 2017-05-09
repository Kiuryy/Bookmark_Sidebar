($ => {
    "use strict";

    window.FormHelper = function (s) {

        /**
         *
         * @param {function} callback
         */
        this.init = (callback) => {
            initEvents();
            initFormElements(callback);
        };

        /**
         *
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
         * @param {function} callback
         */
        let initFormElements = (callback) => {
            let waitingCounter = s.opts.elm.formElement.length();

            let elementLoaded = () => {
                waitingCounter--;
                if (waitingCounter === 0 && typeof callback === "function") { // all form elements loaded -> callback
                    callback();
                }
            };


            s.opts.elm.formElement.forEach((elm) => {
                let type = $(elm).attr(s.opts.attr.type);
                let name = $(elm).attr(s.opts.attr.name);
                let i18n = $(elm).attr(s.opts.attr.i18n) || "";

                $("<br />").insertAfter(elm);
                let label = $("<label />").attr(s.opts.attr.i18n, i18n).insertAfter(elm);
                $("<p />").attr(s.opts.attr.i18n, i18n + "_desc").insertAfter(label);

                switch (type) {
                    case "checkbox": {
                        s.opts.elm.checkbox[name] = s.helper.checkbox.get(s.opts.elm.body).insertAfter(label);
                        elementLoaded();
                        break;
                    }
                    case "text":
                    case "email": {
                        s.opts.elm.field[name] = $("<input type='" + type + "' />").insertAfter(label);
                        ["placeholder"].forEach((attr) => {
                            let elmAttr = $(elm).attr(s.opts.attr.field[attr]);
                            if (elmAttr) {
                                s.opts.elm.field[name].attr(attr, elmAttr);
                            }
                        });
                        elementLoaded();
                        break;
                    }
                    case "textarea": {
                        s.opts.elm.textarea[name] = $("<textarea />").insertAfter(label);
                        elementLoaded();
                        break;
                    }
                    case "language": {
                        s.opts.elm.select[name] = $("<select />").insertAfter(label);
                        $("<option />").attr("value", "default").text(s.helper.i18n.get("settings_language_default")).appendTo(s.opts.elm.select[name]);
                        s.helper.model.call("languageInfos", (obj) => {
                            if (obj && obj.infos) {
                                Object.values(obj.infos).forEach((lang) => {
                                    if (lang.available) {
                                        $("<option />").attr("value", lang.name).text(lang.label).appendTo(s.opts.elm.select[name]);
                                    }
                                });
                            }
                            elementLoaded();
                        });
                        break;
                    }
                    case "font": {
                        s.opts.elm.select[name] = $("<select />").insertAfter(label);
                        chrome.fontSettings.getFontList((fontList) => {
                            fontList.unshift({
                                fontId: "default",
                                displayName: s.helper.i18n.get("settings_font_family_default")
                            });

                            fontList.forEach((font) => {
                                if (s.opts.elm.select[name].children("option[value='" + font.fontId + "']").length() === 0) {
                                    $("<option />").attr("value", font.fontId).text(font.displayName).appendTo(s.opts.elm.select[name]);
                                }
                            });
                        });
                        elementLoaded();
                        break;
                    }
                    case "color": {
                        s.opts.elm.color[name] = $("<input type='text' />").addClass(s.opts.classes.color.field).insertAfter(label);
                        let colorInfo = $("<span />").insertAfter(s.opts.elm.color[name]);
                        let picker = new CP(s.opts.elm.color[name][0]);

                        if ($(elm).attr(s.opts.attr.color.alpha)) {
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

                            s.opts.elm.color[name][0].value = v;
                            s.opts.elm.color[name].trigger("change");
                            colorInfo.css("background-color", v);
                        });

                        s.opts.elm.color[name].data("picker", picker);
                        elementLoaded();
                        break;
                    }
                    case "range": {
                        s.opts.elm.range[name] = $("<input type='range' />").insertAfter(label);

                        ["min", "max", "step"].forEach((attr) => {
                            let elmAttr = $(elm).attr(s.opts.attr.range[attr]);
                            if (elmAttr) {
                                s.opts.elm.range[name].attr(attr, elmAttr);
                            }
                        });

                        s.opts.elm.range[name].attr("value", $(elm).attr(s.opts.attr.value) || "");

                        let unit = $(elm).attr(s.opts.attr.range.unit) || "";
                        let valTooltip = $("<span />").insertAfter(s.opts.elm.range[name]);

                        s.opts.elm.range[name].on('input change', (e) => {
                            let elm = e.currentTarget;
                            let max = elm.max || 100;
                            let min = elm.min || 0;
                            let val = Math.round(100 * (elm.value - min) / (max - min));
                            let backgroundSize = s.opts.elm.range[name].css('background-size').replace(/^.*\s/, val + "% ");

                            s.opts.elm.range[name].css('background-size', backgroundSize);
                            valTooltip.text(elm.value + unit);
                        });
                        s.opts.elm.range[name].trigger("input");
                        elementLoaded();
                        break;
                    }
                    case "select": {
                        s.opts.elm.select[name] = $("<select />").insertAfter(label);
                        $(elm).children("span").forEach((option) => {
                            $("<option />").attr({
                                value: $(option).attr(s.opts.attr.value),
                                [s.opts.attr.i18n]: $(option).attr(s.opts.attr.i18n)
                            }).appendTo(s.opts.elm.select[name]);
                        });
                        elementLoaded();
                        break;
                    }
                }

                elm.remove();
            });
        };
    };

})(jsu);