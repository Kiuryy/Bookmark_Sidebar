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
            elm.addClass(ext.opts.classes.sidebar.active);

            let contextmenu = $("<div />")
                .addClass(ext.opts.classes.contextmenu.wrapper)
                .html("<ul class='" + ext.opts.classes.contextmenu.list + "'></ul><ul class='" + ext.opts.classes.contextmenu.icons + "'></ul>")
                .attr(ext.opts.attr.type, type)
                .data("elm", elm)
                .appendTo(ext.elements.sidebar);

            switch (type) {
                case "list": {
                    handleListMenu(contextmenu, elm);
                    break;
                }
                case "settings": {
                    handleSettingsMenu(contextmenu, elm);
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
         * Extends the contextmenu with the links which are relevant for the settings
         *
         * @param {jsu} contextmenu
         * @param {jsu} elm
         */
        let handleSettingsMenu = (contextmenu, elm) => {
            let list = contextmenu.children("ul." + ext.opts.classes.contextmenu.list);
            let iconWrapper = contextmenu.children("ul." + ext.opts.classes.contextmenu.icons);

            $("<li />")
                .append(ext.helper.checkbox.get(ext.elements.iframeBody, {[ext.opts.attr.type]: 'toggleFix'}))
                .append("<a " + ext.opts.attr.type + "='toggleFix'>" + ext.lang("contextmenu_toggle_fix") + "</a>")
                .appendTo(list);

            if (ext.elements.iframeBody.hasClass(ext.opts.classes.sidebar.entriesUnlocked) === false) {
                contextmenu.find("input[" + ext.opts.attr.type + "='toggleFix']").parent("div." + ext.opts.classes.checkbox.box).trigger("click");
            }

            $("<li />")
                .append(ext.helper.checkbox.get(ext.elements.iframeBody, {[ext.opts.attr.type]: 'toggleHidden'}))
                .append("<a " + ext.opts.attr.type + "='toggleHidden'>" + ext.lang("contextmenu_toggle_hidden") + "</a>")
                .appendTo(list);

            if (ext.elements.iframeBody.hasClass(ext.opts.classes.sidebar.showHidden) === true) {
                contextmenu.find("input[" + ext.opts.attr.type + "='toggleHidden']").parent("div." + ext.opts.classes.checkbox.box).trigger("click");
            }

            iconWrapper
                .append("<li><a " + ext.opts.attr.type + "='settings' title='" + ext.lang("contextmenu_settings") + "'></a></li>")
                .append("<li><a " + ext.opts.attr.type + "='bookmarkManager' title='" + ext.lang("contextmenu_bookmark_manager") + "'></a></li>");
            //.append("<li><a " + ext.opts.attr.type + "='updateUrls' title='" + ext.lang("contextmenu_update_urls") + "'></a></li>");

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
            let infos = elm.data("infos");

            contextmenu.css({
                top: (elm[0].getBoundingClientRect().top + elm.realHeight()) + "px",
                left: elm[0].offsetLeft + "px"
            });

            let i18nAppend = !!(infos.children) ? "_dir" : "_bookmark";
            let list = contextmenu.children("ul." + ext.opts.classes.contextmenu.list);
            let iconWrapper = contextmenu.children("ul." + ext.opts.classes.contextmenu.icons);
            let isSearchList = ext.elements.bookmarkBox["search"].hasClass(ext.opts.classes.sidebar.active);

            if (infos.children) {
                list.append("<li><a " + ext.opts.attr.type + "='openChildren'>" + ext.lang("contextmenu_open_children") + "</a></li>");
                if (infos.children.length > 0) {
                    list.append("<li><a " + ext.opts.attr.type + "='updateUrls'>" + ext.lang("contextmenu_update_urls") + "</a></li>");
                }
            } else {
                if (isSearchList) {
                    list.append("<li><a " + ext.opts.attr.type + "='showInDir'>" + ext.lang("contextmenu_show_in_dir") + "</a></li>");
                }

                list.append("<li><a " + ext.opts.attr.type + "='newTab'>" + ext.lang("contextmenu_new_tab") + "</a></li>");

                if (chrome.extension.inIncognitoContext === false) {
                    list.append("<li><a " + ext.opts.attr.type + "='newTabIncognito'>" + ext.lang("contextmenu_new_tab_incognito") + "</a></li>");
                }
            }

            iconWrapper
                .append("<li><a " + ext.opts.attr.type + "='infos' title='" + ext.lang("contextmenu_infos") + "'></a></li>")
                .append("<li><a " + ext.opts.attr.type + "='edit' title='" + ext.lang("contextmenu_edit" + i18nAppend) + "'></a></li>")
                .append("<li><a " + ext.opts.attr.type + "='delete' title='" + ext.lang("contextmenu_delete" + i18nAppend) + "'></a></li>");

            if (ext.isEntryVisible(infos.id)) {
                iconWrapper.append("<li class='" + ext.opts.classes.contextmenu.right + "'><a " + ext.opts.attr.type + "='hide' title='" + ext.lang("contextmenu_hide_from_sidebar") + "'></a></li>");
            } else if (!isSearchList && elm.parents("li." + ext.opts.classes.sidebar.hidden).length() <= 1) {
                iconWrapper.append("<li class='" + ext.opts.classes.contextmenu.right + "'><a " + ext.opts.attr.type + "='show' title='" + ext.lang("contextmenu_show_in_sidebar") + "'></a></li>");
            }
        };

        /**
         * Initializes the events for the contextmenus
         */
        let initEvents = (contextmenu) => {
            contextmenu.find("input[" + ext.opts.attr.type + "='toggleFix']").on("change", () => { // toggle fixation of the entries
                ext.elements.iframeBody.toggleClass(ext.opts.classes.sidebar.entriesUnlocked);
                ext.helper.model.setData({
                    "u/entriesLocked": ext.elements.iframeBody.hasClass(ext.opts.classes.sidebar.entriesUnlocked) === false
                });
                this.close();
            });

            contextmenu.find("input[" + ext.opts.attr.type + "='toggleHidden']").on("change", () => { // toggle visibility of hidden entries
                ext.elements.iframeBody.toggleClass(ext.opts.classes.sidebar.showHidden);
                ext.startLoading();
                ext.helper.model.setData({
                    "u/showHidden": ext.elements.iframeBody.hasClass(ext.opts.classes.sidebar.showHidden) === true
                });
                ext.updateBookmarkBox();
                ext.endLoading();
                this.close();
            });

            contextmenu.find("a").on("click", (e) => {
                e.preventDefault();
                let type = $(e.currentTarget).attr(ext.opts.attr.type);
                let infos = contextmenu.data("elm").data("infos") || {};

                switch (type) {
                    case "settings": { // open settings
                        ext.helper.model.call("openLink", {
                            href: chrome.extension.getURL("html/settings.html"),
                            newTab: true
                        });
                        break;
                    }
                    case "toggleFix":
                    case "toggleHidden": { // change the checkbox state
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
                        ext.helper.sidebarEvents.openUrl(infos, "incognito");
                        break;
                    }
                    case "newTab": { // open bookmark in new tab
                        ext.helper.sidebarEvents.openUrl(infos, "newTab", ext.helper.model.getData("b/newTab") === "foreground");
                        break;
                    }
                    case "show": { // show the hidden bookmark or directory again
                        ext.startLoading();
                        let hiddenEntries = ext.helper.model.getData("u/hiddenEntries");
                        delete hiddenEntries[infos.id];

                        ext.helper.model.setData({"u/hiddenEntries": hiddenEntries}, () => {
                            ext.updateBookmarkBox();
                            ext.endLoading();
                        });
                        break;
                    }
                    case "openChildren": {
                        let bookmarks = infos.children.filter(val => !!(val.url));
                        if (bookmarks.length > 10) {
                            ext.helper.overlay.create(type, $(e.currentTarget).attr("title") || $(e.currentTarget).text(), infos);
                        } else {
                            bookmarks.forEach((bookmark) => {
                                ext.helper.sidebarEvents.openUrl(bookmark, "newTab", ext.helper.model.getData("b/newTab") === "foreground");
                            });
                        }
                        break;
                    }
                    case "showInDir": { // show search result in normal bookmark list
                        if (ext.entries.bookmarks[infos.id] && ext.entries.bookmarks[infos.id].parents) {
                            let parents = ext.entries.bookmarks[infos.id].parents;

                            let openParent = (i) => {
                                if (parents[i]) {
                                    let entry = ext.elements.bookmarkBox["all"].find("ul > li > a." + ext.opts.classes.sidebar.bookmarkDir + "[" + ext.opts.attr.id + "='" + parents[i] + "']");
                                    if (!entry.hasClass(ext.opts.classes.sidebar.dirOpened)) {
                                        ext.helper.sidebarEvents.toggleBookmarkDir(entry, true, () => {
                                            openParent(i + 1);
                                        });
                                    } else {
                                        openParent(i + 1);
                                    }
                                } else { // all parents opened -> close search and scroll to the bookmark
                                    ext.helper.search.clearSearch();
                                    let entry = ext.elements.bookmarkBox["all"].find("ul > li > a[" + ext.opts.attr.id + "='" + infos.id + "']");
                                    ext.helper.scroll.updateScrollbox(ext.elements.bookmarkBox["all"], entry[0].offsetTop - 50);
                                    entry.addClass(ext.opts.classes.sidebar.mark);
                                }
                            };

                            openParent(0);
                        }
                        break;
                    }
                    default: { // open overlay of the given type
                        ext.helper.overlay.create(type, $(e.currentTarget).attr("title") || $(e.currentTarget).text(), infos);
                        break;
                    }
                }
            });
        };
    };

})(jsu);