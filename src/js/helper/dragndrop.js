($ => {
    "use strict";

    window.DragDropHelper = function (ext) {

        let scrollSensitivity = null;

        /**
         * Initializes the events for the drag n drop functionality
         */
        this.init = () => {
            ext.helper.model.getConfig("scrollSensitivity", (scrollSensitivityStr) => { // user config
                scrollSensitivity = JSON.parse(scrollSensitivityStr);
            }, (scrollSensitivityStr) => { // default config
                scrollSensitivity = JSON.parse(scrollSensitivityStr);
            });

            initEvents();
        };

        /**
         * Checks if the dragged element is outside of the sidebar, so the mouseup will cause an abort and not a repositioning
         *
         * @param {jsu} elm
         * @returns {boolean}
         */
        let isDraggedElementOutside = (elm) => {
            let boundClientRect = elm[0].getBoundingClientRect();
            return elm.realWidth() * 0.6 + boundClientRect.left > ext.elements.sidebar.realWidth();
        };

        /**
         * Initializes the eventhandlers for the dragDrop functionality of the bookmarks
         */
        let initEvents = () => {

            ext.elements.bookmarkBox["all"].children("ul").on("mousedown", "span." + ext.opts.classes.drag.trigger, (e) => { // drag start
                ext.helper.contextmenu.close();
                let elm = $(e.currentTarget).parent("a").removeClass(ext.opts.classes.sidebar.dirOpened);
                let elmParent = elm.parent("li");

                ext.elements.iframeBody.addClass(ext.opts.classes.drag.isDragged);
                elmParent.clone().addClass(ext.opts.classes.drag.dragInitial).insertAfter(elmParent);
                let helper = elm.clone().appendTo(ext.elements.iframeBody);

                let boundClientRect = elm[0].getBoundingClientRect();

                helper.removeAttr("title").css({
                    top: boundClientRect.top + "px",
                    left: boundClientRect.left + "px",
                    width: elm.realWidth() + "px"
                }).data({
                    elm: elmParent,
                    isDir: !!(elm.data("infos").children),
                    startPos: {
                        top: e.pageY - boundClientRect.top,
                        left: e.pageX - boundClientRect.left
                    }
                }).addClass(ext.opts.classes.drag.helper);

                elmParent.addClass(ext.opts.classes.drag.isDragged);
            });


            ext.elements.iframeBody.on("mouseup", (e) => { // drag end
                if (ext.elements.iframeBody.hasClass(ext.opts.classes.drag.isDragged)) { // bookmark has been dragged
                    e.preventDefault();
                    e.stopPropagation();

                    let draggedElm = ext.elements.iframeBody.children("a." + ext.opts.classes.drag.helper);
                    let dragInitialElm = ext.elements.iframeBody.find("li." + ext.opts.classes.drag.dragInitial);
                    let entryElm = draggedElm.data("elm");

                    if (isDraggedElementOutside(draggedElm)) {// cancel drop if mouse position is of the sidebar
                        entryElm.insertAfter(dragInitialElm).removeClass(ext.opts.classes.drag.isDragged);
                        dragInitialElm.remove();
                        draggedElm.remove();
                    } else { // animate the helper back to the new position and save it
                        draggedElm.addClass(ext.opts.classes.drag.snap);

                        let entryInfos = entryElm.children("a").data("infos");
                        let parentInfos = entryElm.parent("ul").prev("a").data("infos");
                        let idx = entryElm.prevAll("li").length();

                        ext.helper.model.call("moveBookmark", {
                            id: entryInfos.id,
                            parentId: parentInfos.id,
                            index: idx
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
                }
            });


            ext.elements.iframeBody.on('wheel', "a." + ext.opts.classes.drag.helper, (e) => { // scroll the bookmark list
                e.preventDefault();
                e.stopPropagation();

                let scrollPos = ext.elements.bookmarkBox["all"].data("scrollpos") || 0;
                let scrollType = Math.abs(e.wheelDelta) < 60 ? "trackpad" : "mouse";

                ext.elements.bookmarkBox["all"].data("scrollpos", scrollPos - (e.wheelDelta * scrollSensitivity[scrollType]));
                ext.helper.scroll.update(ext.elements.bookmarkBox["all"]);
            });


            ext.elements.iframe.find("body").on("mousemove", (e) => { // drag move
                if (ext.elements.iframeBody.hasClass(ext.opts.classes.drag.isDragged) && e.which === 1) {
                    e.preventDefault();
                    e.stopPropagation();

                    let draggedElm = ext.elements.iframeBody.children("a." + ext.opts.classes.drag.helper);
                    let startPos = draggedElm.data("startPos");
                    let topVal = e.pageY - startPos.top;
                    let leftVal = e.pageX - startPos.left;

                    draggedElm.css({
                        top: topVal + "px",
                        left: leftVal + "px"
                    });


                    if (isDraggedElementOutside(draggedElm)) { // dragged outside the sidebar -> mouseup will cancel
                        ext.elements.iframeBody.addClass(ext.opts.classes.drag.cancel);
                    } else {
                        ext.elements.iframeBody.removeClass(ext.opts.classes.drag.cancel);
                    }

                    let newAboveElm = null;
                    let bookmarkElm = draggedElm.data("elm");

                    $([
                        ext.elements.bookmarkBox["all"].find("> ul > li > a." + ext.opts.classes.sidebar.dirOpened).parent("li"),
                        ext.elements.bookmarkBox["all"].find("a." + ext.opts.classes.sidebar.dirOpened + " + ul > li")
                    ]).forEach((node) => {
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


                    if (newAboveElm) {
                        let newAboveLink = newAboveElm.children("a").eq(0);

                        if (newAboveLink.hasClass(ext.opts.classes.sidebar.bookmarkDir)) {
                            if (newAboveLink.hasClass(ext.opts.classes.sidebar.dirOpened)) {
                                draggedElm.data("elm", bookmarkElm.prependTo(newAboveLink.next("ul")));
                            } else if (draggedElm.data("isDir")) {
                                draggedElm.data("elm", bookmarkElm.insertAfter(newAboveElm));
                            } else if (!newAboveLink.hasClass(ext.opts.classes.sidebar.dirAnimated)) {
                                ext.helper.sidebarEvents.toggleBookmarkDir(newAboveLink);
                            }
                        } else {
                            draggedElm.data("elm", bookmarkElm.insertAfter(newAboveElm));
                        }
                    }
                }
            });


            ext.elements.iframeBody.on('contextmenu', "a." + ext.opts.classes.drag.helper, (e) => { // disable right click or the drag handle
                e.preventDefault();
                e.stopPropagation();
            });
        };
    };

})(jsu);
