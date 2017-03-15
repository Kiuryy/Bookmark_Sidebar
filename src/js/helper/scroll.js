($ => {
    "use strict";

    window.ScrollHelper = function (ext) {

        let scrollPosSaved = +new Date();
        let scrollBarTimeout = {};
        let scrollSensitivity = null;

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

            ext.helper.model.getConfig("scrollSensitivity", (scrollSensitivityStr) => { // user config
                scrollSensitivity = JSON.parse(scrollSensitivityStr);
            }, (scrollSensitivityStr) => { // default config
                scrollSensitivity = JSON.parse(scrollSensitivityStr);
            });

            initEvents(scrollBox);
            updateScrollbox(scrollBox, 0);
            return scrollBox;
        };

        /**
         * Triggers the update method of the given scrollbox and optionally saves the scroll position afterwards,
         * important if the content height of the scrollbox has changed
         *
         * @param {jsu} scrollBox
         * @param {boolean} save
         */
        this.update = (scrollBox, save) => {
            let scrollPos = scrollBox.data("scrollpos") || 0;
            updateScrollbox(scrollBox, scrollPos);

            if (save) {
                saveScrollPos(scrollBox);
            }
        };

        /**
         * Restores the scroll position from the storage if configurated so
         */
        this.restoreScrollPos = (scrollBox, callback) => {
            ext.helper.model.getConfig(["rememberScroll", "scrollPos"], (obj) => {
                if (obj.rememberScroll === "y") {
                    let scrollPosObj = JSON.parse(obj.scrollPos);
                    updateScrollbox(scrollBox, scrollPosObj[scrollBox.attr("id")] || 0);
                    setTimeout(() => {
                        if (typeof callback === "function") {
                            callback();
                        }
                    }, 100)
                } else {
                    if (typeof callback === "function") {
                        callback();
                    }
                }
            });
        };

        /**
         * Saves the scroll position of the given scrollbox
         *
         * @param {jsu} scrollBox
         */
        let saveScrollPos = (scrollBox) => {
            if (ext.firstRun === false && +new Date() - scrollPosSaved > 500) { // save scroll position in storage -> limit calls to one every half second (avoid MAX_WRITE_OPERATIONS_PER_MINUTE overflow)

                ext.helper.model.getConfig("scrollPos", (scrollPosJson) => {
                    scrollPosSaved = +new Date();
                    let scrollPosObj = JSON.parse(scrollPosJson);
                    scrollPosObj[scrollBox.attr("id")] = scrollBox.data("scrollpos") || 0;

                    ext.helper.model.setConfig({
                        scrollPos: JSON.stringify(scrollPosObj)
                    });
                });
            }
        };

        /**
         * Updates the scroll position of the given scrollbox
         *
         * @param {jsu} scrollBox
         */
        let updateScrollbox = (scrollBox, scrollPos) => {
            ext.helper.contextmenu.close();

            let boxHeight = scrollBox.realHeight();
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
         * Initializes the eventhandlers for the given scrollbox
         *
         * @param {jsu} scrollBox
         */
        let initEvents = (scrollBox) => {
            scrollBox.on('wheel', (e) => { // scroll through the list
                e.preventDefault();
                e.stopPropagation();

                let scrollPos = scrollBox.data("scrollpos") || 0;
                let scrollType = "mouse";

                if (Math.abs(e.wheelDelta) < 60) {
                    scrollType = "trackpad";
                    scrollBox.addClass(ext.opts.classes.scrollBox.scrollTrackpad);
                }

                updateScrollbox(scrollBox, scrollPos - (e.wheelDelta * scrollSensitivity[scrollType]));
                saveScrollPos(scrollBox);

                scrollBox.removeClass(ext.opts.classes.scrollBox.scrollTrackpad);
            });

            scrollBox.data("scrollbar").children("div").on("mousedown", (e) => {
                e.preventDefault();
                e.stopPropagation();
                $(e.currentTarget).data("startPos", e.pageY - e.currentTarget.getBoundingClientRect().top);
            });

            scrollBox.document().on("mouseup", (e) => {
                e.preventDefault();
                e.stopPropagation();
                scrollBox.removeClass(ext.opts.classes.scrollBox.scrollDrag);
                scrollBox.data("scrollbar").children("div").removeData("startPos");
            });

            scrollBox.document().on("mousemove", (e) => {
                let scrollbarThumb = scrollBox.data("scrollbar").children("div");
                let startPos = scrollbarThumb.data("startPos");

                if (startPos) {
                    if (!scrollBox.hasClass(ext.opts.classes.scrollBox.scrollDrag)) {
                        scrollBox.addClass(ext.opts.classes.scrollBox.scrollDrag);
                    }

                    let boxHeight = scrollBox.realHeight();
                    let contentHeight = scrollBox.data("content").realHeight();
                    let currentPos = Math.max(0, e.pageY - scrollBox[0].getBoundingClientRect().top - startPos);

                    updateScrollbox(scrollBox, currentPos * contentHeight / boxHeight);
                }
            });
        };

    };

})(jsu);

