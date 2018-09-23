($ => {
    "use strict";

    /**
     * @requires helper: model, i18n, entry, overlay, toggle, list, checkbox, tooltip, search, utility, bookmark, scroll
     * @param {object} ext
     * @constructor
     */
    $.ContextmenuHelper = function (ext) {

        const clickFuncs = {};

        /**
         * Generates a contextmenu of the given type for the given element
         *
         * @param {string} type
         * @param {jsu} elm
         */
        this.create = (type, elm) => {
            ext.helper.toggle.addSidebarHoverClass();
            ext.helper.tooltip.close();

            if (alreadyExists(type, elm)) { // contextmenu is already opened

                if (type === "menu" || type === "sort") { // close menu/sort menu when reclicking the icon
                    this.close();
                }
            } else {
                this.close(); // close other contextmenus
                elm.addClass($.cl.active);

                const contextmenu = $("<div />")
                    .addClass($.cl.contextmenu.wrapper)
                    .html("<ul class='" + $.cl.contextmenu.list + "'></ul><ul class='" + $.cl.contextmenu.icons + "'></ul>")
                    .attr($.attr.type, type)
                    .data("elm", elm)
                    .appendTo(ext.elm.sidebar);

                let trackingLabel = type;
                const elmId = elm.attr($.attr.id);
                if (elmId) {
                    contextmenu.attr($.attr.id, elmId);
                }

                switch (type) {
                    case "list": {
                        handleListMenu(contextmenu, elm);
                        const data = ext.helper.entry.getDataById(elmId);
                        trackingLabel = data && data.isDir ? "directory" : "bookmark";
                        break;
                    }
                    case "separator": {
                        handleSeparatorMenu(contextmenu, elm);
                        break;
                    }
                    case "menu": {
                        handleHeaderMenu(contextmenu, elm);
                        break;
                    }
                    case "sort": {
                        handleSortMenu(contextmenu, elm);
                        break;
                    }
                }

                initEvents(contextmenu);
                setPosition(contextmenu, elm, type);

                $.delay().then(() => {
                    contextmenu.addClass($.cl.visible);
                });
            }
        };

        /**
         * Closes all open contextmenus
         */
        this.close = () => {
            const contextmenus = ext.elm.iframeBody.find("div." + $.cl.contextmenu.wrapper);

            contextmenus.forEach((contextmenu) => {
                $(contextmenu).removeClass($.cl.visible);
                $(contextmenu).data("elm").removeClass($.cl.active);
            });

            $.delay(500).then(() => {
                contextmenus.remove();
                ext.helper.toggle.removeSidebarHoverClass();
            });
        };

        /**
         * Returns whether a contextmenu from the same type and if available with the same element id already exists
         *
         * @param {string} type
         * @param {jsu} elm
         * @return {boolean}
         */
        const alreadyExists = (type, elm) => {
            const elmId = elm.attr($.attr.id);
            const value = elm.attr($.attr.value);

            let existingElm = "div." + $.cl.contextmenu.wrapper + "[" + $.attr.type + "='" + type + "']";
            if (elmId) {
                existingElm += "[" + $.attr.id + "='" + elmId + "']";
            } else if (value) {
                existingElm += "[" + $.attr.value + "='" + value + "']";
            }

            return ext.elm.sidebar.find(existingElm).length() > 0;
        };

        /**
         * Extends the contextmenu with the available sort flags
         *
         * @param {jsu} contextmenu
         */
        const handleSortMenu = (contextmenu) => {
            const sortList = ext.helper.list.getSortList();
            const currentSort = ext.helper.list.getSort();
            const list = contextmenu.children("ul." + $.cl.contextmenu.list);
            contextmenu.children("ul." + $.cl.contextmenu.icons).remove();

            Object.keys(sortList).forEach((value) => {
                const langName = value.replace(/([A-Z])/g, "_$1").toLowerCase();
                $("<li />")
                    .append(ext.helper.checkbox.get(ext.elm.iframeBody, {
                        [$.attr.name]: "sort",
                        [$.attr.value]: value
                    }, "radio"))
                    .append("<a " + $.attr.name + "='sort'>" + ext.helper.i18n.get("sort_label_" + langName) + "</a>")
                    .appendTo(list);

                if (value === currentSort.name) {
                    contextmenu.find("input[" + $.attr.name + "='sort'][" + $.attr.value + "='" + value + "']").parent("div." + $.cl.checkbox.box).trigger("click");
                }
            });
        };

        /**
         * Extends the contextmenu with the links which are relevant for the header menu
         *
         * @param {jsu} contextmenu
         */
        const handleHeaderMenu = (contextmenu) => {
            const list = contextmenu.children("ul." + $.cl.contextmenu.list);
            const iconWrapper = contextmenu.children("ul." + $.cl.contextmenu.icons);

            $("<li />")
                .append(ext.helper.checkbox.get(ext.elm.iframeBody, {[$.attr.name]: "toggleHidden"}))
                .append("<a " + $.attr.name + "='toggleHidden'>" + ext.helper.i18n.get("contextmenu_toggle_hidden") + "</a>")
                .appendTo(list);

            if (ext.helper.model.getData("u/showHidden")) {
                contextmenu.find("input[" + $.attr.name + "='toggleHidden']").parent("div." + $.cl.checkbox.box).trigger("click");
            }

            $("<li />")
                .append("<a " + $.attr.name + "='reload'>" + ext.helper.i18n.get("contextmenu_reload_sidebar") + "</a>")
                .appendTo(list);

            const bookmarkList = ext.elm.bookmarkBox.all.children("ul");
            const hideRoot = bookmarkList.hasClass($.cl.sidebar.hideRoot);
            let hasOpenedDirectories = false;

            bookmarkList.find("a." + $.cl.sidebar.dirOpened).forEach((dir) => {
                if (hideRoot === false || $(dir).parents("li").length() > 1) {
                    hasOpenedDirectories = true;
                    return false;
                }
            });

            if (hasOpenedDirectories) { // show option to close all opened directories when at least one is opened
                $("<li />")
                    .append("<a " + $.attr.name + "='closeAll'>" + ext.helper.i18n.get("contextmenu_close_all_directories") + "</a>")
                    .appendTo(list);
            }

            iconWrapper
                .append("<li><a " + $.attr.name + "='settings' title='" + ext.helper.i18n.get("settings_title") + "'></a></li>")
                .append("<li><a " + $.attr.name + "='bookmarkManager' title='" + ext.helper.i18n.get("contextmenu_bookmark_manager") + "'></a></li>")
                .append("<li class='" + $.cl.contextmenu.right + "'><a " + $.attr.name + "='keyboardShortcuts' title='" + ext.helper.i18n.get("contextmenu_keyboard_shortcuts") + "'></a></li>");
        };

        /**
         * Extends the contextmenu with the links which are relevant for the separators
         *
         * @param {jsu} contextmenu
         * @param {jsu} elm
         */
        const handleSeparatorMenu = (contextmenu, elm) => {
            const elmId = elm.attr($.attr.id);
            const data = ext.helper.entry.getDataById(elmId);

            if (data && data.parents && data.parents.length > 0) {
                const list = contextmenu.children("ul." + $.cl.contextmenu.list);

                if (data.parents.length > 0) { // root level can not be edited or deleted
                    list.append("<li><a " + $.attr.name + "='delete'>" + ext.helper.i18n.get("contextmenu_delete_separator") + "</a></li>");
                }
            }

            contextmenu.children("ul." + $.cl.contextmenu.icons).remove();
        };

        /**
         * Extends the contextmenu with the links which are relevant for the bookmark list
         *
         * @param {jsu} contextmenu
         * @param {jsu} elm
         */
        const handleListMenu = (contextmenu, elm) => {
            const elmId = elm.attr($.attr.id);
            const data = ext.helper.entry.getDataById(elmId);

            if (data) {
                const i18nAppend = data.isDir ? "_dir" : "_bookmark";
                const list = contextmenu.children("ul." + $.cl.contextmenu.list);
                const iconWrapper = contextmenu.children("ul." + $.cl.contextmenu.icons);

                if (ext.helper.search.isResultsVisible()) {
                    list.append("<li><a " + $.attr.name + "='showInDir'>" + ext.helper.i18n.get("contextmenu_show_in_dir") + "</a></li>");
                }

                if (data.isDir) {
                    const bookmarks = data.children.filter(val => val.url && val.url !== "about:blank");

                    if (bookmarks.length > 0) {
                        list.append("<li><a " + $.attr.name + "='openChildren'>" + ext.helper.i18n.get("contextmenu_open_children") + " <span>(" + bookmarks.length + ")</span></a></li>");
                    }

                    if (data.children.length > 0) {
                        list.append("<li><a " + $.attr.name + "='checkBookmarks'>" + ext.helper.i18n.get("contextmenu_check_bookmarks") + "</a></li>");
                    }
                } else {
                    list.append("<li><a " + $.attr.name + "='newTab'>" + ext.helper.i18n.get("contextmenu_new_tab") + "</a></li>");
                    list.append("<li><a " + $.attr.name + "='newWindow'>" + ext.helper.i18n.get("contextmenu_new_window") + "</a></li>");

                    if (chrome.extension.inIncognitoContext === false) {
                        list.append("<li><a " + $.attr.name + "='newIncognito'>" + ext.helper.i18n.get("contextmenu_new_tab_incognito") + "</a></li>");
                    }
                }

                iconWrapper.append("<li><a " + $.attr.name + "='infos' title='" + ext.helper.i18n.get("contextmenu_infos") + "'></a></li>");

                if (data.parents.length > 0) { // root level can not be edited or deleted
                    iconWrapper
                        .append("<li><a " + $.attr.name + "='edit' title='" + ext.helper.i18n.get("contextmenu_edit" + i18nAppend) + "'></a></li>")
                        .append("<li><a " + $.attr.name + "='delete' title='" + ext.helper.i18n.get("contextmenu_delete" + i18nAppend) + "'></a></li>");
                }


                if (data.isDir) {
                    iconWrapper.append("<li><a " + $.attr.name + "='add' title='" + ext.helper.i18n.get("contextmenu_add") + "'></a></li>");
                } else if (data.pinned) {
                    iconWrapper.append("<li><a " + $.attr.name + "='unpin' title='" + ext.helper.i18n.get("contextmenu_unpin") + "'></a></li>");
                } else {
                    iconWrapper.append("<li><a " + $.attr.name + "='pin' title='" + ext.helper.i18n.get("contextmenu_pin") + "'></a></li>");
                }

                if (ext.helper.entry.isVisible(elmId)) {
                    iconWrapper.append("<li class='" + $.cl.contextmenu.right + "'><a " + $.attr.name + "='hide' title='" + ext.helper.i18n.get("contextmenu_hide_from_sidebar") + "'></a></li>");
                } else if (ext.helper.search.isResultsVisible() === false && elm.parents("li." + $.cl.hidden).length() <= 1) {
                    iconWrapper.append("<li class='" + $.cl.contextmenu.right + "'><a " + $.attr.name + "='showHidden' title='" + ext.helper.i18n.get("contextmenu_show_in_sidebar") + "'></a></li>");
                }
            }
        };

        /**
         * Sets the correct position for the contextmenu based on the type
         *
         * @param {jsu} contextmenu
         * @param {jsu} elm
         * @param {string} type
         */
        const setPosition = (contextmenu, elm, type) => {
            const dim = {w: contextmenu.realWidth(), h: contextmenu.realHeight()};
            const elmBoundClientRect = elm[0].getBoundingClientRect();
            const top = elmBoundClientRect.top + elmBoundClientRect.height;

            if (top + dim.h >= window.innerHeight) { // no space to show contextmenu on bottom -> show on top instead
                contextmenu.css("top", top - dim.h).addClass($.cl.contextmenu.top);
            } else {
                contextmenu.css("top", top + "px");
            }

            if (type !== "sort" && type !== "menu") {
                let left = elm.parent("li")[0].offsetLeft;

                if (ext.helper.i18n.isRtl()) {
                    left = elmBoundClientRect.width - dim.w;
                }

                contextmenu.css("left", left + "px");
            }
        };

        /**
         * Show the extension settings
         */
        clickFuncs.settings = () => {
            ext.helper.model.call("openLink", {
                href: chrome.extension.getURL("html/settings.html"),
                newTab: true
            });
        };

        /**
         * Triggers a click event on the checkbox
         *
         * @param {object} opts
         */
        clickFuncs.checkbox = (opts) => {
            opts.eventObj.stopPropagation();
            $(opts.elm).prev("div." + $.cl.checkbox.box).trigger("click");
        };

        /**
         * Opens the default bookmark manager
         */
        clickFuncs.bookmarkManager = () => {
            ext.helper.model.call("openLink", {
                href: "chrome://bookmarks",
                newTab: true,
                active: true
            });
        };

        /**
         * Opens the bookmark in a new incognito window
         *
         * @param {object} opts
         */
        clickFuncs.newIncognito = (opts) => {
            if (opts.data) {
                ext.helper.utility.openUrl(opts.data, "incognito");
            }
        };

        /**
         * Opens the bookmark in a new window
         *
         * @param {object} opts
         */
        clickFuncs.newWindow = (opts) => {
            if (opts.data) {
                ext.helper.utility.openUrl(opts.data, "newWindow");
                ext.helper.toggle.closeSidebar();
            }
        };

        /**
         * Opens the bookmark in a new tab
         *
         * @param {object} opts
         */
        clickFuncs.newTab = (opts) => {
            if (opts.data) {
                const inForeground = ext.helper.model.getData("b/newTab") === "foreground";
                opts.data.reopenSidebar = ext.helper.model.getData("b/reopenSidebar");
                ext.helper.utility.openUrl(opts.data, "newTab", inForeground);

                if (inForeground) {
                    ext.helper.toggle.closeSidebar();
                }
            }
        };

        /**
         * Deletes the given entry
         *
         * @param {object} opts
         */
        clickFuncs["delete"] = (opts) => {
            ext.helper.bookmark.removeEntry(opts.data.id);
        };

        /**
         * Shows the hidden entries
         *
         * @param {object} opts
         */
        clickFuncs.showHidden = (opts) => {
            ext.startLoading();
            const hiddenEntries = ext.helper.model.getData("u/hiddenEntries");
            delete hiddenEntries[opts.id];

            ext.helper.model.setData({"u/hiddenEntries": hiddenEntries}).then(() => {
                return Promise.all([
                    ext.helper.model.call("removeCache", {name: "htmlList"}),
                    ext.helper.model.call("removeCache", {name: "htmlPinnedEntries"})
                ]);
            }).then(() => {
                ext.helper.model.call("reload", {type: "Hide"});
            });
        };

        /**
         * Opens all children of the given directory
         *
         * @param {object} opts
         */
        clickFuncs.openChildren = (opts) => {
            if (opts.data) {
                const bookmarks = opts.data.children.filter(val => val.url && val.url !== "about:blank");
                if (bookmarks.length > ext.helper.model.getData("b/openChildrenWarnLimit")) { // more than x bookmarks -> show confirm dialog
                    ext.helper.overlay.create(opts.name, ext.helper.i18n.get("contextmenu_open_children"), opts.data);
                } else { // open bookmarks directly without confirmation
                    ext.helper.utility.openAllBookmarks(bookmarks);
                }
            }
        };

        /**
         * Pins the given entry to the top
         *
         * @param {object} opts
         */
        clickFuncs.pin = (opts) => {
            ext.helper.bookmark.pinEntry(opts.data).then(() => {
                ext.helper.model.call("reload", {type: "Pin"});
            });
        };

        /**
         * Unpins the given entry from the top
         *
         * @param {object} opts
         */
        clickFuncs.unpin = (opts) => {
            ext.helper.bookmark.unpinEntry(opts.data).then(() => {
                ext.helper.model.call("reload", {type: "Unpin"});
            });
        };

        /**
         * Shows search result in normal bookmark list
         *
         * @param {object} opts
         */
        clickFuncs.showInDir = (opts) => {
            const data = ext.helper.entry.getDataById(opts.id);
            if (data && data.parents) {
                const openParent = (i) => {
                    if (data.parents[i]) {
                        const entry = ext.elm.bookmarkBox.all.find("ul > li > a." + $.cl.sidebar.bookmarkDir + "[" + $.attr.id + "='" + data.parents[i] + "']");
                        if (!entry.hasClass($.cl.sidebar.dirOpened)) {
                            ext.helper.list.toggleBookmarkDir(entry, true, false).then(() => {
                                openParent(i + 1);
                            });
                        } else {
                            openParent(i + 1);
                        }
                    } else { // all parents opened -> close search and scroll to the bookmark
                        Promise.all([
                            ext.helper.list.cacheList(),
                            ext.helper.search.clearSearch()
                        ]).then(() => {
                            const entry = ext.elm.bookmarkBox.all.find("ul > li > a[" + $.attr.id + "='" + opts.id + "']");
                            ext.helper.scroll.setScrollPos(ext.elm.bookmarkBox.all, entry[0].offsetTop - 50);
                            entry.addClass($.cl.sidebar.mark);
                        });
                    }
                };

                openParent(0);
            }
        };

        /**
         * Forces the sidebar to reload
         */
        clickFuncs.reload = () => {
            ext.helper.model.call("reload", {type: "Force"});
        };

        /**
         * Closes all opened directories
         */
        clickFuncs.closeAll = () => {
            const list = ext.elm.bookmarkBox.all.children("ul");
            const hideRoot = list.hasClass($.cl.sidebar.hideRoot);
            const promises = [];

            list.find("a." + $.cl.sidebar.dirOpened).forEach((dir) => {
                if (hideRoot === false || $(dir).parents("li").length() > 1) {
                    promises.push(ext.helper.list.toggleBookmarkDir($(dir), false, false));
                }
            });

            Promise.all(promises).then(() => {
                ext.helper.list.cacheList();
            });
        };

        /**
         * Initializes the events for the contextmenus
         *
         * @param {jsu} contextmenu
         */
        const initEvents = (contextmenu) => {
            contextmenu.find("input[" + $.attr.name + "='sort']").on("change", (e) => { // toggle fixation of the entries
                if (e.currentTarget.checked) {
                    const sort = $(e.currentTarget).attr($.attr.value);
                    ext.helper.list.updateSort(sort);
                    this.close();
                }
            });

            contextmenu.find("input[" + $.attr.name + "='toggleHidden']").on("change", (e) => { // toggle visibility of hidden entries
                ext.startLoading();

                Promise.all([
                    ext.helper.model.call("removeCache", {name: "htmlList"}),
                    ext.helper.model.call("removeCache", {name: "htmlPinnedEntries"}),
                    ext.helper.model.setData({
                        "u/showHidden": ext.helper.checkbox.isChecked($(e.currentTarget).parent("div"))
                    })
                ]).then(() => {
                    ext.helper.model.call("reload", {type: "ToggleHidden"});
                });
                this.close();
            });

            contextmenu.on("mouseleave", (e) => {
                $(e.currentTarget).find("a").removeClass($.cl.hover);
            });

            contextmenu.find("a").on("mouseenter", (e) => {
                contextmenu.find("a").removeClass($.cl.hover);
                $(e.currentTarget).addClass($.cl.hover);
            }).on("mouseleave", (e) => {
                $(e.currentTarget).removeClass($.cl.hover);
            }).on("click", (e) => {
                e.preventDefault();

                const opts = {
                    elm: e.currentTarget,
                    eventObj: e,
                    name: $(e.currentTarget).attr($.attr.name),
                    id: contextmenu.attr($.attr.id)
                };

                opts.data = opts.id ? ext.helper.entry.getDataById(opts.id) : null;

                if (opts.name === "sort" || opts.name === "toggleHidden") {
                    opts.name = "checkbox";
                }

                if (typeof clickFuncs[opts.name] === "function") {
                    clickFuncs[opts.name](opts);
                } else {
                    ext.helper.overlay.create(opts.name, $(opts.elm).attr("title") || $(opts.elm).text(), opts.data);
                }
            });
        };
    };

})(jsu);