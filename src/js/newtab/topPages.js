($ => {
    "use strict";

    window.TopPagesHelper = function (n) {

        let type = null;
        let entryHelperInited = false;

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();
            type = n.helper.model.getData("n/topPagesType");
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
         * Updates the entries which are displayed as top pages
         */
        let updateEntries = () => {
            getEntryData().then((list) => {
                let amount = getAmount();

                n.opts.elm.topPages.html("");
                n.opts.elm.topPages.attr(n.opts.attr.perRow, amount.total / amount.rows);

                list.forEach((page) => {
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
                });
            });
        };

        /**
         * Initialises the entry helper (if not already initialized),
         * The helper is used to retrieve the most/recently used bookmarks
         *
         * @returns {Promise}
         */
        let initEntryHelper = () => {
            return new Promise((resolve) => {
                if (entryHelperInited) {
                    resolve();
                } else {
                    n.helper.entry.init().then(() => {
                        resolve();
                    });
                }
            });
        };

        /**
         * Returns the entries which should be displayed as top pages
         *
         * @returns {Promise}
         */
        let getEntryData = () => {
            return new Promise((resolve) => {
                let amount = getAmount();

                if (amount.total > 0) {
                    switch (type) {
                        case "mostUsed":
                        case "recentlyUsed": {
                            initEntryHelper().then(() => {
                                let list = getSortedBookmarks(type);
                                resolve(list);
                            });
                            break;
                        }
                        case "topPages":
                        default: {
                            chrome.topSites.get((list) => {
                                let filteredList = list.slice(0, amount.total);
                                resolve(filteredList);
                            });
                            break;
                        }
                    }
                } else {
                    resolve([]);
                }
            });
        };

        /**
         * Returns the bookmarks sorted by the given type
         *
         * @param {string} type
         * @returns {Array}
         */
        let getSortedBookmarks = (type) => {
            let amount = getAmount();
            let allBookmarks = n.helper.entry.getAllBookmarkData();
            let mostViewedPerMonth = n.helper.model.getData("u/mostViewedPerMonth");
            let collator = n.helper.i18n.getLocaleSortCollator();

            if (type === "recentlyUsed") {
                allBookmarks.sort((a, b) => {
                    let aData = n.helper.entry.getData(a.id);
                    let bData = n.helper.entry.getData(b.id);
                    let aLastView = aData ? aData.views.lastView : 0;
                    let bLastView = bData ? bData.views.lastView : 0;
                    if (aLastView === bLastView) {
                        return collator.compare(a.title, b.title);
                    } else {
                        return bLastView - aLastView;
                    }
                });
            } else if (type === "mostUsed") {
                allBookmarks.sort((a, b) => {
                    let aData = n.helper.entry.getData(a.id);
                    let bData = n.helper.entry.getData(b.id);
                    let aViews = aData ? aData.views[mostViewedPerMonth ? "perMonth" : "total"] : 0;
                    let bViews = bData ? bData.views[mostViewedPerMonth ? "perMonth" : "total"] : 0;
                    if (aViews === bViews) {
                        return collator.compare(a.title, b.title);
                    } else {
                        return bViews - aViews
                    }
                });
            }

            let list = [];

            allBookmarks.some((bookmark) => {
                if (n.helper.entry.isVisible(bookmark.id)) {
                    list.push(bookmark);
                    if (list.length >= amount.total) {
                        return true;
                    }
                }
            });

            return list;
        };

    };

})(jsu);