($ => {
    "use strict";

    const Newtab = function () {

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.elm = {
            body: $("body"),
            content: $("section#content"),
            topLinks: $("section#content > nav"),
            search: {
                wrapper: $("form#search"),
                field: $("form#search > input[type='text']"),
                submit: $("form#search > button[type='submit']"),
                speechSearch: $("form#search > a.speechSearch")
            },
            fallbackInfo: $("div#fallbackInfo"),
            gridLinks: $("div#gridLinks")
        };

        this.sidebarHelper = {};
        this.enabledSetAsNewtab = false;

        /**
         * Constructor
         */
        this.run = async () => {
            loadSidebar();
            initHelpers();

            const loader = this.helper.template.loading().appendTo(this.elm.body);
            this.elm.body.addClass($.cl.initLoading).attr("id", $.opts.ids.page.newtab);

            await this.helper.model.init();
            this.helper.stylesheet.init();

            const config = this.helper.model.getData(["a/surface", "a/highContrast", "b/sidebarPosition"]);
            if (config.surface === "dark" || (config.surface === "auto" && this.helper.stylesheet.getSystemSurface() === "dark")) {
                this.elm.body.addClass($.cl.page.dark);
            } else if (config.highContrast === true) {
                this.elm.body.addClass($.cl.page.highContrast);
            }

            this.elm.body.attr($.attr.position, config.sidebarPosition);

            await Promise.all([
                initIcon(),
                this.helper.i18n.init(),
                this.helper.stylesheet.addStylesheets(["newtab"], $(document))
            ]);

            this.elm.body.parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");
            this.helper.i18n.parseHtml(document);

            const [background] = await Promise.all([
                this.getBackground(),
                this.helper.gridLinks.init(),
                this.helper.topLinks.init(),
                this.helper.search.init(),
                this.helper.fallback.init(),
                this.helper.edit.init(),
                initEvents(),
                $.delay(300),
            ]);

            loader.remove();
            this.setBackground(background);
            this.elm.body.removeClass([$.cl.building, $.cl.initLoading]);
            $(window).trigger("resize");

            if (!this.helper.model.getData("n/autoOpen") && this.elm.search.wrapper.hasClass($.cl.hidden) === false) {
                this.helper.search.focusSearch();
            }
        };

        /**
         * Reads the stored background image
         *
         * @returns {Promise}
         */
        this.getBackground = async () => {
            if (this.helper.model.getUserType() === "premium") {
                const obj = await $.api.storage.local.get(["newtabBackground_1"]);
                if (obj && obj.newtabBackground_1) {
                    return obj.newtabBackground_1;
                }
            }
            return null;
        };

        /**
         * Sets the given image as body background, if there is one available
         *
         * @param {string} background
         */
        this.setBackground = (background) => {
            if (background) {
                this.elm.body.addClass($.cl.newtab.customBackground).css("background-image", "url(" + background + ")");
            } else {
                this.elm.body.removeClass($.cl.newtab.customBackground).css("background-image", "");
            }
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
                model: new $.ModelHelper(this),
                template: new $.TemplateHelper(this),
                i18n: new $.I18nHelper(this),
                font: new $.FontHelper(this),
                stylesheet: new $.StylesheetHelper(this),
                checkbox: new $.CheckboxHelper(this),
                utility: new $.UtilityHelper(this),
                search: new $.SearchHelper(this),
                overlay: new $.OverlayHelper(this),
                entry: new $.EntryHelper(this),
                topLinks: new $.TopLinksHelper(this),
                gridLinks: new $.GridLinksHelper(this),
                fallback: new $.FallbackHelper(this),
                edit: new $.EditHelper(this)
            };
        };

        /**
         * Initialises the eventhandler
         */
        const initEvents = async () => {
            $.api.runtime.onMessage.addListener((message) => { // listen for events from the background script
                if (message && message.action && message.action === "reinitialize" && this.enabledSetAsNewtab === false) { // sidebar has changed (e.g. due to saving configuration)
                    location.reload(true);
                }
            });

            if (this.helper.model.getData("a/surface") === "auto") { // react on system color change
                $(document).on($.opts.events.systemColorChanged, () => {
                    if (this.helper.stylesheet.getSystemSurface() === "dark") {
                        this.elm.body.addClass($.cl.page.dark);
                    } else {
                        this.elm.body.removeClass($.cl.page.dark);
                    }
                });
            }

            $(document).on("keydown", (e) => {
                if (e.key === "Tab" && this.elm.sidebar.sidebar.hasClass($.cl.sidebar.permanent)) { // "Tab" key will focus the sidebar, if it's permanently opened
                    e.preventDefault();
                    this.elm.sidebar.iframe[0].focus();
                }
            });

            if (this.helper.model.getData("n/autoOpen")) { // sidebar should be opened automatically -> pin sidebar permanent if there is enough space to do so
                $(window).on("resize", async () => {
                    if (this.elm.sidebar && this.elm.sidebar.iframe && this.elm.sidebar.sidebar) {
                        const sidebarWidth = this.elm.sidebar.sidebar.realWidth();

                        if (window.innerWidth - sidebarWidth >= 500) {
                            this.elm.sidebar.sidebar.addClass($.cl.sidebar.permanent);
                            sidebarWidth > 0 && this.elm.content.addClass($.cl.newtab.smallContent);
                            $(document).trigger($.opts.events.openSidebar);

                            await $.delay(500);
                            $(document).trigger("click");
                        } else {
                            this.elm.sidebar.sidebar.removeClass($.cl.sidebar.permanent);
                            this.elm.content.removeClass($.cl.newtab.smallContent);
                        }

                        this.helper.gridLinks.handleWindowResize();
                    }
                }, {passive: true});
            }
        };

        /**
         * Initialises the favicon of the page
         *
         * @returns {Promise<void>}
         */
        const initIcon = async () => {
            const opts = this.helper.model.getData(["n/faviconShape", "n/faviconColor", "n/faviconBackground", "n/faviconPadding"]);
            const imageData = await this.helper.utility.getIconImageData({
                shape: opts.faviconShape,
                color: opts.faviconColor,
                background: opts.faviconBackground,
                padding: opts.faviconPadding
            });

            $("<link />").attr({
                rel: "icon",
                href: imageData
            }).appendTo(document.head);
        };

        /**
         * Injects the scripts and stylesheets to load the sidebar
         *
         * @returns {Promise}
         */
        const loadSidebar = () => {
            return new Promise((resolve) => {
                $("[" + $.attr.type + "='script_sidebar']").remove();

                const sidebarEvents = [$.opts.events.loaded, $.opts.events.elementsCreated].join(" ");
                $(document).off(sidebarEvents).on(sidebarEvents, (e) => {
                    this.elm.sidebar = e.detail.elm;
                    this.sidebarHelper = e.detail.helper;
                    $(window).trigger("resize");
                });

                $.opts.manifest.content_scripts[0].css.forEach((css) => {
                    $("<link />").attr({
                        href: $.api.runtime.getURL(css),
                        type: "text/css",
                        rel: "stylesheet",
                        [$.attr.type]: "script_sidebar"
                    }).appendTo("head");
                });

                const loadJs = (i = 0) => {
                    let js = $.opts.manifest.content_scripts[0].js[i];

                    if (typeof js !== "undefined") {
                        const script = document.createElement("script");
                        document.head.appendChild(script);
                        script.onload = () => loadJs(i + 1); // load one after another
                        if (!js.includes("://")) {
                            js = "/" + js;
                        }
                        script.src = js;
                        $(script).attr($.attr.type, "script_sidebar");
                    } else {
                        resolve();
                    }
                };

                loadJs();
            });
        };
    };

    new Newtab().run();
})(jsu);