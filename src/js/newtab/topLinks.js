($ => {
    "use strict";

    $.TopLinksHelper = function (n) {

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
            const entries = n.helper.model.getData("n/topLinks");
            const position = n.helper.model.getData("n/topLinksPosition");

            n.elm.topLinks.attr($.attr.position, position);
            n.elm.topLinks.children("ul").remove();
            const list = $("<ul></ul>").appendTo(n.elm.topLinks);

            if (entries && entries.length > 0) {
                entries.forEach((entry) => {
                    const elm = $("<li></li>").appendTo(list);
                    const link = $("<a></a>").text(entry.title).appendTo(elm);
                    link.data("href", entry.url).attr("href", entry.url);
                });
            }
        };

        /**
         * Initialises the eventhandler
         */
        const initEvents = () => {
            n.elm.topLinks.on("click auxclick", "> ul > li  > a", (e) => { // handle chrome urls -> regular clicking will be blocked

                if (n.elm.body.hasClass($.cl.newtab.edit)) { // disable event in edit mode
                    return;
                }

                e.preventDefault();
                if (e.button === 0 || e.button === 1) {
                    n.helper.model.call("openLink", {
                        href: $(e.currentTarget).data("href"),
                        newTab: e.type === "auxclick",
                        position: n.helper.model.getData("b/newTabPosition"),
                        active: e.type !== "auxclick"
                    });
                }
            });
        };
    };

})(jsu);