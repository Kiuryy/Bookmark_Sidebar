($ => {
    "use strict";

    /**
     * @requires helper: model, i18n, utility, entry, list, overlay, tooltip, contextmenu, bookmark, checkbox, toggle, scroll
     * @param {object} ext
     * @constructor
     */
    $.SidebarEventsHelper = function (ext) {

        let markTimeout = null;
        let lockPinnedEntriesTimeout = null;
        let isRestoring = false;

        /**
         * Initializes the helper
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initBookmarkEntriesEvents();
            initFilterEvents();
            initPinnedEntriesEvents();
            initGeneralEvents();
        };

        this.handleEntryClick = (elm, opts) => {
            let data = ext.helper.entry.getDataById(elm.attr($.attr.id));
            if (!data) {
                return false;
            }

            let config = ext.helper.model.getData(["b/newTab", "b/linkAction"]);
            let middleClick = opts.which === 2 || opts.ctrlKey || opts.metaKey;

            if (data.isDir && !elm.hasClass($.cl.sidebar.dirAnimated)) {  // Click on dir
                if (middleClick) { // middle click -> open all children
                    let bookmarks = data.children.filter(val => val.url && val.url !== "about:blank");
                    if (bookmarks.length > ext.helper.model.getData("b/openChildrenWarnLimit")) { // more than x bookmarks -> show confirm dialog
                        ext.helper.overlay.create("openChildren", ext.helper.i18n.get("contextmenu_open_children"), data);
                    } else { // open bookmarks directly without confirmation
                        ext.helper.utility.openAllBookmarks(bookmarks);
                    }
                } else { // normal click -> toggle directory
                    ext.helper.list.toggleBookmarkDir(elm);
                }
            } else if (!data.isDir) { // Click on link
                if (middleClick) { // @deprecated
                    ext.helper.model.call("trackEvent", {
                        category: "url",
                        action: "open",
                        label: "new_tab_middle_click"
                    });
                } else { // @deprecated
                    ext.helper.model.call("trackEvent", {
                        category: "url",
                        action: "open",
                        label: (opts.which === 2 || config.linkAction === "newtab" ? "new" : "current") + "_tab_default"
                    });
                }

                data.reopenSidebar = ext.helper.model.getData("b/reopenSidebar");

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
            ext.elm.filterBox.on("click", "a[" + $.attr.direction + "]", (e) => { // change sort direction
                e.preventDefault();
                let currentDirection = $(e.target).attr($.attr.direction);
                let newDirection = currentDirection === "ASC" ? "DESC" : "ASC";
                ext.helper.list.updateDirection(newDirection);
            }).on("click", "div." + $.cl.checkbox.box + " + a", (e) => { // trigger checkbox (viewAsTree or mostViewedPerMonth)
                e.preventDefault();
                $(e.target).prev("div[" + $.attr.name + "]").trigger("click");
            });
        };

        /**
         * Initializes the eventhandlers for the bookmark entries
         *
         * @returns {Promise}
         */
        let initBookmarkEntriesEvents = async () => {
            Object.values(ext.elm.bookmarkBox).forEach((box, i) => {
                let selector = [box];
                if (i === 0) {
                    selector.push(ext.elm.pinnedBox);
                }

                $(selector).on("click mousedown", "> ul a", (e) => { // click on a bookmark (link or dir)
                    e.preventDefault();

                    if (
                        !$(e.target).hasClass($.cl.drag.trigger) &&
                        !$(e.target).hasClass($.cl.sidebar.separator) &&
                        !$(e.target).parent().hasClass($.cl.sidebar.removeMask) &&
                        ((e.which === 1 && e.type === "click") || (e.which === 2 && e.type === "mousedown") || ext.refreshRun)
                    ) { // only left click
                        this.handleEntryClick($(e.currentTarget), e);
                    }
                }).on("dblclick", "> ul a", (e) => { // double click on a directory will open the directory + all sub directories
                    let _self = $(e.currentTarget);

                    let openChildren = (elm) => {
                        elm.next("ul").find("> li > a." + $.cl.sidebar.bookmarkDir).forEach((childDir) => {
                            if (!$(childDir).hasClass($.cl.sidebar.dirOpened)) {
                                $.delay().then(() => {
                                    ext.helper.list.toggleBookmarkDir($(childDir), false, false).then(() => {
                                        openChildren($(childDir));
                                    });
                                });
                            }
                        });
                    };

                    if (_self.hasClass($.cl.sidebar.bookmarkDir) && !_self.hasClass($.cl.sidebar.dirOpened)) {
                        openChildren(_self);
                    }
                }).on("mouseover", "> ul a", (e) => { // add class to currently hovered element
                    if (ext.helper.overlay.isOpened() === false) { // prevent hovering if overlay is open
                        let _self = $(e.currentTarget);
                        let id = _self.attr($.attr.id);
                        box.find("a." + $.cl.hover).removeClass($.cl.hover);
                        box.find("a." + $.cl.sidebar.lastHover).removeClass($.cl.sidebar.lastHover);

                        if (!_self.hasClass($.cl.sidebar.mark)) {
                            _self.addClass([$.cl.hover, $.cl.sidebar.lastHover]);
                        }

                        if (markTimeout) {
                            clearTimeout(markTimeout);
                        }

                        markTimeout = setTimeout(() => { // remove highlighting after 500ms of hovering
                            box.find("a[" + $.attr.id + "='" + id + "']").removeClass($.cl.sidebar.mark);
                        }, 500);

                        ext.helper.tooltip.create(_self);
                    }
                }).on("contextmenu", "> ul a", (e) => { // right click
                    e.preventDefault();
                    let type = "list";
                    if ($(e.target).hasClass($.cl.sidebar.separator)) {
                        type = "separator";
                    }
                    $(e.currentTarget).removeClass($.cl.sidebar.mark);
                    ext.helper.contextmenu.create(type, $(e.currentTarget));
                }).on("mouseleave", (e) => {
                    ext.helper.tooltip.close();
                    $(e.currentTarget).find("a." + $.cl.hover).removeClass($.cl.hover);
                }).on("click", "span." + $.cl.sidebar.removeMask + " > span", (e) => { // undo deletion of an entry
                    e.preventDefault();
                    let elm = $(e.target).parents("a").eq(0);

                    if (isRestoring === false) {
                        isRestoring = true;

                        ext.helper.bookmark.restoreEntry(elm).then(() => {
                            isRestoring = false;
                        });
                    }
                }).on("mouseover", "> a[" + $.attr.name + "='add']", (e) => {
                    e.preventDefault();
                    box.find("a." + $.cl.hover).removeClass($.cl.hover);
                    ext.helper.tooltip.close();
                }).on("click", "> a[" + $.attr.name + "='add']", (e) => { // add element to the root if the real root is hidden
                    e.preventDefault();
                    let id = ext.elm.bookmarkBox.all.children("ul > li > a").eq(0).attr($.attr.id);
                    ext.helper.overlay.create("add", ext.helper.i18n.get("contextmenu_add"), ext.helper.entry.getDataById(id));
                });
            });
        };

        /**
         * Initializes events for the pinned entry container
         *
         * @returns {Promise}
         */
        let initPinnedEntriesEvents = async () => {
            let clTimeout = () => { // clear timeout for the lock icon
                if (lockPinnedEntriesTimeout) {
                    clearTimeout(lockPinnedEntriesTimeout);
                }
            };

            let startTimeout = () => { // remove lock icon after 500ms of hovering
                clTimeout();
                lockPinnedEntriesTimeout = setTimeout(() => {
                    ext.elm.lockPinned.removeClass($.cl.active);
                    ext.helper.toggle.removeSidebarHoverClass();
                }, 500);
            };

            ext.elm.pinnedBox.on("mouseenter", () => {
                clTimeout();
                ext.elm.lockPinned.addClass($.cl.active);
            }).on("mouseleave", () => {
                startTimeout();
            });

            ext.elm.lockPinned.on("mouseenter", () => {
                clTimeout();
            }).on("mouseleave", () => {
                startTimeout();
            }).on("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                ext.elm.lockPinned.toggleClass($.cl.sidebar.fixed);
                ext.elm.pinnedBox.toggleClass($.cl.sidebar.fixed);

                let isLocked = ext.elm.pinnedBox.hasClass($.cl.sidebar.fixed);

                ext.helper.model.setData({
                    "u/lockPinned": isLocked
                }).then(() => {
                    if (isLocked === false) { // scroll to top if the pinned entries got unlocked
                        ext.helper.scroll.setScrollPos(ext.elm.bookmarkBox.all, 0, 200);
                        ext.elm.lockPinned.removeClass($.cl.active);
                    }

                    ext.helper.toggle.removeSidebarHoverClass();
                    ext.helper.list.updateSortFilter();
                });
            });
        };

        /**
         * Initializes general events for the sidebar
         *
         * @returns {Promise}
         */
        let initGeneralEvents = async () => {
            ext.elm.iframe.find("body").on("click", () => {
                ext.helper.contextmenu.close();
                ext.helper.tooltip.close();
            });


            $(ext.elm.iframe[0].contentDocument).on($.opts.events.checkboxChanged, (e) => {
                let name = e.detail.checkbox.attr($.attr.name);

                if (name === "viewAsTree" || name === "mostViewedPerMonth") {  // set sort specific config and reload list
                    ext.helper.model.setData({
                        ["u/" + name]: e.detail.checked
                    }).then(() => {
                        ext.startLoading();
                        ext.helper.model.call("reload", {scrollTop: true, type: "Sort"});
                    });
                } else if (name === "config" || name === "activity") { // check whether all tracking checkboxes are checked
                    let allChecked = true;
                    ext.elm.iframeBody.find("div#" + $.opts.ids.sidebar.shareInfo + " input[type='checkbox']").forEach((elm) => {
                        let wrapper = $(elm).parent();
                        if (ext.helper.checkbox.isChecked(wrapper) === false) {
                            allChecked = false;
                            return false;
                        }
                    });

                    if (allChecked) {
                        $.delay(300).then(() => {
                            saveTrackingPreferences();
                        });
                    }
                }
            });

            // listen for events from the background script
            chrome.extension.onMessage.removeListener(handleBackgroundMessage);
            chrome.extension.onMessage.addListener(handleBackgroundMessage);

            ["menu", "sort"].forEach((type) => {
                ext.elm.header.on("click contextmenu", "a." + $.cl.sidebar[type], (e) => { // Menu and sort contextmenu
                    e.preventDefault();
                    e.stopPropagation();
                    ext.helper.contextmenu.create(type, $(e.currentTarget));
                });
            });

            ext.elm.iframeBody.on("click", "#" + $.opts.ids.sidebar.reloadInfo + " a", (e) => { // reload info
                e.preventDefault();
                location.reload(true);
            });

            ext.elm.iframeBody.on("click", "#" + $.opts.ids.sidebar.shareInfo + " a", (e) => { // click on a link in the share info mask
                e.preventDefault();
                let title = $(e.currentTarget).data("title");

                if (title) {
                    ext.helper.overlay.create("shareInfoDesc", title, {type: $(e.currentTarget).data("type")});
                } else {
                    saveTrackingPreferences();
                }
            });
        };

        /**
         * Handles the received message from the background script
         *
         * @param {object} message
         */
        let handleBackgroundMessage = (message) => {
            if (message && message.action && (message.reinitialized === null || ext.initialized > message.reinitialized)) { // background is not reinitialized after the creation of this instance of the script -> perform the action

                if (message.action === "reload") { // reload the current instance of the extension
                    let performReload = true;

                    if (message.type === "Removed" || (message.type === "Created" && isRestoring === true)) { // removed or created from undo -> prevent reload when it was performed on this browser tab
                        Object.values(ext.elm.bookmarkBox).some((box) => {
                            if (box.hasClass($.cl.active)) {

                                if (box.find("a." + $.cl.sidebar.restored).length() > 0 || box.find("span." + $.cl.sidebar.removeMask).length() > 0) { // prevent reloading the sidebar on the tab where the entry got removed or restored
                                    performReload = false;
                                }

                                return true;
                            }
                        });
                    }

                    if (performReload) {
                        let delay = 0;
                        if (message.scrollTop) {
                            ext.helper.scroll.setScrollPos(ext.elm.bookmarkBox.all, 0);
                            delay = 100;
                        }

                        ext.needsReload = true;
                        $.delay(delay).then(ext.reload);
                    }
                } else if (message.action === "toggleSidebar") { // click on the icon in the chrome menu
                    ext.helper.model.call("clearNotWorkingTimeout");

                    if (ext.elm.iframe.hasClass($.cl.page.visible)) {
                        ext.helper.toggle.closeSidebar();
                    } else {
                        ext.helper.toggle.setSidebarHoveredOnce(true);
                        ext.helper.toggle.openSidebar();
                    }
                }
            }
        };

        /**
         * Saves the preference of the user which data should be shared (configuration or activity)
         */
        let saveTrackingPreferences = () => {
            let shareInfo = {
                config: false,
                activity: false
            };

            ext.elm.iframeBody.find("div#" + $.opts.ids.sidebar.shareInfo + " input[type='checkbox']").forEach((elm) => {
                let wrapper = $(elm).parent();
                let name = wrapper.attr($.attr.name);
                shareInfo[name] = ext.helper.checkbox.isChecked(wrapper);
            });

            ext.helper.model.call("updateShareInfo", shareInfo);
            ext.elm.iframeBody.find("div#" + $.opts.ids.sidebar.shareInfo).addClass($.cl.hidden);
        };
    };

})(jsu);