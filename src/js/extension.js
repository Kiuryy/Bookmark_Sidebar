($ => {
    "use strict";

    const Extension = function () {

        const uid = Math.floor(Math.random() * 99999) + 10000;

        let loadingInfo = {};
        let existenceTimeout = null;
        let isLoading = false;

        /*
         * ################################
         * PUBLIC
         * ################################
         */
        this.initialized = null;
        this.refreshRun = true;
        this.elm = {};
        this.needsReload = false;
        this.state = null;

        /**
         * Constructor
         */
        this.run = () => {
            $("html").attr($.attr.uid, uid);

            const removedOldInstance = destroyOldInstance();
            initHelpers();

            $(document).on("visibilitychange.bs", () => { // listen for the document becoming visible/hidden
                if (document.hidden !== true) {
                    if (this.initialized === null) { // extension is not initialized yet
                        init();
                    } else if (this.needsReload) { // extension needs a reload
                        this.reload();
                    }
                }
            }, {capture: false});

            init(removedOldInstance === false);
        };

        /**
         * Initialises the extension,
         * is only running if the current tab is visible and there is no other process running at the moment
         *
         * @param {boolean} force if set to true the sidebar gets initialised regardless of the document visibility state
         */
        const init = (force = false) => {
            if (isLoading === false && (force || document.hidden !== true)) { // prevent multiple init attempts -> only proceed if the previous run finished and if the document is visible
                isLoading = true;

                this.helper.model.init().then(() => {
                    if (isAllowedToInitialize()) { // check against blacklist or whitelist (if one is set)
                        this.helper.i18n.init().then(() => {
                            this.helper.font.init();
                            this.helper.stylesheet.init();
                            return this.helper.stylesheet.addStylesheets(["content"]);
                        }).then(() => {
                            return initSidebarMarkup();
                        }).then(() => {
                            return this.helper.stylesheet.addStylesheets(["sidebar"], this.elm.iframe);
                        }).then(() => {
                            if (this.elm.iframe && this.elm.iframe[0]) { // prevent errors on pages which instantly redirect and prevent the iframe from loading this way
                                this.elm.iframeBody.parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");

                                this.helper.toggle.init();
                                this.helper.list.init();
                                this.helper.scroll.init();
                                this.helper.tooltip.init();
                                this.helper.sidebarEvents.init();
                                this.helper.dragndrop.init();
                                this.helper.keyboard.init();

                                if (document.referrer === "") {
                                    this.helper.model.call("addViewAmount", {url: location.href});
                                }
                            }
                        });
                    } else { // disallowed to load sidebar (blacklisted or not whitelisted)
                        $.api.extension.onMessage.addListener((message) => {
                            if (message && message.action && message.action === "toggleSidebar") { // click on the icon in the chrome menu
                                this.helper.model.call("setNotWorkingReason", {reason: this.state});
                            }
                        });
                        this.log("Don't load sidebar for url '" + location.href + "'");
                    }
                });
            }
        };

        /**
         * Reloads the sidebar, the model data, the language variables and the bookmark list,
         * is only running if the current tab is visible and there is no other process running at the moment
         */
        this.reload = () => {
            if (isLoading === false && document.hidden === false) { // prevent multiple reload attempts -> only proceed if the previous run finished and if the document is visible
                this.needsReload = false;
                isLoading = true;

                this.helper.model.init().then(() => {
                    return Promise.all([
                        this.helper.i18n.init(),
                        this.helper.entry.init()
                    ]);
                }).then(() => {
                    return this.helper.list.updateBookmarkBox();
                }).then(() => {
                    this.helper.selection.reset();
                    this.helper.search.update();
                });
            }
        };

        /**
         * Prints the given message in the console (only if this.dev = true)
         *
         * @param {*} msg
         */
        this.log = (msg) => {
            if ($.isDev) {
                const styles = [
                    "padding: 0 0 5px 0",
                    "font-size:90%",
                    "color:#666"
                ].join(";");

                // eslint-disable-next-line no-console
                console.log(...[
                    // message
                    "%c[] %cBookmark Sidebar %c-> %c" + msg,
                    // styles
                    styles,
                    styles + ";color:#30bfa9;font-weight:bold",
                    styles + ";color:#000;font-weight:bold",
                    styles
                ]);
            }
        };

        /**
         * Sets a class to the iframe body and fires an event to indicate, that the extension is loaded completely
         */
        this.loaded = () => {
            if (!this.elm.iframeBody.hasClass($.cl.sidebar.extLoaded)) {
                const data = this.helper.model.getData(["b/animations", "b/toggleArea", "a/showIndicator"]);
                this.elm.iframeBody.addClass($.cl.sidebar.extLoaded);
                this.helper.list.updateSidebarHeader();
                this.helper.search.init();

                if (this.elm.iframe.hasClass($.cl.page.visible)) { // try to mark the last used bookmark if the sidebar is already opened
                    this.helper.toggle.markLastUsed();
                }

                if (data.animations === true) { // remove noAnimations class, if the user want to have animations (the class is just being set temporary to initialize the sidebar without flickering of transitions)
                    this.elm.iframe.removeClass($.cl.page.noAnimations);
                }

                checkExistence();
                this.initialized = +new Date();
                this.state = "loaded";
                this.log("Finished loading in " + (this.initialized - this.updateBookmarkBoxStart) + "ms");
                this.log("User type: " + this.helper.model.getUserType());

                this.helper.utility.triggerEvent("loaded", {
                    config: {
                        toggleArea: data.toggleArea,
                        showIndicator: data.showIndicator
                    },
                    elm: {
                        iframe: this.elm.iframe,
                        sidebar: this.elm.sidebar
                    },
                    helper: this.helper
                });
            }

            isLoading = false;
        };

        /**
         * Adds a loading mask over the sidebar
         */
        this.startLoading = () => {
            this.elm.sidebar.addClass($.cl.loading);

            if (loadingInfo.timeout) {
                clearTimeout(loadingInfo.timeout);
            }
            if (typeof loadingInfo.loader === "undefined" || loadingInfo.loader.length() === 0) {
                loadingInfo.loader = this.helper.template.loading().appendTo(this.elm.sidebar);
            }
        };

        /**
         * Removes the loading mask after the given time
         *
         * @param {int} timeout in ms
         */
        this.endLoading = (timeout = 500) => {
            loadingInfo.timeout = setTimeout(() => {
                this.elm.sidebar.removeClass($.cl.loading);
                if (loadingInfo.loader) {
                    loadingInfo.loader.remove();
                }
                loadingInfo = {};
            }, timeout);
        };

        /**
         * Initialises the not yet loaded images in the sidebar
         */
        this.initImages = () => {
            $.delay().then(() => {
                if (this.elm.iframe.hasClass($.cl.page.visible)) {
                    this.elm.sidebar.find("img[" + $.attr.src + "]").forEach((_self) => {
                        const img = $(_self);
                        const src = img.attr($.attr.src);
                        img.removeAttr($.attr.src);
                        img.attr("src", src);
                    });
                }
            });
        };

        /**
         * Adds a mask over the sidebar to notice that the page needs to be reloaded to make the sidebar work again
         */
        this.addReloadMask = () => {
            this.elm.sidebar.text("");
            const reloadMask = $("<div></div>").attr("id", $.opts.ids.sidebar.reloadInfo).prependTo(this.elm.sidebar);
            const contentBox = $("<div></div>").prependTo(reloadMask);

            $("<p></p>").html(this.helper.i18n.get("status_background_disconnected_reload_desc")).appendTo(contentBox);
            $("<a></a>").text(this.helper.i18n.get("status_background_disconnected_reload_action")).appendTo(contentBox);
        };

        /**
         * Shows a info box of the given type
         *
         * @parm {string} type
         */
        this.addInfoBox = (type) => {
            this.elm.sidebar.find("#" + $.opts.ids.sidebar.infoBox).remove();
            const infoBox = $("<div></div>")
                .attr("id", $.opts.ids.sidebar.infoBox)
                .attr($.attr.type, type)
                .prependTo(this.elm.sidebar);

            if (type === "premium") {
                $("<p></p>").text(this.helper.i18n.get("premium_popup_text")).appendTo(infoBox);
            } else if (type === "translation") {
                $("<p></p>").text(this.helper.i18n.get("settings_translation_incomplete_info")).appendTo(infoBox);
            } else if (type === "shareInfo") {
                $("<p></p>").text(this.helper.i18n.get("contribute_notice")).appendTo(infoBox);
            }

            $("<a></a>").text(this.helper.i18n.get("more_link")).addClass($.cl.info).appendTo(infoBox);
            $("<a></a>").text(this.helper.i18n.get("overlay_close")).addClass($.cl.close).appendTo(infoBox);

            $.delay(500).then(() => {
                infoBox.addClass($.cl.visible);
            });
        };

        /*
         * ################################
         * PRIVATE
         * ################################
         */

        /**
         * Initialises the helper objects
         */
        const initHelpers = () => {
            this.helper = {
                model: new $.ModelHelper(this),
                toggle: new $.ToggleHelper(this),
                entry: new $.EntryHelper(this),
                selection: new $.SelectionHelper(this),
                list: new $.ListHelper(this),
                scroll: new $.ScrollHelper(this),
                template: new $.TemplateHelper(this),
                i18n: new $.I18nHelper(this),
                font: new $.FontHelper(this),
                sidebarEvents: new $.SidebarEventsHelper(this),
                search: new $.SearchHelper(this),
                stylesheet: new $.StylesheetHelper(this),
                dragndrop: new $.DragDropHelper(this),
                checkbox: new $.CheckboxHelper(this),
                keyboard: new $.KeyboardHelper(this),
                bookmark: new $.BookmarkHelper(this),
                overlay: new $.OverlayHelper(this),
                utility: new $.UtilityHelper(this),
                contextmenu: new $.ContextmenuHelper(this),
                tooltip: new $.TooltipHelper(this),
                linkchecker: new $.Linkchecker(this)
            };
        };

        /**
         * Returns whether the sidebar is allowed to be initialized for the current url,
         * Checks the configured patter rules
         *
         * @returns {boolean}
         */
        const isAllowedToInitialize = () => {
            let ret = true;
            const visibility = this.helper.model.getData("b/visibility");

            if (visibility === "always" || location.href.indexOf($.api.extension.getURL("html/newtab.html")) === 0) {
                ret = true;
            } else if (visibility === "blacklist" || visibility === "whitelist") {
                const rules = this.helper.model.getData("b/" + visibility);
                let match = false;

                rules.some((rule) => {
                    rule = rule.replace(/^https?:\/\//i, "");
                    rule = rule.replace(/([.?&])/g, "\\$1");
                    rule = rule.replace(/\*/g, ".*");

                    const regex = new RegExp(rule);

                    if (location.href.search(regex) !== -1) {
                        match = true;
                        return true;
                    }
                });

                if (visibility === "blacklist") {
                    ret = match === false;

                    if (ret === false) {
                        this.state = "blacklisted";
                    }
                } else if (visibility === "whitelist") {
                    ret = match === true;

                    if (ret === false) {
                        this.state = "notWhitelisted";
                    }
                }
            }

            return ret;
        };

        /**
         * Checks whether the sidebar iframe is still available and reinitialized the extension if not,
         * calls itself every 2s as long the sidebar is not missing
         */
        const checkExistence = () => {
            if (existenceTimeout !== null) {
                clearTimeout(existenceTimeout);
            }

            existenceTimeout = setTimeout(() => {
                const htmlUid = $("html").attr($.attr.uid);

                if (typeof htmlUid === "undefined" || uid === +htmlUid) {
                    const iframe = $("iframe#" + $.opts.ids.page.iframe);
                    if (iframe.length() === 0 || !iframe[0].contentDocument || !iframe[0].contentDocument.body || iframe[0].contentDocument.body.childElementCount === 0) {
                        this.log("Detected: Sidebar missing from DOM");
                        destroyOldInstance();
                        init(true);
                    } else {
                        checkExistence();
                    }
                }
            }, 2000);
        };

        /**
         * Removes the existing instance of the extension
         *
         * @returns {boolean} old instance removed or not
         */
        const destroyOldInstance = () => {
            let ret = false;
            const elements = [];

            ["iframe#" + $.opts.ids.page.iframe, "iframe#" + $.opts.ids.page.overlay, "div#" + $.opts.ids.page.indicator].forEach((elm) => {
                elements.push($(elm));
            });

            const elmObj = $(elements);

            $(document).off("*.bs");
            $(window).off("*.bs");

            if (elmObj.length() > 0) {
                elmObj.remove();
                ret = true;
                this.log("Destroyed old instance");
            }

            return ret;
        };

        /**
         * Creates the basic html markup for the sidebar
         *
         * @returns {Promise}
         */
        const initSidebarMarkup = async () => {
            const config = this.helper.model.getData(["a/theme", "a/darkMode", "a/highContrast"]);
            this.elm.iframe = $("<iframe id=\"" + $.opts.ids.page.iframe + "\"></iframe>")
                .addClass(["notranslate", $.cl.page.noAnimations]) // 'notranslate' prevents Google translator from translating the content of the sidebar
                .attr("aria-hidden", "true") // 'aria-hidden' will mark the iframe as 'not visible/perceivable' for other applications (e.g. screen readers)
                .attr($.attr.theme, config.theme)
                .appendTo("body");

            this.elm.iframeBody = this.elm.iframe.find("body");

            this.elm.iframeBody
                .attr($.attr.theme, config.theme)
                .attr("aria-hidden", "true");

            this.elm.sidebar = $("<section id=\"" + $.opts.ids.sidebar.sidebar + "\"></section>").appendTo(this.elm.iframeBody);
            this.elm.bookmarkBox = {};

            ["all", "search"].forEach((val) => {
                this.elm.bookmarkBox[val] = this.helper.scroll.add($.opts.ids.sidebar.bookmarkBox[val], $("<ul></ul>").appendTo(this.elm.sidebar));
            });

            this.elm.widthDrag = $("<span></span>").addClass($.cl.drag.trigger);

            if (this.helper.model.getUserType() === "premium") {
                this.elm.widthDrag = this.elm.widthDrag.appendTo(this.elm.sidebar);
            }

            this.elm.filterBox = $("<div></div>").addClass([$.cl.sidebar.filterBox, $.cl.hidden]).appendTo(this.elm.sidebar);
            this.elm.pinnedBox = $("<div></div>").addClass($.cl.sidebar.entryPinned).prependTo(this.elm.bookmarkBox.all);
            this.elm.lockPinned = $("<a></a>").addClass($.cl.sidebar.lockPinned).html("<span></span>").appendTo(this.elm.sidebar);

            this.elm.header = $("<header></header>").prependTo(this.elm.sidebar);

            if (config.darkMode === true) {
                this.elm.iframeBody.addClass($.cl.page.darkMode);
            } else if (config.highContrast === true) {
                this.elm.iframeBody.addClass($.cl.page.highContrast);
            }

            this.helper.utility.triggerEvent("elementsCreated", {
                elm: {
                    iframe: this.elm.iframe,
                    sidebar: this.elm.sidebar
                },
                helper: this.helper
            });
        };
    };

    new Extension().run();
})(jsu);