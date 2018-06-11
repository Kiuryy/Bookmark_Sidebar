($ => {
    "use strict";

    window.TemplateHelper = function (ext) {

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
    };

})(jsu);