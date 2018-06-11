($ => {
    "use strict";

    window.onboarding = function () {

        let configChanged = false;

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.opts = {
            elm: {
                body: $("body"),
                title: $("head > title"),
                sidebar: {left: $("div#sidebar")}
            },
            classes: {
                initLoading: "initLoading",
                slide: "slide",
                skip: "skip",
                close: "close",
                settings: "settings",
                appearance: "appearance",
                hideOpenTypeIcon: "hideOpenType",
                large: "large",
                visible: "visible"
            },
            attr: {
                name: "data-name",
                value: "data-value",
                position: "data-position",
                openType: "data-openType",
                surface: "data-surface"
            },
            events: {
                sidebarOpened: "blockbyte-bs-sidebar-opened"
            },
            manifest: chrome.runtime.getManifest()
        };
        this.cl = this.opts.classes;
        this.attr = this.opts.attr;

        /**
         * Constructor
         */
        this.run = () => {
            initHelpers();
            let loader = this.helper.template.loading().appendTo(this.opts.elm.body);

            this.helper.model.init().then(() => {
                return this.helper.i18n.init();
            }).then(() => {
                this.opts.elm.body.parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");

                this.helper.font.init();
                this.helper.stylesheet.init();
                this.helper.stylesheet.addStylesheets(["onboarding"], $(document));

                this.helper.i18n.parseHtml(document);
                this.opts.elm.title.text(this.opts.elm.title.text() + " - " + this.helper.i18n.get("extension_name"));

                this.opts.elm.sidebar.right = $(this.opts.elm.sidebar.left[0].outerHTML).appendTo(this.opts.elm.body);
                this.opts.elm.sidebar.right.attr(this.attr.position, "right");

                initGeneralEvents();
                initIntroEvents();
                initPositionEvents();
                initSurfaceEvents();
                initOpenActionEvents();
                initHandsOnEvents();
                initFinishedEvents();

                this.helper.model.call("trackPageView", {page: "/onboarding", always: true});

                $.delay(500).then(() => { // finish loading
                    this.opts.elm.body.removeClass(this.cl.initLoading);
                    gotoSlide("intro");
                    return $.delay(300);
                }).then(() => {
                    loader.remove();
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
                font: new window.FontHelper(this),
                stylesheet: new window.StylesheetHelper(this),
                template: new window.TemplateHelper(this),
                model: new window.ModelHelper(this)
            };
        };

        /**
         * Initialises the general eventhandlers
         */
        let initGeneralEvents = () => {
            $(window).on("beforeunload", () => { // reinitialize the other tabs after changing any configuration
                if (configChanged) {
                    this.helper.model.call("reinitialize");
                }
            });
        };

        /**
         * Initialises the eventhandlers for the intro slide
         */
        let initIntroEvents = () => {
            $("section." + this.cl.slide + "[" + this.attr.name + "='intro'] a").on("click", (e) => {
                e.preventDefault();

                if ($(e.currentTarget).hasClass(this.cl.skip)) {
                    initHandsOn(true);
                } else {
                    gotoNextSlide();
                }
            });
        };

        /**
         * Initialises the eventhandlers for the position slide
         */
        let initPositionEvents = () => {
            $("section." + this.cl.slide + "[" + this.attr.name + "='position'] a").on("mouseenter click", (e) => {
                e.preventDefault();
                let value = $(e.currentTarget).attr(this.attr.value);
                this.opts.elm.body.attr(this.attr.position, value);

                Object.values(this.opts.elm.sidebar).forEach((sidebar) => {
                    sidebar.removeClass(this.cl.visible);
                });

                this.opts.elm.sidebar[value].addClass(this.cl.visible);

                if (e.type === "click") {
                    this.helper.model.setData({"b/sidebarPosition": value}).then(() => {
                        configChanged = true;
                        gotoNextSlide();
                    });
                }
            }).on("mouseleave", (e) => {
                let slide = $(e.currentTarget).parent();
                $.delay().then(() => {
                    if (slide.hasClass(this.cl.visible)) {
                        Object.values(this.opts.elm.sidebar).forEach((sidebar) => {
                            sidebar.removeClass(this.cl.visible);
                        });
                    }
                });
            });

        };

        /**
         * Initialises the eventhandlers for the surface slide
         */
        let initSurfaceEvents = () => {
            $("section." + this.cl.slide + "[" + this.attr.name + "='surface'] a").on("mouseenter click", (e) => {
                e.preventDefault();
                let value = $(e.currentTarget).attr(this.attr.value);
                this.opts.elm.body.attr(this.attr.surface, value);

                if (e.type === "click") {
                    let styles = this.helper.model.getData("a/styles");
                    styles.colorScheme = this.helper.model.getDefaultColor("colorScheme", value);
                    styles.textColor = this.helper.model.getDefaultColor("textColor", value);
                    styles.bookmarksDirColor = this.helper.model.getDefaultColor("textColor", value);
                    styles.sidebarMaskColor = this.helper.model.getDefaultColor("sidebarMaskColor", value);
                    styles.hoverColor = this.helper.model.getDefaultColor("hoverColor", value);

                    Object.values(this.opts.elm.sidebar).forEach((sidebar) => {
                        sidebar.removeClass(this.cl.visible);
                    });

                    this.helper.model.setData({
                        "a/darkMode": value === "dark",
                        "a/styles": styles
                    }).then(() => {
                        configChanged = true;
                        gotoNextSlide();
                    });
                }
            }).on("mouseleave", (e) => {
                let slide = $(e.currentTarget).parent();
                $.delay().then(() => {
                    if (slide.hasClass(this.cl.visible)) {
                        this.opts.elm.body.removeAttr(this.attr.surface);
                    }
                });
            });
        };

        /**
         * Initialises the eventhandlers for the openAction slide
         */
        let initOpenActionEvents = () => {
            $("section." + this.cl.slide + "[" + this.attr.name + "='openAction'] a").on("mouseenter click", (e) => {
                e.preventDefault();
                let value = $(e.currentTarget).attr(this.attr.value);

                if (value) {
                    if (e.type === "click") {
                        this.opts.elm.body.addClass(this.cl.hideOpenTypeIcon);
                        this.helper.model.setData({"b/openAction": value}).then(() => {
                            configChanged = true;
                            initHandsOn();
                        });
                    } else {
                        this.opts.elm.body.removeClass(this.cl.hideOpenTypeIcon);
                        this.opts.elm.body.attr(this.attr.openType, value === "icon" ? "icon" : "mouse");
                    }
                }
            }).on("mouseleave", (e) => {
                if ($(e.currentTarget).parent("section").hasClass(this.cl.visible)) {
                    this.opts.elm.body.addClass(this.cl.hideOpenTypeIcon);
                }
            });
        };

        /**
         * Initialises the eventhandlers for the hands-on slide
         */
        let initHandsOnEvents = () => {
            $(document).on(this.opts.events.sidebarOpened, () => {
                if (!$("section." + this.cl.slide + "[" + this.attr.name + "='finished']").hasClass(this.cl.visible)) {
                    this.opts.elm.body.addClass(this.cl.hideOpenTypeIcon);
                    gotoSlide("finished");
                }
            });
        };

        /**
         * Initialises the eventhandlers for the last slide
         */
        let initFinishedEvents = () => {
            $("section." + this.cl.slide + "[" + this.attr.name + "='finished'] a").on("click", (e) => {
                e.preventDefault();
                if ($(e.currentTarget).hasClass(this.cl.settings)) {
                    location.href = chrome.extension.getURL("html/settings.html");
                } else if ($(e.currentTarget).hasClass(this.cl.appearance)) {
                    location.href = chrome.extension.getURL("html/settings.html") + "#appearance_sidebar";
                }
            });
        };

        /**
         * Shows the next slide
         */
        let gotoNextSlide = () => {
            let name = $("section." + this.cl.slide + "." + this.cl.visible).next("section." + this.cl.slide).attr(this.attr.name);
            gotoSlide(name);
        };

        /**
         * Shows the slide with the given name
         *
         * @param {string} name
         */
        let gotoSlide = (name) => {
            let slide = $("section." + this.cl.slide + "." + this.cl.visible);
            slide.removeClass(this.cl.visible);

            $.delay(300).then(() => {
                this.helper.model.call("trackEvent", {
                    category: "onboarding",
                    action: "view",
                    label: name,
                    always: true
                });

                $("section." + this.cl.slide + "[" + this.attr.name + "='" + name + "']").addClass(this.cl.visible);
            });
        };

        /**
         * Initialises the Hands-On slide with the actual sidebar loaded
         */
        let initHandsOn = () => {
            gotoSlide("handson");
            loadSidebar();

            Object.values(this.opts.elm.sidebar).forEach((sidebar) => { // hide placeholder sidebar
                sidebar.removeClass(this.cl.visible);
            });

            let slide = $("section." + this.cl.slide + "[" + this.attr.name + "='handson']");

            let config = this.helper.model.getData(["b/openAction", "b/sidebarPosition"]);
            this.opts.elm.body.attr(this.attr.position, config.sidebarPosition);

            // change description how to open the sidebar based on sidebar position and configurated openAction
            if (config.openAction === "icon") {
                $("<p />").text(this.helper.i18n.get("onboarding_handson_icon_desc")).appendTo(slide);
            } else {
                let position = this.helper.i18n.get("onboarding_" + config.sidebarPosition);
                $("<p />").text(this.helper.i18n.get("onboarding_handson_mouse_desc_1", [position])).appendTo(slide);

                if (config.openAction !== "mousemove") {
                    let mouseButton = this.helper.i18n.get("onboarding_" + (config.openAction === "contextmenu" ? "right" : "left"));
                    $("<p />").text(this.helper.i18n.get("onboarding_handson_mouse_desc_2", [mouseButton])).appendTo(slide);
                }
            }

            $.delay(300).then(() => { // show icon as help
                this.opts.elm.body.removeClass(this.cl.hideOpenTypeIcon);
                this.opts.elm.body.attr(this.attr.openType, config.openAction === "icon" ? "icon" : "mouse");
            });
        };

        /**
         * Loads the sidebar with the specified configuration
         */
        let loadSidebar = () => {
            this.opts.manifest.content_scripts[0].css.forEach((css) => {
                $("head").append("<link href='" + chrome.extension.getURL(css) + "' type='text/css' rel='stylesheet' />");
            });

            let loadJs = (i = 0) => {
                let js = this.opts.manifest.content_scripts[0].js[i];

                if (typeof js !== "undefined") {
                    let script = document.createElement("script");
                    document.head.appendChild(script);
                    script.onload = () => loadJs(i + 1);
                    script.src = "/" + js;
                }
            };

            loadJs();
        };
    };

    new window.onboarding().run();

})(jsu);