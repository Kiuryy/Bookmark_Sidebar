/**
 *
 * @param {jsu} $
 */
($ => {
    "use strict";

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
     * Initialises the language variables in the document
     */
    let initLanguage = () => {
        $("[data-i18n]").forEach((elm) => {
            let val = $(elm).attr("data-i18n");
            let key = val.search(/^share_userdata/) === 0 ? val : "settings_" + val;
            $(elm).html(chrome.i18n.getMessage(key).replace(/\[u\](.*)\[\/u\]/, "<span>$1</span>"));
        });
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
        chrome.storage.sync.get("shareUserdata", (obj) => {
            elm.shareUserdata.share[0].checked = obj.shareUserdata === "y" ? true : false;
        });

        elm.shareUserdata.share.on("change", () => {
            chrome.storage.sync.remove(["lastShareDate"]);

            chrome.storage.sync.set({
                shareUserdata: elm.shareUserdata.share[0].checked ? "y" : "n",
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
        chrome.storage.sync.get("addVisual", (obj) => {
            elm.config.addVisual[0].checked = typeof obj.addVisual === "undefined" ? true : (obj.addVisual === "y");
        });

        chrome.storage.sync.get("rememberScroll", (obj) => {
            elm.config.rememberScroll[0].checked = typeof obj.rememberScroll === "undefined" ? true : (obj.rememberScroll === "y");
        });

        chrome.storage.sync.get("hideEmptyDirs", (obj) => {
            elm.config.hideEmptyDirs[0].checked = typeof obj.hideEmptyDirs === "undefined" ? true : (obj.hideEmptyDirs === "y");
        });

        chrome.storage.sync.get("openAction", (obj) => {
            elm.config.openAction[0].value = typeof obj.openAction === "undefined" ? "contextmenu" : obj.openAction;
        });

        chrome.storage.sync.get(["newTab", "middleClickActive"], (obj) => {
            if (typeof obj.newTab === "undefined" && typeof obj.middleClickActive !== "undefined") { // backward compatibility
                obj.newTab = obj.middleClickActive === "y" ? "foreground" : "background";
            }

            elm.config.newTab[0].value = typeof obj.newTab === "undefined" ? "foreground" : obj.newTab;
        });

        chrome.storage.sync.get("closeTimeout", (obj) => {
            elm.config.closeTimeout[0].value = typeof obj.closeTimeout === "undefined" ? 1 : obj.closeTimeout;
            elm.config.closeTimeout.trigger("change");
        });

        chrome.storage.sync.get("pxTolerance", (obj) => {
            let pxToleranceObj = {windowed: 10, maximized: 1};

            if (typeof obj.pxTolerance !== "undefined") {
                pxToleranceObj = JSON.parse(obj.pxTolerance);
            }

            elm.config.pxToleranceMaximized[0].value = pxToleranceObj.maximized;
            elm.config.pxToleranceWindowed[0].value = pxToleranceObj.windowed;

            elm.config.pxToleranceMaximized.trigger("change");
            elm.config.pxToleranceWindowed.trigger("change");
        });

        chrome.storage.sync.get("scrollSensitivity", (obj) => {
            let scrollSensitivityObj = {mouse: 1, trackpad: 1};

            if (typeof obj.scrollSensitivity !== "undefined") {
                scrollSensitivityObj = JSON.parse(obj.scrollSensitivity);
            }

            elm.config.mouseScrollSensitivity[0].value = scrollSensitivityObj.mouse;
            elm.config.trackpadScrollSensitivity[0].value = scrollSensitivityObj.trackpad;

            elm.config.mouseScrollSensitivity.trigger("change");
            elm.config.trackpadScrollSensitivity.trigger("change");
        });


        elm.config.rangeInputs.on("input change", (e) => {
            $(e.currentTarget).next("span").text(e.currentTarget.value);
        });


        elm.config.save.on("click", () => { // save settings
            let openAction = elm.config.openAction[0].value;

            chrome.storage.sync.set({
                addVisual: openAction !== "mousemove" && elm.config.addVisual[0].checked ? "y" : "n",
                rememberScroll: elm.config.rememberScroll[0].checked ? "y" : "n",
                hideEmptyDirs: elm.config.hideEmptyDirs[0].checked ? "y" : "n",
                closeTimeout: elm.config.closeTimeout[0].value,
                openAction: openAction,
                newTab: elm.config.newTab[0].value,
                pxTolerance: JSON.stringify({
                    windowed: elm.config.pxToleranceWindowed[0].value,
                    maximized: elm.config.pxToleranceMaximized[0].value
                }),
                scrollSensitivity: JSON.stringify({
                    mouse: elm.config.mouseScrollSensitivity[0].value,
                    trackpad: elm.config.trackpadScrollSensitivity[0].value
                })
            }, () => {
                elm.body.attr("data-successtext", chrome.i18n.getMessage("settings_saved_config"));
                elm.body.addClass(classes.submitSuccess);
                setTimeout(() => {
                    elm.body.removeClass(classes.submitSuccess);
                }, 1500);
            });

            chrome.storage.sync.remove(["middleClickActive"]); // remove old settings
        });


        elm.config.restoreDefaults.on("click", () => { // restore default settings
            chrome.storage.sync.remove(["addVisual", "rememberScroll", "hideEmptyDirs", "closeTimeout", "openAction", "newTab", "pxTolerance", "scrollSensitivity"], () => {
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
        let manifest = chrome.runtime.getManifest();
        elm.title.text(manifest.short_name + " - " + $("head > title").text());

        let createdDate = +elm.copyright.children("span.created").text();
        let currentYear = new Date().getFullYear();

        if (currentYear > createdDate) {
            elm.copyright.children("span.created").text(createdDate + " - " + currentYear);
        }

        initLanguage();
        initTabs();
        initConfiguration();
        initFeedback();
        initShareUserdata();
    })();

})(jsu);