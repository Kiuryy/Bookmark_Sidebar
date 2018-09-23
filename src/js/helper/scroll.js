($ => {
    "use strict";

    /**
     * @requires helper: model, contextmenu, tooltip, toggle
     * @param {object} ext
     * @constructor
     */
    $.ScrollHelper = function (ext) {

        let scrollPosSaved = +new Date();
        const scrollBarTimeout = {};
        const scrollBoxes = [];
        let scrollBarHide = 0;

        /**
         * Initialize
         *
         * @returns {Promise}
         */
        this.init = () => {
            const delayRaw = ext.helper.model.getData("b/scrollBarHide");
            scrollBarHide = +delayRaw * 1000;
        };

        /**
         * Creates a new scrollbox for the given element
         *
         * @param {int} id
         * @param {jsu} elm
         */
        this.add = (id, elm) => {
            const scrollBox = $("<div id='" + id + "' class='" + $.cl.scrollBox.wrapper + "' tabindex='0' />").insertBefore(elm);
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
            if (ext.elm.iframe.hasClass($.cl.page.visible) &&
                ext.elm.iframe[0].contentDocument !== null &&
                ext.helper.toggle.sidebarHoveredOnce() &&
                ext.elm.header.find("div." + $.cl.sidebar.searchBox + " > input[type='text']")[0] !== ext.elm.iframe[0].contentDocument.activeElement) {
                scrollBoxes.forEach((scrollBox) => {
                    if (scrollBox.hasClass($.cl.active)) {
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
                if (scrollBox.hasClass($.cl.active)) {
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
                const data = ext.helper.model.getData(["b/rememberState", "u/scrollPos"]);

                if (data.rememberState === "all" || data.rememberState === "openStatesAndPos") {
                    this.setScrollPos(scrollBox, data.scrollPos);
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
            if (typeof scrollPos !== "number") { // @deprecated scrollPos is no longer an object, but an integer (06/2018)
                try {
                    scrollPos = scrollPos.bookmarkBox || 0;
                } catch (e) {
                    scrollPos = 0;
                }
            }

            if (duration === 0) {
                scrollBox[0].scrollTop = scrollPos;
                this.update(scrollBox);
            } else {
                const scrollY = scrollBox[0].scrollTop;
                let currentTime = 0;

                const tick = () => {
                    currentTime += 1 / 60;

                    const p = currentTime / (duration / 1000);
                    const t = Math.sin(p * (Math.PI / 2));

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

            const boxHeight = getScrollBoxHeight(scrollBox);
            const contentHeight = getContentHeight(scrollBox);
            const scrollPos = scrollBox[0].scrollTop;

            if (scrollBox.attr("id") === $.opts.ids.sidebar.bookmarkBox.all) {
                saveScrollPos(scrollPos);
            }

            if (scrollPos > 10) {
                scrollBox.addClass($.cl.scrollBox.scrolled);
            } else {
                scrollBox.removeClass($.cl.scrollBox.scrolled);
            }

            const lastScrollPos = scrollBox.data("lastPos") || 0; // determine scroll position by comparing current pos with the one before

            if (scrollPos > lastScrollPos) {
                scrollBox.attr($.attr.direction, "down");
            } else if (scrollPos < lastScrollPos) {
                scrollBox.attr($.attr.direction, "up");
            } else {
                scrollBox.removeAttr($.attr.direction);
            }

            scrollBox.data("lastPos", scrollPos);

            if ((contentHeight - scrollPos < boxHeight * 2) || (contentHeight === scrollPos && boxHeight === 0)) {
                scrollBox.trigger($.opts.events.scrollBoxLastPart);
            }

            if (scrollBarHide > 0) {
                if (ext.elm.iframe.hasClass($.cl.page.visible)) { // hide scrollbar after the given delay
                    scrollBox.removeClass($.cl.scrollBox.hideScrollbar);

                    clearTimeout(scrollBarTimeout[scrollBox.attr("id")]);
                    scrollBarTimeout[scrollBox.attr("id")] = setTimeout(() => {
                        scrollBox.addClass($.cl.scrollBox.hideScrollbar);
                    }, scrollBarHide);
                } else {
                    scrollBox.addClass($.cl.scrollBox.hideScrollbar);
                }
            }
            this.focus();
        };

        /**
         * Returns the content height of the given scrollbox
         *
         * @param scrollBox
         * @returns {number}
         */
        const getContentHeight = (scrollBox) => {
            let height = 0;
            scrollBox.children().forEach((elm) => {
                height += $(elm).realHeight(true);
            });
            return height;
        };

        /**
         * Saves the given scroll position in the local storage
         *
         * @param {int} scrollPos
         */
        const saveScrollPos = (scrollPos) => {
            if (ext.refreshRun === false) {
                clearTimeout(scrollBarTimeout._scrollPos);

                if (+new Date() - scrollPosSaved > 500) { // limit calls to one every half of a second (avoid MAX_WRITE_OPERATIONS_PER_MINUTE overflow)
                    scrollPosSaved = +new Date();
                    ext.helper.model.setData({"u/scrollPos": scrollPos});
                } else { // try again after half of a second
                    scrollBarTimeout._scrollPos = setTimeout(() => {
                        saveScrollPos(scrollPos);
                    }, 500);
                }
            }
        };

        /**
         * Returns the height of the given scrollbox
         *
         * @param {jsu} scrollBox
         * @returns {int}
         */
        const getScrollBoxHeight = (scrollBox) => {
            return scrollBox.realHeight() - parseInt(scrollBox.css("padding-top"));
        };

        /**
         * Initializes the eventhandlers for the given scrollbox
         *
         * @param {jsu} scrollBox
         */
        const initEvents = (scrollBox) => {
            scrollBox.on("scroll", () => {
                this.update(scrollBox);
            });
        };

    };

})(jsu);

