($ => {
    "use strict";

    window.TopPagesHelper = function (n) {

        let entryHelperInited = false;
        let type = null;
        let updateRunning = false;
        let types = {
            topPages: "default",
            mostUsed: "most_used",
            recentlyUsed: "recently_used",
            pinnedEntries: "pinned_entries",
            hidden: "hidden"
        };

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();
            n.elm.topPages.html("<ul />");
            this.setType(n.helper.model.getData("n/topPagesType"));

            setInterval(() => { // refresh the entries every 2 minutes
                if (document.hidden) {
                    updateEntries();
                }
            }, 2 * 60 * 1000);
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
         * Updates the entries if the amount of visible elements has changes because of a different window size
         */
        this.handleWindowResize = () => {
            let amount = getAmount();
            let currentTotal = n.elm.topPages.children("ul").data("total");

            if (amount.total !== currentTotal) {
                updateEntries();
            }
        };

        /**
         * Initialises the eventhandlers
         */
        let initEvents = () => {
            $(window).on("resize.topPages", () => {
                this.handleWindowResize();
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
                w: n.elm.content[0].offsetWidth || window.innerWidth,
                h: n.elm.content[0].offsetHeight || window.innerHeight
            };

            let editInfoBar = $("menu." + $.cl.newtab.infoBar);
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

            if (dim.h < 330) {
                ret.total = 0;
            } else if (dim.h < 470) {
                ret.total /= 2;
                ret.rows = 1;
            }

            return ret;
        };

        /**
         * Updates the entries which are displayed as top pages
         */
        let updateEntries = () => {
            n.elm.topPages.children("ul").removeClass($.cl.general.visible);

            if (type === "hidden") {
                if (n.helper.edit.isEditMode() === false) { // don't clear html in editmode to prevent jumping
                    n.elm.topPages.children("ul").data("total", 0).html("");
                }
            } else if (updateRunning === false) {
                updateRunning = true;

                Promise.all([
                    getEntryData(),
                    $.delay(200) // allows smooth fading between switching of types
                ]).then(([list]) => {
                    let amount = getAmount();

                    n.elm.topPages.children("ul")
                        .html("")
                        .data("total", amount.total)
                        .attr($.attr.newtab.perRow, amount.total / amount.rows);

                    list.forEach((page) => {
                        let entry = $("<li />").appendTo(n.elm.topPages.children("ul"));
                        let entryLink = $("<a />").attr({href: page.url, title: page.title}).appendTo(entry);
                        let entryLabel = $("<span />").text(page.title).appendTo(entryLink);

                        n.helper.model.call("favicon", {url: page.url}).then((response) => { // retrieve favicon of url
                            if (response.img) { // favicon found -> add to entry
                                entryLabel.prepend("<img src='" + response.img + "' />");
                            }
                        });

                        let thumb = $("<img />").appendTo(entryLink);

                        if (n.helper.utility.isUrlOnBlacklist(page.url) === false) {
                            n.helper.model.call("thumbnail", {url: page.url}).then((response) => { //
                                if (response.img) { //
                                    thumb.attr("src", response.img).addClass($.cl.general.visible);
                                }
                            });
                        }
                    });

                    return $.delay(100);
                }).then(() => {
                    n.elm.topPages.children("ul").addClass($.cl.general.visible);
                    updateRunning = false;
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
                        case "pinnedEntries": {
                            initEntryHelper().then(() => {
                                let list = getPinnedEntries();
                                resolve(list);
                            });
                            break;
                        }
                        case "topPages":
                        default: {
                            if (chrome.topSites && chrome.topSites.get) { // topSites may not be available -> requires topSites permission
                                chrome.topSites.get((list) => {
                                    let lastError = chrome.runtime.lastError;

                                    if (typeof lastError === "undefined" && list) { // topSites.get can fail e.g. in incognito mode
                                        let filteredList = list.slice(0, amount.total);
                                        resolve(filteredList);
                                    } else {
                                        resolve([]);
                                    }
                                });
                            }
                            break;
                        }
                    }
                } else {
                    resolve([]);
                }
            });
        };

        /**
         * Returns the pinned bookmarks
         *
         * @returns {Array}
         */
        let getPinnedEntries = () => {
            let pinnedEntries = n.helper.entry.getAllDataByType("pinned");
            let config = n.helper.model.getData(["u/showHidden"]);
            let amount = getAmount();

            let list = [];

            pinnedEntries.some((bookmark) => {
                if ((config.showHidden || n.helper.entry.isVisible(bookmark.id)) && n.helper.entry.isSeparator(bookmark.id) === false) {
                    list.push(bookmark);
                    if (list.length >= amount.total) {
                        return true;
                    }
                }
            });

            return list;
        };

        /**
         * Returns the bookmarks sorted by the given type
         *
         * @param {string} type
         * @returns {Array}
         */
        let getSortedBookmarks = (type) => {
            let amount = getAmount();
            let allBookmarks = n.helper.entry.getAllDataByType("bookmarks");
            let config = n.helper.model.getData(["u/showHidden", "u/mostViewedPerMonth"]);
            let collator = n.helper.i18n.getLocaleSortCollator();

            if (type === "recentlyUsed") {
                allBookmarks.sort((a, b) => {
                    let aData = n.helper.entry.getDataById(a.id);
                    let bData = n.helper.entry.getDataById(b.id);
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
                    let aData = n.helper.entry.getDataById(a.id);
                    let bData = n.helper.entry.getDataById(b.id);
                    let aViews = aData ? aData.views[config.mostViewedPerMonth ? "perMonth" : "total"] : 0;
                    let bViews = bData ? bData.views[config.mostViewedPerMonth ? "perMonth" : "total"] : 0;
                    if (aViews === bViews) {
                        return collator.compare(a.title, b.title);
                    } else {
                        return bViews - aViews;
                    }
                });
            }

            let list = [];

            allBookmarks.some((bookmark) => {
                if ((config.showHidden || n.helper.entry.isVisible(bookmark.id)) && n.helper.entry.isSeparator(bookmark.id) === false && bookmark.url.search(/^file:\/\//) !== 0) {
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