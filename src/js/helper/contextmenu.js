($ => {
    "use strict";

    window.ContextmenuHelper = function (ext) {

        /**
         * Generates a contextmenu of the given type for the given element
         *
         * @param {string} type
         * @param {jsu} elm
         */
        this.create = (type, elm) => {
            if (alreadyExists(type, elm) === false) { // contextmenu is not already opened
                this.close(); // close other contextmenus
                elm.addClass(ext.opts.classes.sidebar.active);

                let contextmenu = $("<div />")
                    .addClass(ext.opts.classes.contextmenu.wrapper)
                    .html("<ul class='" + ext.opts.classes.contextmenu.list + "'></ul><ul class='" + ext.opts.classes.contextmenu.icons + "'></ul>")
                    .attr(ext.opts.attr.type, type)
                    .data("elm", elm)
                    .appendTo(ext.elements.sidebar);

                let elmId = elm.attr(ext.opts.attr.id);
                if (elmId) {
                    contextmenu.attr(ext.opts.attr.id, elmId);
                }

                switch (type) {
                    case "list": {
                        handleListMenu(contextmenu, elm);
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

                setTimeout(() => {
                    contextmenu.addClass(ext.opts.classes.contextmenu.visible);

                    let topVal = parseInt(contextmenu.css("top"));
                    let height = contextmenu.realHeight();
                    if (topVal + height >= window.innerHeight) { // no space to show contextmenu on bottom -> show on top instead
                        contextmenu.css("top", topVal - height).addClass(ext.opts.classes.contextmenu.top);
                    }
                }, 0);
            }
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

            let existingElm = "div." + ext.opts.classes.contextmenu.wrapper + "[" + ext.opts.attr.type + "='" + type + "']";
            if (elmId) {
                existingElm += "[" + ext.opts.attr.id + "='" + elmId + "']";
            }

            return ext.elements.sidebar.find(existingElm).length() > 0;
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

            setTimeout(() => {
                contextmenus.remove();
            }, 500);
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
                        [ext.opts.attr.name]: 'sort',
                        [ext.opts.attr.value]: value
                    }, "radio"))
                    .append("<a " + ext.opts.attr.name + "='sort'>" + langName + "</a>") // ext.lang("contextmenu_sort_" + langName)
                    .appendTo(list);

                if (value === currentSort.name) {
                    contextmenu.find("input[" + ext.opts.attr.name + "='sort'][" + ext.opts.attr.value + "='" + value + "']").parent("div." + ext.opts.classes.checkbox.box).trigger("click");
                }
            });

            let elmBoundClientRect = elm[0].getBoundingClientRect();
            contextmenu.css("top", (elmBoundClientRect.top + elmBoundClientRect.height) + "px");
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
                .append(ext.helper.checkbox.get(ext.elements.iframeBody, {[ext.opts.attr.name]: 'toggleFix'}))
                .append("<a " + ext.opts.attr.name + "='toggleFix'>" + ext.lang("contextmenu_toggle_fix") + "</a>")
                .appendTo(list);

            if (ext.elements.iframeBody.hasClass(ext.opts.classes.sidebar.entriesUnlocked) === false) {
                contextmenu.find("input[" + ext.opts.attr.name + "='toggleFix']").parent("div." + ext.opts.classes.checkbox.box).trigger("click");
            }

            $("<li />")
                .append(ext.helper.checkbox.get(ext.elements.iframeBody, {[ext.opts.attr.name]: 'toggleHidden'}))
                .append("<a " + ext.opts.attr.name + "='toggleHidden'>" + ext.lang("contextmenu_toggle_hidden") + "</a>")
                .appendTo(list);

            if (ext.elements.iframeBody.hasClass(ext.opts.classes.sidebar.showHidden) === true) {
                contextmenu.find("input[" + ext.opts.attr.name + "='toggleHidden']").parent("div." + ext.opts.classes.checkbox.box).trigger("click");
            }

            iconWrapper
                .append("<li><a " + ext.opts.attr.name + "='settings' title='" + ext.lang("contextmenu_settings") + "'></a></li>")
                .append("<li><a " + ext.opts.attr.name + "='bookmarkManager' title='" + ext.lang("contextmenu_bookmark_manager") + "'></a></li>");

            let elmBoundClientRect = elm[0].getBoundingClientRect();
            contextmenu.css("top", (elmBoundClientRect.top + elmBoundClientRect.height) + "px");
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

            contextmenu.css({
                top: (elm[0].getBoundingClientRect().top + elm.realHeight()) + "px",
                left: elm[0].offsetLeft + "px"
            });

            let i18nAppend = data.isDir ? "_dir" : "_bookmark";
            let list = contextmenu.children("ul." + ext.opts.classes.contextmenu.list);
            let iconWrapper = contextmenu.children("ul." + ext.opts.classes.contextmenu.icons);
            let isSearchList = ext.elements.bookmarkBox["search"].hasClass(ext.opts.classes.sidebar.active);

            if (data.isDir) {
                list.append("<li><a " + ext.opts.attr.name + "='openChildren'>" + ext.lang("contextmenu_open_children") + "</a></li>");
                if (data.children.length > 0) {
                    list.append("<li><a " + ext.opts.attr.name + "='updateUrls'>" + ext.lang("contextmenu_update_urls") + "</a></li>");
                }
            } else {
                if (isSearchList) {
                    list.append("<li><a " + ext.opts.attr.name + "='showInDir'>" + ext.lang("contextmenu_show_in_dir") + "</a></li>");
                }

                list.append("<li><a " + ext.opts.attr.name + "='newTab'>" + ext.lang("contextmenu_new_tab") + "</a></li>");

                if (chrome.extension.inIncognitoContext === false) {
                    list.append("<li><a " + ext.opts.attr.name + "='newTabIncognito'>" + ext.lang("contextmenu_new_tab_incognito") + "</a></li>");
                }
            }

            iconWrapper
                .append("<li><a " + ext.opts.attr.name + "='infos' title='" + ext.lang("contextmenu_infos") + "'></a></li>")
                .append("<li><a " + ext.opts.attr.name + "='edit' title='" + ext.lang("contextmenu_edit" + i18nAppend) + "'></a></li>")
                .append("<li><a " + ext.opts.attr.name + "='delete' title='" + ext.lang("contextmenu_delete" + i18nAppend) + "'></a></li>");

            if (data.isDir) {
                iconWrapper.append("<li><a " + ext.opts.attr.name + "='add' title='" + ext.lang("contextmenu_add") + "'></a></li>");
            }

            if (ext.helper.entry.isVisible(elmId)) {
                iconWrapper.append("<li class='" + ext.opts.classes.contextmenu.right + "'><a " + ext.opts.attr.name + "='hide' title='" + ext.lang("contextmenu_hide_from_sidebar") + "'></a></li>");
            } else if (!isSearchList && elm.parents("li." + ext.opts.classes.sidebar.hidden).length() <= 1) {
                iconWrapper.append("<li class='" + ext.opts.classes.contextmenu.right + "'><a " + ext.opts.attr.name + "='show' title='" + ext.lang("contextmenu_show_in_sidebar") + "'></a></li>");
            }
        };

        /**
         * Initializes the events for the sort checkboxes
         *
         * @param {jsu} contextmenu
         */
        let initSortEvents = (contextmenu) => {
            contextmenu.find("input[" + ext.opts.attr.name + "='sort']").on("change", (e) => { // toggle fixation of the entries
                if (e.currentTarget.checked) {
                    let sort = $(e.currentTarget).attr(ext.opts.attr.value);
                    ext.helper.list.updateSort(sort);
                    this.close();
                }
            });
        };

        /**
         * Initializes the events for the contextmenus
         *
         * @param {jsu} contextmenu
         */
        let initEvents = (contextmenu) => {
            initSortEvents(contextmenu);

            contextmenu.find("input[" + ext.opts.attr.name + "='toggleFix']").on("change", () => { // toggle fixation of the entries
                ext.elements.iframeBody.toggleClass(ext.opts.classes.sidebar.entriesUnlocked);
                ext.helper.model.setData({
                    "u/entriesLocked": ext.elements.iframeBody.hasClass(ext.opts.classes.sidebar.entriesUnlocked) === false
                });
                this.close();
            });

            contextmenu.find("input[" + ext.opts.attr.name + "='toggleHidden']").on("change", () => { // toggle visibility of hidden entries
                ext.elements.iframeBody.toggleClass(ext.opts.classes.sidebar.showHidden);
                ext.startLoading();
                ext.helper.model.setData({
                    "u/showHidden": ext.elements.iframeBody.hasClass(ext.opts.classes.sidebar.showHidden) === true
                });
                ext.helper.list.updateBookmarkBox();
                ext.endLoading();
                this.close();
            });

            contextmenu.find("a").on("click", (e) => {
                e.preventDefault();
                let name = $(e.currentTarget).attr(ext.opts.attr.name);
                let elmId = contextmenu.attr(ext.opts.attr.id);
                let data = elmId ? ext.helper.entry.getData(elmId) : null;

                switch (name) {
                    case "settings": { // open settings
                        ext.helper.model.call("openLink", {
                            href: chrome.extension.getURL("html/settings.html"),
                            newTab: true
                        });
                        break;
                    }
                    case "sort":
                    case "toggleFix":
                    case "toggleHidden": { // change the checkbox state
                        e.stopPropagation();
                        $(e.currentTarget).prev("div." + ext.opts.classes.checkbox.box).trigger("click");
                        break;
                    }
                    case "bookmarkManager": { // open bookmark manager
                        ext.helper.model.call("openLink", {
                            href: "chrome://bookmarks",
                            newTab: true,
                            active: true
                        });
                        break;
                    }
                    case "newTabIncognito": { // open bookmark in incognito window
                        ext.helper.sidebarEvents.openUrl(data, "incognito");
                        break;
                    }
                    case "newTab": { // open bookmark in new tab
                        ext.helper.sidebarEvents.openUrl(data, "newTab", ext.helper.model.getData("b/newTab") === "foreground");
                        break;
                    }
                    case "show": { // show the hidden bookmark or directory again
                        ext.startLoading();
                        let hiddenEntries = ext.helper.model.getData("u/hiddenEntries");
                        delete hiddenEntries[elmId];

                        ext.helper.model.setData({"u/hiddenEntries": hiddenEntries}, () => {
                            ext.helper.list.updateBookmarkBox();
                            ext.endLoading();
                        });
                        break;
                    }
                    case "openChildren": {
                        let bookmarks = data.children.filter(val => !!(val.url));
                        if (bookmarks.length > 10) {
                            ext.helper.overlay.create(name, $(e.currentTarget).attr("title") || $(e.currentTarget).text(), data);
                        } else {
                            bookmarks.forEach((bookmark) => {
                                ext.helper.sidebarEvents.openUrl(bookmark, "newTab", ext.helper.model.getData("b/newTab") === "foreground");
                            });
                        }
                        break;
                    }
                    case "showInDir": { // show search result in normal bookmark list
                        let data = ext.helper.entry.getData(elmId);
                        if (data && data.parents) {

                            let openParent = (i) => {
                                if (data.parents[i]) {
                                    let entry = ext.elements.bookmarkBox["all"].find("ul > li > a." + ext.opts.classes.sidebar.bookmarkDir + "[" + ext.opts.attr.id + "='" + data.parents[i] + "']");
                                    if (!entry.hasClass(ext.opts.classes.sidebar.dirOpened)) {
                                        ext.helper.list.toggleBookmarkDir(entry, true, () => {
                                            openParent(i + 1);
                                        });
                                    } else {
                                        openParent(i + 1);
                                    }
                                } else { // all parents opened -> close search and scroll to the bookmark
                                    ext.helper.search.clearSearch();
                                    let entry = ext.elements.bookmarkBox["all"].find("ul > li > a[" + ext.opts.attr.id + "='" + elmId + "']");
                                    ext.helper.scroll.setScrollPos(ext.elements.bookmarkBox["all"], entry[0].offsetTop - 50);
                                    entry.addClass(ext.opts.classes.sidebar.mark);
                                }
                            };

                            openParent(0);
                        }
                        break;
                    }
                    default: { // open overlay of the given type
                        ext.helper.overlay.create(name, $(e.currentTarget).attr("title") || $(e.currentTarget).text(), data);
                        break;
                    }
                }
            });
        };
    };

})(jsu);