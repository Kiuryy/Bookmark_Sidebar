($ => {
    "use strict";

    window.howto = function () {

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.opts = {
            elm: {
                title: $("head > title"),
                thanks: $("section#thanks"),
                tutorial: $("section#tutorial"),
                copyright: $("a#copyright"),
                close: $("a.close"),
                startTutorial: $("a.startTutorial")
            },
            classes: {
                visible: "visible",
                reversed: "reversed"
            },
            attr: {
                i18nReplaces: "data-i18nReplaces"
            },
            manifest: chrome.runtime.getManifest()
        };

        /**
         * Constructor
         */
        this.run = () => {
            initHelpers();

            this.helper.model.init(() => {

                this.helper.i18n.init(() => {
                    let config = this.helper.model.getData(["b/openAction", "a/sidebarPosition"]);

                    this.opts.elm.tutorial.children("p.text[data-index='1']").attr(this.opts.attr.i18nReplaces, this.helper.i18n.get("howto_tutorial_" + config.sidebarPosition));
                    this.opts.elm.tutorial.children("p.text[data-index='2']").attr(this.opts.attr.i18nReplaces, this.helper.i18n.get("howto_tutorial_" + (config.openAction === "contextmenu" ? "right" : "left")));

                    this.helper.i18n.parseHtml(document);
                    this.opts.elm.title.text(this.opts.elm.title.text() + " - " + this.opts.manifest.short_name);

                    initEvents();
                    initView();
                });
            });

        };

        /*
         * ################################
         * PRIVATE
         * ################################
         */

        /**
         * Initialises the helper objects
         */
        let initHelpers = () => {
            this.helper = {
                i18n: new window.I18nHelper(this),
                model: new window.ModelHelper(this)
            };
        };

        /**
         * Initialises the view (start directly with the tutorial or show the thankyou-text)
         */
        let initView = () => {
            if (location.href.search(/(\?|\&)tutorial\=1/) === -1) {
                this.opts.elm.thanks.addClass(this.opts.classes.visible);
            } else {
                startTutorial();
            }
        };

        /**
         * Initialises the eventhandlers
         */
        let initEvents = () => {
            this.opts.elm.close.on("click", (e) => {
                e.preventDefault();
                window.close();
            });

            this.opts.elm.startTutorial.on("click", (e) => {
                e.preventDefault();

                if (this.opts.elm.tutorial.hasClass(this.opts.classes.visible)) {
                    let url = location.href.replace(/(\?|\&)tutorial\=1/, "");
                    location.href = url + (url.search(/\?/) === -1 ? "?" : "&") + "tutorial=1";
                } else {
                    this.opts.elm.thanks.removeClass(this.opts.classes.visible);
                    startTutorial();
                }
            });

        };

        /**
         * Starts playing the tutorial animation
         */
        let startTutorial = () => {
            let config = this.helper.model.getData(["b/openAction", "a/sidebarPosition"]);
            this.opts.elm.tutorial.addClass(this.opts.classes.visible);
            this.opts.elm.tutorial.attr("data-pos", config.sidebarPosition);


            let openSidebarAnimation = (delay = 2000) => {
                setTimeout(() => {
                    this.opts.elm.tutorial.children("p.text[data-index='2']").removeClass(this.opts.classes.visible);
                    this.opts.elm.tutorial.children("div#sidebar").addClass(this.opts.classes.visible);
                    this.opts.elm.tutorial.children("div#cursor").attr("data-step", 3);

                    setTimeout(() => {
                        this.opts.elm.tutorial.children("p.text[data-index='3']").addClass(this.opts.classes.visible);

                        setTimeout(() => {
                            this.opts.elm.tutorial.children("div#cursor, p.text").removeClass(this.opts.classes.visible);

                            this.opts.elm.tutorial.children("div#mask").addClass(this.opts.classes.visible);
                        }, 3000);
                    }, 1000);
                }, delay);
            };

            let showMouseClickAnimation = () => {
                if (config.openAction === "contextmenu") {
                    this.opts.elm.tutorial.children("div#cursor").addClass(this.opts.classes.reversed);
                }

                setTimeout(() => {
                    this.opts.elm.tutorial.children("p.text[data-index='2']").addClass(this.opts.classes.visible);
                    this.opts.elm.tutorial.children("div#cursor").attr("data-step", 2);

                    openSidebarAnimation();
                }, 500);
            };

            setTimeout(() => {
                this.opts.elm.tutorial.children("p.text[data-index='1']").addClass(this.opts.classes.visible);

                setTimeout(() => {
                    this.opts.elm.tutorial.children("div#cursor").addClass(this.opts.classes.visible);

                    setTimeout(() => {
                        this.opts.elm.tutorial.children("div#cursor").attr("data-step", 1);

                        setTimeout(() => {
                            this.opts.elm.tutorial.children("p.text[data-index='1']").removeClass(this.opts.classes.visible);

                            if (config.openAction === "mousemove") {
                                openSidebarAnimation(700);
                            } else {
                                showMouseClickAnimation();
                            }
                        }, 1500);
                    }, 500);
                }, 1000);
            }, 500);
        };
    };

    new window.howto().run();

})(jsu);