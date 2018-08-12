($ => {
    "use strict";

    /**
     * @requires helper: model, contextmenu, tooltip, dragndrop, utility, entry, scroll, overlay
     * @param {object} ext
     * @constructor
     */
    $.ToggleHelper = function (ext) {

        let sidebarPos = null;
        let dndOpen = null;
        let toggleArea = {};
        let preventPageScroll = null;
        let preventWindowed = null;
        let openDelay = 0;
        let indicatorWidth = null;
        let inPixelToleranceTime = null;
        let mouseNotTopLeft = false;
        let timeout = {};
        let keypressed = null;
        let hoveredOnce = false;

        /**
         * Initializes the sidebar toggle
         *
         * @returns {Promise}
         */
        this.init = async () => {
            ext.elm.indicator = $("<div />").attr("id", $.opts.ids.page.indicator).appendTo("body");

            if (ext.helper.model.getData("b/animations") === false) {
                ext.elm.indicator.addClass($.cl.page.noAnimations);
            }

            let data = ext.helper.model.getData(["b/toggleArea", "b/preventPageScroll", "a/showIndicator", "a/showIndicatorIcon", "a/styles", "b/sidebarPosition", "b/openDelay", "b/openAction", "b/preventWindowed", "b/dndOpen", "n/autoOpen", "u/performReopening"]);

            Object.entries(data.toggleArea).forEach(([key, val]) => {
                toggleArea[key] = +val;
            });

            openDelay = +data.openDelay * 1000;
            sidebarPos = data.sidebarPosition;
            preventPageScroll = data.preventPageScroll;
            preventWindowed = data.preventWindowed;
            dndOpen = data.dndOpen;

            ext.elm.indicator.css({
                width: getToggleAreaWidth() + "px",
                height: toggleArea.height + "%",
                top: toggleArea.top + "%"
            });

            if (toggleArea.height === 100) {
                ext.elm.indicator.addClass($.cl.page.fullHeight);
            }

            ext.elm.iframe.attr($.attr.position, sidebarPos);
            ext.elm.sidebar.attr($.attr.position, sidebarPos);

            if (data.styles && data.styles.indicatorWidth) {
                indicatorWidth = parseInt(data.styles.indicatorWidth);
            }

            if (data.showIndicator && data.openAction !== "icon" && data.openAction !== "mousemove") { // show indicator
                ext.elm.indicator.html("<div />").attr($.attr.position, sidebarPos);

                if (data.showIndicatorIcon) { // show indicator icon
                    $("<span />").appendTo(ext.elm.indicator.children("div"));
                }

                $.delay(50).then(() => { // delay to prevent indicator beeing visible initial
                    ext.elm.indicator.addClass($.cl.page.visible);
                });
            }

            handleLeftsideBackExtension();
            initEvents();

            let pageType = getPageType();

            if (((pageType === "newtab_website" || pageType === "newtab_replacement" || pageType === "newtab_fallback") && data.autoOpen) || data.performReopening) {
                this.openSidebar();
                ext.helper.model.setData({"u/performReopening": false});
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
                $(document).trigger("mousemove.bs"); // hide indicator
            }
        };

        /**
         * Opens the sidebar
         */
        this.openSidebar = () => {
            if (ext.helper.utility.isBackgroundConnected() === false) {
                ext.elm.iframe.addClass($.cl.page.visible);
                ext.addReloadMask();
            } else {
                ext.helper.model.call("shareInfoMask").then((opts) => { // check whether to show the share userdata mask or not
                    if (opts && opts.showMask) {
                        ext.addShareInfoMask();
                    } else {
                        ext.elm.sidebar.find("#" + $.opts.ids.sidebar.shareInfo).remove();
                    }
                });

                if (!ext.elm.sidebar.hasClass($.cl.sidebar.openedOnce)) { // first time open -> mark last used bookmark and set html class
                    ext.trackInitialEvents(); // @deprecated
                    ext.elm.sidebar.addClass($.cl.sidebar.openedOnce);
                    this.markLastUsed();
                }

                if (!ext.elm.iframe.hasClass($.cl.page.visible)) {
                    ext.helper.model.call("track", {
                        name: "action",
                        value: {name: "sidebar", value: getPageType()}
                    });
                    ext.helper.model.call("trackPageView", {page: "/sidebar/" + getPageType()}); // @deprecated
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
            }
        };

        /**
         * Marks the last used bookmark in the list if the according configuration is set
         */
        this.markLastUsed = () => {
            let data = ext.helper.model.getData(["u/lastOpened", "b/rememberState"]);

            if (data.rememberState === "all" && data.lastOpened) { // mark last opened bookmark if there is one and user set so in the options
                let entry = ext.elm.bookmarkBox.all.find("ul > li > a[" + $.attr.id + "='" + data.lastOpened + "']");

                if (entry && entry.length() > 0) {
                    entry.addClass($.cl.sidebar.mark);
                    ext.helper.model.setData({"u/lastOpened": null});
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
            hoveredOnce = true;
        };

        /**
         * Removes the hover class from the iframe,
         * will collapse the width of the iframe back to the width of the sidebar, when the mask is hidden (e.g. on the newtab page)
         */
        this.removeSidebarHoverClass = () => {
            let contextmenus = ext.elm.iframeBody.find("div." + $.cl.contextmenu.wrapper);
            let tooltips = ext.elm.iframeBody.find("div." + $.cl.tooltip.wrapper);

            if (
                contextmenus.length() === 0 &&
                tooltips.length() === 0 &&
                !ext.elm.iframeBody.hasClass($.cl.drag.isDragged) &&
                !ext.elm.lockPinned.hasClass($.cl.active)
            ) {
                ext.elm.iframe.removeClass($.cl.page.hover);
            }
        };

        /**
         * Return the amount of pixel in which range the sidebar will open if the user clicks
         *
         * @returns {int}
         */
        let getToggleAreaWidth = () => {
            if (ext.helper.utility.isWindowed()) {
                return preventWindowed ? 0 : toggleArea.widthWindowed;
            } else {
                return toggleArea.width;
            }
        };

        /**
         * Initializes the events to show and hide the bookmark sidebar
         *
         * @returns {Promise}
         */
        let initEvents = async () => {
            $(window).on("resize.bs", () => {
                ext.elm.indicator.css("width", getToggleAreaWidth() + "px");
            });

            ext.elm.iframe.find("body").on("click", (e) => { // click outside the sidebar -> close
                if (e.clientX) {
                    let clientX = e.clientX;
                    if (sidebarPos === "right") {
                        if (sidebarHasMask()) {
                            clientX = window.innerWidth - clientX + ext.elm.sidebar.realWidth() - 1;
                        } else {
                            clientX = ext.elm.iframe.realWidth() - clientX;
                        }
                    }
                    if (clientX > ext.elm.sidebar.realWidth() && ext.elm.iframe.hasClass($.cl.page.visible)) {
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
                        ext.elm.iframeBody.hasClass($.cl.drag.isDragged) === false
                    ) {
                        let closeTimeoutRaw = ext.helper.model.getData("b/closeTimeout");

                        if (+closeTimeoutRaw !== -1) { // timeout only if value > -1
                            timeout.close = setTimeout(() => {
                                if (ext.elm.iframeBody.hasClass($.cl.drag.isDragged) === false) {
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

                    if (ext.elm.iframe.hasClass($.cl.page.visible)) {
                        this.closeSidebar();
                    }
                }
            }).on("mouseout.bs", () => {
                clearSidebarTimeout("open");
            }).on("mousemove.bs", (e) => { // check mouse position
                if (e.isTrusted && isMousePosInPixelTolerance(e.clientX, e.clientY)) {
                    let inPixelToleranceDelay = +new Date() - (inPixelToleranceTime || 0);

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

            let openAction = ext.helper.model.getData("b/openAction");

            if (openAction !== "icon") {
                $(document).on(openAction + ".bs dragover.bs", (e) => {
                    let openByType = false;
                    if (e.type === "dragover") { // drag -> only open when configuration is set
                        openByType = dndOpen;
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
        let sidebarHasMask = () => {
            let pageType = getPageType();
            let styles = ext.helper.model.getData("a/styles");
            let newtabAutoOpen = ext.helper.model.getData("n/autoOpen");
            let maskColor = styles.sidebarMaskColor || null;

            return !(
                ((pageType === "newtab_website" || pageType === "newtab_replacement" || pageType === "newtab_fallback") && newtabAutoOpen)
                || pageType === "onboarding"
                || maskColor === "transparent"
            );
        };

        /**
         * Returns the type of the current url
         *
         * @returns {string}
         */
        let getPageType = () => {
            let url = location.href;
            let ret = "other";
            let found = false;

            Object.entries({
                newtab_default: ["https?://www\\.google\\..+/_/chrome/newtab"],
                newtab_fallback: [chrome.extension.getURL("html/newtab.html") + ".*[?&]type=\\w+"],
                newtab_replacement: [chrome.extension.getURL("html/newtab.html")],
                newtab_website: [".*[?&]bs_nt=1(&|#|$)"],
                website: ["https?://"],
                onboarding: ["chrome\\-extension://.*/intro.html"],
                chrome: ["chrome://"],
                extension: ["chrome\\-extension://"],
                local: ["file://"]
            }).some(([key, patterns]) => {
                patterns.some((str) => {
                    if (url.search(new RegExp(str, "gi")) === 0) {
                        ret = key;
                        found = true;
                        return true;
                    }
                });
                if (found) {
                    return true;
                }
            });

            return ret;
        };

        /**
         * Checks whether the given mouse position is in the configured pixel tolence
         *
         * @param {int} clientX
         * @param {int} clientY
         * @returns {boolean}
         */
        let isMousePosInPixelTolerance = (clientX, clientY) => {
            let ret = false;

            if (preventWindowed && ext.helper.utility.isWindowed()) {
                // prevent opening the sidebar in window mode with the according setting set to true
            } else if (keypressed !== null && +new Date() - keypressed < 500) {
                // a key is pressed -> prevent opening the sidebar
            } else if (typeof clientX !== "undefined" && clientX !== null) {
                if ((clientX > 0 || clientY > 0) || mouseNotTopLeft) { // protection from unwanted triggers with x = 0 and y = 0 on pageload
                    mouseNotTopLeft = true;

                    if (sidebarPos === "right") {
                        clientX = window.innerWidth - clientX - 1;
                    }

                    let area = {
                        w: getToggleAreaWidth(),
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
        let clearSidebarTimeout = (name) => {
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
        let handleLeftsideBackExtension = async () => {
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