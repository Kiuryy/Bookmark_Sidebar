($ => {
    "use strict";

    window.ToggleHelper = function (ext) {

        let sidebarPos = null;
        let pxToleranceObj = null;
        let preventPageScroll = null;
        let openDelay = 0;
        let indicatorWidth = null;
        let inPixelToleranceTime = null;
        let timeout = {};

        /**
         * Initializes the sidebar toggle
         */
        this.init = () => {
            ext.elements.toggle = $("<div />").attr("id", ext.opts.ids.page.indicator).appendTo("body");

            let data = ext.helper.model.getData(["b/pxTolerance", "b/preventPageScroll", "a/showIndicator", "a/showIndicatorIcon", "a/styles", "a/sidebarPosition", "b/openDelay", "b/openAction", "b/initialOpenOnNewTab"]);
            pxToleranceObj = data.pxTolerance;
            openDelay = +data.openDelay * 1000;
            sidebarPos = data.sidebarPosition;
            preventPageScroll = data.preventPageScroll;

            ext.elements.toggle.css("width", getPixelTolerance() + "px");
            ext.elements.iframe.attr(ext.opts.attr.position, sidebarPos);
            ext.elements.sidebar.attr(ext.opts.attr.position, sidebarPos);

            if (data.styles && data.styles.indicatorWidth) {
                indicatorWidth = parseInt(data.styles.indicatorWidth);
            }

            if (data.showIndicator && data.openAction !== "icon" && data.openAction !== "mousemove") { // show indicator
                ext.elements.toggle
                    .addClass(ext.opts.classes.page.visible)
                    .attr(ext.opts.attr.position, sidebarPos);

                if (data.showIndicatorIcon) {
                    ext.elements.toggle.addClass(ext.opts.classes.page.indicatorIcon);
                }
            }

            handleLeftsideBackExtension();
            initEvents();

            if (ext.isNewTab) {
                ext.elements.toggle.addClass(ext.opts.classes.page.isNewTab);
                ext.elements.iframe.addClass(ext.opts.classes.page.isNewTab);

                if (data.initialOpenOnNewTab) {
                    openSidebar();
                }
            }
        };

        /**
         * Return the amount of pixel in which range the sidebar will open if the user clicks
         *
         * @returns {int}
         */
        let getPixelTolerance = () => {
            return pxToleranceObj[ext.isWindowed() ? "windowed" : "maximized"];
        };

        /**
         * Initializes the events to show and hide the bookmark sidebar
         */
        let initEvents = () => {
            $(window).on("resize", () => {
                ext.elements.toggle.css("width", getPixelTolerance() + "px");
            });

            ext.elements.iframe.find("body").on("click", (e) => { // click outside the sidebar -> close
                if (e.pageX) {
                    let pageX = e.pageX;
                    if (sidebarPos === "right") {
                        if (ext.isNewTab) {
                            pageX = ext.elements.iframe.realWidth() - pageX;
                        } else {
                            pageX = window.innerWidth - pageX + ext.elements.sidebar.realWidth() - 1;
                        }
                    }
                    if (pageX > ext.elements.sidebar.realWidth() && ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) {
                        closeSidebar();
                    }
                }
            });

            $(document).on("click", (e) => { // click somewhere in the underlying page -> close
                if (e.isTrusted) {
                    closeSidebar();
                }
            });

            ext.elements.sidebar.on("mouseleave", () => {
                if ($("iframe#" + ext.opts.ids.page.overlay).length() === 0
                    && ext.elements.iframeBody.hasClass(ext.opts.classes.drag.isDragged) === false
                ) {
                    let closeTimeoutRaw = ext.helper.model.getData("b/closeTimeout");

                    if (+closeTimeoutRaw !== -1) { // timeout only if value > -1
                        timeout.close = setTimeout(() => {
                            if (ext.elements.iframeBody.hasClass(ext.opts.classes.drag.isDragged) === false) {
                                closeSidebar();
                            }
                        }, +closeTimeoutRaw * 1000);
                    }
                }
            }).on("mouseenter", () => {
                clearSidebarTimeout("close");
            });

            $([document, ext.elements.iframe[0].contentDocument]).on("keydown", (e) => {
                if ((e.key === "Escape" || e.key === "Esc") && ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) { // close when hitting esc
                    e.preventDefault();
                    closeSidebar();
                }
            });

            $(document).on("visibilitychange", () => { // tab changed -> if current tab is hidden and no overlay opened hide the sidebar
                if (document.hidden && $("iframe#" + ext.opts.ids.page.overlay).length() === 0) {
                    ext.elements.toggle.removeClass(ext.opts.classes.page.hover);

                    if (ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) {
                        closeSidebar();
                    }
                }
            }).on("mouseout", () => {
                clearSidebarTimeout("open");
            }).on("mousemove dragover", (e) => { // check mouse position
                if (e.isTrusted && isMousePosInPixelTolerance(e.pageX)) {
                    let inPixelToleranceDelay = +new Date() - (inPixelToleranceTime || 0);

                    if (!(timeout.indicator)) {
                        timeout.indicator = setTimeout(() => { // wait the duration of the open delay before showing the indicator
                            ext.elements.toggle.addClass(ext.opts.classes.page.hover);
                        }, Math.max(openDelay - inPixelToleranceDelay, 0));
                    }
                } else {
                    clearSidebarTimeout("indicator");
                    ext.elements.toggle.removeClass(ext.opts.classes.page.hover);
                }
            }, {passive: true});

            chrome.extension.onMessage.addListener((message) => {
                if (message && message.action && message.action === "toggleSidebar") { // click on the icon in the chrome menu
                    if (ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) {
                        closeSidebar();
                    } else {
                        openSidebar();
                    }
                }
            });

            let openAction = ext.helper.model.getData("b/openAction");

            if (openAction !== "icon") {
                $(document).on(openAction + " dragover", (e) => {
                    if (e.isTrusted && (e.type === "dragover" || openAction !== "mousedown" || e.button === 0) && isMousePosInPixelTolerance(e.pageX)) { // check mouse position and mouse button
                        e.stopPropagation();
                        e.preventDefault();

                        if (openAction === "mousemove") {
                            if (!(timeout.open)) {
                                timeout.open = setTimeout(() => {
                                    openSidebar();
                                }, openDelay);
                            }
                        } else if (openDelay === 0 || inPixelToleranceTime === null || +new Date() - inPixelToleranceTime > openDelay) { // open delay = 0 or cursor is longer in pixel tolerance range than the delay -> open sidebar
                            openSidebar();
                        }
                    } else {
                        clearSidebarTimeout("open");
                    }
                });
            }
        };

        /**
         * Checks whether the given mouse position is in the configured pixel tolence
         *
         * @param {int} pageX
         * @returns {boolean}
         */
        let isMousePosInPixelTolerance = (pageX) => {
            let ret = false;
            if (typeof pageX !== "undefined" && pageX !== null) {
                if (sidebarPos === "right") {
                    pageX = window.innerWidth - pageX - 1;
                }

                let pixelTolerance = getPixelTolerance();

                if (ext.elements.toggle.hasClass(ext.opts.classes.page.hover) && indicatorWidth > pixelTolerance) { // indicator is visible -> allow click across the indicator width if it is wider then the pixel tolerance
                    pixelTolerance = indicatorWidth;
                }

                ret = pageX < pixelTolerance;
            }

            if (ret === false) {
                inPixelToleranceTime = null;
            } else if (inPixelToleranceTime === null) { // set the time when the cursor was in pixel tolerance the last time
                inPixelToleranceTime = +new Date();
            }

            return ret;
        };

        /**
         * Clears the given timeout
         *
         * @param {string} name
         */
        let clearSidebarTimeout = (name) => {
            if (timeout[name]) {
                clearTimeout(timeout[name]);
                timeout[name] = null;
            }
        };

        /**
         * Closes the sidebar
         */
        let closeSidebar = () => {
            clearSidebarTimeout("close");
            clearSidebarTimeout("open");
            ext.helper.contextmenu.close();
            ext.elements.iframe.removeClass(ext.opts.classes.page.visible);
            $("body").removeClass(ext.opts.classes.page.noscroll);
            $(document).trigger("mousemove"); // hide indicator
        };

        /**
         * Opens the sidebar
         */
        let openSidebar = () => {
            ext.helper.model.call("shareUserdataMask", (opts) => { // check whether to show the share userdata mask or not
                if (opts && opts.showMask) {
                    ext.addShareUserdataMask();
                } else {
                    ext.elements.sidebar.find("#" + ext.opts.ids.sidebar.shareUserdata).remove();
                }
            });

            ext.elements.iframe.addClass(ext.opts.classes.page.visible);
            ext.elements.sidebar.addClass(ext.opts.classes.sidebar.openedOnce);
            ext.initImages();

            if (preventPageScroll) {
                $("body").addClass(ext.opts.classes.page.noscroll);
            }

            $(document).trigger("mousemove"); // hide indicator
        };

        /**
         * Checks whether the user has also the Leftsideback-Extension enabled and if so set an additional class to the visual element
         */
        let handleLeftsideBackExtension = () => {
            if ($(ext.opts.leftsideBackSelector).length() > 0) { // Extension already loaded
                ext.elements.toggle.addClass(ext.opts.classes.page.hasLeftsideBack);
            } else {
                $(document).on(ext.opts.events.lsbLoaded, (e) => { // Extension is now loaded
                    if (e.detail.showIndicator) {
                        ext.elements.toggle.addClass(ext.opts.classes.page.hasLeftsideBack);
                    }
                });
            }
        };

    };

})(jsu);
