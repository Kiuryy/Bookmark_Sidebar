($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.KeyboardHelper = function (ext) {

        let isRemoving = false;

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initSidebarEvents();
        };

        /**
         * Initialises the eventhandlers for the given overlay
         *
         * @param overlay
         */
        this.initOverlayEvents = (overlay) => {
            $(overlay[0].contentDocument).on("keydown", (e) => {
                if (e.key === "Escape" || e.key === "Esc") { // close overlay
                    e.preventDefault();
                    ext.helper.overlay.closeOverlay();
                } else if (e.key === "Enter") { // submit
                    const activeElm = overlay[0].contentDocument.activeElement;

                    if (activeElm === null || activeElm.tagName !== "TEXTAREA") { // prevent submit when pressing enter inside a textarea
                        e.preventDefault();
                        handleOverlayClick(overlay);
                    }
                } else if (e.key === "Tab") { // jump to the next entry
                    e.preventDefault();
                    hoverNextOverlayEntry(overlay);
                }
            });
        };

        /**
         * Returns whether the sidebar has the keyboard focus
         *
         * @returns {boolean}
         */
        const isSidebarFocussed = () => {
            let ret = false;

            if (ext.elm.iframe.hasClass($.cl.page.visible) && document && document.activeElement) {
                ret = document.activeElement === ext.elm.iframe[0];
            }

            return ret;
        };

        /**
         * Initializes the eventhandlers for the sidebar
         */
        const initSidebarEvents = () => {
            $([document, ext.elm.iframeDocument]).on("keydown.bs", async (e) => {
                if (!isSidebarFocussed()) { // sidebar is not focussed
                    return;
                }

                const scrollKeys = ["PageDown", "PageUp", "Home", "End", "Space"];
                const searchField = ext.elm.header.find("div." + $.cl.sidebar.searchBox + " > input[type='text']");
                const isContextmenuOpen = ext.elm.sidebar.find("div." + $.cl.contextmenu.wrapper).length() > 0;
                const isDragged = ext.elm.iframeBody.hasClass($.cl.drag.isDragged);

                if (scrollKeys.indexOf(e.key) > -1 || scrollKeys.indexOf(e.code) > -1) {
                    ext.helper.scroll.focus();
                    await $.delay(300);
                    hoverVisibleEntry();

                } else if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) { // jump to the next entry
                    e.preventDefault();
                    if (isContextmenuOpen) {
                        hoverNextPrevContextmenuEntry("next");
                    } else {
                        hoverNextPrevEntry("next");
                        const searchField = ext.elm.header.find("div." + $.cl.sidebar.searchBox + " > input[type='text']");
                        if (searchField[0]) {
                            searchField[0].blur();
                        }
                    }
                } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) { // jump to the previous entry
                    e.preventDefault();
                    if (isContextmenuOpen) {
                        hoverNextPrevContextmenuEntry("prev");
                    } else {
                        hoverNextPrevEntry("prev");
                    }
                } else if (e.key === "Enter") { // click the current entry
                    e.preventDefault();
                    if (isContextmenuOpen) {
                        handleContextmenuClick();
                    } else {
                        handleClick(e.shiftKey, (e.ctrlKey || e.metaKey));
                    }
                } else if (e.key === "Escape" || e.key === "Esc") {
                    e.preventDefault();
                    if (isDragged) { // cancel drag&drop
                        ext.helper.dragndrop.cancel();
                    } else if (isContextmenuOpen) { // close contextmenu
                        ext.helper.contextmenu.close();
                    } else if (ext.helper.search.isResultsVisible()) { // close search
                        ext.helper.search.clearSearch();
                    } else { // close sidebar
                        ext.helper.toggle.closeSidebar();
                    }
                } else if (e.key === "Delete" && ext.helper.selection.isEnabled()) { // remove the selected entries
                    e.preventDefault();
                    removeHoveredEntry();
                    ext.helper.selection.deleteSelected();
                } else if (e.key === "Delete" && searchField.length() > 0 && searchField[0] !== ext.elm.iframeDocument[0].activeElement) { // remove the currently hovered entry
                    e.preventDefault();
                    removeHoveredEntry();
                } else if (e.key === "f" && (e.ctrlKey || e.metaKey) && e.ctrlKey !== e.metaKey && !e.shiftKey) { // open the search field
                    e.preventDefault();
                    ext.helper.search.showSearchField();
                } else if (e.key === "c" && (e.ctrlKey || e.metaKey)) { // copy url of currently hovered bookmark
                    e.preventDefault();
                    copyHoveredEntryUrl();
                } else if (e.key !== "Shift" && e.key !== "Control" && e.key !== "Command" && searchField.length() > 0 && searchField[0] !== ext.elm.iframeDocument[0].activeElement) { // focus search field to enter the value of the pressed key there -> only if the sidebar is opened by the user
                    searchField[0].focus();
                }
            }).on("keyup.bs", () => {
                if (!isSidebarFocussed()) {
                    return;
                }

                const searchField = ext.elm.header.find("div." + $.cl.sidebar.searchBox + " > input[type='text']");
                if (searchField && searchField.length() > 0) {
                    const searchVal = searchField[0].value;

                    if (searchVal.length > 0 && !ext.elm.header.hasClass($.cl.sidebar.searchVisible)) { // search field is not yet visible but the field is filled
                        ext.helper.contextmenu.close();
                        ext.helper.tooltip.close();
                        ext.elm.header.addClass($.cl.sidebar.searchVisible);
                    }
                }
            });
        };

        /**
         * Clicks on the currently hovered overlay entry
         */
        const handleOverlayClick = (overlay) => {
            const hoveredEntry = overlay.find("menu[" + $.attr.name + "='select'] > a." + $.cl.hover);

            if (hoveredEntry.length() > 0) {
                hoveredEntry.trigger("click");
            } else {
                ext.helper.overlay.performAction();
            }
        };

        /**
         * Clicks on the currently hovered contextmenu entry
         */
        const handleContextmenuClick = () => {
            const contextmenu = ext.elm.sidebar.find("div." + $.cl.contextmenu.wrapper);
            const hoveredEntry = contextmenu.find("a." + $.cl.hover);

            if (hoveredEntry.length() > 0) {
                hoveredEntry.trigger("click");
            }
        };

        /**
         * Clicks on the currently hovered entry,
         * if the shift key is pressed perform a right click and open the contextmenu,
         * else the entry will be clicked regularly (open the url, toggle the directory)
         *
         * @param {boolean} shift
         * @param {boolean} ctrl
         */
        const handleClick = (shift, ctrl) => {
            const box = ext.helper.list.getActiveBookmarkBox();
            const hoveredEntry = box.find("ul > li > a." + $.cl.hover + ", ul > li > a." + $.cl.sidebar.mark);

            if (hoveredEntry.length() > 0) {
                if (shift) { // open contextmenu
                    let type = "list";
                    if (hoveredEntry.hasClass($.cl.sidebar.separator)) {
                        type = "separator";
                    }
                    ext.helper.contextmenu.create(type, hoveredEntry);
                } else { // open url/directory
                    ext.helper.sidebarEvents.handleEntryClick(hoveredEntry, {
                        ctrlKey: ctrl
                    });
                }
            }
        };

        /**
         * Hovers the next entry in the currently visible overlay
         */
        const hoverNextOverlayEntry = (overlay) => {
            const hoveredEntry = overlay.find("menu[" + $.attr.name + "='select'] > a." + $.cl.hover);
            const doc = overlay[0].contentDocument;

            if (hoveredEntry.length() > 0) {
                let newActiveElm = null;

                if (hoveredEntry.next("a").length() > 0) {
                    newActiveElm = hoveredEntry.next("a");
                } else {
                    newActiveElm = overlay.find("menu[" + $.attr.name + "='select'] > a").eq(0);
                }

                overlay.find("menu[" + $.attr.name + "='select'] > a." + $.cl.hover).removeClass($.cl.hover);
                newActiveElm.addClass($.cl.hover);
            } else if (doc.activeElement.tagName === "INPUT") {
                const parentEntry = $(doc.activeElement).parent("li");
                let newActiveElm = null;

                if (parentEntry.length() > 0 && parentEntry.next("li").length() > 0) {
                    newActiveElm = parentEntry.next("li").find("input,text,area,select").eq(0);
                } else {
                    newActiveElm = overlay.find("input,text,area,select").eq(0);
                }

                if (newActiveElm && newActiveElm.length() > 0) {
                    newActiveElm[0].focus();
                }
            } else if (overlay.find("input").length() > 0) {
                overlay.find("input")[0].focus();
            } else if (overlay.find("menu[" + $.attr.name + "='select']").length() > 0) {
                overlay.find("menu[" + $.attr.name + "='select'] > a").eq(0).addClass($.cl.hover);
            }
        };

        /**
         * Hovers the next entry in the currently visible contextmenu
         *
         * @param {string} type 'prev' or 'next'
         */
        const hoverNextPrevContextmenuEntry = (type) => {
            const contextmenu = ext.elm.sidebar.find("div." + $.cl.contextmenu.wrapper);
            let entry = null;

            if (contextmenu.find("a." + $.cl.hover).length() > 0) {
                entry = contextmenu.find("a." + $.cl.hover).eq(0);
            }

            let hoveredElm = contextmenu.find("a").eq(0);

            if (entry !== null) {
                if (type === "next") {
                    if (entry.parent("li").next("li").length() > 0) { // hover the next entry
                        hoveredElm = entry.parent("li").next("li").children("a");
                    } else if (entry.parents("ul").eq(0).next("ul").length() > 0) { // hover the first entry of the next list
                        hoveredElm = entry.parents("ul").eq(0).next("ul").find("> li > a").eq(0);
                    }
                } else if (type === "prev") {
                    if (entry.parent("li").prev("li").length() > 0) { // hover the prev entry
                        hoveredElm = entry.parent("li").prev("li").children("a");
                    } else if (entry.parents("ul").eq(0).prev("ul").length() > 0) { // hover the last entry of the prev list
                        hoveredElm = entry.parents("ul").eq(0).prev("ul").find("> li > a").eq(-1);
                    }
                }
            }

            contextmenu.find("a." + $.cl.hover).removeClass($.cl.hover);
            hoveredElm.addClass($.cl.hover);
        };

        /**
         * Determines the next element in the given list element
         *
         * @param {jsu} elm
         * @returns {jsu}
         */
        const getNextEntry = (elm) => {
            const link = elm.children("a");
            let ret = null;

            if (link.hasClass($.cl.sidebar.dirOpened) && link.next("ul").length() > 0 && link.next("ul").children("li").length() > 0) { // one layer deeper
                ret = link.next("ul").find("> li:first-child > a");
            } else if (elm.next("li").length() > 0) { // next element
                ret = elm.next("li").children("a");
            } else { // go to the next entry in a higher layer
                let found = false;
                let i = 0;

                while (found === false) {
                    const parentEntry = elm.parents("li").eq(i);

                    if (parentEntry.length() > 0) { // there is a higher layer
                        if (parentEntry.next("li").length() > 0) { // there is a next element in this layer -> mark next
                            ret = parentEntry.next("li").children("a");
                            found = true;
                        } else { // in this layer is no next element -> go one layer higher
                            i++;
                        }
                    } else if (elm.parents("." + $.cl.sidebar.entryPinned).length() > 0) { // no higher layer anymore + we are at the end if the pinned entries
                        const box = ext.helper.list.getActiveBookmarkBox();
                        const entries = box.find("> ul li > a");

                        if (box.children("ul." + $.cl.sidebar.hideRoot).length() > 0) {
                            ret = entries.eq(1);
                        } else {
                            ret = entries.eq(0);
                        }

                        found = true;
                    } else { // no higher layer anymore -> end of the list
                        found = true;
                    }
                }
            }

            return ret;
        };

        /**
         * Determines the previous element in the given list element
         *
         * @param {jsu} elm
         * @returns {jsu}
         */
        const getPrevEntry = (elm) => {
            let ret = null;

            if (elm.prev("li").length() > 0) { // prev element
                let prev = elm.prev("li").children("a");

                while (prev.hasClass($.cl.sidebar.dirOpened) && prev.next("ul").length() > 0 && prev.next("ul").children("li").length() > 0) {
                    prev = prev.next("ul").find("> li:last-child > a");
                }

                ret = prev;
            } else { // go to the prev entry in a higher layer
                const parentEntry = elm.parents("li").eq(0);

                if (parentEntry.length() > 0 && parentEntry.parent("ul." + $.cl.sidebar.hideRoot).length() === 0) { // there is a higher layer
                    ret = parentEntry.children("a");
                } else if (!ext.elm.pinnedBox.hasClass($.cl.hidden) && elm.parents("." + $.cl.sidebar.entryPinned).length() === 0) { // no higher layer anymore + we are at the beginning of the regular list
                    ret = ext.elm.pinnedBox.find("ul > li > a").eq(-1);
                }
            }

            return ret;
        };

        /**
         * Hovers a visible entry in the currently visible bookmark list,
         * will be called after using scroll keys on the keyboard, like 'page up, home, end'
         */
        const hoverVisibleEntry = () => {
            const box = ext.helper.list.getActiveBookmarkBox();
            const scrollTop = ext.helper.scroll.getScrollPos(box);

            box.find("ul > li").forEach((entry) => {
                if (entry.offsetTop > scrollTop + 50) {
                    box.find("ul > li > a." + $.cl.hover).removeClass($.cl.hover);
                    box.find("ul > li > a." + $.cl.sidebar.mark).removeClass($.cl.sidebar.mark);
                    $(entry).children("a").addClass([$.cl.hover, $.cl.sidebar.lastHover]);
                    return false;
                }
            });
        };

        /**
         * Hovers the next or previous element in the currently visible bookmark list
         *
         * @param {string} type 'prev' or 'next'
         */
        const hoverNextPrevEntry = (type) => {
            const box = ext.helper.list.getActiveBookmarkBox();
            const scrollTop = ext.helper.scroll.getScrollPos(box);
            let firstVisibleEntry = null;

            if (box.find("ul > li > a." + $.cl.sidebar.mark).length() > 0) {
                firstVisibleEntry = box.find("ul > li > a." + $.cl.sidebar.mark).eq(0).parent("li");
            } else if (box.find("ul > li > a." + $.cl.hover).length() > 0) {
                firstVisibleEntry = box.find("ul > li > a." + $.cl.hover).eq(0).parent("li");
            } else if (box.find("ul > li > a." + $.cl.sidebar.lastHover).length() > 0) {
                firstVisibleEntry = box.find("ul > li > a." + $.cl.sidebar.lastHover).eq(0).parent("li");
            } else {
                box.find("ul > li").forEach((entry) => {
                    if (entry.offsetTop >= scrollTop) {
                        firstVisibleEntry = $(entry);
                        return false;
                    }
                });
            }

            if (firstVisibleEntry) {
                const link = firstVisibleEntry.children("a");
                let hoveredElm = null;

                if (link.hasClass($.cl.hover) || link.hasClass($.cl.sidebar.mark)) {
                    if (type === "prev") {
                        hoveredElm = getPrevEntry(firstVisibleEntry);
                    } else if (type === "next") {
                        hoveredElm = getNextEntry(firstVisibleEntry);
                    }
                } else {
                    hoveredElm = link;
                }

                if (hoveredElm && hoveredElm[0]) {
                    box.find("ul > li > a." + $.cl.hover).removeClass($.cl.hover);
                    box.find("ul > li > a." + $.cl.sidebar.mark).removeClass($.cl.sidebar.mark);
                    hoveredElm.addClass([$.cl.hover, $.cl.sidebar.lastHover]);

                    const offset = hoveredElm[0].offsetTop - scrollTop;
                    const pos = window.innerHeight - offset;
                    const limit = 150 + ext.elm.pinnedBox[0].offsetHeight;

                    if (offset < 0) { // element is not visible (from the top) -> scroll to the top offset of the entry
                        ext.helper.scroll.setScrollPos(box, hoveredElm[0].offsetTop);
                    } else if (pos < limit) { // element is not visible (from the bottom) -> scroll further to the entry
                        ext.helper.scroll.setScrollPos(box, scrollTop + (limit - pos));
                    }
                }
            }
        };

        /**
         * Removes the currently hovered entry
         */
        const removeHoveredEntry = () => {
            if (!isRemoving) {
                isRemoving = true;

                const box = ext.helper.list.getActiveBookmarkBox();
                const elm = box.find("> ul a." + $.cl.hover).eq(0);

                if (elm.length() > 0 && elm.children("span." + $.cl.sidebar.removeMask).length() === 0) {
                    ext.helper.bookmark.removeEntry(elm.attr($.attr.id)).then(() => {
                        isRemoving = false;
                    });
                }
            }
        };

        /**
         * Copies the url of the currently hovered entry into the clipboard
         */
        const copyHoveredEntryUrl = () => {
            const box = ext.helper.list.getActiveBookmarkBox();
            const elm = box.find("> ul a." + $.cl.hover).eq(0);
            if (elm.length() > 0) {
                const data = ext.helper.entry.getDataById(elm.attr($.attr.id));
                if (data && data.url && ext.helper.utility.copyToClipboard(data.url)) {
                    $(elm).children("span." + $.cl.sidebar.copied).remove();
                    const copiedNotice = $("<span></span>").addClass($.cl.sidebar.copied).text(ext.helper.i18n.get("sidebar_copied_to_clipboard")).appendTo(elm);

                    $.delay(100).then(() => {
                        $(elm).addClass($.cl.sidebar.copied);
                        return $.delay(1500);
                    }).then(() => {
                        $(elm).removeClass($.cl.sidebar.copied);
                        return $.delay(500);
                    }).then(() => {
                        copiedNotice.remove();
                    });
                }
            }
        };
    };

})(jsu);