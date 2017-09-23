($ => {
    "use strict";

    window.TopPagesHelper = function (n) {

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initTopPages();
        };

        let initTopPages = () => {
            chrome.topSites.get((list) => {
                list.some((page, i) => {
                    let entry = $("<li />").html("<a href='" + page.url + "' title='" + page.title + "'>" + page.title + "</a>").appendTo(n.opts.elm.topPages);

                    n.helper.model.call("favicon", {url: page.url}).then((response) => { // retrieve favicon of url
                        if (response.img) { // favicon found -> add to entry
                            entry.children("a").prepend("<img src='" + response.img + "' />")
                        }
                    });

                    if (i >= 7) {
                        return true;
                    }
                });
            });
        };
    };

})(jsu);