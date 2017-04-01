/**
 *
 * @param {jsu} $
 */
($ => {
    "use strict";

    let openAction = "mousedown";
    let sidebarPos = "left";

    let classes = {
        visible: "visible",
        reversed: "reversed"
    };

    let elm = {
        body: $("body"),
        title: $("head > title"),
        thanks: $("section#thanks"),
        tutorial: $("section#tutorial"),
        copyright: $("a#copyright"),
        close: $("a.close"),
        startTutorial: $("a.startTutorial")
    };


    /**
     * Initialises the language variables in the document
     */
    let initLanguage = () => {
        let prefix = "howto_";

        $("[data-i18n]").forEach((elm) => {
            let val = $(elm).attr("data-i18n");
            let key = val.search(/^share_userdata/) === 0 ? val : prefix + val;
            $(elm).html(chrome.i18n.getMessage(key).replace(/\[u\](.*)\[\/u\]/, "<span>$1</span>"));
        });

        let texts = [sidebarPos === "right" ? "right" : "left", openAction === "contextmenu" ? "right" : "left"];

        texts.forEach((pos, i) => {
            let text = elm.tutorial.children("p.text[data-index='" + (i + 1) + "']").text();
            text = text.replace(/\{1\}/, chrome.i18n.getMessage(prefix + "tutorial_" + pos));
            elm.tutorial.children("p.text[data-index='" + (i + 1) + "']").text(text);
        });


        let manifest = chrome.runtime.getManifest();
        elm.title.text(elm.title.text() + " - " + manifest.short_name);
    };


    /**
     * Initialises the view (start directly with the tutorial or show the thankyou-text)
     */
    let initView = () => {
        if (location.href.search(/(\?|\&)tutorial\=1/) === -1) {
            elm.thanks.addClass(classes.visible);
        } else {
            startTutorial();
        }
    };

    /**
     * Initialises the eventhandlers
     */
    let initEvents = () => {
        elm.close.on("click", (e) => {
            e.preventDefault();
            window.close();
        });

        elm.startTutorial.on("click", (e) => {
            e.preventDefault();

            if (elm.tutorial.hasClass(classes.visible)) {
                let url = location.href.replace(/(\?|\&)tutorial\=1/, "");
                location.href = url + (url.search(/\?/) === -1 ? "?" : "&") + "tutorial=1";
            } else {
                elm.thanks.removeClass(classes.visible);
                startTutorial();
            }
        });

    };

    /**
     * Starts playing the tutorial animation
     */
    let startTutorial = () => {
        elm.tutorial.addClass(classes.visible);
        elm.tutorial.attr("data-pos", sidebarPos);


        let openSidebarAnimation = (delay = 2000) => {
            setTimeout(() => {
                elm.tutorial.children("p.text[data-index='2']").removeClass(classes.visible);
                elm.tutorial.children("div#sidebar").addClass(classes.visible);
                elm.tutorial.children("div#cursor").attr("data-step", 3);

                setTimeout(() => {
                    elm.tutorial.children("p.text[data-index='3']").addClass(classes.visible);

                    setTimeout(() => {
                        elm.tutorial.children("div#cursor, p.text").removeClass(classes.visible);

                        elm.tutorial.children("div#mask").addClass(classes.visible);
                    }, 3000);
                }, 1000);
            }, delay);
        };

        let showMouseClickAnimation = () => {
            if (openAction === "contextmenu") {
                elm.tutorial.children("div#cursor").addClass(classes.reversed);
            }

            setTimeout(() => {
                elm.tutorial.children("p.text[data-index='2']").addClass(classes.visible);
                elm.tutorial.children("div#cursor").attr("data-step", 2);

                openSidebarAnimation();
            }, 500);
        };

        setTimeout(() => {
            elm.tutorial.children("p.text[data-index='1']").addClass(classes.visible);

            setTimeout(() => {
                elm.tutorial.children("div#cursor").addClass(classes.visible);

                setTimeout(() => {
                    elm.tutorial.children("div#cursor").attr("data-step", 1);

                    setTimeout(() => {
                        elm.tutorial.children("p.text[data-index='1']").removeClass(classes.visible);

                        if (openAction === "mousemove") {
                            openSidebarAnimation(700);
                        } else {
                            showMouseClickAnimation();
                        }
                    }, 1500);
                }, 500);
            }, 1000);
        }, 500);
    };


    /**
     *
     */
    (() => {
        chrome.storage.sync.get(["behaviour", "appearance"], (obj) => {
            if (obj.behaviour && obj.behaviour.openAction) {
                openAction = obj.behaviour.openAction;
            }

            if (obj.appearance && obj.appearance.sidebarPosition) {
                sidebarPos = obj.appearance.sidebarPosition;
            }

            initLanguage();
            initEvents();
            initView();
        });
    })();

})(jsu);