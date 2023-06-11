($ => {
    "use strict";

    const Onboarding = function () {

        let configChanged = false;
        let currentSetup = "";
        let surfaceConfiguredInSetup = "";

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
        this.run = async () => {
            initHelpers();
            const loader = this.helper.template.loading().appendTo(this.elm.body);
            this.elm.body.addClass($.cl.initLoading);

            await this.helper.model.init();
            await this.helper.i18n.init();

            this.elm.body.parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");

            this.helper.stylesheet.init({defaultVal: true});

            this.helper.i18n.parseHtml(document);
            this.elm.title.text(this.elm.title.text() + " - " + this.helper.i18n.get("extension_name"));

            await this.helper.stylesheet.addStylesheets(["onboarding"], $(document));

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

            await $.delay(500); // finish loading
            this.elm.body.removeClass($.cl.initLoading);

            await gotoSlide("intro-1");
            loader.remove();

            await $.delay(1200);
            await gotoSlide("intro-2");
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
            $("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='intro-2'] div.video").on("click", async (e) => {
                e.preventDefault();
                currentSetup = $(e.currentTarget).attr($.attr.type);
                if (currentSetup === "sidepanel") {
                    await gotoSlide("surface");
                } else {
                    await gotoNextSlide();
                }
            });
        };

        /**
         * Initialises the eventhandlers for the position slide
         */
        const initPositionEvents = () => {
            $("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='position'] a").on("click", async (e) => {
                e.preventDefault();
                const value = $(e.currentTarget).attr($.attr.value);
                await this.helper.model.setData({"b/sidebarPosition": value});
                configChanged = true;
                await gotoNextSlide();
            }).on("mouseenter", (e) => {
                const value = $(e.currentTarget).attr($.attr.value);
                this.elm.body.attr($.attr.position, value);

                Object.values(this.elm.sidebar).forEach((sidebar) => {
                    sidebar.removeClass($.cl.visible);
                });

                this.elm.sidebar[value].addClass($.cl.visible);
            }).on("mouseleave", async (e) => {
                const slide = $(e.currentTarget).parent();
                await $.delay();
                if (slide.hasClass($.cl.visible)) {
                    Object.values(this.elm.sidebar).forEach((sidebar) => {
                        sidebar.removeClass($.cl.visible);
                    });
                }
            });
        };

        /**
         * Initialises the eventhandlers for the surface slide
         */
        const initSurfaceEvents = () => {
            $("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='surface'] a").on("click", async (e) => {
                e.preventDefault();
                const value = $(e.currentTarget).attr($.attr.value);
                const styles = this.helper.model.getData("a/styles");
                const defaultColors = this.helper.model.getDefaultColors();

                styles.colorScheme = defaultColors.colorScheme[value];
                styles.textColor = defaultColors.textColor[value];
                styles.bookmarksDirColor = defaultColors.textColor[value];
                styles.sidebarMaskColor = defaultColors.sidebarMaskColor[value];
                styles.hoverColor = defaultColors.hoverColor[value];

                await this.helper.model.setData({
                    "a/surface": value,
                    "a/styles": styles
                });

                configChanged = true;
                surfaceConfiguredInSetup = currentSetup;
                await gotoNextSlide();
            }).on("mouseenter", (e) => {
                const value = $(e.currentTarget).attr($.attr.value);
                let bodyAttr = value;
                if (value === "auto") {
                    bodyAttr = this.helper.stylesheet.getSystemSurface();
                }
                this.elm.body.attr($.attr.onboarding.surface, bodyAttr);

                if (currentSetup === "sidepanel") {
                    this.elm.sidebar.right.addClass($.cl.visible);
                }
            }).on("mouseleave", async (e) => {
                const slide = $(e.currentTarget).parent();
                await $.delay();
                if (slide.hasClass($.cl.visible)) {
                    this.elm.body.removeAttr($.attr.onboarding.surface);
                }
            });
        };

        /**
         * Initialises the eventhandlers for the openAction slide
         */
        const initOpenActionEvents = () => {
            const videoWrapper = $("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='openAction'] div." + $.cl.onboarding.video);

            $("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='openAction'] a").on("click", async (e) => {
                e.preventDefault();
                configChanged = true;
                if ($(e.currentTarget).hasClass($.cl.cancel)) {
                    await this.helper.model.setData({"b/overlayEnabled": false});
                    await gotoSlide("finished");
                } else {
                    const value = $(e.currentTarget).attr($.attr.value);
                    await this.helper.model.setData({
                        "b/openAction": value,
                        "b/iconAction": value === "icon" ? "overlay" : "sidepanel",
                        "b/overlayEnabled": true
                    });
                    await gotoNextSlide();
                }
            }).on("mouseenter", (e) => {
                const value = $(e.currentTarget).attr($.attr.value);

                if (value === "icon") {
                    videoWrapper.addClass($.cl.onboarding.highlightIcon);
                } else {
                    videoWrapper.removeClass($.cl.onboarding.highlightIcon);
                }
            }).on("mouseleave", (e) => {
                videoWrapper.removeClass($.cl.onboarding.highlightIcon);
            });
        };

        /**
         * Initialises the eventhandlers for the hands-on slide
         */
        const initHandsOnEvents = () => {
            $(document).on($.opts.events.sidebarOpened, async () => {
                if ($("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='handson']").hasClass($.cl.visible)) {
                    await gotoSlide("finished");
                }
            });

            $("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='handson'] a").on("click", async (e) => {
                e.preventDefault();
                await gotoSlide("finished");
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
                }
            });
        };

        /**
         * Shows the next slide
         */
        const gotoNextSlide = async () => {
            const name = $("section." + $.cl.onboarding.slide + "." + $.cl.visible).next("section." + $.cl.onboarding.slide).attr($.attr.name);
            await gotoSlide(name);
        };

        /**
         * Shows the slide with the given name
         *
         * @param {string} name
         */
        const gotoSlide = async (name) => {
            if (name === "surface" && surfaceConfiguredInSetup && surfaceConfiguredInSetup !== currentSetup) {
                // skip "surface" slide if the user has this already configured in another setup (e.g. sidepanel)
                name = "handson";
            }

            if (name === "handson") {
                await updateHandsOnSlide();
            } else if (name === "finished") {
                this.elm.body.addClass($.cl.onboarding.hideOpenTypeIcon);
                $("section." + $.cl.onboarding.slide + " [" + $.attr.type + "='" + currentSetup + "'] > span.setup").text(this.helper.i18n.get("onboarding_setup_complete")).addClass($.cl.onboarding.finished);
                const unfinishedSetups = $("section." + $.cl.onboarding.slide + " span.setup:not(." + $.cl.onboarding.finished + ")").length() > 0;
                if (unfinishedSetups) {
                    name = "intro-2";
                }
            }

            const prevSlide = $("section." + $.cl.onboarding.slide + "." + $.cl.visible);
            prevSlide.removeClass($.cl.visible);

            await $.delay(300);
            const newSlide = $("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='" + name + "']").addClass($.cl.visible);
            const num = newSlide.prevAll("section." + $.cl.onboarding.slide).length() + 1;

            this.helper.model.call("track", {
                name: "action",
                value: {name: "onboarding", value: num + "_" + (currentSetup ? currentSetup + "_" : "") + name},
                always: true
            });
        };

        /**
         * Initialises the Hands-On slide with the actual sidebar loaded
         */
        const updateHandsOnSlide = async () => {
            const slide = $("section." + $.cl.onboarding.slide + "[" + $.attr.name + "='handson']");
            if (currentSetup === "sidepanel") {
                slide.children("div." + $.cl.onboarding.video).addClass($.cl.visible);
            } else {
                slide.children("div." + $.cl.onboarding.video).removeClass($.cl.visible);
                loadSidebar();
            }

            Object.values(this.elm.sidebar).forEach((sidebar) => { // hide placeholder sidebar
                sidebar.removeClass($.cl.visible);
            });

            const infoText = slide.children("p." + $.cl.onboarding.small);

            const config = this.helper.model.getData(["b/openAction", "b/sidebarPosition"]);
            this.elm.body.attr($.attr.position, config.sidebarPosition);

            // change description how to open the sidebar based on sidebar position and configurated openAction
            if (currentSetup === "sidepanel") {
                infoText.text(this.helper.i18n.get("onboarding_handson_sidepanel_desc"));
            } else if (config.openAction === "icon") {
                infoText.text(this.helper.i18n.get("onboarding_handson_icon_desc"));
            } else {
                const position = this.helper.i18n.get("onboarding_" + config.sidebarPosition);
                let text = this.helper.i18n.get("onboarding_handson_mouse_desc_1", [position]);

                if (config.openAction !== "mousemove") {
                    const mouseButton = this.helper.i18n.get("onboarding_" + (config.openAction === "contextmenu" ? "right" : "left"));
                    text += " " + this.helper.i18n.get("onboarding_handson_mouse_desc_2", [mouseButton]);
                }

                infoText.text(text);
            }

            await $.delay(300);
            this.elm.body.removeClass($.cl.onboarding.hideOpenTypeIcon);
            this.elm.body.attr($.attr.onboarding.openType, config.openAction === "icon" || currentSetup === "sidepanel" ? "icon" : "mouse");
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