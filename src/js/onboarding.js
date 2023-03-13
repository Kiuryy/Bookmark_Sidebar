($ => {
    "use strict";

    const Onboarding = function () {

        let configChanged = false;

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.elm = {
            body: $("body"),
            title: $("head > title"),
            sidebar: {
                left: $("div#sidebar"),
                right: null
            }
        };

        /**
         * Constructor
         */
        this.run = () => {
            initHelpers();
            const loader = this.helper.template.loading().appendTo(this.elm.body);
            this.elm.body.addClass($.cl.initLoading);

            this.helper.model.init().then(() => {
                return this.helper.i18n.init();
            }).then(() => {
                this.elm.body.parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");

                this.helper.stylesheet.init({defaultVal: true});

                this.helper.i18n.parseHtml(document);
                this.elm.title.text(this.elm.title.text() + " - " + this.helper.i18n.get("extension_name"));

                return this.helper.stylesheet.addStylesheets(["onboarding"], $(document));
            }).then(() => {
                this.elm.body.removeClass($.cl.building);

                this.elm.sidebar.right = $(this.elm.sidebar.left[0].outerHTML).appendTo(this.elm.body);
                this.elm.sidebar.right.attr($.attr.position, "right");

                initGeneralEvents();
                initIntroEvents();
                initPositionEvents();
                initSurfaceEvents();
                initOpenActionEvents();
                initHandsOnEvents();
                initFinishedEvents();

                $.delay(500).then(() => { // finish loading
                    this.elm.body.removeClass($.cl.initLoading);
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
        const initHelpers = () => {
            this.helper = {
                i18n: new $.I18nHelper(this),
                font: new $.FontHelper(this),
                stylesheet: new $.StylesheetHelper(this),
                template: new $.TemplateHelper(this),
                utility: new $.UtilityHelper(this),
                model: new $.ModelHelper(this)
            };
        };

        /**
         * Initialises the general eventhandlers
         */
        const initGeneralEvents = () => {
            $(window).on("beforeunload", () => { // reinitialize the other tabs after changing any configuration
                if (configChanged) {
                    this.helper.model.call("reinitialize");
                }
            });
        };

        /**
         * Initialises the eventhandlers for the intro slide
         */
        const initIntroEvents = () => {
            $("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='intro'] a").on("click", (e) => {
                e.preventDefault();

                if ($(e.currentTarget).hasClass($.cl.onboarding.skip)) {
                    initHandsOn();
                } else {
                    gotoNextSlide();
                }
            });
        };

        /**
         * Initialises the eventhandlers for the position slide
         */
        const initPositionEvents = () => {
            $("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='position'] a").on("mouseenter click", (e) => {
                e.preventDefault();
                const value = $(e.currentTarget).attr($.attr.value);
                this.elm.body.attr($.attr.position, value);

                Object.values(this.elm.sidebar).forEach((sidebar) => {
                    sidebar.removeClass($.cl.visible);
                });

                this.elm.sidebar[value].addClass($.cl.visible);

                if (e.type === "click") {
                    this.helper.model.setData({"b/sidebarPosition": value}).then(() => {
                        configChanged = true;
                        gotoNextSlide();
                    });
                }
            }).on("mouseleave", (e) => {
                const slide = $(e.currentTarget).parent();
                $.delay().then(() => {
                    if (slide.hasClass($.cl.visible)) {
                        Object.values(this.elm.sidebar).forEach((sidebar) => {
                            sidebar.removeClass($.cl.visible);
                        });
                    }
                });
            });

        };

        /**
         * Initialises the eventhandlers for the surface slide
         */
        const initSurfaceEvents = () => {
            $("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='surface'] a").on("mouseenter click", (e) => {
                e.preventDefault();
                const value = $(e.currentTarget).attr($.attr.value);
                let bodyAttr = value;
                if (value === "auto") {
                    bodyAttr = this.helper.stylesheet.getSystemSurface();
                }
                this.elm.body.attr($.attr.onboarding.surface, bodyAttr);

                if (e.type === "click") {
                    const styles = this.helper.model.getData("a/styles");
                    const defaultColors = this.helper.model.getDefaultColors();

                    styles.colorScheme = defaultColors.colorScheme[value];
                    styles.textColor = defaultColors.textColor[value];
                    styles.bookmarksDirColor = defaultColors.textColor[value];
                    styles.sidebarMaskColor = defaultColors.sidebarMaskColor[value];
                    styles.hoverColor = defaultColors.hoverColor[value];

                    Object.values(this.elm.sidebar).forEach((sidebar) => {
                        sidebar.removeClass($.cl.visible);
                    });

                    this.helper.model.setData({
                        "a/surface": value,
                        "a/styles": styles
                    }).then(() => {
                        configChanged = true;
                        gotoNextSlide();
                    });
                }
            }).on("mouseleave", (e) => {
                const slide = $(e.currentTarget).parent();
                $.delay().then(() => {
                    if (slide.hasClass($.cl.visible)) {
                        this.elm.body.removeAttr($.attr.onboarding.surface);
                    }
                });
            });
        };

        /**
         * Initialises the eventhandlers for the openAction slide
         */
        const initOpenActionEvents = () => {
            $("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='openAction'] a").on("mouseenter click", (e) => {
                e.preventDefault();
                const value = $(e.currentTarget).attr($.attr.value);

                if (value) {
                    if (e.type === "click") {
                        this.elm.body.addClass($.cl.onboarding.hideOpenTypeIcon);
                        this.helper.model.setData({"b/openAction": value}).then(() => {
                            configChanged = true;
                            initHandsOn();
                        });
                    } else {
                        this.elm.body.removeClass($.cl.onboarding.hideOpenTypeIcon);
                        this.elm.body.attr($.attr.onboarding.openType, value === "icon" ? "icon" : "mouse");
                    }
                }
            }).on("mouseleave", (e) => {
                if ($(e.currentTarget).parent("section").hasClass($.cl.visible)) {
                    this.elm.body.addClass($.cl.onboarding.hideOpenTypeIcon);
                }
            });
        };

        /**
         * Initialises the eventhandlers for the hands-on slide
         */
        const initHandsOnEvents = () => {
            $(document).on($.opts.events.sidebarOpened, () => {
                if (!$("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='finished']").hasClass($.cl.visible)) {
                    this.elm.body.addClass($.cl.onboarding.hideOpenTypeIcon);
                    initFinishedSlide();
                }
            });
        };

        /**
         * Initialises the eventhandlers for the last slide
         */
        const initFinishedEvents = () => {
            $("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='finished'] a").on("click", (e) => {
                e.preventDefault();
                if ($(e.currentTarget).hasClass($.cl.onboarding.settings)) {
                    location.href = $.api.runtime.getURL("html/settings.html");
                } else if ($(e.currentTarget).hasClass($.cl.onboarding.appearance)) {
                    location.href = $.api.runtime.getURL("html/settings.html") + "#appearance_sidebar";
                } else if ($(e.currentTarget).hasClass($.cl.onboarding.toggleArea)) {
                    location.href = $.api.runtime.getURL("html/settings.html") + "#sidebar_toggle_area";
                }
            });
        };

        /**
         * Shows the next slide
         */
        const gotoNextSlide = () => {
            const name = $("section." + $.cl.onboarding.slide + "." + $.cl.visible).next("section." + $.cl.onboarding.slide).attr($.attr.name);
            gotoSlide(name);
        };

        /**
         * Shows the slide with the given name
         *
         * @param {string} name
         */
        const gotoSlide = (name) => {
            const prevSlide = $("section." + $.cl.onboarding.slide + "." + $.cl.visible);
            prevSlide.removeClass($.cl.visible);

            $.delay(300).then(() => {
                const newSlide = $("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='" + name + "']").addClass($.cl.visible);
                const num = newSlide.prevAll("section." + $.cl.onboarding.slide).length() + 1;

                this.helper.model.call("track", {
                    name: "action",
                    value: {name: "onboarding", value: num + "_" + name},
                    always: true
                });
            });
        };

        /**
         * Initialises the finish slide with links to the settings and a notice when choosing to open the sidebar by clicking inside the browser content
         */
        const initFinishedSlide = () => {
            gotoSlide("finished");
            const config = this.helper.model.getData(["b/openAction", "b/sidebarPosition"]);
            const info = $("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='finished'] p." + $.cl.info);

            if (config.openAction === "icon") {
                info.remove();
            } else {
                const position = this.helper.i18n.get("onboarding_" + config.sidebarPosition);
                info.children("span").text(this.helper.i18n.get("onboarding_finish_notice", [position]));
            }
        };

        /**
         * Initialises the Hands-On slide with the actual sidebar loaded
         */
        const initHandsOn = () => {
            gotoSlide("handson");
            loadSidebar();

            Object.values(this.elm.sidebar).forEach((sidebar) => { // hide placeholder sidebar
                sidebar.removeClass($.cl.visible);
            });

            const slide = $("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='handson']");

            const config = this.helper.model.getData(["b/openAction", "b/sidebarPosition"]);
            this.elm.body.attr($.attr.position, config.sidebarPosition);

            // change description how to open the sidebar based on sidebar position and configurated openAction
            if (config.openAction === "icon") {
                $("<p></p>").text(this.helper.i18n.get("onboarding_handson_icon_desc")).appendTo(slide);
            } else {
                const position = this.helper.i18n.get("onboarding_" + config.sidebarPosition);
                $("<p></p>").text(this.helper.i18n.get("onboarding_handson_mouse_desc_1", [position])).appendTo(slide);

                if (config.openAction !== "mousemove") {
                    const mouseButton = this.helper.i18n.get("onboarding_" + (config.openAction === "contextmenu" ? "right" : "left"));
                    $("<p></p>").text(this.helper.i18n.get("onboarding_handson_mouse_desc_2", [mouseButton])).appendTo(slide);
                }
            }

            $.delay(300).then(() => { // show icon as help
                this.elm.body.removeClass($.cl.onboarding.hideOpenTypeIcon);
                this.elm.body.attr($.attr.onboarding.openType, config.openAction === "icon" ? "icon" : "mouse");
            });
        };

        /**
         * Loads the sidebar with the specified configuration
         */
        const loadSidebar = () => {
            $.opts.manifest.content_scripts[0].css.forEach((css) => {
                $("head").append("<link href='" + $.api.runtime.getURL(css) + "' type='text/css' rel='stylesheet' />");
            });

            const loadJs = (i = 0) => {
                const js = $.opts.manifest.content_scripts[0].js[i];

                if (typeof js !== "undefined") {
                    const script = document.createElement("script");
                    document.head.appendChild(script);
                    script.onload = () => loadJs(i + 1);
                    script.src = "/" + js;
                }
            };

            loadJs();
        };
    };

    new Onboarding().run();
})(jsu);