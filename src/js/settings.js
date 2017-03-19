/**
 *
 * @param {jsu} $
 */
($ => {
    "use strict";

    let data = {};

    let classes = {
        submitSuccess: "submitSuccess",
        tabBar: "tabBar",
        tabActive: "active",
        tabHidden: "hidden",
        feedbackError: "error",
        loading: "loading"
    };

    let elm = {
        body: $("body"),
        title: $("head > title"),
        copyright: $("a#copyright"),
        tab: $("section#content > div.tab"),
        headerContent: $("header > div"),
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
        let createdDate = +elm.copyright.children("span.created").text();
        let currentYear = new Date().getFullYear();

        if (currentYear > createdDate) {
            elm.copyright.children("span.created").text(createdDate + " - " + currentYear);
        }
    };

    /**
     * Initialises the language variables in the document
     */
    let initLanguage = () => {
        $("[data-i18n]").forEach((elm) => {
            let val = $(elm).attr("data-i18n");
            let key = val.search(/^share_userdata/) === 0 ? val : "settings_" + val;
            $(elm).html(chrome.i18n.getMessage(key).replace(/\[u\](.*)\[\/u\]/, "<span>$1</span>"));
        });

        let manifest = chrome.runtime.getManifest();
        elm.title.text(elm.title.text() + " - " + manifest.short_name);
    };


    /**
     * Initialises the tab bar
     */
    let initTabs = () => {
        let tabBar = $("<ul />").addClass(classes.tabBar).prependTo($(elm.headerContent));

        elm.tab.forEach((elm) => {
            let name = $(elm).attr("data-name");
            $("<li />").attr("data-name", name).html("<a href='#'>" + chrome.i18n.getMessage("settings_tab_" + name) + "</a>").appendTo(tabBar);
        });

        tabBar.find("> li > a").on("click", (e) => {
            e.preventDefault();
            tabBar.children("li").removeClass(classes.tabActive);
            let tabElm = $(e.currentTarget).parent("li");
            tabElm.addClass(classes.tabActive);

            elm.tab.addClass(classes.tabHidden);
            $("section#content > div.tab[data-name='" + tabElm.attr("data-name") + "']").removeClass(classes.tabHidden);
        });

        tabBar.find("> li > a").eq(0).trigger("click");
    };

    let initShareUserdata = () => {
        elm.shareUserdata.share[0].checked = data.model.shareUserdata ? true : false;

        elm.shareUserdata.share.on("change", () => {
            data.model.shareUserdata = elm.shareUserdata.share[0].checked;
            data.model.lastShareDate = 0;

            chrome.storage.sync.set({
                model: data.model
            }, () => {
                elm.body.attr("data-successtext", chrome.i18n.getMessage("settings_saved_share_userdata"));
                elm.body.addClass(classes.submitSuccess);
                setTimeout(() => {
                    elm.body.removeClass(classes.submitSuccess);
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

                    elm.body.attr("data-successtext", chrome.i18n.getMessage("settings_saved_feedback"));
                    elm.body.addClass(classes.submitSuccess);
                    setTimeout(() => {
                        elm.body.removeClass(classes.submitSuccess);
                    }, 1500);
                };
                let data = new FormData();
                data.append('email', emailText);
                data.append('msg', messageText);
                data.append('extension', JSON.stringify({
                    name: manifest.name,
                    version: manifest.version
                }));
                xhr.send(data);

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
                elm.body.attr("data-successtext", chrome.i18n.getMessage("settings_saved_config"));
                elm.body.addClass(classes.submitSuccess);
                setTimeout(() => {
                    elm.body.removeClass(classes.submitSuccess);
                }, 1500);
            });
        });


        elm.config.restoreDefaults.on("click", () => { // restore default settings
            chrome.storage.sync.remove(["behaviour", "appearance"], () => {
                elm.body.attr("data-successtext", chrome.i18n.getMessage("settings_saved_restore"));
                elm.body.addClass(classes.submitSuccess);
                setTimeout(() => {
                    elm.body.removeClass(classes.submitSuccess);
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
        initLanguage();
        initCopyright();
        initTabs();

        chrome.storage.sync.get(null, (obj) => {
            data = obj;

            initConfiguration();
            initFeedback();
            initShareUserdata();
        });
    })();

})(jsu);