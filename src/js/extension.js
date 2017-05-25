($ => {
    "use strict";

    window.ext = function (opts) {

        let loadingInfo = {};

        /*
         * ################################
         * PUBLIC
         * ################################
         */
        this.firstRun = true;
        this.isNewTab = false;
        this.elements = {};
        this.opts = opts;

        /**
         * Constructor
         */
        this.run = () => {
            initHelpers();

            this.helper.model.init(() => {
                this.helper.i18n.init(() => {
                    this.helper.font.init();
                    this.helper.stylesheet.init();
                    initSidebar();

                    this.helper.list.init();
                    this.helper.toggle.init();
                    this.helper.sidebarEvents.init();
                    this.helper.dragndrop.init();

                    if (document.referrer === "") {
                        this.helper.model.call("addViewAmount", {url: location.href});
                    }
                });
            });
        };

        /**
         * Checks whether the browser is maximized or windowed
         *
         * @returns {boolean}
         */
        this.isWindowed = () => {
            return window.screenX !== 0 || window.screenY !== 0 || window.screen.availWidth !== window.innerWidth;
        };

        /**
         * Refreshed the sidebar,
         * reloads the model data, the language variables and the bookmark list
         */
        this.refresh = () => {
            this.helper.model.init(() => {
                this.helper.i18n.init(() => {
                    let data = this.helper.model.getData(["u/entriesLocked", "u/showHidden"]);

                    if (data.entriesLocked === false) {
                        this.elements.sidebar.addClass(opts.classes.sidebar.entriesUnlocked);
                    } else {
                        this.elements.sidebar.removeClass(opts.classes.sidebar.entriesUnlocked);
                    }

                    if (data.showHidden === true) {
                        this.elements.sidebar.addClass(opts.classes.sidebar.showHidden);
                    } else {
                        this.elements.sidebar.removeClass(opts.classes.sidebar.showHidden);
                    }

                    this.helper.list.updateBookmarkBox();
                });
            });
        };

        /**
         * Sets a class to the iframe body and fires an event to indicate, that the extension is loaded completely
         */
        this.loaded = () => {
            let data = this.helper.model.getData(["b/pxTolerance", "a/showIndicator"]);

            this.elements.iframeBody.addClass(opts.classes.sidebar.extLoaded);
            document.dispatchEvent(new CustomEvent(opts.events.loaded, {
                detail: {
                    pxTolerance: data.pxTolerance,
                    showIndicator: data.showIndicator
                },
                bubbles: true,
                cancelable: false
            }));
        };

        /**
         * Adds a loading mask over the sidebar
         */
        this.startLoading = () => {
            this.elements.sidebar.addClass(opts.classes.sidebar.loading);

            if (loadingInfo.timeout) {
                clearTimeout(loadingInfo.timeout);
            }
            if (typeof loadingInfo.loader === "undefined" || loadingInfo.loader.length() === 0) {
                loadingInfo.loader = this.helper.template.loading().appendTo(this.elements.sidebar);
            }
        };

        /**
         * Removes the loading mask after the given time
         *
         * @param {int} timeout in ms
         */
        this.endLoading = (timeout = 500) => {
            loadingInfo.timeout = setTimeout(() => {
                this.elements.sidebar.removeClass(opts.classes.sidebar.loading);
                loadingInfo.loader && loadingInfo.loader.remove();
                loadingInfo = {};
            }, timeout);
        };

        /**
         * Copies the given text to the clipboard
         *
         * @param {string} text
         * @returns {boolean}
         */
        this.copyToClipboard = (text) => {
            let textarea = $("<textarea />").text(text).appendTo(this.elements.iframeBody);
            textarea[0].select();

            let success = false;
            try {
                success = this.elements.iframe[0].contentDocument.execCommand('copy');
            } catch (err) {
            }

            textarea.remove();
            return success;
        };

        /**
         * Initialises the not yet loaded images in the sidebar
         */
        this.initImages = () => {
            if (this.elements.iframe.hasClass(this.opts.classes.page.visible)) {
                this.elements.sidebar.find("img[" + opts.attr.src + "]").forEach((_self) => {
                    let img = $(_self);
                    let src = img.attr(opts.attr.src);
                    img.removeAttr(opts.attr.src);
                    img.attr("src", src);
                });
            }
        };

        /**
         * Adds a mask over the sidebar to encourage the user the share their userdata
         */
        this.addShareUserdataMask = () => {
            this.elements.sidebar.find("#" + opts.ids.sidebar.shareUserdata).remove();
            let shareUserdataMask = $("<div />").attr("id", opts.ids.sidebar.shareUserdata).prependTo(this.elements.sidebar);
            let contentBox = $("<div />").prependTo(shareUserdataMask);

            $("<h2 />").html(this.helper.i18n.get("share_userdata_headline")).appendTo(contentBox);
            $("<p />").html(this.helper.i18n.get("share_userdata_desc")).appendTo(contentBox);
            $("<p />").html(this.helper.i18n.get("share_userdata_desc2")).appendTo(contentBox);
            $("<p />").addClass(opts.classes.sidebar.shareUserdataNotice).html(this.helper.i18n.get("share_userdata_notice")).appendTo(contentBox);

            $("<a />").data("accept", true).html(this.helper.i18n.get("share_userdata_accept")).appendTo(contentBox);
            $("<a />").data("accept", false).html(this.helper.i18n.get("share_userdata_decline")).appendTo(contentBox);
        };


        /*
         * ################################
         * PRIVATE
         * ################################
         */

        /**
         * Initialises the helper objects
         */
        let initHelpers = () => {
            this.helper = {
                model: new window.ModelHelper(this),
                toggle: new window.ToggleHelper(this),
                entry: new window.EntryHelper(this),
                list: new window.ListHelper(this),
                scroll: new window.ScrollHelper(this),
                template: new window.TemplateHelper(this),
                i18n: new window.I18nHelper(this),
                font: new window.FontHelper(this),
                sidebarEvents: new window.SidebarEventsHelper(this),
                search: new window.SearchHelper(this),
                stylesheet: new window.StylesheetHelper(this),
                dragndrop: new window.DragDropHelper(this),
                checkbox: new window.CheckboxHelper(this),
                overlay: new window.OverlayHelper(this),
                contextmenu: new window.ContextmenuHelper(this)
            };
        };

        /**
         * Creates the basic html markup for the sidebar and the visual
         */
        let initSidebar = () => {
            this.isNewTab = location.href.search("https://www.google.de/_/chrome/newtab") === 0;
            this.helper.stylesheet.addStylesheets(["content"]);

            this.elements.iframe = $('<iframe id="' + opts.ids.page.iframe + '" />').appendTo("body");
            this.elements.iframeBody = this.elements.iframe.find("body");
            this.elements.sidebar = $('<section id="' + opts.ids.sidebar.sidebar + '" />').appendTo(this.elements.iframeBody);
            this.elements.bookmarkBox = {};

            ["all", "search"].forEach((val) => {
                this.elements.bookmarkBox[val] = this.helper.scroll.add(opts.ids.sidebar.bookmarkBox[val], $("<ul />").appendTo(this.elements.sidebar));
            });

            this.elements.filterBox = $("<div />").addClass(opts.classes.sidebar.filterBox).appendTo(this.elements.sidebar);

            this.elements.iframeBody.attr(opts.attr.dragCancel, this.helper.i18n.get("sidebar_drag_cancel"));
            this.elements.header = $("<header />").prependTo(this.elements.sidebar);
            this.helper.stylesheet.addStylesheets(["sidebar"], this.elements.iframe);

            let data = this.helper.model.getData(["u/entriesLocked", "u/showHidden"]);

            if (data.entriesLocked === false) {
                this.elements.sidebar.addClass(opts.classes.sidebar.entriesUnlocked);
            }

            if (data.showHidden === true) {
                this.elements.sidebar.addClass(opts.classes.sidebar.showHidden);
            }
        };
    };

})(jsu);