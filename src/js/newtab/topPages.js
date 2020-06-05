($ => {
    "use strict";

    $.TopPagesHelper = function (n) {

        const entryHelperInited = false;
        let type = null;
        let maxCols = 0;
        let maxRows = 0;
        let appearance = null;
        let updateRunning = false;

        const appearances = {
            thumbnail: {colWidth: 159, rowHeight: 132},
            favicon: {colWidth: 145, rowHeight: 121},
        };

        const types = {
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
            n.elm.topPages.html("<ul></ul>");
            type = n.helper.model.getData("n/topPagesType");
            appearance = n.helper.model.getData("n/topPagesAppearance");
            maxCols = n.helper.model.getData("n/topPagesMaxCols");
            maxRows = n.helper.model.getData("n/topPagesMaxRows");

            updateEntries();

            setInterval(() => { // refresh the entries every 2 minutes
                if (document.hidden) {
                    updateEntries();
                }
            }, 3 * 60 * 1000);
        };

        /**
         *
         * @returns {object}
         */
        this.getAllTypes = () => types;

        /**
         *
         * @returns {Array}
         */
        this.getAllAppearances = () => appearances;

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
         *
         * @param {string} val
         */
        this.setMaxCols = (val) => {
            if (maxCols !== val) { // don't unneccessary reload the top pages if the amount of cols is still the same
                maxCols = val;
                updateEntries();
            }
        };

        /**
         *
         * @param {string} val
         */
        this.setMaxRows = (val) => {
            if (maxRows !== val) { // don't unneccessary reload the top pages if the amount of rows is still the same
                maxRows = val;
                updateEntries();
            }
        };

        /**
         *
         * @param {string} val
         */
        this.setAppearance = (val) => {
            if (appearance !== val) { // don't unneccessary reload the top pages if the appearance is still the same
                appearance = val;
                updateEntries();
            }
        };

        /**
         * Updates the entries if the amount of visible elements has changes because of a different window size
         */
        this.handleWindowResize = () => {
            const amount = getAmount();
            const currentTotal = n.elm.topPages.children("ul").data("total");

            if (amount.total !== currentTotal) {
                updateEntries();
            }
        };

        /**
         * Initialises the eventhandlers
         */
        const initEvents = () => {
            $(window).on("resize.topPages", () => {
                this.handleWindowResize();
            }, {passive: true});
        };

        /**
         * Returns info about how much columns and rows should be displayed, based on how much space is on the screen
         *
         * @returns {object}
         */
        const getAmount = () => {
            const ret = {
                cols: maxCols,
                rows: maxRows
            };

            const dim = {
                w: n.elm.content[0].offsetWidth || window.innerWidth,
                h: (n.elm.content[0].offsetHeight || window.innerHeight) - n.elm.search.wrapper[0].offsetHeight - 150
            };

            while (appearances[appearance].colWidth * ret.cols > dim.w && ret.cols > 0) { // adjust column amount to fit the grid on the page
                ret.cols--;
            }

            while (appearances[appearance].rowHeight * ret.rows > dim.h && ret.rows > 0) { // adjust row amount to fit the grid on the page
                ret.rows--;
            }

            ret.total = ret.cols * ret.rows;
            return ret;
        };

        /**
         * Updates the entries which are displayed as top pages
         */
        const updateEntries = () => {
            const topPagesWrapper = n.elm.topPages.children("ul");
            topPagesWrapper.removeClass($.cl.visible);

            if (type === "hidden") {
                if (n.helper.edit.isEditMode() === false) { // don't clear html in editmode to prevent jumping
                    topPagesWrapper.data("total", 0).html("");
                }
            } else if (updateRunning === false) {
                updateRunning = true;

                Promise.all([
                    getEntryData(),
                    $.delay(200) // allows smooth fading between switching of types
                ]).then(([pages]) => {
                    const amount = getAmount();

                    topPagesWrapper
                        .html("")
                        .data("total", amount.total)
                        .css("grid-template-columns", "1fr ".repeat(amount.cols).trim())
                        .attr($.attr.newtab.appearance, appearance);

                    pages.forEach((page) => {
                        const entry = $("<li></li>").appendTo(topPagesWrapper);
                        const entryLink = $("<a></a>").attr({href: page.url, title: page.title}).appendTo(entry);
                        const entryLabel = $("<span></span>").text(page.title).appendTo(entryLink);

                        n.helper.model.call("favicon", {url: page.url}).then((response) => { // retrieve favicon of url
                            if (response.img) { // favicon found -> add to entry
                                const favicon = $("<img />").attr("src", response.img);

                                if (appearance === "thumbnail") {
                                    favicon.prependTo(entryLabel);
                                } else {
                                    $("<div></div>").append(favicon).prependTo(entryLink);
                                }
                            }
                        });

                        if (appearance === "thumbnail") {
                            const thumb = $("<img />").appendTo(entryLink);

                            if (n.helper.utility.isUrlOnBlacklist(page.url) === false) {
                                n.helper.model.call("thumbnail", {url: page.url}).then((response) => { //
                                    if (response.img) { //
                                        thumb.attr("src", response.img).addClass($.cl.visible);
                                    }
                                });
                            }
                        }
                    });

                    return $.delay(100);
                }).then(() => {
                    topPagesWrapper.addClass($.cl.visible);
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
        const initEntryHelper = () => {
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
        const getEntryData = () => {
            return new Promise((resolve) => {
                const amount = getAmount();

                if (amount.total > 0) {
                    switch (type) {
                        case "mostUsed":
                        case "recentlyUsed": {
                            initEntryHelper().then(() => {
                                const list = getSortedBookmarks(type);
                                resolve(list);
                            });
                            break;
                        }
                        case "pinnedEntries": {
                            initEntryHelper().then(() => {
                                const list = getPinnedEntries();
                                resolve(list);
                            });
                            break;
                        }
                        case "topPages":
                        default: {
                            if ($.api.topSites && $.api.topSites.get) { // topSites may not be available -> requires topSites permission
                                $.api.topSites.get((list) => {
                                    const lastError = $.api.runtime.lastError;

                                    if (typeof lastError === "undefined" && list) { // topSites.get can fail e.g. in incognito mode
                                        const filteredList = list.slice(0, amount.total);
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
        const getPinnedEntries = () => {
            const sortObj = n.helper.model.getData("u/sort");
            const pinnedEntries = n.helper.entry.getAllDataByType("pinned");
            const showHidden = n.helper.model.getData("u/showHidden");
            const amount = getAmount();

            n.helper.utility.sortEntries(pinnedEntries, sortObj); // sort pinned entries the same way they are arranged in the sidebar
            const list = [];

            pinnedEntries.some((bookmark) => {
                if ((showHidden || n.helper.entry.isVisible(bookmark.id)) && n.helper.entry.isSeparator(bookmark.id) === false) {
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
        const getSortedBookmarks = (type) => {
            const amount = getAmount();
            const list = [];
            const showHidden = n.helper.model.getData("u/showHidden");
            const allBookmarks = n.helper.entry.getAllDataByType("bookmarks");

            n.helper.utility.sortEntries(allBookmarks, {name: type, dir: "DESC"});

            allBookmarks.some((bookmark) => {
                if ((showHidden || n.helper.entry.isVisible(bookmark.id)) && n.helper.entry.isSeparator(bookmark.id) === false && bookmark.url.search(/^file:\/\//) !== 0) {
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