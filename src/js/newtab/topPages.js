($ => {
    "use strict";

    window.TopPagesHelper = function (n) {

        let entryHelperInited = false;
        let type = null;
        let types = {
            topPages: "default",
            mostUsed: "most_used",
            recentlyUsed: "recently_used",
            hidden: "hidden"
        };

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();
            n.opts.elm.topPages.html("<ul />");
            this.setType(n.helper.model.getData("n/topPagesType"));

            setInterval(() => { // refresh the entries every 5 minutes
                updateEntries();
            }, 5 * 60 * 1000);
        };

        /**
         *
         * @returns {object}
         */
        this.getAllTypes = () => types;

        /**
         *
         * @param {string} val
         */
        this.setType = (val) => {
            if (type !== val || type === "hidden") { // don't unneccessary reload the top pages if the type is still the same
                type = val;
                updateEntries();
            }
        };

        /**
         * Initialises the eventhandlers
         */
        let initEvents = () => {
            $(window).on("resize", () => {
                let amount = getAmount();
                let currentElm = n.opts.elm.topPages.find("> ul > li").length();

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

            let dim = {
                w: window.innerWidth,
                h: window.innerHeight
            };

            let editInfoBar = $("menu." + n.opts.classes.infoBar);
            if (editInfoBar.length() > 0) {
                dim.h -= editInfoBar[0].offsetHeight;
            }

            if (dim.w > 650) {
                ret.total = 8;
            } else if (dim.w > 490) {
                ret.total = 6;
            } else if (dim.w > 340) {
                ret.total = 4;
            } else {
                ret.total = 0;
            }

            if (dim.h < 280) {
                ret.total = 0;
            } else if (dim.h < 420) {
                ret.total /= 2;
                ret.rows = 1;
            }

            return ret;
        };

        /**
         * Updates the entries which are displayed as top pages
         */
        let updateEntries = () => {
            n.opts.elm.topPages.children("ul").removeClass(n.opts.classes.visible);

            if (type === "hidden") {
                if (n.helper.edit.isEditMode() === false) { // don't clear html in editmode to prevent jumping
                    n.opts.elm.topPages.children("ul").html("");
                }
            } else {
                Promise.all([
                    getEntryData(),
                    $.delay(200) // allows smooth fading between switching of types
                ]).then(([list]) => {
                    let amount = getAmount();

                    n.opts.elm.topPages.children("ul").html("");
                    n.opts.elm.topPages.children("ul").attr(n.opts.attr.perRow, amount.total / amount.rows);

                    list.forEach((page) => {
                        let entry = $("<li />").html("<a href='" + page.url + "' title='" + page.title + "'><span>" + page.title + "</span></a>").appendTo(n.opts.elm.topPages.children("ul"));

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

                    return $.delay(100);
                }).then(() => {
                    n.opts.elm.topPages.children("ul").addClass(n.opts.classes.visible);
                });
            }
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
            let config = n.helper.model.getData(["u/showHidden", "u/mostViewedPerMonth"]);
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
                    let aViews = aData ? aData.views[config.mostViewedPerMonth ? "perMonth" : "total"] : 0;
                    let bViews = bData ? bData.views[config.mostViewedPerMonth ? "perMonth" : "total"] : 0;
                    if (aViews === bViews) {
                        return collator.compare(a.title, b.title);
                    } else {
                        return bViews - aViews
                    }
                });
            }

            let list = [];

            allBookmarks.some((bookmark) => {
                if (config.showHidden || n.helper.entry.isVisible(bookmark.id)) {
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