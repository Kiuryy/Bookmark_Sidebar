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

        /**
         * Resolves with the content to the given svg name
         *
         * @param {string} name
         * @returns {Promise}
         */
        this.svgByName = (name) => {
            return new Promise((resolve, reject) => {
                $.xhr(chrome.extension.getURL("img/" + name + ".svg")).then((xhr) => {
                    resolve(xhr.responseText);
                }, () => {
                    reject();
                });
            });
        };

        /**
         * Returns the html for the footer
         *
         * @returns {jsu}
         */
        this.footer = () => {
            let footer = $("" +
                "<footer>" +
                " <a id=\"copyright\" href=\"https://extensions.blockbyte.de/\" target=\"_blank\">" +
                "  &copy; <span class=\"created\">2016</span>&ensp;<strong>Blockbyte</strong>" +
                " </a>" +
                "</footer>");

            let createdDate = +footer.find("span.created").text();
            let currentYear = new Date().getFullYear();

            if (currentYear > createdDate) {
                footer.find("span.created").text(createdDate + " - " + currentYear);
            }

            return footer;
        };
    };

})(jsu);