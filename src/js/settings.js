/**
 *
 * @param {jsu} $
 */
($ => {
    "use strict";

    let data = {};

    let opts = {
        classes: {
            tabs: {
                list: "tabBar",
                active: "active",
                hidden: "hidden"
            },
            checkbox: {
                box: "checkbox",
                active: "active",
                clicked: "clicked",
                focus: "focus"
            }
        },
        attr: {
            type: "data-type",
            name: "data-name",
            i18n: "data-i18n",
            value: "data-value",
            tab: "data-tab",
            range: {
                min: "data-min",
                max: "data-max",
                step: "data-step",
                unit: "data-unit"
            }
        },
        elm: {
            body: $("body"),
            title: $("head > title"),
            header: $("body > header"),
            tab: $("section#content > div.tab"),
            copyrightDate: $("a#copyright > span"),
            formElement: $("div.formElement"),
            checkbox: {},
            range: {},
            select: {}
        }
    };

    let classes = {
        submitSuccess: "submitSuccess",
        tabBar: "tabBar",
        tabActive: "active",
        tabHidden: "hidden",
        feedbackError: "error",
        loading: "loading",
        checkbox: {
            box: "checkbox",
            active: "active",
            clicked: "clicked",
            focus: "focus"
        }
    };

    let elm = {
        body: $("body"),
        title: $("head > title"),
        copyright: $("a#copyright"),
        tab: $("section#content > div.tab"),
        header: $("body > header"),
        config: {
            rangeInputs: $("input[type='range']"),
            pxToleranceMaximized: $("input#pxToleranceMaximized"),
            pxToleranceWindowed: $("input#pxToleranceWindowed"),
            mouseScrollSensitivity: $("input#mouseScrollSensitivity"),
            trackpadScrollSensitivity: $("input#trackpadScrollSensitivity"),
            closeTimeout: $("input#closeTimeout"),
            addVisual: $("input#addVisual"),
            newTab: $("select#newTab"),
            rememberScroll: $("input#rememberScroll"),
            rememberSearch: $("input#rememberSearch"),
            hideEmptyDirs: $("input#hideEmptyDirs"),
            openAction: $("select#openAction"),
            save: $("button#save"),
            restoreDefaults: $("button#restore"),
        },
        feedback: {
            save: $("button#sendFeedback"),
            textarea: $("textarea#feedback"),
            email: $("input#feedbackEmail"),
            rate: $("a#rate")
        },
        shareUserdata: {
            share: $("input#shareUserdata")
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

            elm.tab.forEach((tab) => {
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

    let initShareUserdataTab = () => {
        if (data.model.shareUserdata) {
            opts.elm.checkbox.shareUserdata.trigger("click");
        }

        return false;
        elm.shareUserdata.share[0].checked = data.model.shareUserdata ? true : false;

        elm.shareUserdata.share.on("change", () => {
            data.model.shareUserdata = elm.shareUserdata.share[0].checked;
            data.model.lastShareDate = 0;

            chrome.storage.sync.set({
                model: data.model
            }, () => {
                opts.elm.body.attr("data-successtext", chrome.i18n.getMessage("settings_saved_share_userdata"));
                opts.elm.body.addClass(classes.submitSuccess);
                setTimeout(() => {
                    opts.elm.body.removeClass(classes.submitSuccess);
                }, 1500);
            });
        });
    };

    /**
     * Initialises the feedback tab
     */
    let initFeedback = () => {
        elm.feedback.rate.attr({
            href: "https://chrome.google.com/webstore/detail/" + chrome.i18n.getMessage("@@extension_id") + "/reviews",
            target: "_blank"
        });

        elm.feedback.save.on("click", () => { // save setting
            let messageText = elm.feedback.textarea[0].value;
            let emailText = elm.feedback.email[0].value;
            let isEmailValid = emailText.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailText);
            let isMessageValid = messageText.length > 0;

            if (isEmailValid && isMessageValid) {
                elm.feedback.save.addClass(classes.loading);
                let manifest = chrome.runtime.getManifest();

                let xhr = new XMLHttpRequest();
                xhr.open("POST", "https://moonware.de/ajax/extensions/feedback", true);
                xhr.onload = () => {
                    elm.feedback.save.removeClass(classes.loading);
                    elm.feedback.textarea[0].value = "";
                    elm.feedback.email[0].value = "";

                    opts.elm.body.attr("data-successtext", chrome.i18n.getMessage("settings_saved_feedback"));
                    opts.elm.body.addClass(classes.submitSuccess);
                    setTimeout(() => {
                        opts.elm.body.removeClass(classes.submitSuccess);
                    }, 1500);
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
                elm.feedback.email.addClass(classes.feedbackError);
            } else if (!isMessageValid) {
                elm.feedback.textarea.addClass(classes.feedbackError);
            }

            setTimeout(() => {
                $("." + classes.feedbackError).removeClass(classes.feedbackError);
            }, 1500);
        });
    };

    let initAppearanceTab = () => {
        /*
         General
         - color scheme

         Sidebar
         - width
         - position
         - mask color
         - icon size
         - font size
         - line height
         - directory indentation

         Overlay
         - font size
         - mask color

         Indicator
         - width
         - color
         - icon size


         */
    };

    let initBehaviourTab = () => {

        ["rememberScroll", "rememberSearch", "hideEmptyDirs"].forEach((field) => {
            let val = typeof data.behaviour[field] === "undefined" ? true : data.behaviour[field];
            if (val === true) {
                opts.elm.checkbox[field].trigger("click");
            }
        });

        opts.elm.select.openAction[0].value = typeof data.behaviour.openAction === "undefined" ? "mousedown" : data.behaviour.openAction;
        opts.elm.select.newTab[0].value = typeof data.behaviour.newTab === "undefined" ? "foreground" : data.behaviour.newTab;
    };


    /**
     * Initialises the configuration tab (fill fields, init events)
     */
    let initConfiguration = () => {
        let pxToleranceObj = {windowed: 10, maximized: 1};
        let scrollSensitivityObj = {mouse: 1, trackpad: 1};


        elm.config.addVisual[0].checked = typeof data.appearance.addVisual === "undefined" ? true : data.appearance.addVisual;
        elm.config.rememberScroll[0].checked = typeof data.behaviour.rememberScroll === "undefined" ? true : data.behaviour.rememberScroll;
        elm.config.rememberSearch[0].checked = typeof data.behaviour.rememberSearch === "undefined" ? true : data.behaviour.rememberSearch;
        elm.config.hideEmptyDirs[0].checked = typeof data.behaviour.hideEmptyDirs === "undefined" ? true : data.behaviour.hideEmptyDirs;
        elm.config.openAction[0].value = typeof data.behaviour.openAction === "undefined" ? "mousedown" : data.behaviour.openAction;
        elm.config.newTab[0].value = typeof data.behaviour.newTab === "undefined" ? "foreground" : data.behaviour.newTab;

        elm.config.closeTimeout[0].value = typeof data.behaviour.closeTimeout === "undefined" ? 1 : data.behaviour.closeTimeout;
        elm.config.closeTimeout.trigger("change");


        if (typeof data.behaviour.pxTolerance !== "undefined") {
            pxToleranceObj = data.behaviour.pxTolerance;
        }

        elm.config.pxToleranceMaximized[0].value = pxToleranceObj.maximized;
        elm.config.pxToleranceWindowed[0].value = pxToleranceObj.windowed;

        elm.config.pxToleranceMaximized.trigger("change");
        elm.config.pxToleranceWindowed.trigger("change");


        if (typeof data.behaviour.scrollSensitivity !== "undefined") {
            scrollSensitivityObj = data.behaviour.scrollSensitivity;
        }

        elm.config.mouseScrollSensitivity[0].value = scrollSensitivityObj.mouse;
        elm.config.trackpadScrollSensitivity[0].value = scrollSensitivityObj.trackpad;


        elm.config.rangeInputs.on("input change", (e) => {
            $(e.currentTarget).next("span").text(e.currentTarget.value);
        });
        elm.config.rangeInputs.trigger("change");


        elm.config.save.on("click", () => { // save settings
            chrome.storage.sync.set({
                appearance: {
                    addVisual: elm.config.addVisual[0].checked
                },
                behaviour: {
                    rememberScroll: elm.config.rememberScroll[0].checked,
                    rememberSearch: elm.config.rememberSearch[0].checked,
                    hideEmptyDirs: elm.config.hideEmptyDirs[0].checked,
                    closeTimeout: elm.config.closeTimeout[0].value,
                    openAction: elm.config.openAction[0].value,
                    newTab: elm.config.newTab[0].value,
                    pxTolerance: {
                        windowed: elm.config.pxToleranceWindowed[0].value,
                        maximized: elm.config.pxToleranceMaximized[0].value
                    },
                    scrollSensitivity: {
                        mouse: elm.config.mouseScrollSensitivity[0].value,
                        trackpad: elm.config.trackpadScrollSensitivity[0].value
                    }
                }
            }, () => {
                opts.elm.body.attr("data-successtext", chrome.i18n.getMessage("settings_saved_config"));
                opts.elm.body.addClass(classes.submitSuccess);
                setTimeout(() => {
                    opts.elm.body.removeClass(classes.submitSuccess);
                }, 1500);
            });
        });


        elm.config.restoreDefaults.on("click", () => { // restore default settings
            chrome.storage.sync.remove(["behaviour", "appearance"], () => {
                opts.elm.body.attr("data-successtext", chrome.i18n.getMessage("settings_saved_restore"));
                opts.elm.body.addClass(classes.submitSuccess);
                setTimeout(() => {
                    opts.elm.body.removeClass(classes.submitSuccess);
                    setTimeout(() => {
                        window.close();
                    }, 100);
                }, 1500);
            });
        });
    };

    /**
     *
     */
    (() => {
        let checkboxHelper = new window.CheckboxHelper({opts: opts});

        opts.elm.formElement.forEach((elm) => {
            let type = $(elm).attr(opts.attr.type);
            let name = $(elm).attr(opts.attr.name);
            let i18n = $(elm).attr(opts.attr.i18n);

            $("<br />").insertAfter(elm);
            let label = $("<label />").attr(opts.attr.i18n, i18n).insertAfter(elm);
            $("<p />").attr(opts.attr.i18n, i18n + "_desc").insertAfter(label);

            switch (type) {
                case "checkbox": {
                    opts.elm.checkbox[name] = checkboxHelper.get(opts.elm.body).insertAfter(label);
                    break;
                }
                case "range": {
                    opts.elm.range[name] = $("<input type='range' />").insertAfter(label);

                    ["min", "max", "step"].forEach((attr) => {
                        opts.elm.range[name].attr(attr, $(elm).attr(opts.attr.range[attr]));
                    });

                    opts.elm.range[name].attr("value", $(elm).attr(opts.attr.value) || "");

                    let unit = $(elm).attr(opts.attr.range.unit) || "";
                    let valTooltip = $("<span />").insertAfter(opts.elm.range[name]);

                    opts.elm.range[name].on('input', (e) => {
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

        initLanguage();
        initCopyright();
        initTabs();


        let keys = ["utility", "behaviour", "appearance", "model"];
        chrome.storage.sync.get(keys, (obj) => {
            data = obj;

            keys.forEach((key) => {
                if (typeof data[key] === "undefined") {
                    data[key] = {};
                }
            });

            initBehaviourTab();
            initAppearanceTab();
            // initConfiguration();
            initFeedback();
            initShareUserdataTab();
        });
    })();

})(jsu);