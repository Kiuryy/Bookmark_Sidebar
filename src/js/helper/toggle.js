($ => {
    "use strict";

    window.ToggleHelper = function (ext) {

        let sidebarPos = null;
        let dndOpen = null;
        let toggleArea = {};
        let preventPageScroll = null;
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
            ext.elements.indicator = $("<div />").attr("id", ext.opts.ids.page.indicator).appendTo("body");

            if (ext.helper.model.getData("b/animations") === false) {
                ext.elements.indicator.addClass(ext.opts.classes.page.noAnimations);
            }

            let data = ext.helper.model.getData(["b/toggleArea", "b/preventPageScroll", "a/showIndicator", "a/showIndicatorIcon", "a/styles", "b/sidebarPosition", "b/openDelay", "b/openAction", "b/dndOpen", "n/autoOpen", "u/performReopening"]);

            Object.entries(data.toggleArea).forEach(([key, val]) => {
                toggleArea[key] = +val;
            });

            openDelay = +data.openDelay * 1000;
            sidebarPos = data.sidebarPosition;
            preventPageScroll = data.preventPageScroll;
            dndOpen = data.dndOpen;

            ext.elements.indicator.css({
                width: getToggleAreaWidth() + "px",
                height: toggleArea.height + "%",
                top: toggleArea.top + "%"
            });

            if (toggleArea.height === 100) {
                ext.elements.indicator.addClass(ext.opts.classes.page.fullHeight);
            }

            ext.elements.iframe.attr(ext.opts.attr.position, sidebarPos);
            ext.elements.sidebar.attr(ext.opts.attr.position, sidebarPos);

            if (data.styles && data.styles.indicatorWidth) {
                indicatorWidth = parseInt(data.styles.indicatorWidth);
            }

            if (data.showIndicator && data.openAction !== "icon" && data.openAction !== "mousemove") { // show indicator
                ext.elements.indicator.html("<div />").attr(ext.opts.attr.position, sidebarPos);

                if (data.showIndicatorIcon) { // show indicator icon
                    $("<span />").appendTo(ext.elements.indicator.children("div"));
                }

                $.delay(50).then(() => { // delay to prevent indicator beeing visible initial
                    ext.elements.indicator.addClass(ext.opts.classes.page.visible);
                });
            }

            handleLeftsideBackExtension();
            initEvents();

            let pageType = getPageType();

            if (((pageType === "newtab_website" || pageType === "newtab_replacement") && data.autoOpen) || data.performReopening) {
                this.openSidebar();
                ext.helper.model.setData({"u/performReopening": false});
            }

            if (sidebarHasMask() === false) {
                ext.elements.iframe.addClass(ext.opts.classes.page.hideMask);
            }
        };

        /**
         * Closes the sidebar
         */
        this.closeSidebar = () => {
            if (ext.elements.sidebar.hasClass(ext.opts.classes.sidebar.permanent)) {
                // don't close sidebar when configured to be automatically opened on the newtab page
            } else {
                clearSidebarTimeout("close");
                clearSidebarTimeout("open");
                ext.helper.contextmenu.close();
                ext.helper.tooltip.close();
                ext.helper.dragndrop.cancel();

                ext.elements.iframe.removeClass(ext.opts.classes.page.visible);
                $("body").removeClass(ext.opts.classes.page.noscroll);
                $(document).trigger("mousemove.bs"); // hide indicator
            }
        };

        /**
         * Opens the sidebar
         */
        this.openSidebar = () => {
            if (ext.helper.utility.isBackgroundConnected() === false) {
                ext.elements.iframe.addClass(ext.opts.classes.page.visible);
                ext.addReloadMask();
            } else {
                ext.helper.model.call("shareInfoMask").then((opts) => { // check whether to show the share userdata mask or not
                    if (opts && opts.showMask) {
                        ext.addShareInfoMask();
                    } else {
                        ext.elements.sidebar.find("#" + ext.opts.ids.sidebar.shareInfo).remove();
                    }
                });

                if (!ext.elements.sidebar.hasClass(ext.opts.classes.sidebar.openedOnce)) { // first time open -> track initial events
                    ext.trackInitialEvents();
                    ext.elements.sidebar.addClass(ext.opts.classes.sidebar.openedOnce);
                    this.markLastUsed();
                }

                ext.helper.model.call("trackPageView", {page: "/sidebar/" + getPageType()});
                ext.elements.iframe.addClass(ext.opts.classes.page.visible);
                ext.initImages();

                if (preventPageScroll) {
                    $("body").addClass(ext.opts.classes.page.noscroll);
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
                let entry = ext.elements.bookmarkBox.all.find("ul > li > a[" + ext.opts.attr.id + "='" + data.lastOpened + "']");

                if (entry && entry.length() > 0) {
                    entry.addClass(ext.opts.classes.sidebar.mark);
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
            ext.elements.iframe.addClass(ext.opts.classes.page.hover);
            hoveredOnce = true;
        };

        /**
         * Removes the hover class from the iframe,
         * will collapse the width of the iframe back to the width of the sidebar, when the mask is hidden (e.g. on the newtab page)
         */
        this.removeSidebarHoverClass = () => {
            let contextmenus = ext.elements.iframeBody.find("div." + ext.opts.classes.contextmenu.wrapper);
            let tooltips = ext.elements.iframeBody.find("div." + ext.opts.classes.tooltip.wrapper);

            if (
                contextmenus.length() === 0 &&
                tooltips.length() === 0 &&
                !ext.elements.iframeBody.hasClass(ext.opts.classes.drag.isDragged) &&
                !ext.elements.lockPinned.hasClass(ext.opts.classes.sidebar.active)
            ) {
                ext.elements.iframe.removeClass(ext.opts.classes.page.hover);
            }
        };

        /**
         * Return the amount of pixel in which range the sidebar will open if the user clicks
         *
         * @returns {int}
         */
        let getToggleAreaWidth = () => {
            return toggleArea[ext.helper.utility.isWindowed() ? "widthWindowed" : "width"];
        };

        /**
         * Initializes the events to show and hide the bookmark sidebar
         *
         * @returns {Promise}
         */
        let initEvents = async () => {
            $(window).on("resize.bs", () => {
                ext.elements.indicator.css("width", getToggleAreaWidth() + "px");
            });

            ext.elements.iframe.find("body").on("click", (e) => { // click outside the sidebar -> close
                if (e.clientX) {
                    let clientX = e.clientX;
                    if (sidebarPos === "right") {
                        if (sidebarHasMask()) {
                            clientX = window.innerWidth - clientX + ext.elements.sidebar.realWidth() - 1;
                        } else {
                            clientX = ext.elements.iframe.realWidth() - clientX;
                        }
                    }
                    if (clientX > ext.elements.sidebar.realWidth() && ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) {
                        this.closeSidebar();
                    }
                }
            });

            $(document).on(ext.opts.events.openSidebar + ".bs", () => { // open sidebar when someone triggers the according event
                this.openSidebar();
            });

            $(document).on("mousedown.bs click.bs", (e) => { // click somewhere in the underlying page -> close
                if (e.isTrusted && ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) {
                    this.closeSidebar();
                }
            });

            $(window).on("keydown.bs", () => {
                keypressed = +new Date();
            }).on("keyup.bs", () => {
                keypressed = null;
            });

            ext.elements.sidebar.on("mouseleave", (e) => {
                if (e.toElement || e.relatedTarget) { // prevent false positive triggering to close the sidebar (seems to be a bug in Chrome)
                    $.delay(100).then(() => {
                        this.removeSidebarHoverClass();
                    });

                    if ($("iframe#" + ext.opts.ids.page.overlay).length() === 0 &&
                        ext.elements.iframeBody.hasClass(ext.opts.classes.drag.isDragged) === false
                    ) {
                        let closeTimeoutRaw = ext.helper.model.getData("b/closeTimeout");

                        if (+closeTimeoutRaw !== -1) { // timeout only if value > -1
                            timeout.close = setTimeout(() => {
                                if (ext.elements.iframeBody.hasClass(ext.opts.classes.drag.isDragged) === false) {
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
                if (document.hidden && $("iframe#" + ext.opts.ids.page.overlay).length() === 0) {
                    ext.elements.indicator.removeClass(ext.opts.classes.page.hover);

                    if (ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) {
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
                            ext.elements.indicator.addClass(ext.opts.classes.page.hover);
                        }, Math.max(openDelay - inPixelToleranceDelay, 0));
                    }
                } else {
                    clearSidebarTimeout("indicator");
                    ext.elements.indicator.removeClass(ext.opts.classes.page.hover);
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
                ((pageType === "newtab_website" || pageType === "newtab_replacement") && newtabAutoOpen)
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
                newtab_default: ["https?://www\.google\..+/_/chrome/newtab"],
                newtab_replacement: [chrome.extension.getURL("html/newtab.html")],
                newtab_website: [".*[?&]bs_nt=1(&|#|$)"],
                website: ["https?://"],
                onboarding: ["chrome\-extension://.*/intro.html"],
                chrome: ["chrome://"],
                extension: ["chrome\-extension://"],
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

            if (keypressed !== null && +new Date() - keypressed < 500) {
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

                    if (ext.elements.indicator.hasClass(ext.opts.classes.page.hover) && indicatorWidth > area.w) { // indicator is visible -> allow click across the indicator width if it is wider then the pixel tolerance
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
            if ($(ext.opts.leftsideBackSelector).length() > 0) { // Extension already loaded
                ext.elements.indicator.addClass(ext.opts.classes.page.hasLeftsideBack);
            } else {
                $(document).on(ext.opts.events.lsbLoaded + ".bs", (e) => { // Extension is now loaded
                    if (e.detail.showIndicator) {
                        ext.elements.indicator.addClass(ext.opts.classes.page.hasLeftsideBack);
                    }
                });
            }
        };
    };

})(jsu);