($ => {
    "use strict";

    const Onboarding = function () {

        let configChanged = false;
        let widthBeforeSidepanel = null;

        const sidepanelMinWidth = 50; // the page has to get narrower by at least this amount of pixels to count as an opened side panel

        /**
         * Constructor
         */
        this.run = async () => {
            initHelpers();
            const loader = this.helper.template.loading().appendTo("body");
            $("body").addClass($.cl.initLoading);

            await this.helper.model.init();
            await this.helper.i18n.init();

            $("body").parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");

            this.helper.stylesheet.init({defaultVal: true});
            await this.helper.stylesheet.addStylesheets(["settings"], $(document));

            $("body").removeClass($.cl.building);

            parseLangVars();
            this.helper.dialog.init();
            this.helper.video.init();

            initGeneralEvents();
            initModeEvents();
            initOpenActionEvents();
            initPositionEvents();
            initSurfaceEvents();
            initHandsOnEvents();
            initFinishedEvents();

            await $.delay(500);
            loader.remove();
            $("body").removeClass($.cl.initLoading);

            await gotoStep("welcome");
            await $.delay(1500);
            await gotoStep("mode");
        };

        /**
         * Opens the given url in a new active tab
         *
         * @param {string} href
         */
        this.openLink = (href) => {
            this.helper.model.call("openLink", {
                href: href,
                newTab: true,
                active: true
            });
        };

        /**
         * Adds the given class to the given elements if the condition is true, or removes it otherwise
         *
         * @param {jsu} elm
         * @param {string} cl
         * @param {boolean} condition
         */
        this.setConditionalClass = (elm, cl, condition) => {
            elm.forEach((node) => {
                node.classList.toggle(cl, !!condition);
            });
        };

        /**
         * Applies the language variables to the page
         */
        const parseLangVars = () => {
            this.helper.i18n.parseHtml(document);
            $("head > title").text($("head > title").text() + " - " + this.helper.i18n.get("extension_name"));
        };

        /**
         * Returns the element of the step with the given name
         *
         * @param {string} name
         * @returns {jsu}
         */
        const getStep = (name) => $(`section.${$.cl.settings.intro.step}[${$.attr.name}='${name}']`);

        /**
         * Returns the selectable options of the step with the given name
         *
         * @param {string} name
         * @returns {jsu}
         */
        const getOptions = (name) => getStep(name).find(`div.${$.cl.settings.intro.option}`);

        /**
         * Stores the given values and remembers to let the other tabs know about the changed configuration when leaving the page
         *
         * @param {object} values
         * @returns {Promise}
         */
        const saveData = async (values) => {
            await this.helper.model.setData(values);
            configChanged = true;
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
         * Initialises the eventhandlers of the mode selection, the mode is stored right away,
         * opening the sidebar via the extension icon is only possible in overlay mode, otherwise the icon opens the side panel
         */
        const initModeEvents = () => {
            const step = getStep("mode");

            step.find(`div.col.mode[${$.attr.name}='overlay'] a.btn.external`).on("click", (e) => {
                e.preventDefault();
                this.openLink($.opts.website.knowledgebase.overlayMode);
            });

            step.find(`div.col.mode[${$.attr.name}='sidepanel'] a.btn.external`).on("click", (e) => {
                e.preventDefault();
                this.openLink($.opts.website.knowledgebase.sidepanelMode);
            });

            step.find(`a[${$.attr.type}='mode']`).on("click", async (e) => {
                e.preventDefault();
                const mode = $(e.currentTarget).attr($.attr.value);
                const values = {"b/mode": mode};

                if (mode !== "overlay" && this.helper.model.getData("b/openAction") === "icon") {
                    values["b/openAction"] = this.helper.model.getData("b/openAction", true);
                }

                await saveData(values);
                this.helper.model.call("reloadBrowserAction");

                await gotoStep(mode === "overlay" ? "openAction" : "surface");
            });
        };

        /**
         * Initialises the eventhandlers of the open action step
         */
        const initOpenActionEvents = () => {
            getOptions("openAction").on("click", async (e) => {
                e.preventDefault();
                const values = {"b/openAction": $(e.currentTarget).attr($.attr.value)};

                if ($.browserName === "Edge") { // New design of Edge has a border around the browser content, which makes it hard to click the outermost pixel
                    values["b/triggerWidth"] = 20;
                }

                await saveData(values);
                this.helper.model.call("reloadBrowserAction");
                await gotoStep("position");
            });
        };

        /**
         * Initialises the eventhandlers of the position step
         */
        const initPositionEvents = () => {
            getOptions("position").on("click", async (e) => {
                e.preventDefault();
                await saveData({"b/sidebarPosition": $(e.currentTarget).attr($.attr.value)});
                await gotoStep("surface");
            });
        };

        /**
         * Initialises the eventhandlers of the surface step, an explicitly selected surface also changes the colors to the defaults of this surface
         */
        const initSurfaceEvents = () => {
            getOptions("surface").on("click", async (e) => {
                e.preventDefault();
                const surface = $(e.currentTarget).attr($.attr.value);
                const values = {"a/surface": surface};

                if (surface !== "auto") { // in auto mode the model applies the colors of the system surface by itself
                    const styles = this.helper.model.getData("a/styles");
                    const defaultColors = this.helper.model.getDefaultColors(this.helper.model.getData("a/theme"));

                    this.helper.model.getSurfaceColorDependentStyles().forEach((key) => {
                        styles[key] = defaultColors[key][surface];
                    });

                    if (this.helper.model.isDefaultColorScheme(styles.colorScheme)) { // only change if it was the default color (of any theme) before
                        styles.colorScheme = defaultColors.colorScheme[surface];
                    }

                    values["a/styles"] = styles;
                }

                await saveData(values);
                await gotoStep("handson");
            });
        };

        /**
         * Initialises the eventhandlers of the hands-on step, opening the sidebar finishes the setup
         */
        const initHandsOnEvents = () => {
            $(document).on($.opts.events.sidebarOpened, async () => {
                if ($("body").attr($.attr.settings.step) === "handson") {
                    await gotoStep("finished");
                }
            });

            $(window).on("resize", async () => { // the side panel takes its space from the page -> the page getting narrower means it has been opened
                if (widthBeforeSidepanel === null) {
                    return;
                }

                if (window.innerWidth > widthBeforeSidepanel) { // the window got wider in the meantime -> compare with the new width
                    widthBeforeSidepanel = window.innerWidth;
                } else if (widthBeforeSidepanel - window.innerWidth >= sidepanelMinWidth) {
                    widthBeforeSidepanel = null;
                    await gotoStep("finished");
                }
            });

            getStep("handson").find(`a[${$.attr.type}='done']`).on("click", async (e) => {
                e.preventDefault();
                await gotoStep("finished");
            });
        };

        /**
         * Initialises the eventhandlers of the last step
         */
        const initFinishedEvents = () => {
            getOptions("finished").on("click", (e) => {
                e.preventDefault();
                const url = $.api.runtime.getURL("html/settings.html");
                location.href = $(e.currentTarget).attr($.attr.value) === "appearance" ? url + "#appearance" : url + "#settings";
            });
        };

        /**
         * Fades out the current step and fades in the step with the given name
         *
         * @param {string} name
         * @returns {Promise}
         */
        const gotoStep = async (name) => {
            const prevStep = $(`section.${$.cl.settings.intro.step}.${$.cl.visible}`);
            if (prevStep.length() > 0) { // fade out the current step first
                prevStep.removeClass($.cl.visible);
                await $.delay(300);
            }

            widthBeforeSidepanel = null;
            if (name === "surface") { // show the placeholder sidebar of the previews on the side it will appear (the side panel is usually on the right)
                const position = this.helper.model.getData("b/mode") === "sidepanel" ? "right" : this.helper.model.getData("b/sidebarPosition");
                getStep("surface").attr($.attr.position, position);
            } else if (name === "handson") {
                updateHandsOnStep();

                if (this.helper.model.getData("b/mode") === "sidepanel") {
                    widthBeforeSidepanel = window.innerWidth;
                } else {
                    loadSidebar();
                }
            }

            $("body").attr($.attr.settings.step, name);
            window.scrollTo(0, 0);

            await $.delay(20); // the step has to be displayed before it can fade in
            getStep(name).addClass($.cl.visible);
        };

        /**
         * Describes how to open the sidebar, based on the configured mode, position and open action,
         * a cursor at the edge of the window points to the trigger area, when opening via the extension icon there is the info how to make the icon visible instead
         */
        const updateHandsOnStep = () => {
            const step = getStep("handson");
            const config = this.helper.model.getData(["b/mode", "b/openAction", "b/sidebarPosition"]);
            const viaIcon = config.mode === "sidepanel" || config.openAction === "icon"; // in side panel mode the extension icon opens the side panel
            let text;

            if (viaIcon) {
                text = this.helper.i18n.get("onboarding_handson_icon_desc");
            } else {
                const position = this.helper.i18n.get("onboarding_" + config.sidebarPosition);
                text = this.helper.i18n.get("onboarding_handson_mouse_desc_1", [position]);

                if (config.openAction !== "mousemove") {
                    const mouseButton = this.helper.i18n.get("onboarding_" + (config.openAction === "contextmenu" ? "right" : "left"));
                    text += " " + this.helper.i18n.get("onboarding_handson_mouse_desc_2", [mouseButton]);
                }
            }

            step.find(`p.${$.cl.settings.intro.text}`).text(text);
            this.setConditionalClass(step.find(`div.${$.cl.settings.intro.iconInfo}`), $.cl.hidden, !viaIcon);
            this.setConditionalClass(step.find(`span.${$.cl.settings.intro.openHint}`), $.cl.hidden, viaIcon);
            step.find(`span.${$.cl.settings.intro.openHint}`).attr($.attr.position, config.sidebarPosition);
        };

        /**
         * Loads the sidebar with the stored configuration
         */
        const loadSidebar = () => {
            if ($(`script[${$.attr.type}='script_sidebar']`).length() > 0) { // already loaded
                return;
            }

            $.opts.manifest.content_scripts[0].css.forEach((css) => {
                $("head").append("<link href='" + $.api.runtime.getURL(css) + "' type='text/css' rel='stylesheet' />");
            });

            const loadJs = (i = 0) => {
                let js = $.opts.manifest.content_scripts[0].js[i];

                if (typeof js !== "undefined") {
                    const script = document.createElement("script");
                    document.head.appendChild(script);
                    script.onload = () => loadJs(i + 1);
                    if (!js.includes("://")) {
                        js = "/" + js;
                    }
                    script.src = js;
                    $(script).attr($.attr.type, "script_sidebar");
                }
            };

            loadJs();
        };

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
                model: new $.ModelHelper(this),
                dialog: new $.SettingsDialogHelper(this),
                video: new $.SettingsVideoHelper(this),
            };
        };
    };

    new Onboarding().run();

})(jsu);
