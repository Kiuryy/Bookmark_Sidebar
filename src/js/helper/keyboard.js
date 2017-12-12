($ => {
    "use strict";

    window.KeyboardHelper = function (ext) {

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
                    ext.helper.overlay.closeOverlay(true);
                } else if (e.key === "Enter") { // submit
                    let activeElm = overlay[0].contentDocument.activeElement;

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
        let isSidebarFocussed = () => {
            let ret = false;

            if (ext.elements.iframe.hasClass(ext.opts.classes.page.visible) && document && document.activeElement) {
                ret = document.activeElement === ext.elements.iframe[0];
            }

            return ret;
        };

        /**
         * Initializes the eventhandlers for the sidebar
         */
        let initSidebarEvents = () => {
            $([document, ext.elements.iframe[0].contentDocument]).on("keydown.bs", (e) => {
                if (isSidebarFocussed()) { // sidebar is focussed
                    let scrollKeys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", "Space"];
                    let isContextmenuOpen = ext.elements.sidebar.find("div." + ext.opts.classes.contextmenu.wrapper).length() > 0;

                    if (scrollKeys.indexOf(e.key) > -1 || scrollKeys.indexOf(e.code) > -1) {
                        ext.helper.scroll.focus();
                    } else if (e.key === "Tab") { // jump to the next entry
                        e.preventDefault();
                        if (isContextmenuOpen) {
                            hoverNextContextmenuEntry();
                        } else {
                            hoverNextEntry();
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
                        if (isContextmenuOpen) { // close contextmenu
                            ext.helper.contextmenu.close();
                        } else { // close sidebar
                            ext.helper.toggle.closeSidebar();
                        }
                    } else if (e.key === "c" && (e.ctrlKey || e.metaKey)) { // copy url of currently hovered bookmark
                        e.preventDefault();
                        copyHoveredEntryUrl();
                    } else { // focus search field to enter the value of the pressed key there -> only if the sidebar is opened by the user
                        let searchField = ext.elements.header.find("div." + ext.opts.classes.sidebar.searchBox + " > input[type='text']");

                        if (searchField[0] !== ext.elements.iframe[0].contentDocument.activeElement) {
                            searchField[0].focus();
                        }
                    }
                }
            }).on("keyup.bs", () => {
                if (isSidebarFocussed()) {
                    let searchField = ext.elements.header.find("div." + ext.opts.classes.sidebar.searchBox + " > input[type='text']");

                    if (searchField && searchField.length() > 0) {
                        let searchVal = searchField[0].value;

                        if (searchVal.length > 0 && !ext.elements.header.hasClass(ext.opts.classes.sidebar.searchVisible)) { // search field is not yet visible but the field is filled
                            ext.helper.contextmenu.close();
                            ext.helper.tooltip.close();
                            ext.elements.header.addClass(ext.opts.classes.sidebar.searchVisible);
                        }
                    }
                }
            });
        };

        /**
         * Clicks on the currently hovered overlay entry
         */
        let handleOverlayClick = (overlay) => {
            let hoveredEntry = overlay.find("menu[" + ext.opts.attr.name + "='select'] > a." + ext.opts.classes.sidebar.hover);

            if (hoveredEntry.length() > 0) {
                hoveredEntry.trigger("click");
            } else {
                ext.helper.overlay.performAction();
            }
        };

        /**
         * Clicks on the currently hovered contextmenu entry
         */
        let handleContextmenuClick = () => {
            let contextmenu = ext.elements.sidebar.find("div." + ext.opts.classes.contextmenu.wrapper);
            let hoveredEntry = contextmenu.find("a." + ext.opts.classes.sidebar.hover);

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
        let handleClick = (shift, ctrl) => {
            Object.values(ext.elements.bookmarkBox).some((box) => {
                if (box.hasClass(ext.opts.classes.sidebar.active)) {
                    let hoveredEntry = box.find("ul > li > a." + ext.opts.classes.sidebar.hover + ", ul > li > a." + ext.opts.classes.sidebar.mark);

                    if (hoveredEntry.length() > 0) {
                        if (shift) { // open contextmenu
                            let type = "list";
                            if (hoveredEntry.hasClass(ext.opts.classes.sidebar.separator)) {
                                type = "separator";
                            }
                            ext.helper.contextmenu.create(type, hoveredEntry);
                        } else { // open url/directory
                            ext.helper.sidebarEvents.handleEntryClick(hoveredEntry, {
                                ctrlKey: ctrl
                            });
                        }
                    }

                    return true;
                }
            });
        };

        /**
         * Hovers the next entry in the currently visible overlay
         */
        let hoverNextOverlayEntry = (overlay) => {
            let hoveredEntry = overlay.find("menu[" + ext.opts.attr.name + "='select'] > a." + ext.opts.classes.sidebar.hover);
            let doc = overlay[0].contentDocument;

            if (hoveredEntry.length() > 0) {
                let newActiveElm = null;

                if (hoveredEntry.next("a").length() > 0) {
                    newActiveElm = hoveredEntry.next("a");
                } else {
                    newActiveElm = overlay.find("menu[" + ext.opts.attr.name + "='select'] > a").eq(0);
                }

                overlay.find("menu[" + ext.opts.attr.name + "='select'] > a." + ext.opts.classes.sidebar.hover).removeClass(ext.opts.classes.sidebar.hover);
                newActiveElm.addClass(ext.opts.classes.sidebar.hover);
            } else if (doc.activeElement.tagName === "INPUT") {
                let parentEntry = $(doc.activeElement).parent("li");
                let newActiveElm = null;

                if (parentEntry.length() > 0 && parentEntry.next("li").length() > 0) {
                    newActiveElm = parentEntry.next("li").find("input");
                } else {
                    newActiveElm = overlay.find("input").eq(0);
                }

                newActiveElm[0].focus();
            } else if (overlay.find("input").length() > 0) {
                overlay.find("input")[0].focus();
            } else if (overlay.find("menu[" + ext.opts.attr.name + "='select']").length() > 0) {
                overlay.find("menu[" + ext.opts.attr.name + "='select'] > a").eq(0).addClass(ext.opts.classes.sidebar.hover);
            }
        };

        /**
         * Hovers the next entry in the currently visible contextmenu
         */
        let hoverNextContextmenuEntry = () => {
            let contextmenu = ext.elements.sidebar.find("div." + ext.opts.classes.contextmenu.wrapper);
            let hoveredElm = null;
            let entry = null;

            if (contextmenu.find("a." + ext.opts.classes.sidebar.hover).length() > 0) {
                entry = contextmenu.find("a." + ext.opts.classes.sidebar.hover).eq(0);
            }

            if (entry === null) { // hover the first entry
                hoveredElm = contextmenu.find("a").eq(0);
            } else if (entry.parent("li").next("li").length() > 0) { // hover the next entry
                hoveredElm = entry.parent("li").next("li").find("a");
            } else if (entry.parents("ul").eq(0).next("ul").length() > 0) { // hover the first entry of the next list
                hoveredElm = entry.parents("ul").eq(0).next("ul").find("a").eq(0);
            } else { // last entry of the last list -> hover the first entry
                hoveredElm = contextmenu.find("a").eq(0);
            }

            contextmenu.find("a." + ext.opts.classes.sidebar.hover).removeClass(ext.opts.classes.sidebar.hover);
            hoveredElm.addClass(ext.opts.classes.sidebar.hover);
        };

        /**
         * Hovers the next element in the currently visible bookmark list
         */
        let hoverNextEntry = () => {
            Object.values(ext.elements.bookmarkBox).some((box) => {
                if (box.hasClass(ext.opts.classes.sidebar.active)) {
                    let scrollTop = ext.helper.scroll.getScrollPos(box);
                    let firstVisibleEntry = null;

                    if (box.find("ul > li > a." + ext.opts.classes.sidebar.mark).length() > 0) {
                        firstVisibleEntry = box.find("ul > li > a." + ext.opts.classes.sidebar.mark).eq(0).parent("li");
                    } else if (box.find("ul > li > a." + ext.opts.classes.sidebar.hover).length() > 0) {
                        firstVisibleEntry = box.find("ul > li > a." + ext.opts.classes.sidebar.hover).eq(0).parent("li");
                    } else if (box.find("ul > li > a." + ext.opts.classes.sidebar.lastHover).length() > 0) {
                        firstVisibleEntry = box.find("ul > li > a." + ext.opts.classes.sidebar.lastHover).eq(0).parent("li");
                    } else {
                        box.find("ul > li").forEach((entry) => {
                            if (entry.offsetTop >= scrollTop) {
                                firstVisibleEntry = $(entry);
                                return false;
                            }
                        });
                    }

                    if (firstVisibleEntry) {
                        let link = firstVisibleEntry.children("a");
                        let hoveredElm = null;

                        if (link.hasClass(ext.opts.classes.sidebar.hover) || link.hasClass(ext.opts.classes.sidebar.mark)) {
                            if (link.hasClass(ext.opts.classes.sidebar.dirOpened) && link.next("ul").length() > 0) { // one layer deeper
                                hoveredElm = link.next("ul").find("> li:first-child > a");
                            } else if (firstVisibleEntry.next("li").length() > 0) { // next element
                                hoveredElm = firstVisibleEntry.next("li").children("a");
                            } else { // go to the next entry in a higher layer
                                let found = false;
                                let i = 0;

                                while (found === false) {
                                    let parentEntry = firstVisibleEntry.parents("li").eq(i);

                                    if (parentEntry.length() > 0) { // there is a higher layer
                                        if (parentEntry.next("li").length() > 0) { // there is a next element in this layer -> mark next
                                            hoveredElm = parentEntry.next("li").children("a");
                                            found = true;
                                        } else { // in this layer is no next element -> go one layer higher
                                            i++;
                                        }
                                    } else { // no higher layer anymore -> end of the list
                                        found = true;
                                    }
                                }
                            }
                        } else {
                            hoveredElm = link;
                        }

                        if (hoveredElm) {
                            box.find("ul > li > a." + ext.opts.classes.sidebar.hover).removeClass(ext.opts.classes.sidebar.hover);
                            box.find("ul > li > a." + ext.opts.classes.sidebar.mark).removeClass(ext.opts.classes.sidebar.mark);
                            hoveredElm.addClass([ext.opts.classes.sidebar.hover, ext.opts.classes.sidebar.lastHover]);

                            let offset = hoveredElm[0].offsetTop - scrollTop;
                            let pos = window.innerHeight - offset;

                            if (offset < 0) { // element is not visible (from the top) -> scroll to the top offset of the entry
                                ext.helper.scroll.setScrollPos(box, hoveredElm[0].offsetTop);
                            } else if (pos < 150) { // element is not visible (from the bottom) -> scroll further to the entry
                                ext.helper.scroll.setScrollPos(box, scrollTop + (150 - pos));
                            }
                        }
                    }

                    return true;
                }
            });
        };

        /**
         * Copies the url of the currently hovered entry into the clipboard
         */
        let copyHoveredEntryUrl = () => {
            Object.values(ext.elements.bookmarkBox).some((box) => {
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
                    return true;
                }
            });
        };
    };

})(jsu);