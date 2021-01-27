($ => {
    "use strict";

    $.GridLinksHelper = function (n) {

        const entryHelperInited = false;
        let type = null;
        let maxCols = 0;
        let maxRows = 0;
        let updateRunning = false;

        const colWidth = 145;
        const rowHeight = 121;

        const types = {
            topPages: "default",
            mostUsed: "most_used",
            recentlyUsed: "recently_used",
            custom: "custom",
            pinnedEntries: "pinned_entries",
            hidden: "hidden"
        };

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();
            n.elm.gridLinks.html("<ul></ul>");
            type = n.helper.model.getData("n/gridType");
            maxCols = n.helper.model.getData("n/gridMaxCols");
            maxRows = n.helper.model.getData("n/gridMaxRows");

            updateEntries();

            setInterval(() => { // refresh the entries every 3 minutes
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
         * @param {string} val
         */
        this.setType = async (val) => {
            type = val;
            await updateEntries();
        };

        /**
         *
         * @param {string} val
         */
        this.setMaxCols = async (val) => {
            if (maxCols !== val) { // don't unneccessary reload the top pages if the amount of cols is still the same
                maxCols = val;
                await updateEntries();
            }
        };

        /**
         *
         * @param {string} val
         */
        this.setMaxRows = async (val) => {
            if (maxRows !== val) { // don't unneccessary reload the top pages if the amount of rows is still the same
                maxRows = val;
                await updateEntries();
            }
        };

        /**
         * Updates the entries if the amount of visible elements has changes because of a different window size
         */
        this.handleWindowResize = async () => {
            const amount = getAmount();
            const currentTotal = n.elm.gridLinks.children("ul").data("total");

            if (amount.total !== currentTotal) {
                await updateEntries();
            }
        };

        /**
         * Initialises the eventhandlers
         */
        const initEvents = () => {
            $(window).on("resize.gridLinks", () => {
                this.handleWindowResize();
            }, {passive: true});

            n.elm.gridLinks.on("click auxclick", "> ul > li > a", (e) => { // handle chrome urls -> regular clicking will be blocked

                if (n.elm.gridLinks.attr($.attr.type) === "custom" && n.elm.body.hasClass($.cl.newtab.edit)) { // disable event for custom grid in edit mode
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

            while (colWidth * ret.cols > dim.w && ret.cols > 0) { // adjust column amount to fit the grid on the page
                ret.cols--;
            }

            while (rowHeight * ret.rows > dim.h && ret.rows > 0) { // adjust row amount to fit the grid on the page
                ret.rows--;
            }

            ret.total = ret.cols * ret.rows;
            return ret;
        };

        /**
         * Updates the entries which are displayed as top pages
         *
         * @returns {Promise}
         */
        const updateEntries = () => {
            return new Promise((resolve) => {
                n.elm.gridLinks.attr($.attr.type, type);
                const gridWrapper = n.elm.gridLinks.children("ul");
                gridWrapper.removeClass($.cl.visible);

                if (type === "hidden") {
                    if (n.helper.edit.isEditMode() === false) { // don't clear html in editmode to prevent jumping
                        gridWrapper.data("total", 0).html("");
                    }
                    resolve();
                } else if (updateRunning === false) {
                    updateRunning = true;

                    Promise.all([
                        getEntryData(),
                        $.delay(200) // allows smooth fading between switching of types
                    ]).then(([pages]) => {
                        const amount = getAmount();

                        gridWrapper
                            .html("")
                            .data("total", amount.total)
                            .css("grid-template-columns", "1fr ".repeat(amount.cols).trim());

                        pages.forEach((page) => {
                            const entry = $("<li></li>").appendTo(gridWrapper);
                            const entryLink = $("<a></a>")
                                .attr({
                                    href: page.url,
                                    title: page.title,
                                    [$.attr.value]: page.url.length === 0 ? "empty" : "url"
                                })
                                .data("href", page.url)
                                .appendTo(entry);

                            $("<span></span>").text(page.title).appendTo(entryLink);

                            n.helper.model.call("favicon", {url: page.url}).then((response) => { // retrieve favicon of url
                                if (response.img) { // favicon found -> add to entry
                                    const favicon = $("<img />").attr("src", response.img);
                                    $("<div></div>").append(favicon).prependTo(entryLink);
                                }
                            });
                        });

                        return $.delay(100);
                    }).then(() => {
                        gridWrapper.addClass($.cl.visible);
                        updateRunning = false;

                        resolve();
                    });
                }
            });
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
                        case "custom": {
                            const list = getCustomEntries();
                            resolve(list);
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
         * Returns the user defined entries
         *
         * @returns {Array}
         */
        const getCustomEntries = () => {
            const list = [];
            const amount = getAmount();
            const pages = n.helper.model.getData("n/customGridLinks");

            for (let i = 0; i < amount.total; i++) {
                if (pages[i]) {
                    list.push(pages[i]);
                } else {
                    list.push({title: "", url: ""});
                }
            }

            return list;
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