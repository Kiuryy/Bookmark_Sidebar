($ => {
    "use strict";

    window.KeyboardHelper = function (ext) {

        /**
         *
         */
        this.init = async () => {
            initEvents();
        };

        /**
         * Initializes the eventhandlers for keyboard input
         *
         * @returns {Promise}
         */
        let initEvents = async () => {
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
                        } else if (e.key === "Tab") { // jump to the next entry
                            e.preventDefault();
                            hoverNextEntry();
                        } else if (e.key === "Enter") { // click the current entry
                            e.preventDefault();
                            handleClick(e.shiftKey, (e.ctrlKey || e.metaKey));
                        } else if (e.key === "Escape" || e.key === "Esc") { // close sidebar
                            e.preventDefault();
                            ext.helper.toggle.closeSidebar();
                        } else if (e.key === "c" && (e.ctrlKey || e.metaKey)) { // copy url of currently hovered bookmark
                            e.preventDefault();
                            copyHoveredEntryUrl();
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
                    let hoveredEntry = box.find("ul > li > a." + ext.opts.classes.sidebar.hover);

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
         * Hovers the next element in the currently visible bookmark list
         */
        let hoverNextEntry = () => {
            Object.values(ext.elements.bookmarkBox).some((box) => {
                if (box.hasClass(ext.opts.classes.sidebar.active)) {
                    let scrollTop = ext.helper.scroll.getScrollPos(box);
                    let firstVisibleEntry = null;

                    if (box.find("ul > li > a." + ext.opts.classes.sidebar.mark).length() > 0) {
                        firstVisibleEntry = box.find("ul > li > a." + ext.opts.classes.sidebar.mark).parent("li");
                    } else if (box.find("ul > li > a." + ext.opts.classes.sidebar.hover).length() > 0) {
                        firstVisibleEntry = box.find("ul > li > a." + ext.opts.classes.sidebar.hover).parent("li");
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
                        link.removeClass(ext.opts.classes.sidebar.mark);
                        let hoveredElm = null;

                        if (link.hasClass(ext.opts.classes.sidebar.hover)) {
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
                            hoveredElm.addClass(ext.opts.classes.sidebar.hover).removeClass(ext.opts.classes.sidebar.mark);

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
                        if (data && data.url && this.copyToClipboard(data.url)) {
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