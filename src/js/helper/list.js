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
            sort = ext.helper.model.getData("u/sort");
            ext.elements.sidebar.attr(ext.opts.attr.sort, sort.name);
            this.updateBookmarkBox();
        };

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
                recentlyAdded: {
                    dir: "DESC"
                }
            }
        };

        this.getSort = () => {
            return sort;
        };

        this.updateSort = (name, direction) => {
            let sortList = this.getSortList();
            if (sortList[name]) {
                if (typeof direction === "undefined") {
                    direction = sortList[name].dir;
                }

                sort = {
                    name: name,
                    dir: direction
                };

                ext.elements.sidebar.attr(ext.opts.attr.sort, sort.name);

                ext.startLoading();
                ext.helper.scroll.setScrollPos(ext.elements.bookmarkBox["all"], 0, true);
                ext.helper.scroll.update(ext.elements.bookmarkBox["all"], true, true);
                this.updateBookmarkBox();
            }
        };

        /**
         * Updates the sidebar with the newest set of bookmarks
         */
        this.updateBookmarkBox = () => {
            ext.helper.model.call("bookmarks", {id: 0}, (response) => { // Initialize the first layer of the bookmark tree
                if (response.bookmarks && response.bookmarks[0] && response.bookmarks[0].children && response.bookmarks[0].children.length > 0) {
                    ext.firstRun = true;
                    let list = ext.elements.bookmarkBox["all"].children("ul");
                    list.removeClass(ext.opts.classes.sidebar.hideRoot).text("");

                    ext.helper.entry.update(response.bookmarks[0].children, () => {
                        updateSidebarHeader();
                        ext.helper.search.init();

                        this.addBookmarkDir(response.bookmarks[0].children, list);
                        if (list.children("li").length() === 1) { // hide root directory if it's the only one -> show the content of this directory
                            list.addClass(ext.opts.classes.sidebar.hideRoot);
                            this.toggleBookmarkDir(list.find("> li > a." + ext.opts.classes.sidebar.bookmarkDir).eq(0));
                        } else {
                            this.restoreOpenStates(list);
                        }
                    });
                }
            });
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
                instant = ext.firstRun === true;
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
         * Sorts the given bookmarks
         *
         * @param {Array} bookmarks
         */
        let sortBookmarks = (bookmarks) => {
            if (bookmarks.length > 1) {
                switch (sort.name) {
                    case "alphabetical": {
                        bookmarks.sort((a, b) => {
                            return a.title.localeCompare(b.title, [chrome.i18n.getUILanguage(), ext.opts.manifest.default_locale]);
                        });
                        break;
                    }
                    case "recentlyAdded": {
                        bookmarks.sort((a, b) => {
                            return b.dateAdded - a.dateAdded;
                        });
                        break;
                    }
                    case "mostUsed": {
                        bookmarks.sort((a, b) => {
                            let aData = ext.helper.entry.getData(a.id);
                            let bData = ext.helper.entry.getData(b.id);
                            let aViews = aData ? aData.views.total : 0;
                            let bViews = bData ? bData.views.total : 0;
                            // @todo total <-> per month
                            return bViews - aViews;
                        });
                        break;
                    }
                }
            }
        };

        /**
         * Adds the given bookmarks to the given list
         *
         * @param {Array} bookmarks
         * @param {jsu} list
         * @returns {boolean} returns false if nothing has been added
         */
        this.addBookmarkDir = (bookmarks, list) => {
            let hasEntries = false;
            let config = ext.helper.model.getData(["a/showBookmarkIcons", "b/dirOpenDuration"]);
            let sidebarOpen = ext.elements.iframe.hasClass(ext.opts.classes.page.visible);
            let showHidden = ext.elements.sidebar.hasClass(ext.opts.classes.sidebar.showHidden);

            if (list.parents("li").length() > 0) {
                list.css("transition", "height " + config.dirOpenDuration + "s");
            }

            sortBookmarks(bookmarks);

            bookmarks.forEach((bookmark, idx) => {
                if ((showHidden || ext.helper.entry.isVisible(bookmark.id)) && (bookmark.children || bookmark.url)) { // is dir or link -> fix for search results (chrome returns dirs without children and without url)
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
                        .html("<span class='" + ext.opts.classes.sidebar.bookmarkLabel + "'>" + bookmark.title + "</span><span class='" + ext.opts.classes.drag.trigger + "' />")
                        .attr(ext.opts.attr.id, bookmark.id)
                        .appendTo(entry);

                    if (ext.helper.entry.isVisible(bookmark.id) === false) {
                        entry.addClass(ext.opts.classes.sidebar.hidden);
                    }

                    ext.helper.entry.addData(bookmark.id, "element", entryContent);

                    if (bookmark.children) { // dir
                        entryContent
                            .attr("title", bookmark.title + "\n-------------\n" + bookmark.children.length + " " + ext.lang("sidebar_dir_children"))
                            .addClass(ext.opts.classes.sidebar.bookmarkDir);

                        if (config.showBookmarkIcons) {
                            entryContent.prepend("<span class='" + ext.opts.classes.sidebar.dirIcon + "' />");
                        }
                    } else { // link
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
                    }

                    hasEntries = true;
                }
            });

            return hasEntries;
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

            if (data.rememberState === "all" || data.rememberState === "openStates") {
                restoreOpenStateRunning++;

                Object.keys(data.openStates).forEach((node) => {
                    if (data.openStates[node] === true) {
                        let id = +node.replace(/^node_/, ""); // @deprecated replace not needed anymore
                        let entry = list.find("> li > a." + ext.opts.classes.sidebar.bookmarkDir + "[" + ext.opts.attr.id + "='" + id + "']");

                        if (entry.length() > 0) {
                            opened++;
                            this.toggleBookmarkDir(entry);
                        }
                    }
                });

                restoreOpenStateRunning--;
            }

            if (opened === 0 && restoreOpenStateRunning === 0) { // alle OpenStates wiederhergestellt
                setTimeout(() => {
                    ext.firstRun = false;
                    ext.helper.scroll.restoreScrollPos(ext.elements.bookmarkBox["all"], () => {
                        ext.endLoading(200);
                        ext.loaded();
                    });
                }, 100);
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
                delete openStates["node_" + elm.attr(ext.opts.attr.id)]; // @deprecated

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
                        ext.helper.scroll.setScrollPos(ext.elements.bookmarkBox["all"], elm[0].offsetTop);
                    }
                }
                list.css("height", "");
                elm.removeClass(ext.opts.classes.sidebar.dirAnimated);
                ext.helper.scroll.update(ext.elements.bookmarkBox["all"], true);

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
            let bookmarkAmount = Object.keys(ext.helper.entry.getAllBookmarkData()).length;

            $("<h1 />").html("<strong>" + bookmarkAmount + "</strong> <span>" + ext.lang("header_bookmarks" + (bookmarkAmount === 1 ? "_single" : "")) + "</span>").appendTo(ext.elements.header);
            $("<a />").addClass(ext.opts.classes.sidebar.menu).appendTo(ext.elements.header);
            $("<a />").addClass(ext.opts.classes.sidebar.sort).appendTo(ext.elements.header);
            $("<a />").addClass(ext.opts.classes.sidebar.search).appendTo(ext.elements.header);

            $("<div />")
                .addClass(ext.opts.classes.sidebar.searchBox)
                .append("<input type='text' placeholder='" + ext.lang("sidebar_search_placeholder") + "' />")
                .append("<a href='#' class='" + ext.opts.classes.sidebar.searchClose + "'></a>")
                .appendTo(ext.elements.header);
        };
    };

})(jsu);