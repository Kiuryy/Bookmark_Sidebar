($ => {
    "use strict";

    window.changelog = function () {

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.opts = {
            elm: {
                title: $("head > title"),
                infobox: $("section.infobox"),
                close: $("a.close"),
                showChangelog: $("a.showChangelog")
            },
            classes: {
                visible: "visible",
                flipped: "flipped"
            },
            manifest: chrome.runtime.getManifest()
        };

        /**
         * Constructor
         */
        this.run = () => {
            initHelpers();

            this.helper.i18n.init(() => {
                this.helper.i18n.parseHtml(document);
                this.opts.elm.title.text(this.opts.elm.title.text() + " - " + this.opts.manifest.short_name);

                initEvents();
                this.opts.elm.infobox.addClass(this.opts.classes.visible);
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
            };
        };

        /**
         * Initialises the eventhandlers
         */
        let initEvents = () => {
            this.opts.elm.close.on("click", (e) => {
                e.preventDefault();
                window.close();
            });

            this.opts.elm.showChangelog.on("click", (e) => {
                e.preventDefault();
                this.opts.elm.infobox.addClass(this.opts.classes.flipped);
            });
        };
    };


    new window.changelog().run();

})(jsu);