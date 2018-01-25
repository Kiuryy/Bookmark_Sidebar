($ => {
    "use strict";

    window.ContextmenuHelper = function (ext) {

        let clickFuncs = {};

        /**
         * Generates a contextmenu of the given type for the given element
         *
         * @param {string} type
         * @param {jsu} elm
         */
        this.create = (type, elm) => {
            ext.helper.toggle.addSidebarHoverClass();
            ext.helper.tooltip.close();

            if (alreadyExists(type, elm) === false) { // contextmenu is not already opened
                this.close(); // close other contextmenus
                elm.addClass(ext.opts.classes.sidebar.active);

                let contextmenu = $("<div />")
                    .addClass(ext.opts.classes.contextmenu.wrapper)
                    .html("<ul class='" + ext.opts.classes.contextmenu.list + "'></ul><ul class='" + ext.opts.classes.contextmenu.icons + "'></ul>")
                    .attr(ext.opts.attr.type, type)
                    .data("elm", elm)
                    .appendTo(ext.elements.sidebar);

                let trackingLabel = type;
                let elmId = elm.attr(ext.opts.attr.id);
                if (elmId) {
                    contextmenu.attr(ext.opts.attr.id, elmId);
                }

                switch (type) {
                    case "list": {
                        handleListMenu(contextmenu, elm);
                        let data = ext.helper.entry.getData(elmId);
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

                ext.helper.model.call("trackEvent", {category: "contextmenu", action: "open", label: trackingLabel});
                initEvents(contextmenu);
                setPosition(contextmenu, elm, type);

                $.delay().then(() => {
                    contextmenu.addClass(ext.opts.classes.contextmenu.visible);
                });
            }
        };

        /**
         * Closes all open contextmenus
         */
        this.close = () => {
            let contextmenus = ext.elements.iframeBody.find("div." + ext.opts.classes.contextmenu.wrapper);

            contextmenus.forEach((contextmenu) => {
                $(contextmenu).removeClass(ext.opts.classes.contextmenu.visible);
                $(contextmenu).data("elm").removeClass(ext.opts.classes.sidebar.active);
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
        let alreadyExists = (type, elm) => {
            let elmId = elm.attr(ext.opts.attr.id);
            let value = elm.attr(ext.opts.attr.value);

            let existingElm = "div." + ext.opts.classes.contextmenu.wrapper + "[" + ext.opts.attr.type + "='" + type + "']";
            if (elmId) {
                existingElm += "[" + ext.opts.attr.id + "='" + elmId + "']";
            } else if (value) {
                existingElm += "[" + ext.opts.attr.value + "='" + value + "']";
            }

            return ext.elements.sidebar.find(existingElm).length() > 0;
        };

        /**
         * Extends the contextmenu with the available sort flags
         *
         * @param {jsu} contextmenu
         * @param {jsu} elm
         */
        let handleSortMenu = (contextmenu, elm) => {
            let sortList = ext.helper.list.getSortList();
            let currentSort = ext.helper.list.getSort();
            let list = contextmenu.children("ul." + ext.opts.classes.contextmenu.list);
            contextmenu.children("ul." + ext.opts.classes.contextmenu.icons).remove();

            Object.keys(sortList).forEach((value) => {
                let langName = value.replace(/([A-Z])/g, "_$1").toLowerCase();
                $("<li />")
                    .append(ext.helper.checkbox.get(ext.elements.iframeBody, {
                        [ext.opts.attr.name]: "sort",
                        [ext.opts.attr.value]: value
                    }, "radio"))
                    .append("<a " + ext.opts.attr.name + "='sort'>" + ext.helper.i18n.get("sort_label_" + langName) + "</a>")
                    .appendTo(list);

                if (value === currentSort.name) {
                    contextmenu.find("input[" + ext.opts.attr.name + "='sort'][" + ext.opts.attr.value + "='" + value + "']").parent("div." + ext.opts.classes.checkbox.box).trigger("click");
                }
            });
        };

        /**
         * Extends the contextmenu with the links which are relevant for the header menu
         *
         * @param {jsu} contextmenu
         * @param {jsu} elm
         */
        let handleHeaderMenu = (contextmenu, elm) => {
            let list = contextmenu.children("ul." + ext.opts.classes.contextmenu.list);
            let iconWrapper = contextmenu.children("ul." + ext.opts.classes.contextmenu.icons);

            $("<li />")
                .append(ext.helper.checkbox.get(ext.elements.iframeBody, {[ext.opts.attr.name]: "toggleHidden"}))
                .append("<a " + ext.opts.attr.name + "='toggleHidden'>" + ext.helper.i18n.get("contextmenu_toggle_hidden") + "</a>")
                .appendTo(list);

            if (ext.helper.model.getData("u/showHidden")) {
                contextmenu.find("input[" + ext.opts.attr.name + "='toggleHidden']").parent("div." + ext.opts.classes.checkbox.box).trigger("click");
            }

            $("<li />")
                .append("<a " + ext.opts.attr.name + "='reload'>" + ext.helper.i18n.get("contextmenu_reload_sidebar") + "</a>")
                .appendTo(list);

            let bookmarkList = ext.elements.bookmarkBox.all.children("ul");
            let hideRoot = bookmarkList.hasClass(ext.opts.classes.sidebar.hideRoot);
            let hasOpenedDirectories = false;

            bookmarkList.find("a." + ext.opts.classes.sidebar.dirOpened).forEach((dir) => {
                if (hideRoot === false || $(dir).parents("li").length() > 1) {
                    hasOpenedDirectories = true;
                    return false;
                }
            });

            if (hasOpenedDirectories) { // show option to close all opened directories when at least one is opened
                $("<li />")
                    .append("<a " + ext.opts.attr.name + "='closeAll'>" + ext.helper.i18n.get("contextmenu_close_all_directories") + "</a>")
                    .appendTo(list);
            }

            iconWrapper
                .append("<li><a " + ext.opts.attr.name + "='settings' title='" + ext.helper.i18n.get("settings_title") + "'></a></li>")
                .append("<li><a " + ext.opts.attr.name + "='bookmarkManager' title='" + ext.helper.i18n.get("contextmenu_bookmark_manager") + "'></a></li>")
                .append("<li class='" + ext.opts.classes.contextmenu.right + "'><a " + ext.opts.attr.name + "='keyboardShortcuts' title='" + ext.helper.i18n.get("contextmenu_keyboard_shortcuts") + "'></a></li>");
        };

        /**
         * Extends the contextmenu with the links which are relevant for the separators
         *
         * @param {jsu} contextmenu
         * @param {jsu} elm
         */
        let handleSeparatorMenu = (contextmenu, elm) => {
            let elmId = elm.attr(ext.opts.attr.id);
            let data = ext.helper.entry.getData(elmId);

            if (data && data.parents && data.parents.length > 0) {
                let list = contextmenu.children("ul." + ext.opts.classes.contextmenu.list);

                if (data.parents.length > 0) { // root level can not be edited or deleted
                    list.append("<li><a " + ext.opts.attr.name + "='delete'>" + ext.helper.i18n.get("contextmenu_delete_separator") + "</a></li>");
                }
            }

            contextmenu.children("ul." + ext.opts.classes.contextmenu.icons).remove();
        };

        /**
         * Extends the contextmenu with the links which are relevant for the bookmark list
         *
         * @param {jsu} contextmenu
         * @param {jsu} elm
         */
        let handleListMenu = (contextmenu, elm) => {
            let elmId = elm.attr(ext.opts.attr.id);
            let data = ext.helper.entry.getData(elmId);

            if (data) {
                let i18nAppend = data.isDir ? "_dir" : "_bookmark";
                let list = contextmenu.children("ul." + ext.opts.classes.contextmenu.list);
                let iconWrapper = contextmenu.children("ul." + ext.opts.classes.contextmenu.icons);
                let isSearchList = ext.elements.bookmarkBox.search.hasClass(ext.opts.classes.sidebar.active);

                if (data.isDir) {
                    let bookmarks = data.children.filter(val => val.url && val.url !== "about:blank");

                    if (bookmarks.length > 0) {
                        list.append("<li><a " + ext.opts.attr.name + "='openChildren'>" + ext.helper.i18n.get("contextmenu_open_children") + " <span>(" + bookmarks.length + ")</span></a></li>");
                    }

                    if (data.children.length > 0) {
                        list.append("<li><a " + ext.opts.attr.name + "='updateUrls'>" + ext.helper.i18n.get("contextmenu_update_urls") + "</a></li>");
                    }
                } else {
                    if (isSearchList) {
                        list.append("<li><a " + ext.opts.attr.name + "='showInDir'>" + ext.helper.i18n.get("contextmenu_show_in_dir") + "</a></li>");
                    }

                    list.append("<li><a " + ext.opts.attr.name + "='newTab'>" + ext.helper.i18n.get("contextmenu_new_tab") + "</a></li>");
                    list.append("<li><a " + ext.opts.attr.name + "='newWindow'>" + ext.helper.i18n.get("contextmenu_new_window") + "</a></li>");

                    if (chrome.extension.inIncognitoContext === false) {
                        list.append("<li><a " + ext.opts.attr.name + "='newIncognito'>" + ext.helper.i18n.get("contextmenu_new_tab_incognito") + "</a></li>");
                    }
                }

                iconWrapper.append("<li><a " + ext.opts.attr.name + "='infos' title='" + ext.helper.i18n.get("contextmenu_infos") + "'></a></li>");

                if (data.parents.length > 0) { // root level can not be edited or deleted
                    iconWrapper
                        .append("<li><a " + ext.opts.attr.name + "='edit' title='" + ext.helper.i18n.get("contextmenu_edit" + i18nAppend) + "'></a></li>")
                        .append("<li><a " + ext.opts.attr.name + "='delete' title='" + ext.helper.i18n.get("contextmenu_delete" + i18nAppend) + "'></a></li>");
                }


                if (data.isDir) {
                    iconWrapper.append("<li><a " + ext.opts.attr.name + "='add' title='" + ext.helper.i18n.get("contextmenu_add") + "'></a></li>");
                } else if (data.pinned) {
                    iconWrapper.append("<li><a " + ext.opts.attr.name + "='unpin' title='" + ext.helper.i18n.get("contextmenu_unpin") + "'></a></li>");
                } else {
                    iconWrapper.append("<li><a " + ext.opts.attr.name + "='pin' title='" + ext.helper.i18n.get("contextmenu_pin") + "'></a></li>");
                }

                if (ext.helper.entry.isVisible(elmId)) {
                    iconWrapper.append("<li class='" + ext.opts.classes.contextmenu.right + "'><a " + ext.opts.attr.name + "='hide' title='" + ext.helper.i18n.get("contextmenu_hide_from_sidebar") + "'></a></li>");
                } else if (!isSearchList && elm.parents("li." + ext.opts.classes.sidebar.hidden).length() <= 1) {
                    iconWrapper.append("<li class='" + ext.opts.classes.contextmenu.right + "'><a " + ext.opts.attr.name + "='showHidden' title='" + ext.helper.i18n.get("contextmenu_show_in_sidebar") + "'></a></li>");
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
        let setPosition = (contextmenu, elm, type) => {
            let dim = {w: contextmenu.realWidth(), h: contextmenu.realHeight()};
            let elmBoundClientRect = elm[0].getBoundingClientRect();
            let top = elmBoundClientRect.top + elmBoundClientRect.height;

            if (top + dim.h >= window.innerHeight) { // no space to show contextmenu on bottom -> show on top instead
                contextmenu.css("top", top - dim.h).addClass(ext.opts.classes.contextmenu.top);
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
         *
         * @param {object} opts
         */
        clickFuncs.settings = (opts) => {
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
            $(opts.elm).prev("div." + ext.opts.classes.checkbox.box).trigger("click");
        };

        /**
         *
         * @param {object} opts
         */
        clickFuncs.bookmarkManager = (opts) => {
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
            ext.helper.model.call("trackEvent", {
                category: "url",
                action: "open",
                label: "new_window_incognito"
            });
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
            ext.helper.model.call("trackEvent", {
                category: "url",
                action: "open",
                label: "new_window"
            });
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
            ext.helper.model.call("trackEvent", {
                category: "url",
                action: "open",
                label: "new_tab_contextmenu"
            });
            if (opts.data) {
                let inForeground = ext.helper.model.getData("b/newTab") === "foreground";
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
            let hiddenEntries = ext.helper.model.getData("u/hiddenEntries");
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
                let bookmarks = opts.data.children.filter(val => val.url && val.url !== "about:blank");
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
            let data = ext.helper.entry.getData(opts.id);
            if (data && data.parents) {
                let openParent = (i) => {
                    if (data.parents[i]) {
                        let entry = ext.elements.bookmarkBox.all.find("ul > li > a." + ext.opts.classes.sidebar.bookmarkDir + "[" + ext.opts.attr.id + "='" + data.parents[i] + "']");
                        if (!entry.hasClass(ext.opts.classes.sidebar.dirOpened)) {
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
                            let entry = ext.elements.bookmarkBox.all.find("ul > li > a[" + ext.opts.attr.id + "='" + opts.id + "']");
                            ext.helper.scroll.setScrollPos(ext.elements.bookmarkBox.all, entry[0].offsetTop - 50);
                            entry.addClass(ext.opts.classes.sidebar.mark);
                        });
                    }
                };

                openParent(0);
            }
        };

        /**
         * Forces the sidebar to reload
         *
         * @param {object} opts
         */
        clickFuncs.reload = (opts) => {
            ext.helper.model.call("reload", {type: "Force"});
        };

        /**
         * Closes all opened directories
         *
         * @param {object} opts
         */
        clickFuncs.closeAll = (opts) => {
            let list = ext.elements.bookmarkBox.all.children("ul");
            let hideRoot = list.hasClass(ext.opts.classes.sidebar.hideRoot);
            let promises = [];

            list.find("a." + ext.opts.classes.sidebar.dirOpened).forEach((dir) => {
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
        let initEvents = (contextmenu) => {
            contextmenu.find("input[" + ext.opts.attr.name + "='sort']").on("change", (e) => { // toggle fixation of the entries
                if (e.currentTarget.checked) {
                    let sort = $(e.currentTarget).attr(ext.opts.attr.value);
                    ext.helper.list.updateSort(sort);
                    this.close();
                }
            });

            contextmenu.find("input[" + ext.opts.attr.name + "='toggleHidden']").on("change", (e) => { // toggle visibility of hidden entries
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
                $(e.currentTarget).find("a").removeClass(ext.opts.classes.sidebar.hover);
            });

            contextmenu.find("a").on("mouseenter", (e) => {
                contextmenu.find("a").removeClass(ext.opts.classes.sidebar.hover);
                $(e.currentTarget).addClass(ext.opts.classes.sidebar.hover);
            }).on("mouseleave", (e) => {
                $(e.currentTarget).removeClass(ext.opts.classes.sidebar.hover);
            }).on("click", (e) => {
                e.preventDefault();

                let opts = {
                    elm: e.currentTarget,
                    eventObj: e,
                    name: $(e.currentTarget).attr(ext.opts.attr.name),
                    id: contextmenu.attr(ext.opts.attr.id)
                };

                opts.data = opts.id ? ext.helper.entry.getData(opts.id) : null;

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