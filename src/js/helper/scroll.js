($ => {
    "use strict";

    window.ScrollHelper = function (ext) {

        let scrollPosSaved = +new Date();
        let scrollBarTimeout = {};
        let scrollBoxes = [];

        /**
         * Creates a new scrollbox for the given element
         *
         * @param {int} id
         * @param {jsu} elm
         */
        this.add = (id, elm) => {
            let scrollBox = $("<div id='" + id + "' class='" + ext.opts.classes.scrollBox.wrapper + "' />").insertBefore(elm);
            elm = elm.appendTo(scrollBox);

            let scrollbar = $("<div class='" + ext.opts.classes.scrollBox.scrollbar + "' />")
                .html("<div />")
                .appendTo(scrollBox);

            scrollBox.data({
                content: elm,
                scrollbar: scrollbar
            });

            scrollBoxes.push(scrollBox);
            initEvents(scrollBox);
            this.updateScrollbox(scrollBox, 0);

            return scrollBox;
        };

        /**
         * Triggers the update method of all visible scrollboxes and optionally saves the scroll position afterwards,
         * important if the content height of the scrollbox has changed
         *
         * @param {boolean} save
         */
        this.updateAll = (save = false) => {
            scrollBoxes.forEach((scrollBox) => {
                if (scrollBox.hasClass(ext.opts.classes.sidebar.active)) {
                    this.update(scrollBox, save);
                }
            });
        };

        /**
         * Triggers the update method of the given scrollbox and optionally saves the scroll position afterwards,
         * important if the content height of the scrollbox has changed
         *
         * @param {jsu} scrollBox
         * @param {boolean} save
         */
        this.update = (scrollBox, save = false) => {
            let scrollPos = scrollBox.data("scrollpos") || 0;
            this.updateScrollbox(scrollBox, scrollPos);

            if (save) {
                saveScrollPos(scrollBox);
            }
        };

        /**
         * Restores the scroll position from the storage if configurated so
         */
        this.restoreScrollPos = (scrollBox, callback) => {
            let data = ext.helper.model.getData(["b/rememberState", "u/scrollPos"]);

            if (data.rememberState === "all") {
                this.updateScrollbox(scrollBox, data.scrollPos[scrollBox.attr("id")] || 0);
                setTimeout(() => {
                    if (typeof callback === "function") {
                        callback();
                    }
                }, 100);
            } else if (typeof callback === "function") {
                callback();
            }
        };

        /**
         * Updates the scroll position of the given scrollbox
         *
         * @param {jsu} scrollBox
         */
        this.updateScrollbox = (scrollBox, scrollPos) => {
            ext.helper.contextmenu.close();

            let boxHeight = getScrollBoxHeight(scrollBox);
            let contentHeight = scrollBox.data("content").realHeight(true);

            scrollPos = Math.max(0, scrollPos);
            if (boxHeight >= contentHeight) { // content is higher than the box -> scrollpos = 0
                scrollBox.data("scrollbar").addClass(ext.opts.classes.scrollBox.inactive);
                scrollPos = 0;
            } else { // limits the scrollpos to the contents end
                scrollBox.data("scrollbar").removeClass(ext.opts.classes.scrollBox.inactive);

                if (scrollPos >= contentHeight - boxHeight) {
                    scrollPos = contentHeight - boxHeight;
                    scrollBox.addClass(ext.opts.classes.scrollBox.scrolledEnd);
                } else {
                    scrollBox.removeClass(ext.opts.classes.scrollBox.scrolledEnd);
                }
            }

            if (scrollPos > 10) {
                scrollBox.addClass(ext.opts.classes.scrollBox.scrolled);
            } else {
                scrollBox.removeClass(ext.opts.classes.scrollBox.scrolled);
            }

            let paddingTop = parseInt(scrollBox.data("scrollbar").css("padding-top"));
            let thumbPos = scrollPos / contentHeight * (boxHeight - paddingTop * 2) + paddingTop;

            scrollBox.data("scrollbar").removeClass(ext.opts.classes.scrollBox.hidden);
            scrollBox.data("scrollbar").find("> div").css({ // adjust scrollbar thumb
                height: ((boxHeight - paddingTop * 2) / contentHeight * 100) + "%",
                transform: "translate3d(0," + thumbPos + "px,0)"
            });

            scrollBox.data("scrollpos", scrollPos);
            scrollBox.data("content").css("transform", "translate3d(0,-" + scrollPos + "px,0)");

            clearTimeout(scrollBarTimeout[scrollBox.attr("id")]);
            scrollBarTimeout[scrollBox.attr("id")] = setTimeout(() => {
                scrollBox.data("scrollbar").addClass(ext.opts.classes.scrollBox.hidden);
            }, 1500);
        };

        /**
         * Saves the scroll position of the given scrollbox
         *
         * @param {jsu} scrollBox
         */
        let saveScrollPos = (scrollBox) => {
            if (ext.firstRun === false && +new Date() - scrollPosSaved > 500) { // save scroll position in storage -> limit calls to one every half second (avoid MAX_WRITE_OPERATIONS_PER_MINUTE overflow)
                scrollPosSaved = +new Date();

                let scrollPos = ext.helper.model.getData("u/scrollPos");
                scrollPos[scrollBox.attr("id")] = scrollBox.data("scrollpos") || 0;

                ext.helper.model.setData({
                    "u/scrollPos": scrollPos
                });
            }
        };

        /**
         * Returns the height of the given scrollbox
         *
         * @param {jsu} scrollBox
         * @returns {int}
         */
        let getScrollBoxHeight = (scrollBox) => {
            return scrollBox.realHeight() - parseInt(scrollBox.css("padding-top"));
        };

        /**
         * Initializes the eventhandlers for the given scrollbox
         *
         * @param {jsu} scrollBox
         */
        let initEvents = (scrollBox) => {
            let scrollbar = scrollBox.data("scrollbar");
            let scrollbarThumb = scrollbar.children("div");
            let scrollSensitivity = ext.helper.model.getData("b/scrollSensitivity");

            scrollBox.on('wheel', (e) => { // scroll through the list
                e.preventDefault();
                e.stopPropagation();

                let scrollPos = scrollBox.data("scrollpos") || 0;
                let scrollType = "mouse";

                if (Math.abs(e.wheelDelta) < 60) {
                    scrollType = "trackpad";
                    scrollBox.addClass(ext.opts.classes.scrollBox.scrollTrackpad);
                }

                this.updateScrollbox(scrollBox, scrollPos - (e.wheelDelta * scrollSensitivity[scrollType]));
                saveScrollPos(scrollBox);

                scrollBox.removeClass(ext.opts.classes.scrollBox.scrollTrackpad);
            });

            scrollbarThumb.on("mousedown", (e) => {
                e.preventDefault();
                e.stopPropagation();
                $(e.currentTarget).data("startPos", e.pageY - e.currentTarget.getBoundingClientRect().top);
            });


            scrollBox.document().on("mouseup", (e) => {
                e.preventDefault();
                e.stopPropagation();
                scrollBox.removeClass(ext.opts.classes.scrollBox.scrollDrag);
                scrollbarThumb.removeData("startPos");
            });

            scrollBox.document().on("mousemove", (e) => {
                let startPos = scrollbarThumb.data("startPos");

                if (startPos) {
                    if (!scrollBox.hasClass(ext.opts.classes.scrollBox.scrollDrag)) {
                        scrollBox.addClass(ext.opts.classes.scrollBox.scrollDrag);
                    }

                    let contentHeight = scrollBox.data("content").realHeight();
                    let currentPos = Math.max(0, e.pageY - scrollbar[0].getBoundingClientRect().top - startPos);
                    this.updateScrollbox(scrollBox, currentPos * contentHeight / getScrollBoxHeight(scrollBox));
                }
            });
        };

    };

})(jsu);

