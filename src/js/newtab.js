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
            title: $("head > title"),
            content: $("section#content"),
            topNav: $("section#content > nav"),
            search: {
                wrapper: $("div#search"),
                field: $("div#search > input[type='text']"),
                submit: $("div#search > button[type='submit']"),
                speechSearch: $("div#search > a.speechSearch")
            },
            fallbackInfo: $("div#fallbackInfo"),
            topPages: $("div#topPages")
        };

        this.sidebarHelper = {};
        this.enabledSetAsNewtab = false;

        /**
         * Constructor
         */
        this.run = () => {
            loadSidebar();
            initHelpers();

            const loader = this.helper.template.loading().appendTo(this.elm.body);
            this.elm.body.addClass($.cl.initLoading);

            this.helper.model.init().then(() => {
                const config = this.helper.model.getData(["a/darkMode", "a/highContrast", "b/sidebarPosition"]);
                if (config.darkMode === true) {
                    this.elm.body.addClass($.cl.page.darkMode);
                } else if (config.highContrast === true) {
                    this.elm.body.addClass($.cl.page.highContrast);
                }

                this.elm.body.attr($.attr.position, config.sidebarPosition);

                this.helper.font.init();
                this.helper.stylesheet.init();

                return Promise.all([
                    this.helper.i18n.init(),
                    this.helper.stylesheet.addStylesheets(["newtab"], $(document))
                ]);
            }).then(() => {
                this.elm.body.parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");
                this.helper.i18n.parseHtml(document);

                this.helper.topPages.init();
                this.helper.search.init();
                this.helper.shortcuts.init();
                this.helper.fallback.init();
                this.helper.edit.init();

                initEvents();

                return Promise.all([this.getBackground(), $.delay(500)]);
            }).then(([background]) => {
                loader.remove();
                this.setBackground(background);
                this.elm.body.removeClass([$.cl.building, $.cl.initLoading]);
                $(window).trigger("resize");
            });
        };

        /**
         * Reads the stored background image
         *
         * @returns {Promise}
         */
        this.getBackground = () => {
            return new Promise((resolve) => {
                if (this.helper.model.getUserType() === "premium") {
                    chrome.storage.local.get(["newtabBackground_1"], (obj) => {
                        if (obj && obj.newtabBackground_1) {
                            resolve(obj.newtabBackground_1);
                        } else {
                            resolve(null);
                        }
                    });
                } else {
                    resolve(null);
                }
            });
        };

        /**
         * Sets the given image as body background, if there is one available
         *
         * @param {string} background
         * @returns {Promise}
         */
        this.setBackground = async (background) => {
            if (background === null) {
                this.elm.body.removeClass($.cl.newtab.customBackground).css("background-image", "");
            } else {
                this.elm.body.addClass($.cl.newtab.customBackground).css("background-image", "url(" + background + ")");
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
                shortcuts: new $.ShortcutsHelper(this),
                topPages: new $.TopPagesHelper(this),
                fallback: new $.FallbackHelper(this),
                edit: new $.EditHelper(this)
            };
        };

        /**
         * Initialises the eventhandler
         */
        const initEvents = async () => {
            chrome.extension.onMessage.addListener((message) => { // listen for events from the background script
                if (message && message.action && message.action === "reinitialize" && this.enabledSetAsNewtab === false) { // sidebar has changed (e.g. due to saving configuration
                    location.reload(true);
                }
            });

            if (this.helper.model.getData("n/autoOpen")) { // sidebar should be opened automatically -> pin sidebar permanent if there is enough space to do so
                $(window).on("resize", () => {
                    if (this.elm.sidebar && this.elm.sidebar.iframe && this.elm.sidebar.sidebar) {
                        const sidebarWidth = this.elm.sidebar.sidebar.realWidth();

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
                        href: chrome.extension.getURL(css),
                        type: "text/css",
                        rel: "stylesheet",
                        [$.attr.type]: "script_sidebar"
                    }).appendTo("head");
                });

                const loadJs = (i = 0) => {
                    const js = $.opts.manifest.content_scripts[0].js[i];

                    if (typeof js !== "undefined") {
                        const script = document.createElement("script");
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