($ => {
    "use strict";

    window.DragDropHelper = function (ext) {

        let scrollSensitivity = null;
        let oldAboveElm = null;
        let oldTopVal = 0;

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
            scrollSensitivity = ext.helper.model.getData("b/scrollSensitivity");
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

                            ext.helper.overlay.create("add", ext.helper.i18n.get("contextmenu_add"), {
                                values: {
                                    index: entryPlaceholder.prevAll("li").length(),
                                    parentId: entryPlaceholder.parent("ul").prev("a").attr(ext.opts.attr.id),
                                    title: title,
                                    url: url
                                }
                            });
                        }
                    }

                    ext.elements.iframeBody.removeClass(ext.opts.classes.drag.isDragged);
                }
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
            let data = ext.helper.entry.getData(elm.attr(ext.opts.attr.id));
            let boundClientRect = elm[0].getBoundingClientRect();

            helper.removeAttr("title").css({
                top: boundClientRect.top + "px",
                left: boundClientRect.left + "px",
                width: elm.realWidth() + "px"
            }).data({
                elm: elmParent,
                isDir: data.isDir,
                startPos: {
                    top: y - boundClientRect.top,
                    left: x - boundClientRect.left
                }
            }).addClass(ext.opts.classes.drag.helper);

            elmParent.addClass(ext.opts.classes.drag.isDragged);

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
                let scrollPos = ext.elements.bookmarkBox["all"].data("scrollpos") || 0;
                let newScrollPos = null;

                if (edgeScroll.posY - bookmarkBoxTopOffset < 50) {
                    newScrollPos = scrollPos - Math.pow((50 - edgeScroll.posY + bookmarkBoxTopOffset) / 10, 2);
                } else if (edgeScroll.posY + 50 > bookmarkBoxHeight) {
                    newScrollPos = scrollPos + Math.pow((edgeScroll.posY + 50 - bookmarkBoxHeight) / 10, 2);
                }

                if (newScrollPos) {
                    ext.elements.bookmarkBox["all"].data("scrollpos", newScrollPos);
                    ext.helper.scroll.update(ext.elements.bookmarkBox["all"], true);
                }
            }

            edgeScroll.previousDelta = currentDelta;
        };

        /**
         * Stop dragging an element (bookmark or directory)
         */
        let dragend = () => {
            let draggedElm = ext.elements.iframeBody.children("a." + ext.opts.classes.drag.helper);
            let dragInitialElm = ext.elements.bookmarkBox["all"].find("li." + ext.opts.classes.drag.dragInitial);
            let entryElm = draggedElm.data("elm");

            if (isDraggedElementOutside(draggedElm)) {// cancel drop if mouse position is outside the sidebar
                entryElm.insertAfter(dragInitialElm).removeClass(ext.opts.classes.drag.isDragged);
                dragInitialElm.remove();
                draggedElm.remove();
            } else { // animate the helper back to the new position and save it
                draggedElm.addClass(ext.opts.classes.drag.snap);

                ext.helper.model.call("moveBookmark", {
                    id: entryElm.children("a").attr(ext.opts.attr.id),
                    parentId: entryElm.parent("ul").prev("a").attr(ext.opts.attr.id),
                    index: entryElm.prevAll("li").length()
                });

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
                ext.elements.iframeBody.addClass(ext.opts.classes.drag.cancel);
            } else {
                ext.elements.iframeBody.removeClass(ext.opts.classes.drag.cancel);
            }

            let newAboveElm = null;

            $([
                ext.elements.bookmarkBox["all"].find("> ul > li > a." + ext.opts.classes.sidebar.dirOpened).parent("li"),
                ext.elements.bookmarkBox["all"].find("a." + ext.opts.classes.sidebar.dirOpened + " + ul > li")
            ]).forEach((node) => { // determine the element which is above the current drag position
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

                if (newAboveLink.hasClass(ext.opts.classes.sidebar.bookmarkDir)) { // drag position is beneath a directory
                    if (newAboveLink.hasClass(ext.opts.classes.sidebar.dirOpened)) {
                        let elm = bookmarkElm.prependTo(newAboveLink.next("ul"));
                        draggedElm && draggedElm.data("elm", elm);
                    } else if (draggedElm && draggedElm.data("isDir")) {
                        let elm = bookmarkElm.insertAfter(newAboveElm);
                        draggedElm && draggedElm.data("elm", elm);
                    } else if (!newAboveLink.hasClass(ext.opts.classes.sidebar.dirAnimated)) {
                        ext.helper.list.toggleBookmarkDir(newAboveLink);
                    }
                } else { // drag position is beneath a bookmark
                    let elm = bookmarkElm.insertAfter(newAboveElm);
                    draggedElm && draggedElm.data("elm", elm);
                }
            }
        };

        /**
         * Initializes the eventhandlers for the dragDrop functionality of the bookmarks
         */
        let initEvents = () => {

            ext.elements.bookmarkBox["all"].children("ul").on("mousedown", "span." + ext.opts.classes.drag.trigger, (e) => { // drag start
                dragstart(e.currentTarget, e.pageX, e.pageY);
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

                    let scrollPos = ext.elements.bookmarkBox["all"].data("scrollpos") || 0;
                    let scrollType = Math.abs(e.wheelDelta) < 60 ? "trackpad" : "mouse";

                    ext.elements.bookmarkBox["all"].data("scrollpos", scrollPos - (e.wheelDelta * scrollSensitivity[scrollType]));
                    ext.helper.scroll.update(ext.elements.bookmarkBox["all"], true);
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
