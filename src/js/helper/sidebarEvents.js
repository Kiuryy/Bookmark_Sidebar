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

                    if (open === false) {
                        closeAllChildDirs(elm, openStates);
                    } else {
                        ext.helper.model.setData({
                            "u/openStates": openStates
                        });
                    }
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

                    if (typeof callback === "function") {
                        callback();
                    }
                }, instant ? 0 : 500);
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
            initEvents();
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
                ext.elements.iframeBody.find("div#" + ext.opts.ids.sidebar.shareUserdata).addClass(ext.opts.classes.sidebar.shareUserdataHidden);
            });


            Object.keys(ext.elements.bookmarkBox).forEach((key) => {
                ext.elements.bookmarkBox[key].children("ul").on("click mousedown", "a", (e) => { // click on a bookmark (link or dir)
                    e.preventDefault();

                    if (!$(e.target).hasClass(ext.opts.classes.drag.trigger) && ((e.which === 1 && e.type === "click") || (e.which === 2 && e.type === "mousedown") || ext.firstRun)) { // only left click
                        let _self = $(e.currentTarget);
                        let middleClicked = e.which === 2;
                        let infos = _self.data("infos");
                        let isDir = !!(infos.children);

                        if (isDir && !_self.hasClass(ext.opts.classes.sidebar.dirAnimated)) {  // Click on dir
                            this.toggleBookmarkDir(_self);
                        } else if (!isDir) { // Click on link
                            let newTab = ext.helper.model.getData("b/newTab");
                            ext.helper.model.call("openLink", {
                                parentId: infos.parentId,
                                id: infos.id,
                                href: infos.url,
                                newTab: middleClicked,
                                active: middleClicked ? newTab === "foreground" : true
                            });
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
            elm.next("ul").find("a.dir").forEach((node) => {
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