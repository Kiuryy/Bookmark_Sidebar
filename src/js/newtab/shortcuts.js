($ => {
    "use strict";

    $.ShortcutsHelper = function (n) {

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            this.refreshEntries();
            initEvents();
        };

        /**
         * Initialises the entries for the menu
         */
        this.refreshEntries = () => {
            let entries = n.helper.model.getData("n/shortcuts");
            n.elm.topNav.children("ul").remove();
            let list = $("<ul />").appendTo(n.elm.topNav);

            if (entries && entries.length > 0) {
                entries.forEach((entry) => {
                    let elm = $("<li />").appendTo(list);
                    let link = $("<a />").addClass($.cl.newtab.link).text(entry.label).appendTo(elm);

                    if (entry.url.startsWith("chrome://") || entry.url.startsWith("chrome-extension://")) {
                        link.data("href", entry.url);
                    } else {
                        link.attr("href", entry.url);
                    }
                });
            }
        };

        /**
         * Initialises the eventhandler
         */
        let initEvents = () => {
            n.elm.topNav.on("mousedown", "a." + $.cl.newtab.link, (e) => { // handle chrome urls -> regular clicking will be blocked
                let dataHref = $(e.currentTarget).data("href");
                if (dataHref) {
                    e.preventDefault();

                    n.helper.model.call("openLink", {
                        href: dataHref,
                        newTab: e.which === 2,
                        position: n.helper.model.getData("b/newTabPosition"),
                        active: e.which !== 2
                    });
                }
            });
        };

    };

})(jsu);