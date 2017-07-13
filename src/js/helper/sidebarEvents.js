($ => {
    "use strict";

    window.SidebarEventsHelper = function (ext) {

        /**
         * Initializes the helper
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initBookmarkEntriesEvents();
            initFilterEvents();
            initKeyboardEvents();
            initGeneralEvents();
        };

        /**
         * Initializes the eventhandlers for keyboard input
         *
         * @returns {Promise}
         */
        let initKeyboardEvents = async () => {
            $([document, ext.elements.iframe[0].contentDocument]).on("keydown", (e) => {
                if ($("iframe#" + ext.opts.ids.page.overlay).length()) { // overlay is open
                    if (e.key === "Escape" || e.key === "Esc") { // close overlay
                        e.preventDefault();
                        ext.helper.overlay.closeOverlay(true);
                    }
                } else {
                    if (ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) { // sidebar is open
                        let scrollKeys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", "Space"];

                        if (scrollKeys.indexOf(e.key) > -1 || scrollKeys.indexOf(e.code) > -1) {
                            ext.helper.scroll.focus();
                        } else if (e.key === "Escape" || e.key === "Esc") { // close sidebar
                            e.preventDefault();
                            ext.helper.toggle.closeSidebar();
                        } else if (e.key === "c" && (e.ctrlKey || e.metaKey)) { // copy url of currently hovered bookmark
                            e.preventDefault();
                            Object.values(ext.elements.bookmarkBox).forEach((box) => {
                                if (box.hasClass(ext.opts.classes.sidebar.active)) {
                                    let elm = box.find("> ul a." + ext.opts.classes.sidebar.hover).eq(0);
                                    if (elm.length() > 0) {
                                        let data = ext.helper.entry.getData(elm.attr(ext.opts.attr.id));
                                        if (data && data.url && ext.helper.utility.copyToClipboard(data.url)) {
                                            $(elm).children("span." + ext.opts.classes.sidebar.copied).remove();
                                            let copiedNotice = $("<span />").addClass(ext.opts.classes.sidebar.copied).text(ext.helper.i18n.get("sidebar_copied_to_clipboard")).appendTo(elm);

                                            $.delay(100).then(() => {
                                                $(elm).addClass(ext.opts.classes.sidebar.copied);
                                                return $.delay(1500);
                                            }).then(() => {
                                                $(elm).removeClass(ext.opts.classes.sidebar.copied);
                                                return $.delay(500);
                                            }).then(() => {
                                                copiedNotice.remove();
                                            });
                                        }
                                    }
                                }
                            });
                        } else { // focus search field to enter the value of the pressed key there
                            let searchField = ext.elements.header.find("div." + ext.opts.classes.sidebar.searchBox + " > input[type='text']");

                            if (searchField[0] !== ext.elements.iframe[0].contentDocument.activeElement) {
                                searchField[0].focus();
                            }
                        }
                    }
                }
            }).on("keyup", () => {
                if (ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) {
                    let searchField = ext.elements.header.find("div." + ext.opts.classes.sidebar.searchBox + " > input[type='text']");
                    let searchVal = searchField[0].value;

                    if (searchVal.length > 0 && !ext.elements.header.hasClass(ext.opts.classes.sidebar.searchVisible)) { // search field is not yet visible but the field is filled
                        ext.helper.contextmenu.close();
                        ext.helper.tooltip.close();
                        ext.elements.header.addClass(ext.opts.classes.sidebar.searchVisible);
                    }
                }
            });
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
                        ext.helper.model.call("refreshAllTabs", {scrollTop: true, type: "Sort"});
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
                        let _self = $(e.currentTarget);
                        let data = ext.helper.entry.getData(_self.attr(ext.opts.attr.id));
                        let config = ext.helper.model.getData(["b/newTab", "b/linkAction"]);

                        if (data.isDir && !_self.hasClass(ext.opts.classes.sidebar.dirAnimated)) {  // Click on dir
                            if (e.which === 2) { // middle click -> open all children
                                let bookmarks = data.children.filter(val => !!(val.url));
                                if (bookmarks.length > ext.helper.model.getData("b/openChildrenWarnLimit")) { // more than x bookmarks -> show confirm dialog
                                    ext.helper.overlay.create("openChildren", ext.helper.i18n.get("contextmenu_open_children"), data);
                                } else { // open bookmarks directly without confirmation
                                    ext.helper.utility.openAllBookmarks(bookmarks, config.newTab === "foreground");
                                }
                            } else { // normal click -> toggle directory
                                ext.helper.list.toggleBookmarkDir(_self);
                            }
                        } else if (!data.isDir) { // Click on link
                            if (e.which === 2) {
                                ext.helper.model.call("trackEvent", {
                                    category: "url",
                                    action: "open",
                                    label: "new_tab_middle_click"
                                });
                            } else {
                                ext.helper.model.call("trackEvent", {
                                    category: "url",
                                    action: "open",
                                    label: (e.which === 2 || config.linkAction === "newtab" ? "new" : "current") + "_tab_default"
                                });
                            }

                            if (e.which === 2) { // new tab -> middle click
                                ext.helper.utility.openUrl(data, "newTab", config.newTab === "background" && config.linkAction === "newtab"); // open always in background except a normal click opens them in new tab in the background
                            } else if (config.linkAction === "newtab") { // new tab -> normal click
                                ext.helper.utility.openUrl(data, "newTab", config.newTab === "foreground");
                            } else { // current tab
                                ext.helper.utility.openUrl(data, "default", true);
                            }
                        }
                    }
                }).on("mouseover", "a", (e) => { // add class to currently hovered element
                    let _self = $(e.currentTarget);

                    box.find("> ul a." + ext.opts.classes.sidebar.hover).removeClass(ext.opts.classes.sidebar.hover);
                    _self.addClass(ext.opts.classes.sidebar.hover).removeClass(ext.opts.classes.sidebar.mark);

                    ext.helper.tooltip.create(_self);
                }).on("contextmenu", "a", (e) => { // right click
                    e.preventDefault();
                    let type = "list";
                    if ($(e.target).hasClass(ext.opts.classes.sidebar.separator)) {
                        type = "separator";
                    }
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
            $(window).on("beforeunload", () => { // save scroll position before unloading page
                if (ext.elements.sidebar.hasClass(ext.opts.classes.sidebar.openedOnce)) { // sidebar was opened or is still open
                    ext.helper.scroll.updateAll();
                }
            });

            ext.elements.iframe.find("body").on("click", () => {
                ext.helper.contextmenu.close();
                ext.helper.tooltip.close();
            });

            chrome.extension.onMessage.addListener((message) => { // listen for refresh event
                if (message && message.action && message.action === "refresh") {
                    let delay = 0;
                    if (message.scrollTop) {
                        ext.helper.scroll.setScrollPos(ext.elements.bookmarkBox["all"], 0);
                        delay = 100;
                    }

                    $.delay(delay).then(ext.refresh);
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