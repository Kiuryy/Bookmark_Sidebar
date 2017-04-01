($ => {
    "use strict";

    window.HelpHelper = function (s) {

        /**
         * Initialises the help tab
         */
        this.init = () => {
            $("a." + s.opts.classes.gotoFeedback).on("click", (e) => {
                e.preventDefault();
                s.opts.elm.header.find("> ul > li[" + s.opts.attr.name + "='feedback'] > a").trigger("click");
            });

            $("a." + s.opts.classes.howto).on("click", (e) => {
                e.preventDefault();
                window.open(chrome.extension.getURL("html/howto.html") + "?tutorial=1", '_blank');
            });
        };

    };

})(jsu);