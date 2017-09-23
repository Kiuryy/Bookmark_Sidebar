($ => {
    "use strict";

    window.ShortcutsHelper = function (n) {

        /**
         *
         * @returns {Promise}
         */
        this.init = async() => {
            n.opts.elm.topNav.on("click", "a." + n.opts.classes.chromeApps, (e) => { // open chrome apps page
                e.preventDefault();
                chrome.tabs.update({url: "chrome://apps"});
            });
        };

    };

})(jsu);