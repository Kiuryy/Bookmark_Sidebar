($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.ListHelper = function (ext) {

        let restoreOpenStateRunning = 0;
        let sort = {};
        let dirOpenDuration = 0;

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            ext.elm.bookmarkBox.all.addClass($.cl.active);

            Object.values(ext.elm.bookmarkBox).forEach((box) => {
                box.on($.opts.events.scrollBoxLastPart, () => { // check if there are entries remaining to be loaded (only relevant for one dimensional lists)
                    const list = box.children("ul");
                    const remainingEntries = list.data("remainingEntries");
                    if (remainingEntries && remainingEntries.length > 0) {
                        this.addBookmarkDir(remainingEntries, list, false, false);
                        if (ext.refreshRun || ext.elm.iframe.hasClass($.cl.page.visible) === false) {
                            ext.helper.scroll.restoreScrollPos(box);
                        }
                    }
                });
            });

            const dirOpenDurationRaw = ext.helper.model.getData("b/dirOpenDuration");
            dirOpenDuration = +dirOpenDurationRaw * 1000;

            this.updateBookmarkBox();
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
            const sortList = ext.helper.utility.getSortList();
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
                const viewAsTree = ext.helper.model.getData("u/viewAsTree");
                ext.elm.sidebar.attr($.attr.sort, sort.name + (viewAsTree || sort.name === "custom" ? "" : "-flat"));
                ext.elm.bookmarkBox.all.children("a[" + $.attr.name + "='add']").remove();

                const list = ext.elm.bookmarkBox.all.children("ul");
                ext.updateBookmarkBoxStart = +new Date();

                let promiseObj;
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
                const dirId = elm.attr($.attr.id);
                let childrenList = elm.next("ul");
                const childrenLoaded = childrenList.length() > 0;
                const initial = ext.refreshRun === true || ext.elm.iframe.hasClass($.cl.page.visible) === false;
                const close = elm.hasClass($.cl.sidebar.dirOpened) && childrenLoaded;
                const rememberState = ext.helper.model.getData("b/rememberState");

                if (typeof instant === "undefined") {
                    instant = initial || ext.helper.model.getData("b/animations") === false;
                }

                const preResolve = () => {
                    if (initial === false && close === false && ext.helper.model.getData("b/rememberOpenStatesSubDirectories") === true) {
                        this.restoreOpenStates(childrenList);
                    }

                    let doCaching = cache && !initial && !ext.helper.search.isResultsVisible();
                    if (rememberState === "nothing") {
                        doCaching = false;
                    } else if (rememberState === "openStatesRoot" && elm.parents("ul:not(." + $.cl.sidebar.hideRoot + ")").length() !== 1) {
                        doCaching = false;
                    }

                    if (doCaching) {
                        this.cacheList().then(resolve);
                    } else {
                        resolve();
                    }
                };

                if (close) { // close children
                    expandCollapseDir(elm, childrenList, false, instant).then(preResolve);
                } else { // open children
                    if (ext.helper.model.getData("b/dirAccordion") && cache === true) { // close all directories except the current one and its parents
                        const visibleBox = ext.helper.search.isResultsVisible() ? "search" : "all";

                        $([
                            ext.elm.bookmarkBox[visibleBox].find("a." + $.cl.sidebar.dirOpened), // opened directory
                            ext.elm.bookmarkBox[visibleBox].find("a." + $.cl.sidebar.dirAnimated + ":not(" + $.cl.sidebar.dirOpened + ")") // not yet opened directory
                        ]).forEach((dir) => {
                            if (dir !== elm[0] && $(dir).next("ul").find("a[" + $.attr.id + "='" + dirId + "']").length() === 0) {
                                let delay = 0;

                                if ($(dir).hasClass($.cl.sidebar.dirAnimated)) { // another directory is being opened already -> wait until the animation is finished to prevent visual bugs
                                    delay = dirOpenDuration;
                                }

                                $.delay(instant ? 0 : delay).then(() => {
                                    $(dir).addClass($.cl.sidebar.dirOpened); // add class to properly close it
                                    this.toggleBookmarkDir($(dir), instant, false).then(preResolve);
                                });
                            }
                        });
                    }

                    if (!childrenLoaded) { // not yet loaded -> load and expand afterwards
                        ext.helper.model.call("bookmarks", {id: dirId}).then((response) => {
                            if (response.bookmarks && response.bookmarks[0] && response.bookmarks[0].children) {
                                childrenList = $("<ul></ul>").insertAfter(elm);
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
         * Returns the active bookmark box
         *
         * @returns {elm}
         */
        this.getActiveBookmarkBox = () => {
            let bookmarkBox = null;
            Object.values(ext.elm.bookmarkBox).some((box) => {
                if (box.hasClass($.cl.active)) {
                    bookmarkBox = box;
                    return true;
                }
            });
            return bookmarkBox;
        };

        /**
         * Hides the headline label or the entire headline when the sidebar is to small to display them inline with the icons
         */
        this.handleSidebarWidthChange = () => {
            const headerIcons = ext.elm.header.children("a");
            const headline = ext.elm.header.children("h1");

            headline.removeClass($.cl.hidden);
            headline.children("span").removeClass($.cl.hidden);

            ["label", "amount"].forEach((type) => {
                let lastOffset = null;
                headerIcons.forEach((icon) => {
                    if (lastOffset === null) {
                        lastOffset = icon.offsetTop;
                    } else if (icon.offsetTop > lastOffset * 2 || headline[0].offsetTop === 0) { // header elements are not in one line anymore -> header to small -> remove some markup
                        if (type === "label") {
                            headline.children("span").addClass($.cl.hidden);
                        } else if (type === "amount") {
                            headline.addClass($.cl.hidden);
                        }
                        return false;
                    }
                });
            });

            if (ext.helper.selection.isEnabled()) { // sidebar is in selection mode -> do additional checks
                ext.helper.selection.handleSidebarWidthChange();
            }
        };

        /**
         * Updates the html for the sidebar header
         */
        this.updateSidebarHeader = () => {
            if (ext.helper.selection.isEnabled()) { // sidebar is in selection mode -> we have another header here
                ext.helper.selection.updateSidebarHeader();
                return;
            }

            let searchVal = "";
            const searchField = ext.elm.header.find("div." + $.cl.sidebar.searchBox + " > input[type='text']");
            if (searchField.length() > 0 && searchField[0] && searchField[0].value) { // restore the search value before reinitializing the header content
                searchVal = searchField[0].value;
            }

            ext.elm.header.text("");
            const bookmarkAmount = ext.helper.entry.getAmount("bookmarks");

            $("<h1></h1>")
                .html("<strong>" + bookmarkAmount + "</strong> <span>" + ext.helper.i18n.get("header_bookmarks" + (bookmarkAmount === 1 ? "_single" : "")) + "</span>")
                .attr("title", bookmarkAmount + " " + ext.helper.i18n.get("header_bookmarks" + (bookmarkAmount === 1 ? "_single" : ""), null, true))
                .appendTo(ext.elm.header);

            $("<a></a>").addClass($.cl.sidebar.search).appendTo(ext.elm.header);
            $("<a></a>").addClass($.cl.sidebar.sort).appendTo(ext.elm.header);
            $("<a></a>").addClass($.cl.sidebar.menu).appendTo(ext.elm.header);

            this.handleSidebarWidthChange();

            $("<div></div>")
                .addClass($.cl.sidebar.searchBox)
                .append("<input type='text' value='" + searchVal.replace(/'/g, "&#x27;") + "' placeholder='" + ext.helper.i18n.get("sidebar_search_placeholder", null, true) + "' />")
                .append("<a class='" + $.cl.sidebar.searchClose + "'></a>")
                .appendTo(ext.elm.header);
        };

        /**
         * Restores the open states of the directories in your bookmarks,
         * optionally calls the restoreScrollPos-Method when all open states have been restored
         *
         * @param {jsu} list
         * @param {boolean} initial
         */
        this.restoreOpenStates = (list, initial = false) => {
            let restore = false;
            const data = ext.helper.model.getData(["b/rememberState", "u/openStates"]);

            const checkAllRestored = () => {
                if (!restore && initial && restoreOpenStateRunning === 0) { // all open states restored -> restore scroll position
                    $.delay(100).then(() => {
                        restoreScrollPos();
                    });
                }
            };

            if (data.rememberState === "all" || data.rememberState === "openStatesAndPos" || data.rememberState === "openStates" || data.rememberState === "openStatesRoot") {
                Object.entries(data.openStates).forEach(([node, val]) => {
                    if (val === true) {
                        const entry = list.find("> li > a." + $.cl.sidebar.bookmarkDir + "[" + $.attr.id + "='" + node + "']:not(." + $.cl.sidebar.dirOpened + ")");

                        if (entry.length() > 0) {
                            if (data.rememberState !== "openStatesRoot" || entry.parents("ul").length() === 1 || initial === false) { // if rememberState = openStatesRoot -> initially only open top level directories
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
                const config = ext.helper.model.getData(["u/viewAsTree", "u/mostViewedPerMonth"]);

                const langName = sort.name.replace(/([A-Z])/g, "_$1").toLowerCase();
                $("<a></a>").attr($.attr.direction, sort.dir).text(ext.helper.i18n.get("sort_label_" + langName)).appendTo(ext.elm.filterBox);
                const checkList = $("<ul></ul>").appendTo(ext.elm.filterBox);

                if (ext.helper.search.isResultsVisible() === false) { // show bookmarks as tree or one dimensional list
                    $("<li></li>")
                        .append(ext.helper.checkbox.get(ext.elm.iframeBody, {
                            [$.attr.name]: "viewAsTree",
                            checked: config.viewAsTree ? "checked" : ""
                        }))
                        .append("<a>" + ext.helper.i18n.get("sort_view_as_tree") + "</a>")
                        .appendTo(checkList);
                }

                if (sort.name === "mostUsed") { // sort most used based on total clicks or clicks per month
                    $("<li></li>")
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

            ext.elm.pinnedBox.css("top", ext.helper.model.getData("u/lockPinned") ? -filterBoxHeight : 0);
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
            const showSeparators = asTree && sort.name === "custom" && list.prev("a").length() > 0; // only show separators for custom sorting and in tree view
            const config = ext.helper.model.getData(["a/directoryArrows", "a/showBookmarkIcons", "a/showDirectoryIcons", "u/showHidden"]);

            if (list.parents("li").length() > 0) {
                list.css("transition", "height " + dirOpenDuration + "ms");
            }

            let bookmarkCounter = 0;
            list.removeData("remainingEntries");

            if (sorting) {
                ext.helper.utility.sortEntries(bookmarks, sort);
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
                        const remainingEntries = bookmarks.slice(idx + 1);

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
         */
        const updatePinnedEntries = () => {
            const config = ext.helper.model.getData(["a/directoryArrows", "a/showBookmarkIcons", "a/showDirectoryIcons", "u/showHidden"]);

            ext.elm.lockPinned.removeClass($.cl.sidebar.fixed);
            ext.elm.pinnedBox.removeClass([$.cl.hidden, $.cl.sidebar.fixed]);

            ext.elm.pinnedBox.children("ul").remove();
            const pinnedEntries = ext.helper.entry.getAllDataByType("pinned");

            if (pinnedEntries.length === 0) {
                ext.elm.pinnedBox.addClass($.cl.hidden);
            } else {
                ext.helper.utility.sortEntries(pinnedEntries, sort);
                const list = $("<ul></ul>").appendTo(ext.elm.pinnedBox);

                if (ext.helper.model.getData("u/lockPinned")) {
                    ext.elm.lockPinned.addClass($.cl.sidebar.fixed);
                    ext.elm.pinnedBox.addClass($.cl.sidebar.fixed);
                }

                pinnedEntries.forEach((entry) => {
                    if (config.showHidden || ext.helper.entry.isVisible(entry.id)) {
                        addEntryToList(entry, list, {
                            config: config,
                            asTree: false,
                            pinnedBox: true
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
        const cleanCachedHtml = (elm) => {
            elm.find("div." + $.cl.checkbox.box).removeClass($.cl.active);
            elm.find("a." + $.cl.sidebar.mark).removeClass($.cl.sidebar.mark);
            elm.find("a." + $.cl.hover).removeClass($.cl.hover);
            elm.find("a." + $.cl.selected).removeClass($.cl.selected);
            elm.find("li." + $.cl.drag.dragHover).removeClass($.cl.drag.dragHover);
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
        const addEntryToList = (bookmark, list, opts) => {
            const entry = $("<li></li>").appendTo(list);
            const label = bookmark.title && bookmark.title.trim().length ? bookmark.title : "";
            const entryContent = $("<a></a>").appendTo(entry);

            const labelElm = $("<span></span>").addClass($.cl.sidebar.bookmarkLabel).text(label.trim()).appendTo(entryContent);
            const dragElm = $("<span></span>").addClass($.cl.drag.trigger).appendTo(entryContent);

            if (bookmark.id) {
                entryContent.attr($.attr.id, bookmark.id);
            }

            if (ext.helper.entry.isVisible(bookmark.id) === false) { // hide element
                entry.addClass($.cl.hidden);
            }

            if (ext.helper.entry.isSeparator(bookmark.id)) { // separator
                entryContent.addClass($.cl.sidebar.separator);
                const label = bookmark.title.replace(/(^[-_]+|[-_]+$)/g, "").trim();
                if (label.length > 0) { // named separator (e.g. '---- Social ----')
                    labelElm.attr($.attr.name, label);
                }
                labelElm.text("");
            } else if (bookmark.children) { // dir
                entryContent.addClass($.cl.sidebar.bookmarkDir);
                $("<span></span>").addClass($.cl.add).insertBefore(dragElm);

                if (opts.config.showDirectoryIcons) {
                    entryContent.prepend("<span class='" + $.cl.sidebar.dirIcon + "'></span>");
                }

                if (opts.config.directoryArrows) {
                    entryContent.addClass($.cl.sidebar.dirArrow);
                }
            } else if (bookmark.url) { // link
                entryContent.addClass($.cl.sidebar.bookmarkLink);

                if (opts.config.showBookmarkIcons) {
                    if ($.opts.demoMode) {
                        entryContent.prepend("<span class='" + $.cl.sidebar.dirIcon + "' data-color='" + (Math.floor(Math.random() * 10) + 1) + "'></span>");
                    } else {
                        addFavicon(entryContent, bookmark.url);
                    }
                }
            }

            if (!opts.pinnedBox) {
                ext.helper.checkbox.get(ext.elm.iframeBody, {[$.attr.name]: "select"}).prependTo(entryContent);
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
        const loadMissingFavicons = (wrapper, cache = false) => {
            return new Promise((resolve) => {
                const promises = [];
                wrapper.find("a." + $.cl.sidebar.bookmarkLink + " > img[" + $.attr.value + "]").forEach((img) => {
                    const entry = $(img).parent("a");
                    const url = $(img).attr($.attr.value);
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
        const addFavicon = (elm, url) => {
            elm.children("img").remove();
            const favicon = $("<img />").prependTo(elm);
            favicon.attr($.attr.value, url);

            return new Promise((resolve) => {
                ext.helper.model.call("favicon", {url: url}).then((response) => { // retrieve favicon of url
                    if (response.img) { // favicon found -> add to entry
                        const sidebarOpen = ext.elm.iframe.hasClass($.cl.page.visible);
                        favicon.attr(sidebarOpen ? "src" : $.attr.src, response.img);
                    }
                    favicon.removeAttr($.attr.value);
                    resolve();
                });
            });
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
        const expandCollapseDir = (elm, list, open, instant) => {
            return new Promise((resolve) => {
                list.css("height", list[0].scrollHeight + "px");

                if (open === false) { // parameter false -> close list
                    $.delay(50).then(() => {
                        list.css("height", 0);
                    });
                }

                if (ext.refreshRun === true) { // restore open states of child nodes
                    this.restoreOpenStates(list, true);
                } else {
                    const openStates = ext.helper.model.getData("u/openStates");
                    openStates[elm.attr($.attr.id)] = open;

                    if (open === false && ext.helper.model.getData("b/rememberOpenStatesSubDirectories") === false) { // open sub directories should not be remembered
                        closeAllChildDirs(elm, openStates);
                    } else if (ext.helper.search.isResultsVisible() === false) {
                        ext.helper.model.setData({
                            "u/openStates": openStates
                        });
                    }
                }

                $.delay(instant ? 20 : dirOpenDuration).then(() => { // unset changes in css, so opening of children in child list works properly
                    if (open === false) {
                        elm.removeClass($.cl.sidebar.dirOpened);
                    } else {
                        elm.addClass($.cl.sidebar.dirOpened);
                        if (ext.helper.model.getData("b/dirAccordion") && ext.refreshRun === false) {
                            const visibleBox = ext.helper.search.isResultsVisible() ? "search" : "all";
                            const scrollPos = ext.helper.scroll.getScrollPos(ext.elm.bookmarkBox[visibleBox]);
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
        const closeAllChildDirs = (elm, openStates) => {
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
        const updateFromCache = (list, cachedHtml) => {
            return new Promise((resolve) => {
                ext.log("Load html from cache");
                list.html(cachedHtml);

                cleanCachedHtml(list);

                list.find("div." + $.cl.checkbox.box).forEach((checkboxWrapper) => { // reinitialize event handlers for the checkboxes
                    ext.helper.checkbox.initEvents($(checkboxWrapper), ext.elm.iframeBody);
                });

                loadMissingFavicons(list, true);
                ext.elm.bookmarkBox.all.addClass($.cl.sidebar.cached);

                this.updateSidebarHeader();
                this.updateSortFilter();

                if (list.children("li").length() === 1) { // hide root directory if it's the only one -> show the content of this directory
                    list.addClass($.cl.sidebar.hideRoot);
                    $("<a></a>").attr($.attr.name, "add").insertAfter(list);
                }

                $.delay(100).then(() => {
                    restoreScrollPos();
                    resolve();
                });
            });
        };

        /**
         * Updates the list by building the content from the bookmark tree
         *
         * @param {jsu} list
         * @returns {Promise}
         */
        const updateFromObject = (list) => {
            return new Promise((resolve) => {
                ext.log("Load html from object");
                let entries = [];
                const viewAsTree = ext.helper.model.getData("u/viewAsTree");
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
                    updatePinnedEntries();

                    if (viewAsTree || sort.name === "custom") { // with directories
                        this.addBookmarkDir(entries, list, true);

                        if (list.children("li").length() === 1) { // hide root directory if it's the only one -> show the content of this directory
                            list.addClass($.cl.sidebar.hideRoot);
                            $("<a></a>").attr($.attr.name, "add").insertAfter(list);
                            this.toggleBookmarkDir(list.find("> li > a." + $.cl.sidebar.bookmarkDir).eq(0));
                        } else {
                            this.restoreOpenStates(list, true);
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
        const restoreScrollPos = () => {
            ext.helper.scroll.restoreScrollPos(ext.elm.bookmarkBox.all).then(() => {
                ext.initImages();
                ext.endLoading(200);
                ext.refreshRun = false;

                if ((ext.helper.model.getData("u/viewAsTree") || sort.name === "custom") && !ext.elm.bookmarkBox.all.hasClass($.cl.sidebar.cached)) {
                    this.cacheList();
                }

                ext.loaded();
            });
        };
    };

})(jsu);