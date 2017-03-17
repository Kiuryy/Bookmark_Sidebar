($ => {
    "use strict";

    window.SidebarEventsHelper = function (ext) {

        let newTabForeground = null;

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
                    ext.helper.scroll.update(ext.elements.bookmarkBox, true);
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
            ext.helper.model.getConfig("newTab", (newTabStr) => { // user config
                newTabForeground = newTabStr === "foreground";
            }, (newTabStr) => { // default config
                newTabForeground = newTabStr === "foreground";
            });

            initEvents();
        };

        /**
         * Initializes the events for the sidebar
         */
        let initEvents = () => {
            $(window).on("beforeunload", () => { // save scroll position before unloading page
                if (ext.elements.iframe.data("visibleOnce")) { // sidebar has been open or is still open
                    ext.helper.scroll.update(ext.elements.bookmarkBox, true);
                }
            }).on("resize", () => {
                ext.helper.scroll.update(ext.elements.bookmarkBox, true);
            });

            ext.elements.iframe.find("body").on("click", () => {
                ext.helper.contextmenu.close();
            });

            ext.elements.iframeBody.on("click contextmenu", "a." + ext.opts.classes.sidebar.settings, (e) => {
                e.preventDefault();
                e.stopPropagation();
                ext.helper.contextmenu.close();
                ext.helper.contextmenu.create("settings", $(e.currentTarget));
            });

            ext.elements.iframeBody.on("click", "a." + ext.opts.classes.sidebar.search, (e) => {
                e.preventDefault();
                e.stopPropagation();
                ext.elements.header.addClass(ext.opts.classes.sidebar.searchVisible);
            });

            ext.elements.iframeBody.on("click", "a." + ext.opts.classes.sidebar.searchClose, (e) => {
                e.preventDefault();
                e.stopPropagation();
                ext.elements.header.removeClass(ext.opts.classes.sidebar.searchVisible);
            });

            ext.elements.iframeBody.on("click", "div#" + ext.opts.ids.sidebar.shareUserdata + " a", (e) => {
                e.preventDefault();
                ext.helper.model.setConfig({
                    shareUserdata: $(e.currentTarget).data("accept") ? "y" : "n",
                    lastShareDate: 0
                });
                ext.elements.iframeBody.find("div#" + ext.opts.ids.sidebar.shareUserdata).addClass(ext.opts.classes.sidebar.shareUserdataHidden);
            });

            ext.elements.bookmarkBox.children("ul").on("click mousedown", "a", (e) => { // click on a bookmark (link or dir)
                e.preventDefault();

                if (e.target.tagName === "A" && ((e.which === 1 && e.type === "click") || (e.which === 2 && e.type === "mousedown") || ext.firstRun)) { // only left click
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