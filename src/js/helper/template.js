($ => {
    "use strict";

    window.TemplateHelper = function (ext) {

        /**
         * Returns the html for the loading indicator
         *
         * @returns {jsu}
         */
        this.loading = () => {
            return $('' +
                '<div class="loading">' +
                ' <div>' +
                '  <div class="circle-clipper left">' +
                '   <div></div>' +
                '  </div>' +
                '  <div class="gap-patch">' +
                '   <div></div>' +
                '  </div>' +
                '  <div class="circle-clipper right">' +
                '   <div></div>' +
                '  </div>' +
                ' </div>' +
                '</div>');
        };

        /**
         * Returns the html for the footer
         *
         * @returns {jsu}
         */
        this.footer = () => {
            let footer = $('' +
                '<footer>' +
                ' <a id="copyright" href="https://moonware.de/extensions" target="_blank">' +
                '  &copy; <span class="created">2016</span>&ensp;<strong>Moonware</strong>' +
                ' </a>' +
                '</footer>');

            let createdDate = +footer.find("span.created").text();
            let currentYear = new Date().getFullYear();

            if (currentYear > createdDate) {
                footer.find("span.created").text(createdDate + " - " + currentYear);
            }

            return footer;
        };


    };

})(jsu);