($ => {
    "use strict";

    window.ListHelper = function (ext) {

        let restoreOpenStateRunning = 0;
        let sort = null;

        /**
         *
         */
        this.init = () => {
            ext.elements.bookmarkBox["all"].addClass(ext.opts.classes.sidebar.active);

            Object.values(ext.elements.bookmarkBox).forEach((box) => {
                box.on(ext.opts.events.scrollBoxLastPart, () => { // check if there are entries remaining to be loaded (only relevant for one dimensional lists)
                    let list = box.children("ul");
                    let remainingEntries = list.data("remainingEntries");
                    if (remainingEntries && remainingEntries.length > 0) {
                        this.addBookmarkDir(remainingEntries, list, false, false);
                        if (ext.firstRun || ext.elements.iframe.hasClass(ext.opts.classes.page.visible) === false) {
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
            }
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
                ext.helper.model.setData({
                    "u/sort": sort
                }, () => {
                    ext.helper.model.call("refreshAllTabs", {scrollTop: true, type: "Sort"});
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
         */
        this.updateBookmarkBox = () => {
            ext.startLoading();
            sort = ext.helper.model.getData("u/sort");
            ext.elements.sidebar.attr(ext.opts.attr.sort, sort.name);

            ext.helper.model.call("bookmarks", {id: 0}, (response) => { // Initialize the first layer of the bookmark tree
                if (response.bookmarks && response.bookmarks[0] && response.bookmarks[0].children && response.bookmarks[0].children.length > 0) {
                    ext.firstRun = true;
                    let list = ext.elements.bookmarkBox["all"].children("ul");
                    list.removeClass(ext.opts.classes.sidebar.hideRoot).text("");

                    ext.helper.entry.update(response.bookmarks[0].children, () => {
                        updateSidebarHeader();
                        this.updateSortFilter();
                        ext.helper.search.init();

                        let viewAsTree = ext.helper.model.getData("u/viewAsTree");

                        if (viewAsTree || sort.name === "custom") { // with directories
                            this.addBookmarkDir(response.bookmarks[0].children, list, true);
                        } else { // one dimensional without directories
                            this.addBookmarkDir(ext.helper.entry.getAllBookmarkData(), list, false);
                        }

                        if (list.children("li").length() === 1) { // hide root directory if it's the only one -> show the content of this directory
                            list.addClass(ext.opts.classes.sidebar.hideRoot);
                            this.toggleBookmarkDir(list.find("> li > a." + ext.opts.classes.sidebar.bookmarkDir).eq(0));
                        } else {
                            this.restoreOpenStates(list);
                        }
                    });
                }
            });

            ext.helper.scroll.focus();
        };

        /**
         * Decides whether to open or to close the subordinate bookmarks of the given directory,
         * loads the subordinate bookmarks if they are not yet loaded,
         * calls the expandCollapseDir method to perform the toggle operation
         *
         * @param {jsu} elm
         * @param {boolean} instant
         * @param {function} callback
         */
        this.toggleBookmarkDir = (elm, instant, callback) => {
            elm.addClass(ext.opts.classes.sidebar.dirAnimated);
            let dirId = elm.attr(ext.opts.attr.id);
            let childrenList = elm.next("ul");

            if (typeof instant === "undefined") {
                instant = ext.firstRun === true || ext.elements.iframe.hasClass(ext.opts.classes.page.visible) === false;
            }

            if (elm.hasClass(ext.opts.classes.sidebar.dirOpened)) { // close children
                expandCollapseDir(elm, childrenList, false, instant, callback);
            } else { // open children
                if (ext.helper.model.getData("b/dirAccordion")) { // close all directories except the current one and its parents
                    ext.elements.bookmarkBox["all"].find("a." + ext.opts.classes.sidebar.dirOpened).forEach((dir) => {
                        if ($(dir).next("ul").find("a[" + ext.opts.attr.id + "='" + dirId + "']").length() === 0) {
                            this.toggleBookmarkDir($(dir), instant);
                        }
                    });
                }

                if (childrenList.length() === 0) { // not yet loaded -> load and expand afterwards
                    ext.helper.model.call("bookmarks", {id: dirId}, (response) => {
                        if (response.bookmarks && response.bookmarks[0] && response.bookmarks[0].children && response.bookmarks[0].children.length > 0) {
                            childrenList = $("<ul />").insertAfter(elm);
                            this.addBookmarkDir(response.bookmarks[0].children, childrenList);
                            expandCollapseDir(elm, childrenList, true, instant, callback);
                        }
                    });
                } else { // already loaded -> just expand
                    expandCollapseDir(elm, childrenList, true, instant, callback);
                }
            }
        };

        /**
         * Restores the open states of the directories in your bookmarks,
         * calls the restoreScrollPos-Method when all open states have been restored
         *
         * @param {jsu} list
         */
        this.restoreOpenStates = (list) => {
            let opened = 0;
            let data = ext.helper.model.getData(["b/rememberState", "u/openStates"]);

            if (data.rememberState === "all" || data.rememberState === "openStates" || data.rememberState === "openStatesRoot") {
                restoreOpenStateRunning++;

                Object.keys(data.openStates).forEach((node) => {
                    if (data.openStates[node] === true) {
                        let entry = list.find("> li > a." + ext.opts.classes.sidebar.bookmarkDir + "[" + ext.opts.attr.id + "='" + (node) + "']");

                        if (entry.length() > 0) {
                            if (data.rememberState !== "openStatesRoot" || entry.parents("ul").length() === 1) { // if rememberState = openStatesRoot -> only open top level directories
                                opened++;
                                this.toggleBookmarkDir(entry);
                            }
                        }
                    }
                });

                restoreOpenStateRunning--;
            }

            if (opened === 0 && restoreOpenStateRunning === 0) { // alle OpenStates wiederhergestellt
                setTimeout(() => {
                    ext.firstRun = false;

                    ext.helper.scroll.restoreScrollPos(ext.elements.bookmarkBox["all"], () => {
                        ext.initImages();
                        ext.endLoading(200);
                        ext.loaded();
                    });
                }, 100);
            }
        };

        /**
         * Updates the html for the sort filterbox
         */
        this.updateSortFilter = () => {
            ext.elements.filterBox.removeClass(ext.opts.classes.sidebar.hidden).text("");
            let filterBoxHeight = 0;

            if (sort.name === "custom") {
                ext.elements.filterBox.addClass(ext.opts.classes.sidebar.hidden);
            } else {
                let config = ext.helper.model.getData(["u/viewAsTree", "u/mostViewedPerMonth"]);

                let langName = sort.name.replace(/([A-Z])/g, "_$1").toLowerCase();
                $("<a />").attr(ext.opts.attr.direction, sort.dir).text(ext.helper.i18n.get("sort_label_" + langName)).appendTo(ext.elements.filterBox);
                let checkList = $("<ul />").appendTo(ext.elements.filterBox);

                if (!ext.elements.bookmarkBox["search"].hasClass(ext.opts.classes.sidebar.active)) { // show bookmarks as tree or one dimensional list
                    $("<li />")
                        .append(ext.helper.checkbox.get(ext.elements.iframeBody, {
                            [ext.opts.attr.name]: 'viewAsTree',
                            checked: config.viewAsTree ? "checked" : ""
                        }))
                        .append("<a>" + ext.helper.i18n.get("sort_view_as_tree") + "</a>")
                        .appendTo(checkList);
                }

                if (sort.name === "mostUsed") { // sort most used based on total clicks or clicks per month
                    $("<li />")
                        .append(ext.helper.checkbox.get(ext.elements.iframeBody, {
                            [ext.opts.attr.name]: 'mostViewedPerMonth',
                            checked: config.mostViewedPerMonth ? "checked" : ""
                        }))
                        .append("<a>" + ext.helper.i18n.get("sort_most_used_per_month") + "</a>")
                        .appendTo(checkList);
                }

                if (checkList.children("li").length() === 0) {
                    checkList.remove();
                }

                filterBoxHeight = ext.elements.filterBox.realHeight();
            }

            Object.values(ext.elements.bookmarkBox).forEach((box) => {
                box.css("padding-top", filterBoxHeight);
            });
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
            let config = ext.helper.model.getData(["a/showBookmarkIcons", "b/dirOpenDuration"]);
            let sidebarOpen = ext.elements.iframe.hasClass(ext.opts.classes.page.visible);
            let showHidden = ext.elements.sidebar.hasClass(ext.opts.classes.sidebar.showHidden);

            if (list.parents("li").length() > 0) {
                list.css("transition", "height " + config.dirOpenDuration + "s");
            }

            if (asTree && sort.name === "custom" && list.prev("a").length() > 0) { // show separators in custom sorted view
                let dirId = list.prev("a").attr("data-id");
                let separators = ext.helper.model.getData("u/separators");
                if (separators[dirId]) {
                    separators[dirId].forEach((separator) => {
                        separator.separator = true;
                        separator.parentId = dirId;
                        bookmarks.push(separator);
                    });
                }
            }

            let bookmarkCounter = 0;
            list.removeData("remainingEntries");

            if (sorting) {
                sortBookmarks(bookmarks);
            }

            bookmarks.some((bookmark, idx) => {
                if ((showHidden || bookmark.separator || ext.helper.entry.isVisible(bookmark.id)) && (bookmark.children || bookmark.url || bookmark.separator)) { // is dir or link -> fix for search results (chrome returns dirs without children and without url)
                    if (ext.opts.demoMode) {
                        if (bookmark.children) {
                            bookmark.title = "Directory " + (idx + 1);
                        } else {
                            bookmark.title = "Bookmark " + (idx + 1);
                            bookmark.url = "https://example.com/";
                        }
                    }

                    let entry = $("<li />").appendTo(list);
                    let entryContent = $("<a />")
                        .html("<span class='" + ext.opts.classes.sidebar.bookmarkLabel + "'>" + (bookmark.title || "") + "</span><span class='" + ext.opts.classes.drag.trigger + "' />")
                        .appendTo(entry);

                    if (bookmark.id) {
                        entryContent.attr(ext.opts.attr.id, bookmark.id);
                    }

                    if (!(bookmark.separator) && ext.helper.entry.isVisible(bookmark.id) === false) { // hide element
                        entry.addClass(ext.opts.classes.sidebar.hidden);
                    }

                    ext.helper.entry.addData(bookmark.id, "element", entryContent);

                    if (bookmark.children && asTree) { // dir
                        entryContent
                            .attr("title", bookmark.title + "\n-------------\n" + bookmark.children.length + " " + ext.helper.i18n.get("sidebar_dir_children"))
                            .addClass(ext.opts.classes.sidebar.bookmarkDir);

                        if (config.showBookmarkIcons) {
                            entryContent.prepend("<span class='" + ext.opts.classes.sidebar.dirIcon + "' />");
                        }
                    } else if (bookmark.url) { // link
                        entryContent
                            .attr("title", bookmark.title + "\n-------------\n" + bookmark.url)
                            .addClass(ext.opts.classes.sidebar.bookmarkLink);

                        if (config.showBookmarkIcons) {
                            if (ext.opts.demoMode) {
                                entryContent.prepend("<span class='" + ext.opts.classes.sidebar.dirIcon + "' data-color='" + (Math.floor(Math.random() * 10) + 1) + "' />");
                            } else {
                                ext.helper.model.call("favicon", {url: bookmark.url}, (response) => { // retrieve favicon of url
                                    if (response.img) { // favicon found -> add to entry
                                        ext.helper.entry.addData(bookmark.id, "icon", response.img);
                                        entryContent.prepend("<img " + (sidebarOpen ? "src" : ext.opts.attr.src) + "='" + response.img + "' />")
                                    }
                                });
                            }
                        }

                        bookmarkCounter++;
                    } else if (bookmark.separator) { // separator
                        entryContent
                            .addClass(ext.opts.classes.sidebar.separator)
                            .data("infos", {
                                id: bookmark.parentId,
                                index: bookmark.index
                            });
                    }

                    hasEntries = true;

                    if (asTree === false && bookmarkCounter >= 100) { // only render 100 entries of the one dimensional list -> if user scrolles to the end of the list the next 100 entries will be loaded
                        let remainingEntries = bookmarks.slice(100);

                        if (remainingEntries.length > 0) {
                            list.data("remainingEntries", remainingEntries)
                        }

                        return true;
                    }
                }
            });

            return hasEntries;
        };

        /**
         * Sorts the given bookmarks
         *
         * @param {Array} bookmarks
         */
        let sortBookmarks = (bookmarks) => {
            if (bookmarks.length > 1) {
                let collator = ext.helper.i18n.getLocaleSortCollator();
                let doSort = (defaultDir, func) => {
                    bookmarks.sort((a, b) => {
                        if (sort.name !== "custom" && !!(a.children) !== !!(b.children)) {
                            return !!(a.children) ? -1 : 1;
                        } else {
                            return (defaultDir === sort.dir ? 1 : -1) * func(a, b);
                        }
                    });
                };

                switch (sort.name) {
                    case "custom": {
                        doSort("ASC", (a, b) => {
                            return (a.index - (a.separator ? 0.5 : 0)) - (b.index - (b.separator ? 0.5 : 0));
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
                            let aData = ext.helper.entry.getData(a.id);
                            let bData = ext.helper.entry.getData(b.id);
                            let aViews = aData ? aData.views[mostViewedPerMonth ? "perMonth" : "total"] : 0;
                            let bViews = bData ? bData.views[mostViewedPerMonth ? "perMonth" : "total"] : 0;
                            if (aViews === bViews) {
                                return collator.compare(a.title, b.title);
                            } else {
                                return bViews - aViews
                            }
                        });
                        break;
                    }
                    case "recentlyUsed": {
                        doSort("DESC", (a, b) => {
                            let aData = ext.helper.entry.getData(a.id);
                            let bData = ext.helper.entry.getData(b.id);
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
         * @param {function} callback
         */
        let expandCollapseDir = (elm, list, open, instant, callback) => {
            list.css("height", list[0].scrollHeight + "px");

            if (open === false) { // parameter false -> close list
                setTimeout(() => {
                    list.css("height", 0);
                }, 0);
            }

            if (ext.firstRun === true) { // first run -> restore open states of child nodes
                this.restoreOpenStates(list);
            } else {
                let openStates = ext.helper.model.getData("u/openStates");
                openStates[elm.attr(ext.opts.attr.id)] = open;

                if (open === false) {
                    closeAllChildDirs(elm, openStates);
                } else {
                    ext.helper.model.setData({
                        "u/openStates": openStates
                    });
                }
            }

            let dirOpenDurationRaw = ext.helper.model.getData("b/dirOpenDuration");

            setTimeout(() => { // unset changes in css, so opening of children in child list works properly
                if (open === false) {
                    elm.removeClass(ext.opts.classes.sidebar.dirOpened);
                } else {
                    elm.addClass(ext.opts.classes.sidebar.dirOpened);
                    if (ext.helper.model.getData("b/dirAccordion")) {
                        ext.helper.scroll.setScrollPos(ext.elements.bookmarkBox["all"], elm[0].offsetTop, 300);
                    }
                }
                list.css("height", "");
                elm.removeClass(ext.opts.classes.sidebar.dirAnimated);

                if (typeof callback === "function") {
                    callback();
                }
            }, instant ? 0 : (+dirOpenDurationRaw * 1000));
        };

        /**
         * closes all children of the given bookmark node
         *
         * @param {jsu} elm
         * @param {object} openStates
         */
        let closeAllChildDirs = (elm, openStates) => {
            elm.next("ul").find("a." + ext.opts.classes.sidebar.bookmarkDir).forEach((node) => {
                openStates[$(node).attr(ext.opts.attr.id)] = false;
                setTimeout(() => {
                    $(node).removeClass(ext.opts.classes.sidebar.dirOpened);
                }, 500);
            });

            ext.helper.model.setData({
                "u/openStates": openStates
            });
        };

        /**
         * Updates the html for the sidebar header
         */
        let updateSidebarHeader = () => {
            ext.elements.header.text("");
            let bookmarkAmount = ext.helper.entry.getAllBookmarkData().length;

            let headline = $("<h1 />")
                .html("<strong>" + bookmarkAmount + "</strong> <span>" + ext.helper.i18n.get("header_bookmarks" + (bookmarkAmount === 1 ? "_single" : "")) + "</span>")
                .attr("title", bookmarkAmount + " " + ext.helper.i18n.get("header_bookmarks" + (bookmarkAmount === 1 ? "_single" : "")))
                .appendTo(ext.elements.header);

            let headerIcons = [];
            headerIcons.push($("<a />").addClass(ext.opts.classes.sidebar.menu).appendTo(ext.elements.header));
            headerIcons.push($("<a />").addClass(ext.opts.classes.sidebar.sort).appendTo(ext.elements.header));
            headerIcons.push($("<a />").addClass(ext.opts.classes.sidebar.search).appendTo(ext.elements.header));

            let computedStyle = window.getComputedStyle(ext.elements.header[0]);
            let headerPaddingTop = parseInt(computedStyle.getPropertyValue('padding-top'));

            headerIcons.some((icon) => {
                if (icon[0].offsetTop > headerPaddingTop) { // icons are not in one line anymore -> header to small -> remove the label of the headline
                    headline.children("span").addClass(ext.opts.classes.sidebar.hidden);
                    return true;
                }
            });

            $("<div />")
                .addClass(ext.opts.classes.sidebar.searchBox)
                .append("<input type='text' placeholder='" + ext.helper.i18n.get("sidebar_search_placeholder") + "' />")
                .append("<a class='" + ext.opts.classes.sidebar.searchClose + "'></a>")
                .appendTo(ext.elements.header);
        };
    };

})(jsu);