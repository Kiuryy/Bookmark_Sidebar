($ => {
    "use strict";

    window.SidebarEventsHelper = function (ext) {


        /**
         * Expands/Collapses the bookmarks under the given bookmark node
         *
         * @param {jsu} elm
         * @param {boolean} instant
         * @param {function} callback
         */
        this.toggleBookmarkDir = (elm, instant, callback) => {
            elm.addClass(ext.opts.classes.sidebar.dirAnimated);
            let dirId = elm.data("infos").id;
            let childrenList = elm.next("ul");

            if (typeof instant === "undefined") {
                instant = ext.firstRun === true;
            }

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
                    let openStates = ext.helper.model.getData("u/openStates");
                    openStates[elm.data("infos").id] = open;
                    delete openStates["node_" + elm.data("infos").id]; // @deprecated

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
                    childrenList.css("height", "");
                    elm.removeClass(ext.opts.classes.sidebar.dirAnimated);
                    ext.helper.scroll.update(ext.elements.bookmarkBox["all"], true);

                    if (typeof callback === "function") {
                        callback();
                    }
                }, instant ? 0 : (+dirOpenDurationRaw * 1000));
            };


            if (elm.hasClass(ext.opts.classes.sidebar.dirOpened)) { // close children
                expandCollapseChildrenList(false);
            } else { // open children

                if (ext.helper.model.getData("b/dirAccordion")) {
                    ext.elements.bookmarkBox["all"].find("a." + ext.opts.classes.sidebar.dirOpened).forEach((dir) => {
                        if ($(dir).next("ul").find("a[" + ext.opts.attr.id + "='" + dirId + "']").length() === 0) {
                            this.toggleBookmarkDir($(dir), instant);
                        }
                    });
                }

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
            initEvents();
        };

        /**
         * Opens the url of the given bookmark
         *
         * @param {object} infos
         * @param {string} type
         * @param {boolean} active
         */
        this.openUrl = (infos, type = "default", active = true) => {
            if (type === "incognito") {
                ext.helper.model.call("openLink", {
                    href: infos.url,
                    incognito: true
                });
            } else {
                ext.helper.model.call("openLink", {
                    parentId: infos.parentId,
                    id: infos.id,
                    href: infos.url,
                    newTab: type === "newTab",
                    active: active
                });
            }
        };

        /**
         * Initializes the events for the sidebar
         */
        let initEvents = () => {
            $(window).on("beforeunload", () => { // save scroll position before unloading page
                if (ext.elements.sidebar.hasClass(ext.opts.classes.sidebar.openedOnce)) { // sidebar has been open or is still open
                    ext.helper.scroll.updateAll();
                }
            }).on("resize", () => {
                ext.helper.scroll.updateAll();
            });

            $([document, ext.elements.iframe[0].contentDocument]).on("keydown", (e) => { // scroll to top with pos1
                if (e.key === "Home") {
                    ext.helper.scroll.setAllScrollPos(0);
                }
            });


            ext.elements.iframe.find("body").on("click", () => {
                ext.helper.contextmenu.close();
            });

            chrome.extension.onMessage.addListener((message) => {
                if (message && message.action && message.action === "showShareUserdataMask") {
                    ext.initShareUserdataMask();
                }
            });

            ext.elements.header.on("click contextmenu", "a." + ext.opts.classes.sidebar.settings, (e) => {
                e.preventDefault();
                e.stopPropagation();
                ext.helper.contextmenu.close();
                ext.helper.contextmenu.create("settings", $(e.currentTarget));
            });

            ext.elements.iframeBody.on("click", "div#" + ext.opts.ids.sidebar.shareUserdata + " a", (e) => {
                e.preventDefault();
                ext.helper.model.call("shareUserdata", {
                    share: $(e.currentTarget).data("accept")
                });
                ext.elements.iframeBody.find("div#" + ext.opts.ids.sidebar.shareUserdata).addClass(ext.opts.classes.sidebar.hidden);
            });


            Object.keys(ext.elements.bookmarkBox).forEach((key) => {
                ext.elements.bookmarkBox[key].children("ul").on("click mousedown", "a", (e) => { // click on a bookmark (link or dir)
                    e.preventDefault();

                    if (!$(e.target).hasClass(ext.opts.classes.drag.trigger) && ((e.which === 1 && e.type === "click") || (e.which === 2 && e.type === "mousedown") || ext.firstRun)) { // only left click
                        let _self = $(e.currentTarget);
                        let infos = _self.data("infos");
                        let isDir = !!(infos.children);

                        if (isDir && !_self.hasClass(ext.opts.classes.sidebar.dirAnimated)) {  // Click on dir
                            this.toggleBookmarkDir(_self);
                        } else if (!isDir) { // Click on link
                            let config = ext.helper.model.getData(["b/newTab", "b/linkAction"]);
                            let newTab = e.which === 2 || config.linkAction === "newtab";
                            this.openUrl(infos, newTab ? "newTab" : "default", newTab ? config.newTab === "foreground" : true);
                        }
                    }
                }).on("mouseover", "a", (e) => {
                    if ($(e.currentTarget).hasClass(ext.opts.classes.sidebar.mark)) {
                        $(e.currentTarget).removeClass(ext.opts.classes.sidebar.mark);
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
         * @param {jsu} elm
         * @param {object} openStates
         */
        let closeAllChildDirs = (elm, openStates) => {
            elm.next("ul").find("a." + ext.opts.classes.sidebar.bookmarkDir).forEach((node) => {
                openStates[$(node).data("infos").id] = false;
                setTimeout(() => {
                    $(node).removeClass(ext.opts.classes.sidebar.dirOpened);
                }, 500);
            });

            ext.helper.model.setData({
                "u/openStates": openStates
            });
        };
    };

})(jsu);