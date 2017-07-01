($ => {
    "use strict";

    window.DragDropHelper = function (ext) {

        let oldAboveElm = null;
        let oldTopVal = 0;
        let dirOpenTimeout = null;

        let edgeScroll = {
            running: false,
            posY: null,
            previousDelta: 0,
            fpsLimit: 30
        };

        /**
         * Initializes the events for the drag n drop functionality
         */
        this.init = () => {
            initEvents();
            initExternalDragDropEvents();
        };

        /**
         * Checks if the dragged element is outside of the sidebar, so the mouseup will cause an abort and not a repositioning
         *
         * @param {jsu|int} elm
         * @returns {boolean}
         */
        let isDraggedElementOutside = (elm) => {
            let offset = 0;

            if (typeof elm === "object") {
                let boundClientRect = elm[0].getBoundingClientRect();
                offset = boundClientRect.left;
            } else {
                offset = +elm;
            }

            if (ext.elements.iframe.attr(ext.opts.attr.position) === "right") {
                offset = window.innerWidth - offset;
            }

            if (typeof elm === "object") {
                return elm.realWidth() * 0.6 + offset > ext.elements.sidebar.realWidth();
            } else {
                return offset > ext.elements.sidebar.realWidth();
            }
        };

        /**
         * Initialises the eventhandler for external elements beeing dragged into the sidebar (e.g. a link, an image, ...)
         */
        let initExternalDragDropEvents = () => {
            ext.elements.iframeBody.on("dragenter", () => {
                ext.helper.contextmenu.close();
                ext.elements.iframeBody.addClass(ext.opts.classes.drag.isDragged);
                ext.elements.iframe.removeClass(ext.opts.classes.page.hideMask);
                trackStart("selection");

                if (!edgeScroll.running) {
                    window.requestAnimationFrame(edgeScrolling);
                }
            }).on("drop dragend", (e) => {
                e.preventDefault();
                e.stopPropagation();
                edgeScroll.posY = null;

                if (ext.elements.iframeBody.hasClass(ext.opts.classes.drag.isDragged)) { // something has been dragged
                    if (!isDraggedElementOutside(e.pageX)) { // only proceed if mouse position is in the sidebar
                        let entryPlaceholder = ext.elements.bookmarkBox["all"].find("li." + ext.opts.classes.drag.isDragged).eq(0);

                        if (entryPlaceholder && entryPlaceholder.length() > 0) {
                            let url = e.dataTransfer.getData('URL');
                            let title = "";

                            if (location.href === url) {
                                title = $(document).find("title").text();
                            }

                            trackEnd("selection");

                            ext.helper.overlay.create("add", ext.helper.i18n.get("contextmenu_add"), {
                                values: {
                                    index: entryPlaceholder.prevAll("li").length(),
                                    parentId: entryPlaceholder.parent("ul").prev("a").attr(ext.opts.attr.id),
                                    title: title,
                                    url: url
                                }
                            });
                        }
                    } else {
                        trackEnd("selection", true);
                    }

                    ext.elements.iframeBody.removeClass(ext.opts.classes.drag.isDragged);

                    if (ext.helper.utility.sidebarHasMask() === false) {
                        ext.elements.iframe.addClass(ext.opts.classes.page.hideMask);
                    }
                }
            });
        };

        /**
         * Returns the type of the element which is dragged
         *
         * @param {jsu|string} elm
         */
        let getDragType = (elm) => {
            let type = "bookmark";

            if (elm === "selection") { // element is text
                type = elm;
            } else if (elm.data("type")) { // element type is cached in data obj
                type = elm.data("type");
            } else { // determine type of given element
                if (elm.hasClass(ext.opts.classes.sidebar.bookmarkDir)) {
                    type = "directory";
                } else if (elm.hasClass(ext.opts.classes.sidebar.separator)) {
                    type = "separator";
                } else if (elm.parent("li." + ext.opts.classes.sidebar.entryPinned).length() > 0) {
                    type = "pinned";
                }

                elm.data("type", type);
            }

            return type;
        };

        /**
         * Tracks that an element is beeing dragged
         *
         * @param {jsu|string} elm
         */
        let trackStart = (elm) => {
            ext.helper.model.call("trackEvent", {
                category: "dragndrop",
                action: getDragType(elm),
                label: "dragstart"
            });
        };

        /**
         * Tracks that an element is no longer dragged
         *
         * @param {jsu|string} elm
         * @param {boolean} cancel
         */
        let trackEnd = (elm, cancel = false) => {
            ext.helper.model.call("trackEvent", {
                category: "dragndrop",
                action: getDragType(elm),
                label: cancel ? "cancel" : "dragend"
            });
        };

        /**
         * Start dragging an element (bookmark or directory)
         *
         * @param {Element} node
         * @param {int} x
         * @param {int} y
         */
        let dragstart = (node, x, y) => {
            ext.helper.contextmenu.close();
            let elm = $(node).parent("a").removeClass(ext.opts.classes.sidebar.dirOpened);
            let elmParent = elm.parent("li");

            ext.elements.iframeBody.addClass(ext.opts.classes.drag.isDragged);
            elmParent.clone().addClass(ext.opts.classes.drag.dragInitial).insertAfter(elmParent);

            let helper = elm.clone().appendTo(ext.elements.iframeBody);
            let boundClientRect = elm[0].getBoundingClientRect();
            let data = {};

            if (!elm.hasClass(ext.opts.classes.sidebar.separator)) {
                data = ext.helper.entry.getData(elm.attr(ext.opts.attr.id));
            }

            helper.removeAttr("title").css({
                top: boundClientRect.top + "px",
                left: boundClientRect.left + "px",
                width: elm.realWidth() + "px"
            }).data({
                elm: elmParent,
                isDir: !!(data.isDir),
                startPos: {
                    top: y - boundClientRect.top,
                    left: x - boundClientRect.left
                }
            }).addClass(ext.opts.classes.drag.helper);

            elmParent.addClass(ext.opts.classes.drag.isDragged);
            trackStart(elm);

            if (!edgeScroll.running) {
                window.requestAnimationFrame(edgeScrolling);
            }
        };

        /**
         * Scrolls the bookmark list automatically when the user drags an element near the top or bottom of the list
         *
         * @param {int} currentDelta
         */
        let edgeScrolling = (currentDelta) => {
            window.requestAnimationFrame(edgeScrolling);
            let delta = currentDelta - edgeScroll.previousDelta;

            if (edgeScroll.fpsLimit && delta < 1000 / edgeScroll.fpsLimit) {
                return;
            }

            if (edgeScroll.posY !== null) {
                let bookmarkBoxTopOffset = ext.elements.bookmarkBox["all"][0].offsetTop;
                let bookmarkBoxHeight = ext.elements.bookmarkBox["all"][0].offsetHeight;
                let scrollPos = ext.elements.bookmarkBox["all"][0].scrollTop;
                let newScrollPos = null;

                if (edgeScroll.posY - bookmarkBoxTopOffset < 60) {
                    newScrollPos = scrollPos - Math.pow((50 - edgeScroll.posY + bookmarkBoxTopOffset) / 10, 2);
                } else if (edgeScroll.posY + 60 > bookmarkBoxHeight) {
                    newScrollPos = scrollPos + Math.pow((edgeScroll.posY + 50 - bookmarkBoxHeight) / 10, 2);
                }

                if (newScrollPos) {
                    ext.helper.scroll.setScrollPos(ext.elements.bookmarkBox["all"], newScrollPos);
                }
            }

            edgeScroll.previousDelta = currentDelta;
        };

        /**
         * Stop dragging an element (bookmark or directory)
         */
        let dragend = () => {
            clearDirOpenTimeout();

            let draggedElm = ext.elements.iframeBody.children("a." + ext.opts.classes.drag.helper);
            let dragInitialElm = ext.elements.bookmarkBox["all"].find("li." + ext.opts.classes.drag.dragInitial);
            let entryElm = draggedElm.data("elm");
            let elm = entryElm.children("a");
            let type = getDragType(elm);

            if (isDraggedElementOutside(draggedElm)) {// cancel drop if mouse position is outside the sidebar
                entryElm.insertAfter(dragInitialElm).removeClass(ext.opts.classes.drag.isDragged);
                dragInitialElm.remove();
                draggedElm.remove();
                trackEnd(elm, true);
            } else { // animate the helper back to the new position and save it
                draggedElm.addClass(ext.opts.classes.drag.snap);

                let parentId = entryElm.parent("ul").prev("a").attr(ext.opts.attr.id);
                let index = 0;

                entryElm.prevAll("li").forEach((el) => {
                    if (el !== dragInitialElm && !$(el).children("a").hasClass(ext.opts.classes.sidebar.separator)) {
                        index++;
                    }
                });

                if (type === "separator") { // save separator position
                    ext.helper.specialEntry.removeSeparator(elm.data("infos")).then(() => {
                        let opts = {
                            id: parentId,
                            index: index
                        };

                        ext.helper.specialEntry.addSeparator(opts);
                        elm.data("infos", opts);
                    });
                } else if (type === "pinned") { // save position of pinned entry
                    ext.helper.specialEntry.reorderPinnedEntries({
                        id: entryElm.children("a").attr(ext.opts.attr.id),
                        prevId: entryElm.prev("li").children("a").attr(ext.opts.attr.id)
                    });
                } else { // save bookmark/directory position
                    ext.helper.model.call("moveBookmark", {
                        id: entryElm.children("a").attr(ext.opts.attr.id),
                        parentId: parentId,
                        index: index
                    });
                }

                trackEnd(elm);

                setTimeout(() => {
                    let boundClientRect = entryElm[0].getBoundingClientRect();

                    draggedElm.css({
                        top: boundClientRect.top + "px",
                        left: boundClientRect.left + "px"
                    });

                    setTimeout(() => {
                        entryElm.removeClass(ext.opts.classes.drag.isDragged);
                        dragInitialElm.remove();
                        draggedElm.remove();
                    }, 200);
                }, 0);
            }

            ext.elements.iframeBody.removeClass(ext.opts.classes.drag.isDragged);

            setTimeout(() => {
                if (ext.helper.utility.sidebarHasMask() === false) {
                    ext.elements.iframe.addClass(ext.opts.classes.page.hideMask);
                }
            }, 500);
        };

        /**
         * Clears the directory open timeout
         *
         * @param {jsu} checkElm
         */
        let clearDirOpenTimeout = (checkElm = null) => {
            if (dirOpenTimeout !== null && (checkElm === null || dirOpenTimeout.id !== checkElm.attr(ext.opts.attr.id))) {
                dirOpenTimeout.elm.removeClass(ext.opts.classes.drag.dragHover);
                clearTimeout(dirOpenTimeout.instance);
                dirOpenTimeout = null;
            }
        };

        /**
         * Drag an element (bookmark or directory or something external (a link, an image, ...))
         *
         * @param {string} eventType
         * @param {int} x
         * @param {int} y
         */
        let dragmove = (eventType, x, y) => {
            edgeScroll.posY = y;

            let draggedElm = null;
            let bookmarkElm = null;
            let topVal = 0;
            let leftVal = 0;

            if (eventType === "dragover") { // dragging anything (e.g. a link, an image, ...)
                topVal = y - 20;
                leftVal = x;
                if (topVal === oldTopVal) {
                    return false;
                }
                oldTopVal = topVal;
                ext.elements.bookmarkBox["all"].find("li." + ext.opts.classes.drag.isDragged).remove();
                bookmarkElm = $("<li />").html("<a>&nbsp;</a>").addClass(ext.opts.classes.drag.isDragged);
            } else { // dragging bookmark or directory
                draggedElm = ext.elements.iframeBody.children("a." + ext.opts.classes.drag.helper);
                let startPos = draggedElm.data("startPos");
                topVal = y - startPos.top;
                leftVal = x - startPos.left;

                draggedElm.css({
                    top: topVal + "px",
                    left: leftVal + "px"
                });

                bookmarkElm = draggedElm.data("elm");
            }

            if (isDraggedElementOutside(draggedElm || leftVal)) { // dragged outside the sidebar -> mouseup will cancel
                clearDirOpenTimeout();
                ext.elements.iframeBody.addClass(ext.opts.classes.drag.cancel);
                return false;
            } else {
                ext.elements.iframeBody.removeClass(ext.opts.classes.drag.cancel);
            }

            let newAboveElm = null;


            let elmList = null;
            let type = getDragType(bookmarkElm.children("a"));
            if (type === "pinned") {
                elmList = ext.elements.bookmarkBox["all"].find("> ul > li." + ext.opts.classes.sidebar.entryPinned);
            } else {
                elmList = $([
                    ext.elements.bookmarkBox["all"].find("> ul > li > a." + ext.opts.classes.sidebar.dirOpened).parent("li"),
                    ext.elements.bookmarkBox["all"].find("a." + ext.opts.classes.sidebar.dirOpened + " + ul > li")
                ]);
            }

            elmList.forEach((node) => { // determine the element which is above the current drag position
                let elmObj = $(node);

                if (node !== bookmarkElm[0] && !elmObj.hasClass(ext.opts.classes.drag.dragInitial)) {
                    let boundClientRect = node.getBoundingClientRect();

                    if (boundClientRect.top > topVal) {
                        return false;
                    } else {
                        newAboveElm = elmObj;
                    }
                }
            });

            if (newAboveElm && newAboveElm !== oldAboveElm) {
                oldAboveElm = newAboveElm;
                let newAboveLink = newAboveElm.children("a").eq(0);

                clearDirOpenTimeout(newAboveLink);

                if (newAboveLink.hasClass(ext.opts.classes.sidebar.bookmarkDir)) { // drag position is beneath a directory
                    if (newAboveLink.hasClass(ext.opts.classes.sidebar.dirOpened)) { // opened directory
                        let elm = bookmarkElm.prependTo(newAboveLink.next("ul"));
                        draggedElm && draggedElm.data("elm", elm);
                    } else if (draggedElm && draggedElm.data("isDir")) {
                        let elm = bookmarkElm.insertAfter(newAboveElm);
                        draggedElm && draggedElm.data("elm", elm);
                    } else if (!newAboveLink.hasClass(ext.opts.classes.sidebar.dirAnimated)) { // closed directory
                        if (dirOpenTimeout === null) {
                            dirOpenTimeout = {
                                id: newAboveLink.attr(ext.opts.attr.id),
                                elm: newAboveLink.addClass(ext.opts.classes.drag.dragHover)
                            };

                            dirOpenTimeout.instance = setTimeout(() => { // open closed directory after short delay -> possibility for user to cancel timeout
                                ext.helper.list.toggleBookmarkDir(newAboveLink);
                            }, 700);
                        }
                    } else if (newAboveLink.next("ul").length() === 0) { // empty directory
                        newAboveLink.addClass(ext.opts.classes.sidebar.dirOpened);
                        $("<ul />").insertAfter(newAboveLink);
                    }
                } else { // drag position is beneath a bookmark
                    let elm = bookmarkElm.insertAfter(newAboveElm);
                    draggedElm && draggedElm.data("elm", elm);
                }
            } else if (type === "pinned") { // pinned entry -> no element above -> index = 0
                let elm = bookmarkElm.prependTo(ext.elements.bookmarkBox["all"].find("> ul"));
                draggedElm && draggedElm.data("elm", elm);
            }
        };

        /**
         * Initializes the eventhandlers for the dragDrop functionality of the bookmarks
         */
        let initEvents = () => {

            ext.elements.bookmarkBox["all"].children("ul").on("mousedown", "span." + ext.opts.classes.drag.trigger, (e) => { // drag start
                let x = e.pageX;
                let hasMask = ext.helper.utility.sidebarHasMask();

                if (hasMask === false && ext.elements.iframe.attr(ext.opts.attr.position) === "right") {
                    let width = ext.elements.iframe.realWidth();
                    ext.elements.iframe.removeClass(ext.opts.classes.page.hideMask);

                    x += ext.elements.iframe.realWidth() - width;
                }

                ext.elements.iframe.removeClass(ext.opts.classes.page.hideMask);
                dragstart(e.currentTarget, x, e.pageY);
            });

            ext.elements.iframeBody.on("mouseup", (e) => { // drag end
                edgeScroll.posY = null;
                if (ext.elements.iframeBody.hasClass(ext.opts.classes.drag.isDragged)) { // bookmark has been dragged
                    e.preventDefault();
                    e.stopPropagation();
                    dragend();
                }
            });

            ext.elements.iframeBody.on('wheel', (e) => { // scroll the bookmark list
                if (ext.elements.iframeBody.hasClass(ext.opts.classes.drag.isDragged)) {
                    e.preventDefault();
                    e.stopPropagation();

                    let scrollPos = ext.elements.bookmarkBox["all"][0].scrollTop;
                    ext.helper.scroll.setScrollPos(ext.elements.bookmarkBox["all"], scrollPos - e.wheelDelta, 300);
                }
            });

            ext.elements.iframeBody.on("mousemove dragover", (e) => { // drag move
                if (ext.elements.iframeBody.hasClass(ext.opts.classes.drag.isDragged) && e.which === 1) {
                    e.preventDefault();
                    e.stopPropagation();
                    dragmove(e.type, e.pageX, e.pageY);
                }
            });

            ext.elements.iframeBody.on('contextmenu', "a." + ext.opts.classes.drag.helper, (e) => { // disable right click or the drag handle
                e.preventDefault();
                e.stopPropagation();
            });
        };
    };

})(jsu);
