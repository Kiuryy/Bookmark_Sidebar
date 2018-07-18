($ => {
    "use strict";

    /**
     * @requires helper: model, entry, scroll, i18n, search, checkbox
     * @param {object} ext
     * @constructor
     */
    $.ListHelper = function (ext) {

        let restoreOpenStateRunning = 0;
        let sort = null;

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            ext.elm.bookmarkBox.all.addClass($.cl.active);

            Object.values(ext.elm.bookmarkBox).forEach((box) => {
                box.on($.opts.events.scrollBoxLastPart, () => { // check if there are entries remaining to be loaded (only relevant for one dimensional lists)
                    let list = box.children("ul");
                    let remainingEntries = list.data("remainingEntries");
                    if (remainingEntries && remainingEntries.length > 0) {
                        this.addBookmarkDir(remainingEntries, list, false, false);
                        if (ext.refreshRun || ext.elm.iframe.hasClass($.cl.page.visible) === false) {
                            ext.helper.scroll.restoreScrollPos(box);
                        }
                    }
                });
            });

            this.updateBookmarkBox();
        };

        /**
         * Returns the available sortings
         *
         * @returns {object}
         */
        this.getSortList = () => {
            return {
                custom: {
                    dir: "ASC"
                },
                alphabetical: {
                    dir: "ASC"
                },
                mostUsed: {
                    dir: "DESC"
                },
                recentlyUsed: {
                    dir: "DESC"
                },
                recentlyAdded: {
                    dir: "DESC"
                }
            };
        };

        /**
         * Returns information about the current sorting
         *
         * @returns {object}
         */
        this.getSort = () => {
            return sort;
        };

        /**
         * Changes the sorting and updates the bookmark list
         *
         * @param {string} name
         * @param {string} direction 'ASC' or 'DESC'
         */
        this.updateSort = (name, direction) => {
            let sortList = this.getSortList();
            if (sortList[name]) {
                if (typeof direction === "undefined") {
                    direction = sortList[name].dir;
                }

                sort = {
                    name: name,
                    dir: direction === "ASC" ? "ASC" : "DESC"
                };

                ext.startLoading();

                Promise.all([
                    ext.helper.model.call("removeCache", {name: "htmlList"}),
                    ext.helper.model.call("removeCache", {name: "htmlPinnedEntries"}),
                    ext.helper.model.setData({"u/sort": sort})
                ]).then(() => {
                    ext.helper.model.call("trackEvent", {
                        category: "sorting",
                        action: "change",
                        label: sort.name + "_" + sort.dir
                    });
                    ext.helper.model.call("reload", {scrollTop: true, type: "Sort"});
                });
            }
        };

        /**
         * Changes the sort direction and updates the bookmark list
         *
         * @param {string} direction 'ASC' or 'DESC'
         */
        this.updateDirection = (direction) => {
            this.updateSort(sort.name, direction);
        };

        /**
         * Updates the sidebar with the newest set of bookmarks
         *
         * @returns {Promise}
         */
        this.updateBookmarkBox = () => {
            return new Promise((resolve) => {
                ext.startLoading();
                sort = ext.helper.model.getData("u/sort");
                ext.elm.sidebar.attr($.attr.sort, sort.name);
                ext.elm.bookmarkBox.all.children("a[" + $.attr.name + "='add']").remove();

                let list = ext.elm.bookmarkBox.all.children("ul");
                let promiseObj = null;

                ext.updateBookmarkBoxStart = +new Date();

                if (ext.helper.model.getData("u/viewAsTree") || sort.name === "custom") {
                    promiseObj = Promise.all([
                        ext.helper.model.call("getCache", {name: "htmlList"}),
                        ext.helper.model.call("getCache", {name: "htmlPinnedEntries"}),
                    ]);
                } else {
                    promiseObj = new Promise((resolve) => {
                        resolve();
                    });
                }

                ext.helper.scroll.focus();

                promiseObj.then((result) => {
                    if (result && result[0] && result[0].val) { // load content from cache
                        if (result[1] && result[1].val) {
                            ext.elm.pinnedBox.html(result[1].val);

                            if (ext.helper.model.getData("u/lockPinned")) {
                                ext.elm.lockPinned.addClass($.cl.sidebar.fixed);
                                ext.elm.pinnedBox.addClass($.cl.sidebar.fixed);
                            }

                            cleanCachedHtml(ext.elm.pinnedBox);
                            loadMissingFavicons(ext.elm.pinnedBox);
                        } else {
                            ext.elm.pinnedBox.addClass($.cl.hidden);
                        }

                        return updateFromCache(list, result[0].val);
                    } else { // load content from object
                        return updateFromObject(list);
                    }
                }).then(() => {
                    resolve();
                });
            });
        };

        /**
         * Decides whether to open or to close the subordinate bookmarks of the given directory,
         * loads the subordinate bookmarks if they are not yet loaded,
         * calls the expandCollapseDir method to perform the toggle operation
         *
         * @param {jsu} elm
         * @param {boolean} instant
         * @param {boolean} cache
         * @returns {Promise}
         */
        this.toggleBookmarkDir = (elm, instant, cache = true) => {
            return new Promise((resolve) => {
                elm.addClass($.cl.sidebar.dirAnimated);
                let dirId = elm.attr($.attr.id);
                let childrenList = elm.next("ul");
                let childrenLoaded = childrenList.length() > 0;
                let initial = ext.refreshRun === true || ext.elm.iframe.hasClass($.cl.page.visible) === false;

                if (typeof instant === "undefined") {
                    instant = initial || ext.helper.model.getData("b/animations") === false;
                }

                let preResolve = () => {
                    if ((ext.helper.model.getData("b/rememberState") !== "nothing" && cache) && !initial && !ext.helper.search.isResultsVisible()) {
                        this.cacheList().then(resolve);
                    } else {
                        resolve();
                    }
                };

                if (elm.hasClass($.cl.sidebar.dirOpened) && childrenLoaded) { // close children
                    expandCollapseDir(elm, childrenList, false, instant).then(preResolve);
                } else { // open children
                    if (ext.helper.model.getData("b/dirAccordion")) { // close all directories except the current one and its parents
                        let visibleBox = ext.helper.search.isResultsVisible() ? "search" : "all";

                        ext.elm.bookmarkBox[visibleBox].find("a." + $.cl.sidebar.dirOpened).forEach((dir) => {
                            if ($(dir).next("ul").find("a[" + $.attr.id + "='" + dirId + "']").length() === 0) {
                                this.toggleBookmarkDir($(dir), instant, false);
                            }
                        });
                    }

                    if (!childrenLoaded) { // not yet loaded -> load and expand afterwards
                        ext.helper.model.call("bookmarks", {id: dirId}).then((response) => {
                            if (response.bookmarks && response.bookmarks[0] && response.bookmarks[0].children) {
                                childrenList = $("<ul />").insertAfter(elm);
                                this.addBookmarkDir(response.bookmarks[0].children, childrenList);
                                expandCollapseDir(elm, childrenList, true, instant).then(preResolve);
                            }
                        });
                    } else { // already loaded -> just expand
                        expandCollapseDir(elm, childrenList, true, instant).then(preResolve);
                    }
                }
            });
        };

        /**
         * Caches the sidebar html
         *
         * @returns {Promise}
         */
        this.cacheList = () => {
            ext.log("Cache sidebar html");

            return Promise.all([
                ext.helper.model.call("setCache", {
                    name: "htmlList",
                    val: ext.elm.bookmarkBox.all.children("ul").html()
                }),
                ext.helper.model.call("setCache", {
                    name: "htmlPinnedEntries",
                    val: ext.elm.pinnedBox.html()
                })
            ]);
        };

        /**
         * Updates the html for the sidebar header
         */
        this.updateSidebarHeader = () => {
            let searchField = ext.elm.header.find("div." + $.cl.sidebar.searchBox + " > input[type='text']");
            let searchVal = "";

            if (searchField.length() > 0 && searchField[0] && searchField[0].value) { // restore the search value before reinitializing the header content
                searchVal = searchField[0].value;
            }

            ext.elm.header.text("");
            let bookmarkAmount = ext.helper.entry.getAmount("bookmarks");

            let headline = $("<h1 />")
                .html("<strong>" + bookmarkAmount + "</strong> <span>" + ext.helper.i18n.get("header_bookmarks" + (bookmarkAmount === 1 ? "_single" : "")) + "</span>")
                .attr("title", bookmarkAmount + " " + ext.helper.i18n.get("header_bookmarks" + (bookmarkAmount === 1 ? "_single" : "")))
                .appendTo(ext.elm.header);

            let headerIcons = [];
            headerIcons.push($("<a />").addClass($.cl.sidebar.search).appendTo(ext.elm.header));
            headerIcons.push($("<a />").addClass($.cl.sidebar.sort).appendTo(ext.elm.header));
            headerIcons.push($("<a />").addClass($.cl.sidebar.menu).appendTo(ext.elm.header));

            ["label", "amount"].forEach((type) => {
                let lastOffset = null;
                headerIcons.some((icon) => {
                    if (lastOffset === null) {
                        lastOffset = icon[0].offsetTop;
                    } else if (lastOffset !== icon[0].offsetTop || headline[0].offsetTop === 0) { // header elements are not in one line anymore -> header to small -> remove some markup
                        if (type === "label") {
                            headline.children("span").addClass($.cl.hidden);
                        } else if (type === "amount") {
                            headline.addClass($.cl.hidden);
                        }
                        return true;
                    }
                });
            });

            $("<div />")
                .addClass($.cl.sidebar.searchBox)
                .append("<input type='text' value='" + searchVal.replace(/'/g, "&#x27;") + "' placeholder='" + ext.helper.i18n.get("sidebar_search_placeholder").replace(/'/g, "&#x27;") + "' />")
                .append("<a class='" + $.cl.sidebar.searchClose + "'></a>")
                .appendTo(ext.elm.header);
        };

        /**
         * Restores the open states of the directories in your bookmarks,
         * calls the restoreScrollPos-Method when all open states have been restored
         *
         * @param {jsu} list
         */
        this.restoreOpenStates = (list) => {
            let restore = false;
            let data = ext.helper.model.getData(["b/rememberState", "u/openStates"]);

            let checkAllRestored = () => {
                if (!restore && restoreOpenStateRunning === 0) { // all open statas restored -> restore scroll position
                    $.delay(100).then(() => {
                        restoreScrollPos();
                    });
                }
            };

            if (data.rememberState === "all" || data.rememberState === "openStatesAndPos" || data.rememberState === "openStates" || data.rememberState === "openStatesRoot") {
                Object.keys(data.openStates).forEach((node) => {
                    if (data.openStates[node] === true) {
                        let entry = list.find("> li > a." + $.cl.sidebar.bookmarkDir + "[" + $.attr.id + "='" + (node) + "']");

                        if (entry.length() > 0) {
                            if (data.rememberState !== "openStatesRoot" || entry.parents("ul").length() === 1) { // if rememberState = openStatesRoot -> only open top level directories
                                restore = true;
                                restoreOpenStateRunning++;

                                this.toggleBookmarkDir(entry).then(() => {
                                    restoreOpenStateRunning--;
                                    restore = false;
                                    checkAllRestored();
                                });
                            }
                        }
                    }
                });
            }

            checkAllRestored();
        };

        /**
         * Updates the html for the sort filterbox
         */
        this.updateSortFilter = () => {
            ext.elm.filterBox.removeClass($.cl.hidden).text("");
            let filterBoxHeight = 0;

            if (sort.name === "custom") {
                ext.elm.filterBox.addClass($.cl.hidden);
            } else {
                let config = ext.helper.model.getData(["u/viewAsTree", "u/mostViewedPerMonth"]);

                let langName = sort.name.replace(/([A-Z])/g, "_$1").toLowerCase();
                $("<a />").attr($.attr.direction, sort.dir).text(ext.helper.i18n.get("sort_label_" + langName)).appendTo(ext.elm.filterBox);
                let checkList = $("<ul />").appendTo(ext.elm.filterBox);

                if (ext.helper.search.isResultsVisible() === false) { // show bookmarks as tree or one dimensional list
                    $("<li />")
                        .append(ext.helper.checkbox.get(ext.elm.iframeBody, {
                            [$.attr.name]: "viewAsTree",
                            checked: config.viewAsTree ? "checked" : ""
                        }))
                        .append("<a>" + ext.helper.i18n.get("sort_view_as_tree") + "</a>")
                        .appendTo(checkList);
                }

                if (sort.name === "mostUsed") { // sort most used based on total clicks or clicks per month
                    $("<li />")
                        .append(ext.helper.checkbox.get(ext.elm.iframeBody, {
                            [$.attr.name]: "mostViewedPerMonth",
                            checked: config.mostViewedPerMonth ? "checked" : ""
                        }))
                        .append("<a>" + ext.helper.i18n.get("sort_most_used_per_month") + "</a>")
                        .appendTo(checkList);
                }

                if (checkList.children("li").length() === 0) {
                    checkList.remove();
                }

                filterBoxHeight = ext.elm.filterBox.realHeight();
            }

            Object.values(ext.elm.bookmarkBox).forEach((box) => {
                box.css("padding-top", filterBoxHeight);
            });

            // @deprecated sticky positioning seems to have changed with Chrome 68 -> this workaround can be removed as soon as v68 is the min required version
            let versionRaw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
            let version = versionRaw ? parseInt(versionRaw[2], 10) : null;
            if (version < 68) {
                ext.elm.pinnedBox.css("top", ext.helper.model.getData("u/lockPinned") ? -filterBoxHeight : 0);
            }
        };

        /**
         * Adds the given bookmarks to the given list
         *
         * @param {Array} bookmarks
         * @param {jsu} list
         * @param {boolean} asTree one dimensional list or with directories
         * @param {boolean} sorting whether the bookmarks need to be sorted or not
         * @returns {boolean} returns false if nothing has been added
         */
        this.addBookmarkDir = (bookmarks, list, asTree = true, sorting = true) => {
            let hasEntries = false;
            let showSeparators = asTree && sort.name === "custom" && list.prev("a").length() > 0; // only show separators for custom sorting and in tree view
            let config = ext.helper.model.getData(["a/showBookmarkIcons", "a/showDirectoryIcons", "b/dirOpenDuration", "u/showHidden"]);

            if (list.parents("li").length() === 0) {
                if (ext.helper.search.isResultsVisible() === false) { // don't show in search results
                    updatePinnedEntries(config);
                }
            } else {
                list.css("transition", "height " + config.dirOpenDuration + "s");
            }

            let bookmarkCounter = 0;
            list.removeData("remainingEntries");

            if (sorting) {
                sortEntries(bookmarks);
            }

            bookmarks.some((bookmark, idx) => {
                if ((config.showHidden || ext.helper.entry.isVisible(bookmark.id)) && (bookmark.children || bookmark.url)) { // is dir or link -> fix for search results (chrome returns dirs without children and without url)
                    if ($.opts.demoMode) {
                        if (bookmark.children) {
                            bookmark.title = "Directory " + (idx + 1);
                        } else {
                            bookmark.title = "Bookmark " + (idx + 1);
                            bookmark.url = "https://example.com/";
                        }
                    }

                    if (ext.helper.entry.isSeparator(bookmark.id) === false || showSeparators) { // entry is no separator or separators should be displayed
                        addEntryToList(bookmark, list, {
                            config: config,
                            asTree: asTree
                        });
                    }

                    if (bookmark.url) { // link
                        bookmarkCounter++;
                    }

                    hasEntries = true;

                    if (asTree === false && bookmarkCounter >= 100) { // only render 100 entries of the one dimensional list -> if user scrolles to the end of the list the next 100 entries will be loaded
                        let remainingEntries = bookmarks.slice(100);

                        if (remainingEntries.length > 0) {
                            list.data("remainingEntries", remainingEntries);
                        }

                        return true;
                    }
                }
            });

            return hasEntries;
        };

        /**
         * Updates the list with the pinned entries
         *
         * @param {object} config
         */
        let updatePinnedEntries = (config) => {
            ext.elm.lockPinned.removeClass($.cl.sidebar.fixed);
            ext.elm.pinnedBox.removeClass([$.cl.hidden, $.cl.sidebar.fixed]);

            ext.elm.pinnedBox.children("ul").remove();
            let pinnedEntries = ext.helper.entry.getAllDataByType("pinned");

            if (pinnedEntries.length === 0) {
                ext.elm.pinnedBox.addClass($.cl.hidden);
            } else {
                sortEntries(pinnedEntries);
                let list = $("<ul />").appendTo(ext.elm.pinnedBox);

                if (ext.helper.model.getData("u/lockPinned")) {
                    ext.elm.lockPinned.addClass($.cl.sidebar.fixed);
                    ext.elm.pinnedBox.addClass($.cl.sidebar.fixed);
                }

                pinnedEntries.forEach((entry) => {
                    if (config.showHidden || ext.helper.entry.isVisible(entry.id)) {
                        addEntryToList(entry, list, {
                            config: config,
                            asTree: false
                        });
                    }
                });
            }
        };

        /**
         * Removes specific classes from the children of the given element
         *
         * @param {jsu} elm
         */
        let cleanCachedHtml = (elm) => {
            elm.find("a." + $.cl.sidebar.mark).removeClass($.cl.sidebar.mark);
            elm.find("a." + $.cl.hover).removeClass($.cl.hover);
            elm.find("a." + $.cl.drag.dragHover).removeClass($.cl.drag.dragHover);
            elm.find("a." + $.cl.sidebar.lastHover).removeClass($.cl.sidebar.lastHover);
            elm.find("li." + $.cl.drag.dragInitial).removeClass($.cl.drag.dragInitial);
            elm.find("li." + $.cl.drag.isDragged).remove();
        };

        /**
         * Adds the given bookmark to the list
         *
         * @param {object} bookmark
         * @param {jsu} list
         * @param {object} opts
         * @returns {jsu}
         */
        let addEntryToList = (bookmark, list, opts) => {
            let entry = $("<li />").appendTo(list);
            let label = bookmark.title && bookmark.title.trim().length ? bookmark.title : "";
            let entryContent = $("<a />").appendTo(entry);

            let labelElm = $("<span />").addClass($.cl.sidebar.bookmarkLabel).text(label.trim()).appendTo(entryContent);
            let dragElm = $("<span />").addClass($.cl.drag.trigger).appendTo(entryContent);

            if (bookmark.id) {
                entryContent.attr($.attr.id, bookmark.id);
            }

            if (ext.helper.entry.isVisible(bookmark.id) === false) { // hide element
                entry.addClass($.cl.hidden);
            }

            if (ext.helper.entry.isSeparator(bookmark.id)) { // separator
                entryContent.addClass($.cl.sidebar.separator);
                labelElm.text("");
            } else if (bookmark.children) { // dir
                entryContent.addClass($.cl.sidebar.bookmarkDir);

                if (opts.config.showDirectoryIcons) {
                    entryContent.prepend("<span class='" + $.cl.sidebar.dirIcon + "' />");
                }
            } else if (bookmark.url) { // link
                entryContent.addClass($.cl.sidebar.bookmarkLink);

                if (opts.config.showBookmarkIcons) {
                    if ($.opts.demoMode) {
                        entryContent.prepend("<span class='" + $.cl.sidebar.dirIcon + "' data-color='" + (Math.floor(Math.random() * 10) + 1) + "' />");
                    } else {
                        addFavicon(entryContent, bookmark.url);
                    }
                }
            }

            return entry;
        };

        /**
         * Loads the missing favicons of the entries in the given wrapper element
         *
         * @param {jsu} wrapper
         * @param {boolean} cache whether to cache the html when at least one favicon was missing
         * @returns {Promise}
         */
        let loadMissingFavicons = (wrapper, cache = false) => {
            return new Promise((resolve) => {
                let promises = [];
                wrapper.find("a." + $.cl.sidebar.bookmarkLink + " > img[" + $.attr.value + "]").forEach((img) => {
                    let entry = $(img).parent("a");
                    let url = $(img).attr($.attr.value);
                    promises.push(addFavicon(entry, url));
                });

                if (promises.length > 0) {
                    ext.log("Detected: Missing bookmark favicons");

                    Promise.all(promises).then(() => {
                        if (cache) {
                            this.cacheList().then(resolve);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    resolve();
                }
            });
        };

        /**
         * Adds the favicon to the given element
         *
         * @param {jsu} elm
         * @param {string} url
         * @returns {Promise}
         */
        let addFavicon = (elm, url) => {
            elm.children("img").remove();
            let favicon = $("<img />").prependTo(elm);
            favicon.attr($.attr.value, url);

            return new Promise((resolve) => {
                ext.helper.model.call("favicon", {url: url}).then((response) => { // retrieve favicon of url
                    if (response.img) { // favicon found -> add to entry
                        let sidebarOpen = ext.elm.iframe.hasClass($.cl.page.visible);
                        favicon.attr(sidebarOpen ? "src" : $.attr.src, response.img);
                    }
                    favicon.removeAttr($.attr.value);
                    resolve();
                });
            });
        };

        /**
         * Sorts the given bookmarks
         *
         * @param {Array} bookmarks
         */
        let sortEntries = (bookmarks) => {
            if (bookmarks.length > 1) {
                let collator = ext.helper.i18n.getLocaleSortCollator();
                let doSort = (defaultDir, func) => {
                    bookmarks.sort((a, b) => {
                        let aChildren = !!(a.children);
                        let bChildren = !!(b.children);

                        if (sort.name !== "custom" && aChildren !== bChildren) {
                            return aChildren ? -1 : 1;
                        } else {
                            return (defaultDir === sort.dir ? 1 : -1) * func(a, b);
                        }
                    });
                };

                switch (sort.name) {
                    case "custom": {
                        doSort("ASC", (a, b) => {
                            return a.index - b.index;
                        });
                        break;
                    }
                    case "alphabetical": {
                        doSort("ASC", (a, b) => {
                            return collator.compare(a.title, b.title);
                        });
                        break;
                    }
                    case "recentlyAdded": {
                        doSort("DESC", (a, b) => {
                            return b.dateAdded - a.dateAdded;
                        });
                        break;
                    }
                    case "mostUsed": {
                        let mostViewedPerMonth = ext.helper.model.getData("u/mostViewedPerMonth");
                        doSort("DESC", (a, b) => {
                            let aData = ext.helper.entry.getDataById(a.id);
                            let bData = ext.helper.entry.getDataById(b.id);
                            let aViews = aData ? aData.views[mostViewedPerMonth ? "perMonth" : "total"] : 0;
                            let bViews = bData ? bData.views[mostViewedPerMonth ? "perMonth" : "total"] : 0;
                            if (aViews === bViews) {
                                return collator.compare(a.title, b.title);
                            } else {
                                return bViews - aViews;
                            }
                        });
                        break;
                    }
                    case "recentlyUsed": {
                        doSort("DESC", (a, b) => {
                            let aData = ext.helper.entry.getDataById(a.id);
                            let bData = ext.helper.entry.getDataById(b.id);
                            let aLastView = aData ? aData.views.lastView : 0;
                            let bLastView = bData ? bData.views.lastView : 0;
                            if (aLastView === bLastView) {
                                return collator.compare(a.title, b.title);
                            } else {
                                return bLastView - aLastView;
                            }
                        });
                        break;
                    }
                }
            }
        };

        /**
         * Expands/Collapses the bookmarks under the given bookmark node
         *
         * @param {jsu} elm
         * @param {jsu} list
         * @param {boolean} open
         * @param {boolean} instant
         * @returns {Promise}
         */
        let expandCollapseDir = (elm, list, open, instant) => {
            return new Promise((resolve) => {
                list.css("height", list[0].scrollHeight + "px");

                if (open === false) { // parameter false -> close list
                    $.delay(0).then(() => {
                        list.css("height", 0);
                    });
                }

                if (ext.refreshRun === true) { // restore open states of child nodes
                    this.restoreOpenStates(list);
                } else {
                    let openStates = ext.helper.model.getData("u/openStates");
                    openStates[elm.attr($.attr.id)] = open;

                    if (open === false) {
                        closeAllChildDirs(elm, openStates);
                    } else if (ext.helper.search.isResultsVisible() === false) {
                        ext.helper.model.setData({
                            "u/openStates": openStates
                        });
                    }
                }

                let dirOpenDurationRaw = ext.helper.model.getData("b/dirOpenDuration");

                $.delay(instant ? 0 : (+dirOpenDurationRaw * 1000)).then(() => { // unset changes in css, so opening of children in child list works properly
                    if (open === false) {
                        elm.removeClass($.cl.sidebar.dirOpened);
                    } else {
                        elm.addClass($.cl.sidebar.dirOpened);
                        if (ext.helper.model.getData("b/dirAccordion") && ext.refreshRun === false) {
                            let visibleBox = ext.helper.search.isResultsVisible() ? "search" : "all";

                            let scrollPos = ext.helper.scroll.getScrollPos(ext.elm.bookmarkBox[visibleBox]);
                            if (scrollPos > elm[0].offsetTop) { // the currently opened directory is not visible correctly -> correct scroll position
                                ext.helper.scroll.setScrollPos(ext.elm.bookmarkBox[visibleBox], elm[0].offsetTop, 300);
                            }
                        }
                    }
                    list.css("height", "");
                    elm.removeClass($.cl.sidebar.dirAnimated);

                    resolve();
                });
            });
        };

        /**
         * closes all children of the given bookmark node
         *
         * @param {jsu} elm
         * @param {object} openStates
         */
        let closeAllChildDirs = (elm, openStates) => {
            elm.next("ul").find("a." + $.cl.sidebar.bookmarkDir).forEach((node) => {
                openStates[$(node).attr($.attr.id)] = false;
                $.delay(500).then(() => {
                    $(node).removeClass($.cl.sidebar.dirOpened);
                });
            });

            if (ext.helper.search.isResultsVisible() === false) {
                ext.helper.model.setData({
                    "u/openStates": openStates
                });
            }
        };

        /**
         * Updates the list by setting the content from the cache
         *
         * @param {jsu} list
         * @param {string} cachedHtml
         * @returns {Promise}
         */
        let updateFromCache = (list, cachedHtml) => {
            return new Promise((resolve) => {
                ext.log("Load html from cache");
                list.html(cachedHtml);
                cleanCachedHtml(list);

                loadMissingFavicons(list, true);
                ext.elm.bookmarkBox.all.addClass($.cl.sidebar.cached);

                this.updateSidebarHeader();
                this.updateSortFilter();

                if (list.children("li").length() === 1) { // hide root directory if it's the only one -> show the content of this directory
                    list.addClass($.cl.sidebar.hideRoot);
                    $("<a />").attr($.attr.name, "add").insertAfter(list);
                }

                restoreScrollPos();
                resolve();
            });
        };

        /**
         * Updates the list by building the content from the bookmark tree
         *
         * @param {jsu} list
         * @returns {Promise}
         */
        let updateFromObject = (list) => {
            return new Promise((resolve) => {
                ext.log("Load html from object");
                let entries = [];
                let viewAsTree = ext.helper.model.getData("u/viewAsTree");
                ext.elm.bookmarkBox.all.removeClass($.cl.sidebar.cached);

                ext.helper.model.call("bookmarks", {id: 0}).then((response) => {
                    ext.refreshRun = true;
                    list.removeClass($.cl.sidebar.hideRoot).text("");

                    if (response.bookmarks && response.bookmarks[0] && response.bookmarks[0].children) { // children are existing
                        entries = response.bookmarks[0].children;
                    }

                    return ext.helper.entry.init(entries);
                }).then(() => {
                    this.updateSidebarHeader();

                    if (viewAsTree || sort.name === "custom") { // with directories
                        this.addBookmarkDir(entries, list, true);

                        if (list.children("li").length() === 1) { // hide root directory if it's the only one -> show the content of this directory
                            list.addClass($.cl.sidebar.hideRoot);
                            $("<a />").attr($.attr.name, "add").insertAfter(list);
                            this.toggleBookmarkDir(list.find("> li > a." + $.cl.sidebar.bookmarkDir).eq(0));
                        } else {
                            this.restoreOpenStates(list);
                        }
                    } else { // one dimensional without directories
                        this.addBookmarkDir(ext.helper.entry.getAllDataByType("bookmarks"), list, false);
                        restoreScrollPos();
                    }

                    this.updateSortFilter();
                    resolve();
                });
            });
        };

        /**
         * Restores the scroll position and finishes loading
         */
        let restoreScrollPos = () => {
            ext.helper.scroll.restoreScrollPos(ext.elm.bookmarkBox.all).then(() => {
                ext.initImages();
                ext.endLoading(200);
                ext.firstRun = false;
                ext.refreshRun = false;

                if ((ext.helper.model.getData("u/viewAsTree") || sort.name === "custom") && !ext.elm.bookmarkBox.all.hasClass($.cl.sidebar.cached)) {
                    this.cacheList();
                }

                ext.loaded();
            });
        };
    };

})(jsu);