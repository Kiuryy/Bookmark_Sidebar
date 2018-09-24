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
            const entries = n.helper.model.getData("n/shortcuts");
            const position = n.helper.model.getData("n/shortcutsPosition");

            n.elm.topNav.attr($.attr.position, position);
            n.elm.topNav.children("ul").remove();
            const list = $("<ul />").appendTo(n.elm.topNav);

            if (entries && entries.length > 0) {
                entries.forEach((entry) => {
                    const elm = $("<li />").appendTo(list);
                    const link = $("<a />").addClass($.cl.newtab.link).text(entry.label).appendTo(elm);

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
        const initEvents = () => {
            n.elm.topNav.on("mousedown", "a." + $.cl.newtab.link, (e) => { // handle chrome urls -> regular clicking will be blocked
                const dataHref = $(e.currentTarget).data("href");
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