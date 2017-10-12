($ => {
    "use strict";

    window.SidebarEventsHelper = function (ext) {

        let markTimeout = null;

        /**
         * Initializes the helper
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initBookmarkEntriesEvents();
            initFilterEvents();
            initGeneralEvents();
        };

        this.handleEntryClick = (elm, opts) => {
            let data = ext.helper.entry.getData(elm.attr(ext.opts.attr.id));
            if (!data) {
                return false;
            }

            let config = ext.helper.model.getData(["b/newTab", "b/linkAction"]);
            let middleClick = opts.which === 2 || opts.ctrlKey || opts.metaKey;

            if (data.isDir && !elm.hasClass(ext.opts.classes.sidebar.dirAnimated)) {  // Click on dir
                if (middleClick) { // middle click -> open all children
                    let bookmarks = data.children.filter(val => !!(val.url));
                    if (bookmarks.length > ext.helper.model.getData("b/openChildrenWarnLimit")) { // more than x bookmarks -> show confirm dialog
                        ext.helper.overlay.create("openChildren", ext.helper.i18n.get("contextmenu_open_children"), data);
                    } else { // open bookmarks directly without confirmation
                        ext.helper.utility.openAllBookmarks(bookmarks, config.newTab === "foreground");
                    }
                } else { // normal click -> toggle directory
                    ext.helper.list.toggleBookmarkDir(elm);
                }
            } else if (!data.isDir) { // Click on link
                if (middleClick) {
                    ext.helper.model.call("trackEvent", {
                        category: "url",
                        action: "open",
                        label: "new_tab_middle_click"
                    });
                } else {
                    ext.helper.model.call("trackEvent", {
                        category: "url",
                        action: "open",
                        label: (opts.which === 2 || config.linkAction === "newtab" ? "new" : "current") + "_tab_default"
                    });
                }

                if (middleClick) { // new tab -> middle click
                    ext.helper.utility.openUrl(data, "newTab", config.newTab === "background" && config.linkAction === "newtab"); // open always in background except a normal click opens them in new tab in the background
                } else if (config.linkAction === "newtab") { // new tab -> normal click
                    ext.helper.utility.openUrl(data, "newTab", config.newTab === "foreground");
                } else { // current tab
                    ext.helper.utility.openUrl(data, "default", true);
                }
            }
        };

        /**
         * Initializes the eventhandlers for the filterbox
         *
         * @returns {Promise}
         */
        let initFilterEvents = async () => {
            ext.elements.filterBox.on("click", "a[" + ext.opts.attr.direction + "]", (e) => { // change sort direction
                e.preventDefault();
                let currentDirection = $(e.target).attr(ext.opts.attr.direction);
                let newDirection = currentDirection === "ASC" ? "DESC" : "ASC";
                ext.helper.list.updateDirection(newDirection);
            }).on("click", "div." + ext.opts.classes.checkbox.box + " + a", (e) => { // trigger checkbox (viewAsTree or mostViewedPerMonth)
                e.preventDefault();
                $(e.target).prev("div[" + ext.opts.attr.name + "]").trigger("click");
            });

            $(ext.elements.iframe[0].contentDocument).on(ext.opts.events.checkboxChanged, (e) => { // set sort specific config and reload list
                let name = e.detail.checkbox.attr(ext.opts.attr.name);

                if (name === "viewAsTree" || name === "mostViewedPerMonth") {
                    ext.helper.model.setData({
                        ["u/" + name]: e.detail.checked
                    }).then(() => {
                        ext.startLoading();
                        ext.helper.model.call("reload", {scrollTop: true, type: "Sort"});
                    });
                }
            });
        };

        /**
         * Initializes the eventhandlers for the bookmark entries
         *
         * @returns {Promise}
         */
        let initBookmarkEntriesEvents = async () => {
            Object.values(ext.elements.bookmarkBox).forEach((box) => {
                box.children("ul").on("click mousedown", "a", (e) => { // click on a bookmark (link or dir)
                    e.preventDefault();

                    if (!$(e.target).hasClass(ext.opts.classes.drag.trigger) && !$(e.target).hasClass(ext.opts.classes.sidebar.separator) && ((e.which === 1 && e.type === "click") || (e.which === 2 && e.type === "mousedown") || ext.refreshRun)) { // only left click
                        this.handleEntryClick($(e.currentTarget), e);
                    }
                }).on("mouseover", "a", (e) => { // add class to currently hovered element
                    let _self = $(e.currentTarget);
                    box.find("> ul a." + ext.opts.classes.sidebar.hover).removeClass(ext.opts.classes.sidebar.hover);

                    if (!_self.hasClass(ext.opts.classes.sidebar.mark)) {
                        _self.addClass(ext.opts.classes.sidebar.hover);
                    }

                    if (markTimeout) {
                        clearTimeout(markTimeout);
                    }

                    markTimeout = setTimeout(() => { // remove highlighting after 500ms of hovering
                        _self.removeClass(ext.opts.classes.sidebar.mark);
                        _self.addClass(ext.opts.classes.sidebar.hover);
                    }, 500);

                    ext.helper.tooltip.create(_self);
                }).on("contextmenu", "a", (e) => { // right click
                    e.preventDefault();
                    let type = "list";
                    if ($(e.target).hasClass(ext.opts.classes.sidebar.separator)) {
                        type = "separator";
                    }
                    $(e.currentTarget).removeClass(ext.opts.classes.sidebar.mark);
                    ext.helper.contextmenu.create(type, $(e.currentTarget));
                });

                box.children("ul").on("mouseleave", (e) => {
                    ext.helper.tooltip.close();
                    $(e.currentTarget).find("a." + ext.opts.classes.sidebar.hover).removeClass(ext.opts.classes.sidebar.hover);
                });
            });
        };

        /**
         * Initializes general events for the sidebar
         *
         * @returns {Promise}
         */
        let initGeneralEvents = async () => {
            $(window).on("beforeunload.bs", () => { // save scroll position before unloading page
                if (ext.elements.sidebar.hasClass(ext.opts.classes.sidebar.openedOnce)) { // sidebar was opened or is still open
                    ext.helper.scroll.updateAll();
                }
            });

            ext.elements.iframe.find("body").on("click", () => {
                ext.helper.contextmenu.close();
                ext.helper.tooltip.close();
            });

            chrome.extension.onMessage.addListener((message) => { // listen for events from the background script
                if (message && message.action && (message.reinitialized === null || ext.initialized > message.reinitialized)) { // background is not reinitialized after the creation of this instance of the script -> perform the action

                    if (message.action === "reload") { // reload the current instance of the extension
                        let delay = 0;
                        if (message.scrollTop) {
                            ext.helper.scroll.setScrollPos(ext.elements.bookmarkBox["all"], 0);
                            delay = 100;
                        }

                        $.delay(delay).then(ext.reload);
                    } else if (message.action === "toggleSidebar") { // click on the icon in the chrome menu
                        if (ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) {
                            ext.helper.toggle.closeSidebar();
                        } else {
                            ext.helper.toggle.openSidebar();
                        }
                    }
                }
            });

            ["menu", "sort"].forEach((type) => {
                ext.elements.header.on("click contextmenu", "a." + ext.opts.classes.sidebar[type], (e) => { // Menu and sort contextmenu
                    e.preventDefault();
                    e.stopPropagation();
                    ext.helper.contextmenu.create(type, $(e.currentTarget));
                });
            });

            ext.elements.iframeBody.on("click", "#" + ext.opts.ids.sidebar.reloadInfo + " a", (e) => { // reload info
                e.preventDefault();
                location.reload(true);
            });

            ext.elements.iframeBody.on("click", "#" + ext.opts.ids.sidebar.shareUserdata + " a", (e) => { // share userdata mask
                e.preventDefault();
                ext.helper.model.call("shareUserdata", {
                    share: $(e.currentTarget).data("accept")
                });
                ext.elements.iframeBody.find("div#" + ext.opts.ids.sidebar.shareUserdata).addClass(ext.opts.classes.sidebar.hidden);
            });
        };
    };

})(jsu);