($ => {
    "use strict";

    window.SidebarEventsHelper = function (ext) {

        let newTabForeground = null;
        let rememberSearch = null;

        /**
         * Expands/Collapses the bookmarks under the given bookmark node
         *
         * @param {jsu} elm
         */
        this.toggleBookmarkDir = (elm) => {
            elm.addClass(ext.opts.classes.sidebar.dirAnimated);
            let childrenList = elm.next("ul");

            let expandCollapseChildrenList = (open) => { // open or close the children list
                childrenList.css("height", childrenList[0].scrollHeight + "px");

                if (open === false) { // parameter false -> close list
                    setTimeout(() => {
                        childrenList.css("height", 0);
                    }, 0);
                }

                if (ext.firstRun === true) { // first run -> restore open states of child nodes
                    ext.restoreOpenStates(childrenList);
                } else {
                    ext.helper.model.getConfig("openStates", (val) => {
                        let openStates = JSON.parse(val);
                        openStates["node_" + elm.data("infos").id] = open;

                        ext.helper.model.setConfig({
                            openStates: JSON.stringify(openStates)
                        }, () => {
                            if (open === false) {
                                closeAllChildDirs(elm, openStates);
                            }
                        });
                    });
                }

                setTimeout(() => { // unset changes in css, so opening of children in child list works properly
                    if (open === false) {
                        elm.removeClass(ext.opts.classes.sidebar.dirOpened);
                    } else {
                        elm.addClass(ext.opts.classes.sidebar.dirOpened);
                    }
                    childrenList.css("height", "");
                    elm.removeClass(ext.opts.classes.sidebar.dirAnimated);
                    ext.helper.scroll.update(ext.elements.bookmarkBox["all"], true);
                }, ext.firstRun === true ? 0 : 500);
            };

            if (elm.hasClass(ext.opts.classes.sidebar.dirOpened)) { // close children
                expandCollapseChildrenList(false);
            } else { // open children
                if (childrenList.length() === 0) { // not yet loaded -> load and expand afterwards
                    ext.helper.model.call("bookmarks", {id: elm.data("infos").id}, (response) => {
                        if (response.bookmarks && response.bookmarks[0] && response.bookmarks[0].children && response.bookmarks[0].children.length > 0) {
                            childrenList = $("<ul />").insertAfter(elm);
                            ext.addBookmarkDir(response.bookmarks[0].children, childrenList);
                            expandCollapseChildrenList(true);
                        }
                    });
                } else { // already loaded -> just expand
                    expandCollapseChildrenList(true);
                }
            }
        };

        /**
         * Initializes the helper
         */
        this.init = () => {
            ext.helper.model.getConfig(["newTab", "rememberSearch"], (values) => { // user config
                newTabForeground = values.newTab === "foreground";
                rememberSearch = values.rememberSearch === "y";

                if (rememberSearch) { // restore search result
                    ext.helper.model.getConfig("searchValue", (searchValue) => {
                        if (searchValue && searchValue.length > 0) { // search value is not empty -> restore
                            ext.elements.header.addClass(ext.opts.classes.sidebar.searchVisible);
                            handleSearchValChanged(searchValue, () => { // scroll to the last position
                                ext.helper.scroll.restoreScrollPos(ext.elements.bookmarkBox["search"]);
                            });
                        }
                    });
                }
            }, (values) => { // default config
                newTabForeground = values.newTab === "foreground";
            });

            initEvents();
        };

        /**
         * Handles the view of the search result list
         *
         * @param val
         * @param callback
         */
        let handleSearchValChanged = (val = null, callback) => {
            let searchField = ext.elements.header.find("div." + ext.opts.classes.sidebar.searchBox + " > input[type='text']");
            if (val === null) {
                val = searchField[0].value;
                ext.helper.scroll.updateScrollbox(ext.elements.bookmarkBox["search"], 0);
            } else {
                searchField[0].value = val;
            }

            if (val && val.length > 0) { // search field is not empty
                ext.elements.bookmarkBox["all"].removeClass(ext.opts.classes.sidebar.active);
                ext.elements.bookmarkBox["search"].addClass(ext.opts.classes.sidebar.active);

                if (val !== searchField.data("lastVal")) { // search value is not the same
                    searchField.data("lastVal", val);
                    ext.helper.model.setConfig({searchValue: val});

                    ext.helper.model.call("searchBookmarks", {searchVal: val}, (response) => {
                        let list = ext.elements.bookmarkBox["search"].children("ul");
                        list.text("");

                        if (response.bookmarks && response.bookmarks.length > 0) { // results for your search value
                            ext.addBookmarkDir(response.bookmarks, list);
                            if (typeof callback === "function") {
                                callback();
                            }
                        } else { // no results
                            console.log("SEARCH RESULT EMPTY");
                        }
                    });
                }
            } else { // empty search field -> reset list
                ext.helper.model.setConfig({searchValue: null});

                if (ext.elements.bookmarkBox["search"].hasClass(ext.opts.classes.sidebar.active)) {
                    ext.elements.bookmarkBox["all"].addClass(ext.opts.classes.sidebar.active);
                    ext.elements.bookmarkBox["search"].removeClass(ext.opts.classes.sidebar.active);
                    ext.helper.scroll.restoreScrollPos(ext.elements.bookmarkBox["all"]);
                }
            }
        };

        /**
         * Updates the scroll position of the visible bookmark list
         */
        let updateScrollPos = () => {
            Object.keys(ext.elements.bookmarkBox).forEach((key) => {
                let bookmarkBox = ext.elements.bookmarkBox[key];
                if (bookmarkBox.hasClass(ext.opts.classes.sidebar.active)) {
                    ext.helper.scroll.update(bookmarkBox, true);
                }
            });
        };

        /**
         * Initializes the events for the sidebar
         */
        let initEvents = () => {
            $(window).on("beforeunload", () => { // save scroll position before unloading page
                if (ext.elements.iframe.data("visibleOnce")) { // sidebar has been open or is still open
                    updateScrollPos();
                }
            }).on("resize", () => {
                updateScrollPos();
            });

            ext.elements.iframe.find("body").on("click", () => {
                ext.helper.contextmenu.close();
            });

            ext.elements.header.on("click contextmenu", "a." + ext.opts.classes.sidebar.settings, (e) => {
                e.preventDefault();
                e.stopPropagation();
                ext.helper.contextmenu.close();
                ext.helper.contextmenu.create("settings", $(e.currentTarget));
            });

            ext.elements.header.on("click", "a." + ext.opts.classes.sidebar.search, (e) => {
                e.preventDefault();
                e.stopPropagation();
                ext.elements.header.addClass(ext.opts.classes.sidebar.searchVisible);
                ext.elements.header.find("div." + ext.opts.classes.sidebar.searchBox + " > input[type='text']")[0].focus();
            });

            ext.elements.header.on("change keyup", "div." + ext.opts.classes.sidebar.searchBox + " > input[type='text']", (e) => {
                e.preventDefault();
                handleSearchValChanged();
            });

            ext.elements.header.on("click", "a." + ext.opts.classes.sidebar.searchClose, (e) => {
                e.preventDefault();
                e.stopPropagation();
                ext.elements.header.removeClass(ext.opts.classes.sidebar.searchVisible);
                setTimeout(() => {
                    ext.elements.header.find("div." + ext.opts.classes.sidebar.searchBox + " > input[type='text']")[0].value = "";
                    handleSearchValChanged();
                }, 300);
            });

            ext.elements.iframeBody.on("click", "div#" + ext.opts.ids.sidebar.shareUserdata + " a", (e) => {
                e.preventDefault();
                ext.helper.model.setConfig({
                    shareUserdata: $(e.currentTarget).data("accept") ? "y" : "n",
                    lastShareDate: 0
                });
                ext.elements.iframeBody.find("div#" + ext.opts.ids.sidebar.shareUserdata).addClass(ext.opts.classes.sidebar.shareUserdataHidden);
            });


            Object.keys(ext.elements.bookmarkBox).forEach((key) => {
                ext.elements.bookmarkBox[key].children("ul").on("click mousedown", "a", (e) => { // click on a bookmark (link or dir)
                    e.preventDefault();

                    if (!$(e.target).hasClass(ext.opts.classes.sidebar.drag) && ((e.which === 1 && e.type === "click") || (e.which === 2 && e.type === "mousedown") || ext.firstRun)) { // only left click
                        let _self = $(e.currentTarget);
                        let middleClicked = e.which === 2;
                        let infos = _self.data("infos");
                        let isDir = !!(infos.children);

                        if (isDir && !_self.hasClass(ext.opts.classes.sidebar.dirAnimated)) {  // Click on dir
                            this.toggleBookmarkDir(_self);
                        } else if (!isDir) { // Click on link
                            ext.helper.model.call("openLink", {
                                parentId: infos.parentId,
                                id: infos.id,
                                href: infos.url,
                                newTab: middleClicked,
                                active: middleClicked ? newTabForeground : true
                            });
                        }
                    }
                }).on("contextmenu", "a", (e) => { // right click
                    e.preventDefault();
                    ext.helper.contextmenu.close();
                    ext.helper.contextmenu.create("list", $(e.currentTarget));
                });
            });
        };

        /**
         * closes all children of the given bookmark node
         *
         * @param jsu elm
         * @param object openStates
         */
        let closeAllChildDirs = (elm, openStates) => {
            elm.next("ul").find("a.dir").forEach((node) => {
                openStates["node_" + $(node).data("infos").id] = false;
                setTimeout(() => {
                    $(node).removeClass(ext.opts.classes.sidebar.dirOpened);
                }, 500);
            });

            ext.helper.model.setConfig({
                openStates: JSON.stringify(openStates)
            });
        };
    };

})(jsu);