($ => {
    "use strict";

    /**
     * @requires helper: none
     * @param {object} ext
     * @constructor
     */
    $.TemplateHelper = function (ext) {

        /**
         * Returns the html for the loading indicator
         *
         * @returns {jsu}
         */
        this.loading = () => {
            return $("" +
                "<svg class=\"loading\" width=\"36px\" height=\"36px\" viewBox=\"0 0 36 36\" xmlns=\"http://www.w3.org/2000/svg\">" +
                "<circle fill=\"none\" stroke-width=\"3\" stroke-linecap=\"round\" cx=\"18\" cy=\"18\" r=\"16\"></circle>" +
                "</svg>");
        };

        /**
         * Creates a new overlay and returns the html elements
         *
         * @param {string} type
         * @param {string} title
         * @returns {jsu}
         */
        this.overlay = (type, title) => {
            const ret = {};
            const config = ext.helper.model.getData(["b/animations", "a/darkMode", "a/highContrast"]);

            ret.overlay = $("<iframe />")
                .attr("id", $.opts.ids.page.overlay)
                .addClass("notranslate") // 'notranslate' prevents Google translator from translating the content of the overlay
                .appendTo("body");

            ext.helper.stylesheet.addStylesheets(["overlay"], ret.overlay);

            const iframeBody = ret.overlay.find("body");
            iframeBody.parent("html").attr("dir", ext.helper.i18n.isRtl() ? "rtl" : "ltr");

            ret.modal = $("<div />")
                .attr($.attr.type, type)
                .addClass($.cl.overlay.modal)
                .appendTo(iframeBody);

            if (config.animations === false) {
                ret.overlay.addClass($.cl.page.noAnimations);
            }

            if (config.darkMode) {
                iframeBody.addClass($.cl.page.darkMode);
            } else if (config.highContrast) {
                iframeBody.addClass($.cl.page.highContrast);
            }

            const header = $("<header />").appendTo(ret.modal);
            $("<h1 />").text(title).appendTo(header);
            $("<a />").addClass($.cl.close).appendTo(header);

            ret.buttonWrapper = $("<menu />").addClass($.cl.overlay.buttonWrapper).appendTo(ret.modal);
            $("<a />")
                .addClass($.cl.close)
                .appendTo(ret.buttonWrapper);

            ret.overlay[0].focus();

            $.delay(100).then(() => {
                ret.modal.addClass($.cl.visible);
                ret.overlay.addClass($.cl.page.visible);
            });

            return ret;
        };
    };

})(jsu);