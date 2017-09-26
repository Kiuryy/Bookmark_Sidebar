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
                loading: "loading",
                chromeApps: "chromeApps",
                suggestions: "suggestions",
                active: "active",
                visible: "visible",
                darkMode: "dark"
            },
            attr: {
                type: "data-type",
                perRow: "data-perRow"
            },
            elm: {
                body: $("body"),
                title: $("head > title"),
                content: $("section#content"),
                topNav: $("section#content > nav"),
                search: {
                    field: $("div#search > input[type='text']"),
                    submit: $("div#search > button[type='submit']")
                },
                topPages: $("ul.topPages")
            },
            manifest: chrome.runtime.getManifest()
        };

        /**
         * Constructor
         */
        this.run = () => {
            chrome.permissions.contains({
                permissions: ['tabs', 'topSites']
            }, function (result) {
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
                return $.delay(500);
            }).then(() => {
                loader.remove();
                this.opts.elm.body.removeClass([this.opts.classes.building, this.opts.classes.initLoading]);
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
         * Loads the sidebar with the specified configuration
         */
        let loadSidebar = () => {
            this.opts.manifest.content_scripts[0].css.forEach((css) => {
                $("head").append("<link href='" + chrome.extension.getURL(css) + "' type='text/css' rel='stylesheet' />");
            });

            let loadJs = (i = 0) => {
                let js = this.opts.manifest.content_scripts[0].js[i];

                if (typeof js !== "undefined") {
                    let script = document.createElement('script');
                    document.head.appendChild(script);
                    script.onload = () => loadJs(i + 1);
                    script.src = "/" + js;
                }
            };

            loadJs();
        };
    };

    new window.newtab().run();

})(jsu);