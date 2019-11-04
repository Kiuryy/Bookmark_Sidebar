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
                    link.data("href", entry.url).attr("href", entry.url);
                });
            }
        };

        /**
         * Initialises the eventhandler
         */
        const initEvents = () => {
            n.elm.topNav.on("click auxclick", "a." + $.cl.newtab.link, (e) => { // handle chrome urls -> regular clicking will be blocked
                e.preventDefault();
                if (e.button === 0 || e.button === 1) {
                    n.helper.model.call("openLink", {
                        href: $(e.currentTarget).data("href"),
                        newTab: e.type === "auxclick",
                        position: n.helper.model.getData("b/newTabPosition"),
                        active: e.type === "auxclick"
                    });
                }
            });
        };
    };

})(jsu);