($ => {
    "use strict";

    window.ScrollHelper = function (ext) {

        let scrollPosSaved = +new Date();
        let scrollBarTimeout = {};
        let scrollBoxes = [];
        let scrollBarHide = 0;

        /**
         * Initialize
         *
         * @returns {Promise}
         */
        this.init = async () => {
            let delayRaw = ext.helper.model.getData("b/scrollBarHide");
            scrollBarHide = +delayRaw * 1000;
        };

        /**
         * Creates a new scrollbox for the given element
         *
         * @param {int} id
         * @param {jsu} elm
         */
        this.add = (id, elm) => {
            let scrollBox = $("<div id='" + id + "' class='" + ext.opts.classes.scrollBox.wrapper + "' tabindex='0' />").insertBefore(elm);
            elm = elm.appendTo(scrollBox);

            scrollBox.data({
                list: elm
            });

            scrollBoxes.push(scrollBox);
            initEvents(scrollBox);

            return scrollBox;
        };

        /**
         * Sets the focus to the currently visible scrollbox to allow keyboard navigation (only if the search field is not focused)
         */
        this.focus = () => {
            if (ext.elements.iframe.hasClass(ext.opts.classes.page.visible)
                && ext.elements.header.find("div." + ext.opts.classes.sidebar.searchBox + " > input[type='text']")[0] !== ext.elements.iframe[0].contentDocument.activeElement) {
                scrollBoxes.forEach((scrollBox) => {
                    if (scrollBox.hasClass(ext.opts.classes.sidebar.active)) {
                        scrollBox[0].focus();
                    }
                });
            }
        };

        /**
         * Triggers the update method of all visible scrollboxes and optionally saves the scroll position afterwards,
         * important if the content height of the scrollbox has changed
         */
        this.updateAll = () => {
            scrollBoxes.forEach((scrollBox) => {
                if (scrollBox.hasClass(ext.opts.classes.sidebar.active)) {
                    this.update(scrollBox);
                }
            });
        };

        /**
         * Restores the scroll position from the storage if configurated so
         *
         * @param {jsu} scrollBox
         * @returns {Promise}
         */
        this.restoreScrollPos = (scrollBox) => {
            return new Promise((resolve) => {
                let data = ext.helper.model.getData(["b/rememberState", "u/scrollPos"]);

                if (data.rememberState === "all" || data.rememberState === "openStatesAndPos") {
                    this.setScrollPos(scrollBox, data.scrollPos[scrollBox.attr("id")] || 0);
                    $.delay(100).then(resolve);
                } else {
                    resolve();
                }
            });
        };

        /**
         * Updates the scroll position of the given scrollbox
         *
         * @param {jsu} scrollBox
         * @param {int} scrollPos
         * @param {int} duration if set the scroll position will be set animated to the given value
         */
        this.setScrollPos = (scrollBox, scrollPos, duration = 0) => {
            if (duration === 0) {
                scrollBox[0].scrollTop = scrollPos;
                this.update(scrollBox);
            } else {
                let scrollY = scrollBox[0].scrollTop;
                let currentTime = 0;

                let tick = () => {
                    currentTime += 1 / 60;

                    let p = currentTime / (duration / 1000);
                    let t = Math.sin(p * (Math.PI / 2));

                    if (p < 1) {
                        window.requestAnimationFrame(tick);

                        scrollBox[0].scrollTop = scrollY + ((scrollPos - scrollY) * t);
                    } else {
                        scrollBox[0].scrollTop = scrollPos;
                        this.update(scrollBox);
                    }
                };

                tick();
            }
        };

        /**
         * Returns the current scroll position of the given scrollbox
         *
         * @param {jsu} scrollBox
         * @returns {int}
         */
        this.getScrollPos = (scrollBox) => {
            return scrollBox[0].scrollTop;
        };

        /**
         * Triggers the update method of the given scrollbox and optionally saves the scroll position afterwards,
         * important if the content height of the scrollbox has changed
         *
         * @param {jsu} scrollBox
         */
        this.update = (scrollBox) => {
            ext.helper.contextmenu.close();
            ext.helper.tooltip.close();
            saveScrollPos(scrollBox);

            let boxHeight = getScrollBoxHeight(scrollBox);
            let contentHeight = getContentHeight(scrollBox);
            let scrollPos = scrollBox[0].scrollTop;

            if (scrollPos > 10) {
                scrollBox.addClass(ext.opts.classes.scrollBox.scrolled);
            } else {
                scrollBox.removeClass(ext.opts.classes.scrollBox.scrolled);
            }

            let lastScrollPos = scrollBox.data("lastPos") || 0; // determine scroll position by comparing current pos with the one before

            if (scrollPos > lastScrollPos) {
                scrollBox.attr(ext.opts.attr.direction, "down");
            } else if (scrollPos < lastScrollPos) {
                scrollBox.attr(ext.opts.attr.direction, "up");
            } else {
                scrollBox.removeAttr(ext.opts.attr.direction);
            }

            scrollBox.data("lastPos", scrollPos);

            if ((contentHeight - scrollPos < boxHeight * 2) || (contentHeight === scrollPos && boxHeight === 0)) {
                scrollBox.trigger(ext.opts.events.scrollBoxLastPart);
            }

            if (scrollBarHide > 0) {
                if (ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) { // hide scrollbar after the given delay
                    scrollBox.removeClass(ext.opts.classes.scrollBox.hideScrollbar);

                    clearTimeout(scrollBarTimeout[scrollBox.attr("id")]);
                    scrollBarTimeout[scrollBox.attr("id")] = setTimeout(() => {
                        scrollBox.addClass(ext.opts.classes.scrollBox.hideScrollbar);
                    }, scrollBarHide);
                } else {
                    scrollBox.addClass(ext.opts.classes.scrollBox.hideScrollbar);
                }
            }
            ext.helper.scroll.focus();
        };

        /**
         * Returns the content height of the given scrollbox
         *
         * @param scrollBox
         * @returns {number}
         */
        let getContentHeight = (scrollBox) => {
            let height = 0;
            scrollBox.children().forEach((elm) => {
                height += $(elm).realHeight(true);
            });
            return height;
        };

        /**
         * Saves the scroll position of the given scrollbox
         *
         * @param {jsu} scrollBox
         */
        let saveScrollPos = (scrollBox) => {
            if (ext.refreshRun === false && +new Date() - scrollPosSaved > 500) { // save scroll position in storage -> limit calls to one every half second (avoid MAX_WRITE_OPERATIONS_PER_MINUTE overflow)
                scrollPosSaved = +new Date();

                let scrollPos = ext.helper.model.getData("u/scrollPos");
                scrollPos[scrollBox.attr("id")] = scrollBox[0].scrollTop;

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
            scrollBox.on("scroll", () => {
                this.update(scrollBox);
            });
        };

    };

})(jsu);

