($ => {
    "use strict";

    window.newtab = function () {

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.opts = {
            classes: {
                building: "building",
                initLoading: "initLoading",
                sidebarPermanent: "permanent",
                smallContent: "small",
                loading: "loading",
                chromeApps: "chromeApps",
                suggestions: "suggestions",
                edit: "edit",
                add: "add",
                link: "link",
                permanentSidebar: "permanentSidebar",
                remove: "remove",
                infoBar: "infoBar",
                save: "save",
                cancel: "cancel",
                active: "active",
                visible: "visible",
                darkMode: "dark"
            },
            attr: {
                type: "data-type",
                perRow: "data-perRow",
                pos: "data-pos"
            },
            elm: {
                body: $("body"),
                title: $("head > title"),
                content: $("section#content"),
                topNav: $("section#content > nav"),
                search: {
                    wrapper: $("div#search"),
                    field: $("div#search > input[type='text']"),
                    submit: $("div#search > button[type='submit']")
                },
                topPages: $("div#topPages")
            },
            events: {
                loaded: "blockbyte-bs-loaded",
                elementsCreated: "blockbyte-bs-created"
            },
            manifest: chrome.runtime.getManifest()
        };

        /**
         * Constructor
         */
        this.run = () => {
            chrome.permissions.contains({
                permissions: ["tabs", "topSites"]
            }, (result) => {
                if (result) {
                    loadPage();
                } else { // no permission to continue -> show default page instead
                    chrome.tabs.update({url: "chrome-search://local-ntp/local-ntp.html"});
                }
            });
        };

        /*
         * ################################
         * PRIVATE
         * ################################
         */

        let loadPage = () => {
            loadSidebar();
            initHelpers();

            let loader = this.helper.template.loading().appendTo(this.opts.elm.body);
            this.opts.elm.body.addClass(this.opts.classes.initLoading);

            this.helper.model.init().then(() => {
                let darkMode = this.helper.model.getData("a/darkMode");
                if (darkMode === true) {
                    this.opts.elm.body.addClass(this.opts.classes.darkMode);
                }
                return this.helper.i18n.init();
            }).then(() => {
                this.helper.font.init();
                this.helper.stylesheet.init();
                this.helper.stylesheet.addStylesheets(["newtab"], $(document));
                this.helper.i18n.parseHtml(document);

                this.helper.topPages.init();
                this.helper.search.init();
                this.helper.shortcuts.init();
                this.helper.edit.init();
                initEvents();

                return $.delay(500);
            }).then(() => {
                loader.remove();
                this.opts.elm.body.removeClass([this.opts.classes.building, this.opts.classes.initLoading]);
                $(window).trigger("resize");
            });
        };

        /**
         * Initialises the helper objects
         */
        let initHelpers = () => {
            this.helper = {
                model: new window.ModelHelper(this),
                template: new window.TemplateHelper(this),
                i18n: new window.I18nHelper(this),
                font: new window.FontHelper(this),
                stylesheet: new window.StylesheetHelper(this),
                search: new window.SearchHelper(this),
                entry: new window.EntryHelper(this),
                shortcuts: new window.ShortcutsHelper(this),
                topPages: new window.TopPagesHelper(this),
                edit: new window.EditHelper(this)
            };
        };

        /**
         * Initialises the eventhandler
         */
        let initEvents = async () => {
            chrome.extension.onMessage.addListener((message) => { // listen for events from the background script
                if (message && message.action && message.action === "reinitialize") { // sidebar has changed (e.g. due to saving configuration
                    location.reload(true);
                }
            });

            if (this.helper.model.getData("n/autoOpen")) { // sidebar should be opened automatically -> pin sidebar permanent if there is enough space to do so
                $(window).on("resize", () => {
                    if (this.opts.elm.sidebar && this.opts.elm.sidebar.iframe && this.opts.elm.sidebar.sidebar) {
                        let sidebarWidth = this.opts.elm.sidebar.sidebar.realWidth();

                        if (window.innerWidth - sidebarWidth >= 500) {
                            this.opts.elm.sidebar.sidebar.addClass(this.opts.classes.sidebarPermanent);
                            sidebarWidth > 0 && this.opts.elm.content.addClass(this.opts.classes.smallContent);
                        } else {
                            this.opts.elm.sidebar.sidebar.removeClass(this.opts.classes.sidebarPermanent);
                            this.opts.elm.content.removeClass(this.opts.classes.smallContent);
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
                $("[" + this.opts.attr.type + "='script_sidebar']").remove();

                let sidebarEvents = [this.opts.events.loaded, this.opts.events.elementsCreated].join(" ");
                $(document).off(sidebarEvents).on(sidebarEvents, (e) => {
                    this.opts.elm.sidebar = e.detail.elm;
                    $(window).trigger("resize");
                });

                this.opts.manifest.content_scripts[0].css.forEach((css) => {
                    $("<link />").attr({
                        href: chrome.extension.getURL(css),
                        type: "text/css",
                        rel: "stylesheet",
                        [this.opts.attr.type]: "script_sidebar"
                    }).appendTo("head");
                });

                let loadJs = (i = 0) => {
                    let js = this.opts.manifest.content_scripts[0].js[i];

                    if (typeof js !== "undefined") {
                        let script = document.createElement("script");
                        document.head.appendChild(script);
                        script.onload = () => loadJs(i + 1); // load one after another
                        script.src = "/" + js;
                        $(script).attr(this.opts.attr.type, "script_sidebar");
                    } else {
                        resolve();
                    }
                };

                loadJs();
            });
        };
    };

    new window.newtab().run();

})(jsu);