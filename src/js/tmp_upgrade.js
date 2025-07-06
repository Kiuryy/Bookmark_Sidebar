($ => {
    "use strict";

    const TmpUpgrade = function () {

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.elm = {
            body: $("body"),
            title: $("head > title"),
            content: $("section#content"),
            button: $("section#content > a"),
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
            initEvents();

            this.helper.i18n.parseHtml(document);
            this.elm.title.text(this.elm.title.text() + " - " + this.helper.i18n.get("extension_name"));

            await this.helper.stylesheet.addStylesheets(["tmp_upgrade"], $(document));

            this.elm.body.removeClass($.cl.building);

            await $.delay(500); // finish loading
            this.elm.body.removeClass($.cl.initLoading);
            this.elm.content.addClass($.cl.visible);
            loader.remove();
        };

        /*
         * ################################
         * PRIVATE
         * ################################
         */

        const initEvents = () => {
            this.elm.button.on("click", (e) => {
                e.preventDefault();
                location.href = $.api.runtime.getURL("html/settings.html") + "#newtab";
            });
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
                model: new $.ModelHelper(this)
            };
        };
    };

    new TmpUpgrade().run();
})(jsu);