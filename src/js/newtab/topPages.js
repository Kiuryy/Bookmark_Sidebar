($ => {
    "use strict";

    window.TopPagesHelper = function (n) {

        let type = null;

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            type = n.helper.model.getData("n/topPagesType");
            initEvents();
            updateEntries();
        };

        /**
         * Initialises the eventhandlers
         */
        let initEvents = () => {
            $(window).on("resize", () => {
                let amount = getAmount();
                let currentElm = n.opts.elm.topPages.children("li").length();

                if (amount.total !== currentElm) {
                    updateEntries();
                }
            });
        };

        /**
         * Returns info about how much entries should be visible and how many rows should be displayed
         *
         * @returns {object}
         */
        let getAmount = () => {
            let ret = {
                total: 8,
                rows: 2
            };

            if (window.innerWidth > 650) {
                ret.total = 8;
            } else if (window.innerWidth > 490) {
                ret.total = 6;
            } else if (window.innerWidth > 340) {
                ret.total = 4;
            } else {
                ret.total = 0;
            }

            if (window.innerHeight < 280) {
                ret.total = 0;
            } else if (window.innerHeight < 420) {
                ret.total /= 2;
                ret.rows = 1;
            }

            return ret;
        };

        /**
         * Updates the entries
         */
        let updateEntries = () => {
            chrome.topSites.get((list) => {
                n.opts.elm.topPages.html("");
                let amount = getAmount();

                n.opts.elm.topPages.attr(n.opts.attr.perRow, amount.total / amount.rows);

                if (amount.total > 0) {
                    list.some((page, i) => {
                        let entry = $("<li />").html("<a href='" + page.url + "' title='" + page.title + "'><span>" + page.title + "</span></a>").appendTo(n.opts.elm.topPages);

                        n.helper.model.call("favicon", {url: page.url}).then((response) => { // retrieve favicon of url
                            if (response.img) { // favicon found -> add to entry
                                entry.find("> a > span").prepend("<img src='" + response.img + "' />")
                            }
                        });

                        let thumb = $("<img />").appendTo(entry.children("a"));
                        n.helper.model.call("thumbnail", {url: page.url}).then((response) => { //
                            if (response.img) { //
                                thumb.attr("src", response.img).addClass(n.opts.classes.visible);
                            }
                        });

                        if (i >= amount.total - 1) {
                            return true;
                        }
                    });
                }
            });
        };
    };

})(jsu);