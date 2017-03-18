($ => {
    "use strict";

    window.ToggleHelper = function (ext) {

        let sidebarTimeout = null;
        let pxToleranceObj = null;
        let closeTimeoutDuration = null;

        /**
         * Initializes the sidebar toggle
         */
        this.init = () => {
            ext.elements.toggle = $("<div />").attr("id", ext.opts.ids.page.visual).appendTo("body");

            ext.helper.model.getConfig(["pxTolerance", "addVisual", "closeTimeout"], (values) => { // update the visual element based on the config values
                closeTimeoutDuration = +values.closeTimeout * 1000;
                pxToleranceObj = JSON.parse(values.pxTolerance);
                ext.elements.toggle.css("width", getPixelTolerance() + "px");

                if (values.addVisual === "y") { // show icon on black background
                    ext.elements.toggle.addClass(ext.opts.classes.page.addVisual);
                }
            }, (values) => { // default values
                closeTimeoutDuration = +values.closeTimeout * 1000;
                pxToleranceObj = JSON.parse(values.pxTolerance);
                ext.elements.toggle.css("width", getPixelTolerance() + "px");
            });

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
                if (e.pageX > ext.elements.sidebar.realWidth() && ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) {
                    closeSidebar();
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
                if (e.pageX < getPixelTolerance()) {
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

            ext.helper.model.getConfig("openAction", (openAction) => {
                $(document).on(openAction, (e) => {
                    if ((openAction !== "mousedown" || e.button === 0) && e.pageX < getPixelTolerance()) { // check mouse position and mouse button
                        e.stopPropagation();
                        e.preventDefault();
                        openSidebar();
                    }
                });
            });
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
        };

        /**
         * Opens the sidebar
         */
        let openSidebar = () => {
            ext.initImages();
            ext.elements.iframe.addClass(ext.opts.classes.page.visible).data("visibleOnce", true);
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
