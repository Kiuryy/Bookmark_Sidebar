($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.SidebarEventsHelper = function (ext) {

        let markTimeout = null;
        let lockPinnedEntriesTimeout = null;
        let isRestoring = false;
        let sidebarPos = null;
        let surface = null;

        const sidebarWidthRange = {min: 150, max: 1800};

        /**
         * Initializes the helper
         *
         * @returns {Promise}
         */
        this.init = async () => {
            sidebarPos = ext.helper.model.getData("b/sidebarPosition");
            surface = ext.helper.model.getData("a/surface");

            initBookmarkEntriesEvents();
            initFilterEvents();
            initPinnedEntriesEvents();
            initGeneralEvents();

            if (ext.helper.model.getUserType() === "premium") {
                initSidebarWidthEvents();
            }
        };

        /**
         * Handles the click on one of the entries in the sidebar,
         * either opens the url, if the clicked entry was a bookmark,
         * or opens/closes the directory
         *
         * @param {jsu} elm
         * @param {object} opts
         * @returns {boolean}
         */
        this.handleEntryClick = (elm, opts) => {
            const data = ext.helper.entry.getDataById(elm.attr($.attr.id));
            if (!data) {
                return false;
            }

            const config = ext.helper.model.getData(["b/newTab", "b/linkAction"]);
            const middleClick = opts.which === 2 || opts.ctrlKey || opts.metaKey;

            if (data.isDir && !elm.hasClass($.cl.sidebar.dirAnimated)) { // Click on dir
                if (middleClick) { // middle click -> open all children
                    const bookmarks = data.children.filter(val => val.url && !val.url.startsWith("about:blank"));
                    if (bookmarks.length > ext.helper.model.getData("b/openChildrenWarnLimit")) { // more than x bookmarks -> show confirm dialog
                        ext.helper.overlay.create("openChildren", ext.helper.i18n.get("contextmenu_open_children"), data);
                    } else { // open bookmarks directly without confirmation
                        ext.helper.utility.openAllBookmarks(bookmarks);
                    }
                } else { // normal click -> toggle directory
                    ext.helper.list.toggleBookmarkDir(elm);
                }
            } else if (!data.isDir) { // Click on link
                data.reopenSidebar = ext.helper.model.getData("b/reopenSidebar");

                if (middleClick) { // new tab -> middle click
                    const active = opts.shiftKey || (config.newTab === "background" && config.linkAction === "newtab");
                    ext.helper.utility.openUrl(data, "newTab", active); // open in foreground when a normal click opens the tab in new tab in the background or while pressing 'shift' always in the foreground
                } else if (config.linkAction === "newtab") { // new tab -> normal click
                    ext.helper.utility.openUrl(data, "newTab", config.newTab === "foreground");
                } else if (ext.helper.selection.isEnabled() && elm.parents("div." + $.cl.sidebar.entryPinned).length() === 0) { // sidebar is in selection mode -> select/deselect the entry instead of opening the url/folder
                    selectOrDeselectEntry(elm);
                } else { // current tab
                    ext.helper.utility.openUrl(data, "default", true);
                }
            }
        };

        /**
         * Selects/Deselects the given entry
         *
         * @param elm
         */
        const selectOrDeselectEntry = (elm) => {
            const id = elm.attr($.attr.id);

            if (elm.hasClass($.cl.selected)) {
                ext.helper.selection.deselect(id);
            } else {
                ext.helper.selection.select(id);
            }
        };

        /**
         * Initializes the eventhandlers for the filterbox
         *
         * @returns {Promise}
         */
        const initFilterEvents = async () => {
            ext.elm.filterBox.on("click", "a[" + $.attr.direction + "]", (e) => { // change sort direction
                e.preventDefault();
                const currentDirection = $(e.target).attr($.attr.direction);
                const newDirection = currentDirection === "ASC" ? "DESC" : "ASC";
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
        const initBookmarkEntriesEvents = async () => {
            Object.values(ext.elm.bookmarkBox).forEach((box, i) => {
                const selector = [box];
                if (i === 0) {
                    selector.push(ext.elm.pinnedBox);
                }

                $(selector).on("click mousedown", "> ul a", (e) => { // click on a bookmark (link or dir)
                    e.preventDefault();
                    const elm = $(e.target);

                    if (
                        !elm.hasClass($.cl.drag.trigger) &&
                        !elm.hasClass($.cl.sidebar.separator) &&
                        !elm.parent().hasClass($.cl.sidebar.removeMask) &&
                        ((e.which === 1 && e.type === "click") || (e.which === 2 && e.type === "mousedown") || ext.refreshRun)
                    ) { // only left click
                        if (elm.hasClass($.cl.add)) {
                            const id = elm.parent("a").attr($.attr.id);
                            ext.helper.overlay.create("add", ext.helper.i18n.get("contextmenu_add"), ext.helper.entry.getDataById(id));
                        } else {
                            this.handleEntryClick($(e.currentTarget), e);
                        }
                    }
                }).on("dblclick", "> ul a", (e) => { // double click on a directory will open the directory + all sub directories
                    const _self = $(e.currentTarget);
                    if (_self.hasClass($.cl.sidebar.bookmarkDir) && !_self.hasClass($.cl.sidebar.dirOpened)) {
                        const openChildren = (elm) => {
                            $.delay().then(() => {
                                elm.next("ul").find("> li > a." + $.cl.sidebar.bookmarkDir + ":not(." + $.cl.sidebar.dirOpened + ")").forEach((childDir) => {
                                    ext.helper.list.toggleBookmarkDir($(childDir), false, false).then(() => {
                                        openChildren($(childDir));
                                    });
                                });
                            });
                        };
                        openChildren(_self);
                    }
                }).on("mouseover", "> ul a", (e) => { // add class to currently hovered element
                    if (ext.helper.overlay.isOpened() === false) { // prevent hovering if overlay is open
                        const _self = $(e.currentTarget);
                        const id = _self.attr($.attr.id);
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
                    const elm = $(e.target).parents("a").eq(0);

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
                    const id = ext.elm.bookmarkBox.all.children("ul > li > a").eq(0).attr($.attr.id);
                    ext.helper.overlay.create("add", ext.helper.i18n.get("contextmenu_add"), ext.helper.entry.getDataById(id));
                });
            });
        };

        /**
         * Initializes events for the pinned entry container
         *
         * @returns {Promise}
         */
        const initPinnedEntriesEvents = async () => {
            const clTimeout = () => { // clear timeout for the lock icon
                if (lockPinnedEntriesTimeout) {
                    clearTimeout(lockPinnedEntriesTimeout);
                }
            };

            const startTimeout = () => { // remove lock icon after 500ms of hovering
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

                const isLocked = ext.elm.pinnedBox.hasClass($.cl.sidebar.fixed);

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
        const initGeneralEvents = async () => {
            $(document).on($.opts.events.systemColorChanged, () => {
                ext.helper.model.call("reloadIcon");
                if (surface === "auto") {
                    if (ext.helper.stylesheet.getSystemSurface() === "dark") {
                        ext.elm.iframeBody.addClass($.cl.page.dark);
                    } else {
                        ext.elm.iframeBody.removeClass($.cl.page.dark);
                    }
                }
            });

            ext.elm.iframeBody.on("click", () => {
                ext.helper.contextmenu.close();
                ext.helper.tooltip.close();
            });

            $(document).on($.opts.events.premiumPurchased, (e) => { // user purchased premium -> activate by checking the license key
                if (e.detail && e.detail.licenseKey) {
                    $(document).off($.opts.events.premiumPurchased);
                    ext.helper.model.call("activatePremium", {licenseKey: e.detail.licenseKey});
                }
            }).on($.opts.events.showFeedbackForm, () => { // user accessed the feedback page from the webstore -> open the feedback form of the extension
                $("div[data-name='redeviation-extension']").removeAttr($.attr.name);

                ext.helper.model.call("openLink", {
                    href: $.api.extension.getURL("html/settings.html#support"),
                    newTab: false
                });
            });

            $(ext.elm.iframeDocument).on($.opts.events.checkboxChanged, (e) => {
                const name = e.detail.checkbox.attr($.attr.name);

                if (name === "viewAsTree" || name === "mostViewedPerMonth") { // set sort specific config and reload list
                    ext.helper.model.setData({
                        ["u/" + name]: e.detail.checked
                    }).then(() => {
                        ext.startLoading();
                        ext.helper.model.call("reload", {scrollTop: true, type: "Sort"});
                    });
                } else if (name === "select") {
                    selectOrDeselectEntry($(e.detail.container).parent());
                }
            });

            // listen for events from the background script
            $.api.extension.onMessage.removeListener(handleBackgroundMessage);
            $.api.extension.onMessage.addListener(handleBackgroundMessage);

            ["menu", "sort"].forEach((type) => {
                ext.elm.header.on("click contextmenu", "a." + $.cl.sidebar[type], (e) => { // Menu and sort contextmenu
                    e.preventDefault();
                    e.stopPropagation();
                    ext.helper.contextmenu.create(type, $(e.currentTarget));
                });
            });

            ext.elm.header.on("click contextmenu", "a." + $.cl.sidebar.removeSelected, (e) => { // Remove selected entries
                e.preventDefault();
                e.stopPropagation();
                ext.helper.selection.deleteSelected();
            });

            ext.elm.header.on("click contextmenu", "a." + $.cl.sidebar.openSelected, (e) => { // Open selected entries in new tabs
                e.preventDefault();
                e.stopPropagation();
                ext.helper.selection.openSelected();
            });


            ext.elm.header.on("click contextmenu", "a." + $.cl.cancel, (e) => { // Cancel selection of entries
                e.preventDefault();
                e.stopPropagation();
                ext.helper.selection.leave();
            });

            ext.elm.iframeBody.on("click", "#" + $.opts.ids.sidebar.reloadInfo + " a", (e) => { // reload info
                e.preventDefault();
                location.reload(true);
            });

            ext.elm.iframeBody.on("click", "#" + $.opts.ids.sidebar.infoBox + " a", (e) => { // click on a link in the info box
                e.preventDefault();
                const infoBox = ext.elm.iframeBody.find("#" + $.opts.ids.sidebar.infoBox);
                const type = ext.elm.iframeBody.find("#" + $.opts.ids.sidebar.infoBox).attr($.attr.type);

                infoBox.removeClass($.cl.visible);

                if (type === "shareInfo") { // don't track anything as default value -> this method call will result in the infobox never showing up again
                    ext.helper.model.call("updateShareInfo", {
                        config: false,
                        activity: false
                    });
                }

                if ($(e.currentTarget).hasClass($.cl.info)) {
                    let href = null;

                    switch (type) {
                        case "premium": {
                            href = "html/settings.html#premium";
                            break;
                        }
                        case "translation": {
                            href = "html/settings.html#language_translate";
                            break;
                        }
                        case "shareInfo": {
                            href = "html/settings.html#infos_permissions";
                            break;
                        }
                    }

                    if (href) {
                        ext.helper.model.call("openLink", {
                            href: $.api.extension.getURL(href),
                            newTab: true
                        });
                    }
                }
            });
        };

        /**
         * Initialises the eventhandlers for dragging the sidebar width
         *
         * @returns {Promise}
         */
        const initSidebarWidthEvents = async () => {
            ext.elm.widthDrag.on("mousemove", () => {
                ext.elm.widthDrag.addClass($.cl.hover);
            }).on("mouseleave", () => {
                ext.elm.widthDrag.removeClass($.cl.hover);
            }).on("mousedown", () => { // change width of sidebar
                ext.helper.contextmenu.close();
                ext.helper.tooltip.close();
                ext.helper.toggle.addSidebarHoverClass();
                ext.elm.widthDrag.addClass($.cl.drag.isDragged);
            });

            ext.elm.iframeBody.on("mousemove", (e) => {
                if (ext.elm.widthDrag.hasClass($.cl.drag.isDragged) && e.which === 1) {
                    e.preventDefault();
                    e.stopPropagation();

                    let dragInfo = ext.elm.widthDrag.data("dragInfo");
                    if (!dragInfo) {
                        dragInfo = {start: e.clientX, width: ext.elm.sidebar.realWidth()};
                        ext.elm.widthDrag.data("dragInfo", dragInfo);
                    }

                    let diff = e.clientX - dragInfo.start;

                    if (sidebarPos === "right") {
                        diff *= -1;
                    }

                    ext.helper.toggle.addSidebarHoverClass();

                    let sidebarWidth = dragInfo.width + diff;
                    sidebarWidth = Math.min(sidebarWidth, sidebarWidthRange.max);
                    sidebarWidth = Math.max(sidebarWidth, sidebarWidthRange.min);

                    ext.elm.sidebar.css("width", sidebarWidth + "px");
                    ext.helper.list.handleSidebarWidthChange();
                }
            }).on("mouseup", () => { // save current sidebar width
                if (ext.elm.widthDrag.data("dragInfo")) {
                    ext.elm.widthDrag.removeData("dragInfo");
                    const styles = ext.helper.model.getData("a/styles");

                    $.delay().then(() => {
                        const widthValue = Math.round(ext.elm.sidebar.realWidth());

                        if (!isNaN(widthValue)) {
                            styles.sidebarWidth = widthValue + "px";
                            ext.helper.model.setData({"a/styles": styles});

                            if (ext.elm.iframe.hasClass($.cl.page.hideMask)) { // save width of iframe in data attribute
                                ext.elm.iframe.data("width", widthValue + 50);
                            }
                        }

                        ext.helper.toggle.removeSidebarHoverClass();
                        ext.elm.widthDrag.removeClass($.cl.drag.isDragged);
                    });
                }
            });
        };

        /**
         * Handles the received message from the background script
         *
         * @param {object} message
         */
        const handleBackgroundMessage = (message) => {
            if (message && message.action && (message.reinitialized === null || ext.initialized > message.reinitialized)) { // background is not reinitialized after the creation of this instance of the script -> perform the action

                if (message.action === "reload") { // reload the current instance of the extension
                    let performReload = true;

                    if (message.type === "Removed" || (message.type === "Created" && isRestoring === true)) { // removed or created from undo -> prevent reload when it was performed on this browser tab
                        const box = ext.helper.list.getActiveBookmarkBox();
                        if (box.find("a." + $.cl.sidebar.restored).length() > 0 || box.find("span." + $.cl.sidebar.removeMask).length() > 0) { // prevent reloading the sidebar on the tab where the entry got removed or restored
                            performReload = false;
                        }
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
    };

})(jsu);