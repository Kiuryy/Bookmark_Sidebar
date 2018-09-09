($ => {
    "use strict";

    let Newtab = function () {

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.elm = {
            body: $("body"),
            title: $("head > title"),
            content: $("section#content"),
            topNav: $("section#content > nav"),
            search: {
                wrapper: $("div#search"),
                field: $("div#search > input[type='text']"),
                submit: $("div#search > button[type='submit']")
            },
            fallbackInfo: $("div#fallbackInfo"),
            topPages: $("div#topPages")
        };

        this.enabledSetAsNewtab = false;

        /**
         * Constructor
         */
        this.run = () => {
            loadSidebar();
            initHelpers();

            let loader = this.helper.template.loading().appendTo(this.elm.body);
            this.elm.body.addClass($.cl.initLoading);

            this.helper.model.init().then(() => {
                let config = this.helper.model.getData(["a/darkMode", "a/highContrast", "b/sidebarPosition"]);
                if (config.darkMode === true) {
                    this.elm.body.addClass($.cl.page.darkMode);
                } else if (config.highContrast === true) {
                    this.elm.body.addClass($.cl.page.highContrast);
                }

                this.elm.body.attr($.attr.position, config.sidebarPosition);

                this.helper.font.init();
                this.helper.stylesheet.init();
                this.helper.stylesheet.addStylesheets(["newtab"], $(document));

                return this.helper.i18n.init();
            }).then(() => {
                this.elm.body.parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");
                this.helper.i18n.parseHtml(document);

                this.helper.topPages.init();
                this.helper.search.init();
                this.helper.shortcuts.init();
                this.helper.fallback.init();
                this.helper.edit.init();

                initEvents();
                this.setBackground();

                return $.delay(500);
            }).then(() => {
                loader.remove();
                this.elm.body.removeClass([$.cl.building, $.cl.initLoading]);
                $(window).trigger("resize");
            });
        };

        /**
         * Sets the stored image as body background, if there is one available
         *
         * @returns {Promise}
         */
        this.setBackground = async () => {
            if (this.helper.model.getUserType() === "premium") {
                let background = this.helper.model.getData("u/newtabBackground");
                if (background) {
                    this.elm.body.addClass($.cl.newtab.customBackground).css("background-image", "url(" + background + ")");
                } else {
                    this.elm.body.removeClass($.cl.newtab.customBackground).css("background-image", "");
                }
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
        let initHelpers = () => {
            this.helper = {
                model: new $.ModelHelper(this),
                template: new $.TemplateHelper(this),
                i18n: new $.I18nHelper(this),
                font: new $.FontHelper(this),
                stylesheet: new $.StylesheetHelper(this),
                checkbox: new $.CheckboxHelper(this),
                utility: new $.UtilityHelper(this),
                search: new $.SearchHelper(this),
                entry: new $.EntryHelper(this),
                shortcuts: new $.ShortcutsHelper(this),
                topPages: new $.TopPagesHelper(this),
                fallback: new $.FallbackHelper(this),
                edit: new $.EditHelper(this)
            };
        };

        /**
         * Initialises the eventhandler
         */
        let initEvents = async () => {
            chrome.extension.onMessage.addListener((message) => { // listen for events from the background script
                if (message && message.action && (message.action === "reinitialize" || message.action === "reload") && this.enabledSetAsNewtab === false) { // sidebar has changed (e.g. due to saving configuration
                    location.reload(true);
                }
            });

            if (this.helper.model.getData("n/autoOpen")) { // sidebar should be opened automatically -> pin sidebar permanent if there is enough space to do so
                $(window).on("resize", () => {
                    if (this.elm.sidebar && this.elm.sidebar.iframe && this.elm.sidebar.sidebar) {
                        let sidebarWidth = this.elm.sidebar.sidebar.realWidth();

                        if (window.innerWidth - sidebarWidth >= 500) {
                            this.elm.sidebar.sidebar.addClass($.cl.sidebar.permanent);
                            sidebarWidth > 0 && this.elm.content.addClass($.cl.newtab.smallContent);
                            $(document).trigger($.opts.events.openSidebar);

                            $.delay(500).then(() => {
                                $(document).trigger("click");
                            });
                        } else {
                            this.elm.sidebar.sidebar.removeClass($.cl.sidebar.permanent);
                            this.elm.content.removeClass($.cl.newtab.smallContent);
                        }

                        this.helper.topPages.handleWindowResize();
                    }
                });
            }
        };

        /**
         * Injects the scripts and stylesheets to load the sidebar
         *
         * @returns {Promise}
         */
        let loadSidebar = () => {
            return new Promise((resolve) => {
                $("[" + $.attr.type + "='script_sidebar']").remove();

                let sidebarEvents = [$.opts.events.loaded, $.opts.events.elementsCreated].join(" ");
                $(document).off(sidebarEvents).on(sidebarEvents, (e) => {
                    this.elm.sidebar = e.detail.elm;
                    $(window).trigger("resize");
                });

                $.opts.manifest.content_scripts[0].css.forEach((css) => {
                    $("<link />").attr({
                        href: chrome.extension.getURL(css),
                        type: "text/css",
                        rel: "stylesheet",
                        [$.attr.type]: "script_sidebar"
                    }).appendTo("head");
                });

                let loadJs = (i = 0) => {
                    let js = $.opts.manifest.content_scripts[0].js[i];

                    if (typeof js !== "undefined") {
                        let script = document.createElement("script");
                        document.head.appendChild(script);
                        script.onload = () => loadJs(i + 1); // load one after another
                        script.src = "/" + js;
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