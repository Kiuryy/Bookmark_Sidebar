($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.ToggleHelper = function (ext) {
        const toggleArea = {};
        const timeout = {};

        let openDelay = 0;
        let mouseNotTopLeft = false;
        let hoveredOnce = false;
        let sidebarPos = null;
        let preventPageScroll = null;
        let preventWindowed = null;
        let preventWebapp = null;
        let indicatorWidth = null;
        let sidebarWidth = null;
        let inPixelToleranceTime = null;
        let keypressed = null;
        let refocusWebsite = null;
        let lastFocussed = null;

        /**
         * Initializes the sidebar toggle
         *
         * @returns {Promise}
         */
        this.init = async () => {
            const data = ext.helper.model.getData(["a/theme", "b/toggleArea", "b/preventPageScroll", "a/showIndicator", "a/showIndicatorIcon", "a/styles", "b/sidebarPosition", "b/openDelay", "b/openAction", "b/preventWindowed", "b/preventWebapp", "b/refocusWebsite", "n/autoOpen"]);
            const pageType = ext.helper.utility.getPageType();

            ext.elm.indicator = $("<div></div>")
                .attr("id", $.opts.ids.page.indicator)
                .attr($.attr.theme, data.theme)
                .appendTo("body");

            if (ext.helper.model.getData("b/animations") === false) {
                ext.elm.indicator.addClass($.cl.page.noAnimations);
            }

            if (document.activeElement) {
                lastFocussed = document.activeElement;
            }

            Object.entries(data.toggleArea).forEach(([key, val]) => {
                toggleArea[key] = +val;
            });

            openDelay = +data.openDelay * 1000;
            sidebarPos = pageType === "sidepanel" ? "right" : data.sidebarPosition;
            preventPageScroll = data.preventPageScroll;
            preventWindowed = data.preventWindowed;
            preventWebapp = data.preventWebapp;
            refocusWebsite = data.refocusWebsite;

            ext.elm.indicator.css({
                height: toggleArea.height + "%",
                top: toggleArea.top + "%"
            });

            if (toggleArea.height === 100) {
                ext.elm.indicator.addClass($.cl.page.fullHeight);
            }

            ext.elm.iframe.attr($.attr.position, sidebarPos);
            ext.elm.sidebar.attr($.attr.position, sidebarPos);

            if (data.styles) {
                if (data.styles.indicatorWidth) {
                    indicatorWidth = parseInt(data.styles.indicatorWidth);
                }
                if (data.styles.sidebarWidth) {
                    sidebarWidth = parseInt(data.styles.sidebarWidth);
                }
            }

            if (data.showIndicator && pageType !== "sidepanel" && data.openAction !== "icon" && data.openAction !== "mousemove") { // show indicator
                ext.elm.indicator.html("<div></div>").attr($.attr.position, sidebarPos);

                if (data.showIndicatorIcon) { // show indicator icon
                    $("<span></span>").appendTo(ext.elm.indicator.children("div"));
                }

                $.delay(50).then(() => { // delay to prevent indicator beeing visible initial
                    ext.elm.indicator.addClass($.cl.page.visible);
                });
            }

            handleLeftsideBackExtension();
            initEvents();

            if (((pageType === "newtab_replacement" || pageType === "newtab_fallback") && data.autoOpen) || pageType === "sidepanel") {
                this.openSidebar();
            }

            if (sidebarHasMask() === false) {
                ext.elm.iframe.addClass($.cl.page.hideMask);
            }
        };

        /**
         * Closes the sidebar
         */
        this.closeSidebar = () => {
            if (ext.elm.sidebar.hasClass($.cl.sidebar.permanent)) {
                // don't close sidebar when configured to be automatically opened on the newtab page
            } else {
                clearSidebarTimeout("close");
                clearSidebarTimeout("open");
                ext.helper.contextmenu.close();
                ext.helper.tooltip.close();
                ext.helper.dragndrop.cancel();

                ext.elm.iframe.removeClass($.cl.page.visible);
                $("body").removeClass($.cl.page.noscroll);
                clearSidebarTimeout("indicator");
                ext.elm.indicator.removeClass($.cl.page.hover);

                if (refocusWebsite && lastFocussed && typeof lastFocussed.focus === "function") { // try to restore the focus on the website
                    lastFocussed.focus({
                        preventScroll: true
                    });
                }
            }
        };

        /**
         * Opens the sidebar
         */
        this.openSidebar = () => {
            ext.helper.model.call("infoToDisplay").then((opts) => { // check whether to show any info to the user
                if (opts && opts.info) {
                    if (opts.info === "shareInfo" || opts.info === "premium" || opts.info === "translation") {
                        ext.addInfoBox(opts.info);
                    }
                }
            });

            if (!ext.elm.sidebar.hasClass($.cl.sidebar.openedOnce)) { // first time open -> mark last used bookmark and set html class
                ext.elm.sidebar.addClass($.cl.sidebar.openedOnce);
                ext.helper.list.handleSidebarWidthChange();
                this.markLastUsed();
            }

            if (!ext.elm.iframe.hasClass($.cl.page.visible)) {
                ext.helper.model.call("track", {
                    name: "action",
                    value: {name: "sidebar", value: ext.helper.utility.getPageType()}
                });
            }

            ext.elm.iframe.addClass($.cl.page.visible);
            ext.initImages();

            if (preventPageScroll) {
                $("body").addClass($.cl.page.noscroll);
            }

            $.delay(ext.helper.model.getData("b/animations") ? 300 : 0).then(() => { // initialise entries if not already done -> necessary for clicking entries, tooltips, etc.
                return ext.helper.entry.initOnce();
            }).then(() => {
                ext.helper.scroll.focus();
            });

            $(document).trigger("mousemove.bs"); // hide indicator
            ext.helper.utility.triggerEvent("sidebarOpened");
        };

        /**
         * Marks the last used bookmark in the list if the according configuration is set
         */
        this.markLastUsed = (fromBookmarkClick = false) => {
            const data = ext.helper.model.getData(["u/lastOpened", "b/rememberState"]);

            if (data.rememberState === "all" && data.lastOpened) { // mark last opened bookmark if there is one and user set so in the options
                ext.elm.bookmarkBox.all.find("ul > li > a." + $.cl.sidebar.mark).removeClass($.cl.sidebar.mark);
                const entry = ext.elm.bookmarkBox.all.find("ul > li > a[" + $.attr.id + "='" + data.lastOpened + "']");

                if (entry && entry.length() > 0) {
                    entry.addClass($.cl.sidebar.mark);

                    if (!fromBookmarkClick) {
                        ext.helper.model.setData({"u/lastOpened": null});
                    }
                }
            }
        };

        /**
         * Returns whether the sidebar was hovered by the user already
         *
         * @returns {boolean}
         */
        this.sidebarHoveredOnce = () => hoveredOnce;

        /**
         * Sets the variable whether the sidebar was hovered by the user to true,
         * will be called by the hotkey callback for example, to allow navigating with the keyboard after opening the sidebar with the hotkey
         */
        this.setSidebarHoveredOnce = () => {
            hoveredOnce = true;
        };

        /**
         * Adds the hover class to the iframe,
         * will expand the width of the iframe to 100%, when the mask is hidden (e.g. on the newtab page)
         */
        this.addSidebarHoverClass = () => {
            ext.elm.iframe.addClass($.cl.page.hover);
            ext.elm.iframe.css("width", "");
            hoveredOnce = true;
        };

        /**
         * Removes the hover class from the iframe,
         * will collapse the width of the iframe back to the width of the sidebar, when the mask is hidden (e.g. on the newtab page)
         */
        this.removeSidebarHoverClass = () => {
            const contextmenus = ext.elm.iframeBody.find("div." + $.cl.contextmenu.wrapper);
            const tooltips = ext.elm.iframeBody.find("div." + $.cl.tooltip.wrapper);

            if (
                contextmenus.length() === 0 &&
                tooltips.length() === 0 &&
                !ext.elm.iframeBody.hasClass($.cl.drag.isDragged) &&
                !ext.elm.widthDrag.hasClass($.cl.drag.isDragged) &&
                !ext.elm.widthDrag.hasClass($.cl.hover) &&
                !ext.elm.lockPinned.hasClass($.cl.active)
            ) {
                ext.elm.iframe.removeClass($.cl.page.hover);

                const dataWidth = ext.elm.iframe.data("width");
                if (dataWidth) { // user dragged the sidebar width -> don't take the iframe width of the css file, but from the data attribute
                    ext.elm.iframe.css("width", dataWidth + "px");
                }
            }
        };

        /**
         * Initializes the events to show and hide the bookmark sidebar
         *
         * @returns {Promise}
         */
        const initEvents = async () => {
            $(document).on("focus", "input,textarea", (e) => { // save the last focussed form element of the website -> will be restored when closing the sidebar
                lastFocussed = e.target;
            }, {capture: true});

            ext.elm.iframeBody.on("click", (e) => { // click outside the sidebar -> close
                if (e.clientX) {
                    let clientX = e.clientX;
                    const curSidebarWidth = ext.elm.sidebar.realWidth();

                    if (sidebarPos === "right") {
                        if (sidebarHasMask()) {
                            clientX = window.innerWidth - clientX + (sidebarWidth || curSidebarWidth) - 1;
                        } else {
                            clientX = ext.elm.iframe.realWidth() - clientX;
                        }
                    }

                    if (
                        clientX > curSidebarWidth &&
                        ext.elm.iframe.hasClass($.cl.page.visible) &&
                        ext.elm.widthDrag.hasClass($.cl.drag.isDragged) === false
                    ) {
                        this.closeSidebar();
                    }
                }
            });

            $(document).on($.opts.events.openSidebar + ".bs", () => { // open sidebar when someone triggers the according event
                this.openSidebar();
            });

            $(document).on("mousedown.bs click.bs", (e) => { // click somewhere in the underlying page -> close
                if (e.isTrusted && ext.elm.iframe.hasClass($.cl.page.visible)) {
                    this.closeSidebar();
                }
            });

            $(window).on("keydown.bs", () => {
                keypressed = +new Date();
            }).on("keyup.bs", () => {
                keypressed = null;
            });

            ext.elm.sidebar.on("mouseleave", (e) => {
                if (e.toElement || e.relatedTarget) { // prevent false positive triggering to close the sidebar (seems to be a bug in Chrome)
                    $.delay(100).then(() => {
                        this.removeSidebarHoverClass();
                    });

                    if (ext.helper.overlay.isOpened() === false &&
                        ext.elm.iframeBody.hasClass($.cl.drag.isDragged) === false &&
                        ext.elm.widthDrag.hasClass($.cl.drag.isDragged) === false
                    ) {
                        const closeTimeoutRaw = ext.helper.model.getData("b/closeTimeout");

                        if (+closeTimeoutRaw !== -1) { // timeout only if value > -1
                            timeout.close = setTimeout(() => {
                                if (ext.elm.iframeBody.hasClass($.cl.drag.isDragged) === false && ext.elm.widthDrag.hasClass($.cl.drag.isDragged) === false) {
                                    this.closeSidebar();
                                }
                            }, +closeTimeoutRaw * 1000);
                        }
                    }
                }
            }).on("mouseenter", () => {
                this.addSidebarHoverClass();
                clearSidebarTimeout("close");
            });

            $(document).on("visibilitychange.bs", () => { // tab changed -> if current tab is hidden and no overlay opened hide the sidebar
                if (document.hidden && ext.helper.overlay.isOpened() === false) {
                    ext.elm.indicator.removeClass($.cl.page.hover);
                    const close = ext.helper.model.getData("b/closeOnTabChange");

                    if (close && ext.elm.iframe.hasClass($.cl.page.visible)) {
                        this.closeSidebar();
                    }
                }
            }).on("mouseleave.bs", () => {
                clearSidebarTimeout("open");
                clearSidebarTimeout("indicator");
                ext.elm.indicator.removeClass($.cl.page.hover);
            }).on("mousemove.bs", (e) => { // check mouse position
                if (e.isTrusted && isMousePosInPixelTolerance(e.clientX, e.clientY)) {
                    const inPixelToleranceDelay = +new Date() - (inPixelToleranceTime || 0);

                    if (!(timeout.indicator)) {
                        timeout.indicator = setTimeout(() => { // wait the duration of the open delay before showing the indicator
                            ext.elm.indicator.addClass($.cl.page.hover);
                        }, Math.max(openDelay - inPixelToleranceDelay, 0));
                    }
                } else {
                    clearSidebarTimeout("indicator");
                    ext.elm.indicator.removeClass($.cl.page.hover);
                }
            }, {passive: true});

            const openAction = ext.helper.model.getData("b/openAction");

            if (openAction !== "icon") {
                $(document).on(openAction + ".bs dragover.bs", (e) => {
                    let openByType = false;
                    if (e.type === "dragover") { // drag -> only open when configuration is set
                        const dt = e.dataTransfer;
                        openByType = dt && dt.types && (dt.types.indexOf ? dt.types.indexOf("text/plain") !== -1 : dt.types.contains("text/plain"));
                    } else if (e.type === "mousedown") { // mousedown -> only open when the left mouse button is pressed
                        openByType = e.button === 0;
                    } else {
                        openByType = true;
                    }

                    if (e.isTrusted && openByType && isMousePosInPixelTolerance(e.clientX, e.clientY)) { // check mouse position and mouse button
                        e.stopPropagation();
                        e.preventDefault();

                        if (openAction === "mousemove") {
                            if (!(timeout.open)) {
                                timeout.open = setTimeout(() => {
                                    this.openSidebar();
                                }, openDelay);
                            }
                        } else if (openDelay === 0 || inPixelToleranceTime === null || +new Date() - inPixelToleranceTime > openDelay) { // open delay = 0 or cursor is longer in pixel tolerance range than the delay -> open sidebar
                            this.openSidebar();
                        }
                    } else {
                        clearSidebarTimeout("open");
                    }
                });
            }
        };

        /**
         * Returns whether the the sidebar mask should be visible or not
         *
         * @returns {boolean}
         */
        const sidebarHasMask = () => {
            const pageType = ext.helper.utility.getPageType();
            const styles = ext.helper.model.getData("a/styles");
            const newtabAutoOpen = ext.helper.model.getData("n/autoOpen");
            const maskColor = styles.sidebarMaskColor || null;

            return !(
                ((pageType === "newtab_replacement" || pageType === "newtab_fallback") && newtabAutoOpen)
                || pageType === "sidepanel"
                || pageType === "onboarding"
                || maskColor === "transparent"
            );
        };

        /**
         * Checks whether the given mouse position is in the configured pixel tolence
         *
         * @param {int} clientX
         * @param {int} clientY
         * @returns {boolean}
         */
        const isMousePosInPixelTolerance = (clientX, clientY) => {
            let ret = false;

            if (preventWebapp && ext.helper.utility.isWebapp()) {
                // prevent opening the sidebar in a PWA with the according option set to true
            } else if (preventWindowed && ext.helper.utility.isWindowed()) {
                // prevent opening the sidebar in window mode with the according option set to true
            } else if (document.fullscreen || document.webkitIsFullScreen) {
                // don't open the sidebar when the website requested fullscreen (will be false when a user browses with F11 fullscreen)
            } else if (keypressed !== null && +new Date() - keypressed < 500) {
                // a key is pressed -> prevent opening the sidebar
            } else if (typeof clientX !== "undefined" && clientX !== null) {
                if ((clientX > 0 || clientY > 0) || mouseNotTopLeft) { // protection from unwanted triggers with x = 0 and y = 0 on pageload
                    mouseNotTopLeft = true;

                    if (sidebarPos === "right") {
                        clientX = window.innerWidth - clientX - 1;
                    }

                    let w = toggleArea.width;
                    if (ext.helper.utility.isWindowed()) { // return different values for the toggle area width in window mode
                        w = toggleArea.widthWindowed;
                    }

                    const area = {
                        w: w,
                        h: clientY / window.innerHeight * 100
                    };

                    if (ext.elm.indicator.hasClass($.cl.page.hover) && indicatorWidth > area.w) { // indicator is visible -> allow click across the indicator width if it is wider then the pixel tolerance
                        area.w = indicatorWidth;
                    }

                    ret = clientX < area.w && (area.h >= toggleArea.top && area.h <= toggleArea.top + toggleArea.height);
                }
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
        const clearSidebarTimeout = (name) => {
            if (timeout[name]) {
                clearTimeout(timeout[name]);
                timeout[name] = null;
            }
        };

        /**
         * Checks whether the user has also the Leftsideback-Extension enabled and if so set an additional class to the visual element
         *
         * @returns {Promise}
         */
        const handleLeftsideBackExtension = async () => {
            if ($($.opts.leftsideBackSelector).length() > 0) { // Extension already loaded
                ext.elm.indicator.addClass($.cl.page.hasLeftsideBack);
            } else {
                $(document).on($.opts.events.lsbLoaded + ".bs", (e) => { // Extension is now loaded
                    if (e.detail.showIndicator) {
                        ext.elm.indicator.addClass($.cl.page.hasLeftsideBack);
                    }
                });
            }
        };
    };

})(jsu);