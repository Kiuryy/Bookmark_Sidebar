/**
 *
 * @param {jsu} $
 */
($ => {
    "use strict";

    let data = {};
    let modelHelper = null;
    let checkboxHelper = null;

    let opts = {
        classes: {
            tabs: {
                list: "tabBar",
                active: "active",
                hidden: "hidden"
            },
            color: {
                field: "color"
            },
            checkbox: {
                box: "checkbox",
                active: "active",
                clicked: "clicked",
                focus: "focus"
            },
            success: "success",
            error: "error",
            loading: "loading"
        },
        attr: {
            type: "data-type",
            appearance: "data-appearance",
            name: "data-name",
            i18n: "data-i18n",
            value: "data-value",
            tab: "data-tab",
            success: "data-successtext",
            range: {
                min: "data-min",
                max: "data-max",
                step: "data-step",
                unit: "data-unit"
            },
            color: {
                alpha: "data-alpha"
            },
            field: {
                placeholder: "data-placeholder"
            }
        },
        elm: {
            body: $("body"),
            title: $("head > title"),
            header: $("body > header"),
            tab: $("section#content > div.tab"),
            appearanceLabels: $("ul.appearanceLabels > li"),
            appearanceSections: $("div[data-appearance]"),
            copyrightDate: $("a#copyright > span"),
            formElement: $("div.formElement"),
            feedback: {
                textarea: $("textarea#feedback"),
                email: $("input#feedbackEmail")
            },
            button: {
                save: $("div.tab > header > button.save"),
                restore: $("div.tab > header > button.restore")
            },
            checkbox: {},
            range: {},
            select: {},
            color: {},
            textarea: {},
            field: {}
        }
    };

    /**
     * Initialises the copyright text
     */
    let initCopyright = () => {
        let createdDate = +opts.elm.copyrightDate.text();
        let currentYear = new Date().getFullYear();

        if (currentYear > createdDate) {
            opts.elm.copyrightDate.text(createdDate + " - " + currentYear);
        }
    };

    /**
     * Initialises the language variables in the document
     */
    let initLanguage = () => {
        $("[" + opts.attr.i18n + "]").forEach((elm) => {
            let val = $(elm).attr(opts.attr.i18n);
            let key = val.search(/^share_userdata/) === 0 ? val : "settings_" + val;
            let msg = chrome.i18n.getMessage(key);
            if (msg) {
                $(elm).html(msg.replace(/\[u\](.*)\[\/u\]/, "<span>$1</span>"));
            } else {
                $(elm).remove();
            }
        });

        let manifest = chrome.runtime.getManifest();
        opts.elm.title.text(opts.elm.title.text() + " - " + manifest.short_name);
    };


    /**
     * Initialises the tab bar
     */
    let initTabs = () => {
        let tabBar = $("<ul />").addClass(opts.classes.tabs.list).prependTo(opts.elm.header);

        opts.elm.tab.forEach((elm) => {
            let name = $(elm).attr(opts.attr.name);
            $("<li />").attr(opts.attr.name, name).html("<a href='#'>" + chrome.i18n.getMessage("settings_tab_" + name) + "</a>").appendTo(tabBar);
        });

        tabBar.find("> li > a").on("click", (e) => {
            e.preventDefault();
            tabBar.children("li").removeClass(opts.classes.tabs.active);
            let tabElm = $(e.currentTarget).parent("li");
            let tabName = tabElm.attr(opts.attr.name);
            tabElm.addClass(opts.classes.tabs.active);

            opts.elm.tab.forEach((tab) => {
                let name = $(tab).attr(opts.attr.name);

                if (name === tabName) {
                    $(tab).removeClass(opts.classes.tabs.hidden);
                } else {
                    $(tab).addClass(opts.classes.tabs.hidden);
                }
            });

            location.hash = tabName;
            opts.elm.body.attr(opts.attr.tab, tabName);
        });

        let hash = location.hash ? location.hash.substr(1) : null;
        tabBar.find("> li > a").eq(0).trigger("click");

        if (hash) {
            tabBar.find("> li[" + opts.attr.name + "='" + hash + "'] > a").trigger("click");
        }
    };

    /**
     * Initialises the share userdata tab
     */
    let initShareUserdataTab = () => {
        chrome.storage.sync.get(["model"], (obj) => {
            if (typeof obj.model === "undefined") {
                obj.model = {};
            }

            if (obj.model.shareUserdata && obj.model.shareUserdata === true) {
                opts.elm.checkbox.shareUserdata.trigger("click");
            }

            opts.elm.checkbox.shareUserdata.children("input[type='checkbox']").on("change", () => {
                obj.model.shareUserdata = checkboxHelper.isChecked(opts.elm.checkbox.shareUserdata);
                obj.model.lastShareDate = 0;

                chrome.storage.sync.set({
                    model: obj.model
                }, () => {
                    showSuccessMessage("saved_share_userdata");
                });
            });
        });
    };


    /**
     * Returns the html for the loading indicator
     *
     * @returns {jsu}
     */
    let getLoaderHtml = () => {
        let html = '' +
            '<div class="loading">' +
            ' <div>' +
            '  <div class="circle-clipper left">' +
            '   <div></div>' +
            '  </div>' +
            '  <div class="gap-patch">' +
            '   <div></div>' +
            '  </div>' +
            '  <div class="circle-clipper right">' +
            '   <div></div>' +
            '  </div>' +
            ' </div>' +
            '</div>';

        return $(html);
    };

    /**
     * Checks the content of the feedback fields and sends the content via ajax if they are filled properly
     */
    let sendFeedback = () => {
        let messageText = opts.elm.textarea.feedbackMsg[0].value;
        let emailText = opts.elm.field.feedbackEmail[0].value;
        let isEmailValid = emailText.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailText);
        let isMessageValid = messageText.length > 0;

        if (isEmailValid && isMessageValid) {
            let loadStartTime = +new Date();
            let loader = getLoaderHtml().appendTo(opts.elm.body);
            opts.elm.body.addClass(opts.classes.loading);
            let manifest = chrome.runtime.getManifest();

            let xhr = new XMLHttpRequest();
            xhr.open("POST", "https://moonware.de/ajax/extensions/feedback", true);
            xhr.onload = () => {
                setTimeout(() => { // load at least 1s
                    opts.elm.textarea.feedbackMsg[0].value = "";
                    opts.elm.field.feedbackEmail[0].value = "";
                    opts.elm.body.removeClass(opts.classes.loading);
                    loader.remove();
                    showSuccessMessage("feedback_sent_message");
                }, Math.max(0, 1000 - (+new Date() - loadStartTime)));
            };
            let formData = new FormData();
            formData.append('email', emailText);
            formData.append('msg', messageText);
            formData.append('extension', JSON.stringify({
                name: manifest.name,
                version: manifest.version
            }));
            xhr.send(formData);

        } else if (!isEmailValid) {
            opts.elm.field.feedbackEmail.addClass(opts.classes.error);
        } else if (!isMessageValid) {
            opts.elm.textarea.feedbackMsg.addClass(opts.classes.error);
        }

        setTimeout(() => {
            $("." + opts.classes.error).removeClass(opts.classes.error);
        }, 700);
    };

    /**
     * Initialises the appearance settings
     */
    let initAppearanceTab = () => {
        opts.elm.appearanceLabels.children("a").on("click", (e) => {
            e.preventDefault();
            opts.elm.appearanceLabels.removeClass(opts.classes.tabs.active);
            let tabElm = $(e.currentTarget).parent("li");
            let tabName = tabElm.attr(opts.attr.type);
            tabElm.addClass(opts.classes.tabs.active);

            opts.elm.appearanceSections.forEach((section) => {
                let name = $(section).attr(opts.attr.appearance);

                if (name === tabName) {
                    $(section).removeClass(opts.classes.tabs.hidden);
                } else {
                    $(section).addClass(opts.classes.tabs.hidden);
                }
            });
        });

        opts.elm.appearanceLabels.children("a").eq(0).trigger("click");

        let styles = modelHelper.getData("a/styles");

        setTimeout(() => {
            Object.keys(styles).forEach((key) => {
                let value = styles[key];

                if (opts.elm.range[key]) {
                    opts.elm.range[key][0].value = value.replace("px", "");
                    opts.elm.range[key].trigger("change");
                } else if (opts.elm.color[key]) {
                    let picker = opts.elm.color[key].data("picker");

                    if (value.search(/rgba\(/) > -1) {
                        let colorParsed = value.replace(/(rgba|\(|\))/gi, "").split(",");
                        value = "rgb(" + colorParsed[0] + "," + colorParsed[1] + "," + colorParsed[2] + ")";
                        if (picker.alpha) {
                            picker.alpha[0].value = colorParsed[3];
                        }
                    }

                    picker.set(value);
                    picker.trigger("change");
                }
            });
        }, 0);
    };

    /**
     * Initialises the behaviour settings
     */
    let initBehaviourTab = () => {
        ["rememberScroll", "rememberSearch", "hideEmptyDirs"].forEach((field) => {
            if (modelHelper.getData("b/" + field) === true) {
                opts.elm.checkbox[field].trigger("click");
            }
        });

        let pxTolerance = modelHelper.getData("b/pxTolerance");
        opts.elm.range.pxToleranceMaximized[0].value = pxTolerance.maximized;
        opts.elm.range.pxToleranceWindowed[0].value = pxTolerance.windowed;

        let scrollSensitivity = modelHelper.getData("b/scrollSensitivity");
        opts.elm.range.mouseScrollSensitivity[0].value = scrollSensitivity.mouse;
        opts.elm.range.trackpadScrollSensitivity[0].value = scrollSensitivity.trackpad;

        opts.elm.range.closeTimeout[0].value = modelHelper.getData("b/closeTimeout");
        opts.elm.select.openAction[0].value = modelHelper.getData("b/openAction");
        opts.elm.select.newTab[0].value = modelHelper.getData("b/newTab");

        opts.elm.range.pxToleranceMaximized.trigger("change");
        opts.elm.range.pxToleranceWindowed.trigger("change");
        opts.elm.range.mouseScrollSensitivity.trigger("change");
        opts.elm.range.trackpadScrollSensitivity.trigger("change");
        opts.elm.range.closeTimeout.trigger("change");
    };

    /**
     * Save the behaviour settings
     */
    let saveBehaviourSettings = () => {
        let config = {
            pxTolerance: {
                maximized: opts.elm.range.pxToleranceMaximized[0].value,
                windowed: opts.elm.range.pxToleranceWindowed[0].value
            },
            scrollSensitivity: {
                mouse: opts.elm.range.mouseScrollSensitivity[0].value,
                trackpad: opts.elm.range.trackpadScrollSensitivity[0].value
            },
            closeTimeout: opts.elm.range.closeTimeout[0].value,
            openAction: opts.elm.select.openAction[0].value,
            newTab: opts.elm.select.newTab[0].value
        };

        ["rememberScroll", "rememberSearch", "hideEmptyDirs"].forEach((field) => {
            config[field] = checkboxHelper.isChecked(opts.elm.checkbox[field]);
        });

        chrome.storage.sync.set({behaviour: config}, () => {
            showSuccessMessage("saved_message");
        });
    };

    /**
     * Initialises the eventhandler for the buttons
     */
    let initButtonEvents = () => {
        opts.elm.button.save.on("click", (e) => {
            e.preventDefault();

            switch (opts.elm.body.attr(opts.attr.tab)) {
                case "behaviour": {
                    saveBehaviourSettings();
                    break;
                }
                case "feedback": {
                    sendFeedback();
                    break;
                }
            }
        });
    };

    /**
     * Shows the given success message for 1.5s
     *
     * @param {string} i18nStr
     */
    let showSuccessMessage = (i18nStr) => {
        opts.elm.body.attr(opts.attr.success, chrome.i18n.getMessage("settings_" + i18nStr));
        opts.elm.body.addClass(opts.classes.success);
        setTimeout(() => {
            opts.elm.body.removeClass(opts.classes.success);
        }, 1500);
    };


    /**
     * Initialises all form elements
     */
    let initFormElements = () => {
        opts.elm.formElement.forEach((elm) => {
            let type = $(elm).attr(opts.attr.type);
            let name = $(elm).attr(opts.attr.name);
            let i18n = $(elm).attr(opts.attr.i18n) || "";

            $("<br />").insertAfter(elm);
            let label = $("<label />").attr(opts.attr.i18n, i18n).insertAfter(elm);
            $("<p />").attr(opts.attr.i18n, i18n + "_desc").insertAfter(label);

            switch (type) {
                case "checkbox": {
                    opts.elm.checkbox[name] = checkboxHelper.get(opts.elm.body).insertAfter(label);
                    break;
                }
                case "text":
                case "email": {
                    opts.elm.field[name] = $("<input type='" + type + "' />").insertAfter(label);
                    ["placeholder"].forEach((attr) => {
                        let elmAttr = $(elm).attr(opts.attr.field[attr]);
                        if (elmAttr) {
                            opts.elm.field[name].attr(attr, elmAttr);
                        }
                    });
                    break;
                }
                case "textarea": {
                    opts.elm.textarea[name] = $("<textarea />").insertAfter(label);
                    break;
                }
                case "color": {
                    opts.elm.color[name] = $("<input type='text' />").addClass(opts.classes.color.field).insertAfter(label);
                    let colorInfo = $("<span />").insertAfter(opts.elm.color[name]);
                    let picker = new CP(opts.elm.color[name][0]);

                    if ($(elm).attr(opts.attr.color.alpha)) {
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

                        if (picker.alpha && +picker.alpha[0].value < 1) {
                            picker.alpha.css("background-image", "linear-gradient(to right, transparent 0%, rgb(" + v.join(',') + ") 100%),url(" + chrome.extension.getURL("img/settings/alpha.png") + ")");
                            v = 'rgba(' + v.join(',') + ',' + picker.alpha[0].value.replace(/^0\./, '.') + ')';
                        } else {
                            v = 'rgb(' + v.join(',') + ')';
                        }

                        opts.elm.color[name][0].value = v;
                        colorInfo.css("background-color", v);
                    });

                    opts.elm.color[name].data("picker", picker);
                    break;
                }
                case "range": {
                    opts.elm.range[name] = $("<input type='range' />").insertAfter(label);

                    ["min", "max", "step"].forEach((attr) => {
                        let elmAttr = $(elm).attr(opts.attr.range[attr]);
                        if (elmAttr) {
                            opts.elm.range[name].attr(attr, elmAttr);
                        }
                    });

                    opts.elm.range[name].attr("value", $(elm).attr(opts.attr.value) || "");

                    let unit = $(elm).attr(opts.attr.range.unit) || "";
                    let valTooltip = $("<span />").insertAfter(opts.elm.range[name]);

                    opts.elm.range[name].on('input change', (e) => {
                        let elm = e.currentTarget;
                        let max = elm.max || 100;
                        let min = elm.min || 0;
                        let val = Math.round(100 * (elm.value - min) / (max - min));
                        let backgroundSize = opts.elm.range[name].css('background-size').replace(/^.*\s/, val + "% ");

                        opts.elm.range[name].css('background-size', backgroundSize);
                        valTooltip.text(elm.value + unit);
                    });
                    opts.elm.range[name].trigger("input");

                    break;
                }
                case "select": {
                    opts.elm.select[name] = $("<select />").insertAfter(label);
                    $(elm).children("span").forEach((option) => {
                        $("<option />").attr({
                            value: $(option).attr(opts.attr.value),
                            [opts.attr.i18n]: $(option).attr(opts.attr.i18n)
                        }).appendTo(opts.elm.select[name]);
                    });
                    break;
                }
            }

            elm.remove();
        });
    };

    /**
     *
     */
    (() => {
        modelHelper = new window.ModelHelper();
        checkboxHelper = new window.CheckboxHelper({opts: opts});

        initFormElements();
        initLanguage();
        initCopyright();
        initTabs();

        modelHelper.init(() => {
            initBehaviourTab();
            //initAppearanceTab();
            initShareUserdataTab();
            initButtonEvents();
        });
    })();

})(jsu);