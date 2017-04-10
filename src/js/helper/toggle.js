($ => {
    "use strict";

    window.ToggleHelper = function (ext) {

        let sidebarPos = null;
        let sidebarTimeout = null;
        let pxToleranceObj = null;
        let closeTimeoutDuration = null;

        /**
         * Initializes the sidebar toggle
         */
        this.init = () => {
            ext.elements.toggle = $("<div />").attr("id", ext.opts.ids.page.visual).appendTo("body");

            let data = ext.helper.model.getData(["b/pxTolerance", "b/closeTimeout", "a/showIndicator", "a/sidebarPosition"]);
            closeTimeoutDuration = +data.closeTimeout * 1000;
            pxToleranceObj = data.pxTolerance;
            ext.elements.toggle.css("width", getPixelTolerance() + "px");

            sidebarPos = data.sidebarPosition;
            ext.elements.iframe.attr(ext.opts.attr.position, sidebarPos);
            ext.elements.sidebar.attr(ext.opts.attr.position, sidebarPos);

            if (data.showIndicator > 0) { // show indicator
                ext.elements.toggle
                    .addClass(ext.opts.classes.page.addVisual)
                    .attr(ext.opts.attr.position, sidebarPos);
            }

            handleLeftsideBackExtension();
            initEvents();
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
                        pageX = window.innerWidth - pageX + ext.elements.sidebar.realWidth() - 1;
                    }
                    if (pageX > ext.elements.sidebar.realWidth() && ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) {
                        closeSidebar();
                    }
                }
            });

            ext.elements.sidebar.on("mouseleave", () => {
                if ($("iframe#" + ext.opts.ids.page.overlay).length() === 0
                    && ext.elements.sidebar.find("." + ext.opts.classes.scrollBox.scrollDrag).length() === 0
                    && ext.elements.iframeBody.find("li." + ext.opts.classes.drag.dragInitial).length() === 0
                ) {
                    sidebarTimeout = setTimeout(() => {
                        closeSidebar();
                    }, closeTimeoutDuration);
                }
            }).on("mouseenter", () => {
                if (sidebarTimeout) {
                    clearTimeout(sidebarTimeout);
                    sidebarTimeout = null;
                }
            });

            $(document).on("visibilitychange", () => { // tab changed -> if current tab is hidden and no overlay opened hide the sidebar
                if (document.hidden && $("iframe#" + ext.opts.ids.page.overlay).length() === 0) {
                    ext.elements.toggle.removeClass(ext.opts.classes.page.hover);

                    if (ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) {
                        closeSidebar();
                    }
                }
            }).on("mousemove", (e) => { // check mouse position
                if (isMousePosInPixelTolerance(e.pageX)) {
                    ext.elements.toggle.addClass(ext.opts.classes.page.hover);
                } else {
                    ext.elements.toggle.removeClass(ext.opts.classes.page.hover);
                }
            }, {passive: true});

            chrome.extension.onMessage.addListener((message) => {
                if (message && message.action && message.action === "toggleSidebar") {
                    if (ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) {
                        closeSidebar();
                    } else {
                        openSidebar();
                    }
                }
            });

            let openAction = ext.helper.model.getData("b/openAction");
            $(document).on(openAction, (e) => {
                if ((openAction !== "mousedown" || e.button === 0) && isMousePosInPixelTolerance(e.pageX)) { // check mouse position and mouse button
                    e.stopPropagation();
                    e.preventDefault();
                    openSidebar();
                }
            });
        };

        /**
         * Checks whether the given mouse position is in the configured pixel tolence
         *
         * @param {int} pageX
         * @returns {boolean}
         */
        let isMousePosInPixelTolerance = (pageX) => {
            if (typeof pageX !== "undefined" && pageX !== null) {
                if (sidebarPos === "right") {
                    pageX = window.innerWidth - pageX - 1;
                }

                return pageX < getPixelTolerance();
            }
            return false;
        };

        /**
         * Closes the sidebar
         */
        let closeSidebar = () => {
            if (sidebarTimeout) {
                clearTimeout(sidebarTimeout);
                sidebarTimeout = null;
            }
            ext.helper.contextmenu.close();
            ext.elements.iframe.removeClass(ext.opts.classes.page.visible);
            $(document).trigger("mousemove");
        };

        /**
         * Opens the sidebar
         */
        let openSidebar = () => {
            ext.elements.iframe.addClass(ext.opts.classes.page.visible);
            ext.elements.sidebar.addClass(ext.opts.classes.sidebar.openedOnce);
            ext.initImages();
            $(document).trigger("mousemove");
        };

        /**
         * Checks whether the user has also the Leftsideback-Extension enabled and if so set an additional class to the visual element
         */
        let handleLeftsideBackExtension = () => {
            if ($(ext.opts.leftsideBackSelector).length() > 0) { // Extension already loaded
                ext.elements.toggle.addClass(ext.opts.classes.page.hasLeftsideBack);
            } else {
                $(document).on(ext.opts.events.lsbLoaded, (e) => { // Extension is now loaded
                    if (e.detail.addVisual) {
                        ext.elements.toggle.addClass(ext.opts.classes.page.hasLeftsideBack);
                    }
                });
            }
        };

    };

})(jsu);
