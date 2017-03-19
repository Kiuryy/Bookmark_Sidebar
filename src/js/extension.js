($ => {
    "use strict";

    window.ext = function (opts) {

        /*
         * ################################
         * PUBLIC
         * ################################
         */
        this.firstRun = true;
        this.elements = {};
        this.opts = opts;

        /**
         * Constructor
         */
        this.run = () => {
            initHelpers();

            this.helper.model.init(() => {
                initSidebarHtml();

                this.helper.sidebarEvents.init();
                this.helper.dragndrop.init();

                if (document.referrer === "") {
                    this.helper.model.call("addViewAmount", {url: location.href});
                }
            });
        };

        /**
         * Initialises the helper objects
         */
        let initHelpers = () => {
            this.helper = {
                model: new window.ModelHelper(this),
                toggle: new window.ToggleHelper(this),
                scroll: new window.ScrollHelper(this),
                sidebarEvents: new window.SidebarEventsHelper(this),
                search: new window.SearchHelper(this),
                dragndrop: new window.DragDropHelper(this),
                checkbox: new window.CheckboxHelper(this),
                overlay: new window.OverlayHelper(this),
                contextmenu: new window.ContextmenuHelper(this)
            };
        };

        /**
         * Returns the html for the loading indicator
         *
         * @returns {jsu}
         */
        this.getLoaderHtml = () => {
            let html = '' +
                '<div class="loading">' +
                ' <div>' +
                '  <div class="circle-clipper left">' +
                '   <div></div>' +
                '  </div>' +
                '  <div class="gap-patch">' +
                '   <div></div>' +
                '  </div>' +
                '  <div class="circle-clipper right">' +
                '   <div></div>' +
                '  </div>' +
                ' </div>' +
                '</div>';

            return $(html);
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
         * Restores the open states of the directories in your bookmarks,
         * calls the restoreScrollPos-Method when all open states have been restored
         *
         * @param {jsu} list
         */
        this.restoreOpenStates = (list) => {
            restoreOpenStateRunning++;

            let openStates = this.helper.model.getData("u/openStates");
            let opened = 0;

            Object.keys(openStates).forEach((node) => {
                if (openStates[node] === true) {
                    let id = +node.replace(/^node_/, "");

                    list.find("> li > a.dir").forEach((elm) => {
                        if (+$(elm).data("infos").id === id) {
                            opened++;
                            $(elm).trigger("click", {
                                bubbles: true
                            });
                        }
                    });
                }
            });

            restoreOpenStateRunning--;

            if (opened === 0 && restoreOpenStateRunning === 0) { // alle OpenStates wiederhergestellt
                setTimeout(() => {
                    this.firstRun = false;
                    this.helper.scroll.restoreScrollPos(this.elements.bookmarkBox["all"], () => {
                        extensionLoaded();
                    });
                }, 100);
            }

        };

        /**
         * Adds the given bookmarks to the given list
         *
         * @param {Array} bookmarks
         * @param {jsu} list
         */
        this.addBookmarkDir = (bookmarks, list) => {
            let sidebarOpen = this.elements.iframe.hasClass(this.opts.classes.page.visible);
            let hideEmptyDirs = this.helper.model.getData("b/hideEmptyDirs");

            bookmarks.forEach((bookmark, idx) => {
                if (opts.demoMode) {
                    if (bookmark.children) {
                        bookmark.title = "Directory " + (idx + 1);
                    } else {
                        bookmark.title = "Bookmark " + (idx + 1);
                        bookmark.url = "https://example.com/";
                    }
                }

                if (bookmark.children || bookmark.url) { // is dir or link -> fix for search results (chrome returns dirs without children and without url)
                    let entry = $("<li />").appendTo(list);
                    let entryContent = $("<a />")
                        .html("<span class='" + this.opts.classes.sidebar.bookmarkLabel + "'>" + bookmark.title + "</span><span class='" + this.opts.classes.drag.trigger + "' />")
                        .appendTo(entry);

                    bookmark.element = entryContent;

                    if (bookmark.children) { // dir
                        if (hideEmptyDirs === false || bookmark.children.length > 0) { // not empty or configured to show anyway
                            bookmark.icon = chrome.extension.getURL("img/dir.png");

                            entryContent
                                .data("infos", bookmark)
                                .prepend("<img " + (sidebarOpen ? "" : "data-") + "src='" + bookmark.icon + "' />")
                                .attr("title", bookmark.title + "\n-------------\n" + bookmark.children.length + " " + chrome.i18n.getMessage("sidebar_dir_children"))
                                .addClass(this.opts.classes.sidebar.bookmarkDir);
                        } else { // configured to not show empty dirs
                            entry.remove();
                        }
                    } else { // link
                        entryContent
                            .attr("title", bookmark.title + "\n-------------\n" + bookmark.url)
                            .addClass(this.opts.classes.sidebar.bookmarkLink);

                        this.helper.model.call("favicon", {url: bookmark.url}, (response) => { // retrieve favicon of url
                            if (opts.demoMode) {
                                response.img = chrome.extension.getURL("img/demo/favicon-" + (Math.floor(Math.random() * 10) + 1  ) + ".png");
                            }

                            if (response.img) { // favicon found -> add to entry
                                bookmark.icon = response.img;

                                entryContent
                                    .data("infos", bookmark)
                                    .prepend("<img " + (sidebarOpen ? "" : "data-") + "src='" + bookmark.icon + "' />")
                            }
                        });
                    }
                }
            });
        };

        /**
         * Initialises the not yet loaded images in the sidebar
         */
        this.initImages = () => {
            this.elements.sidebar.find("img[data-src]").forEach((_self) => {
                let img = $(_self);
                let src = img.attr("data-src");
                img.removeAttr("data-src");
                img.attr("src", src);
            });
        };


        /**
         * Updates the sidebar with the newest set of bookmarks
         */
        this.updateBookmarkBox = () => {
            this.helper.model.call("bookmarks", {id: 0}, (response) => { // Initialize the first layer of the bookmark tree
                if (response.bookmarks && response.bookmarks[0] && response.bookmarks[0].children && response.bookmarks[0].children.length > 0) {
                    this.firstRun = true;
                    let list = this.elements.bookmarkBox["all"].children("ul");
                    list.text("");

                    updateSidebarHeader(response.bookmarks[0].children);
                    this.addBookmarkDir(response.bookmarks[0].children, list);
                    this.restoreOpenStates(list);
                }
            });
        };

        /**
         * Adds a mask over the sidebar to encourage the user the share their userdata,
         * only add the mask, if the sidebar is not opened
         */
        this.initShareUserdataMask = () => {
            if (!this.elements.iframe.hasClass(this.opts.classes.page.visible)) {
                let shareUserdataMask = $("<div />").attr("id", opts.ids.sidebar.shareUserdata).prependTo(this.elements.sidebar);
                let contentBox = $("<div />").prependTo(shareUserdataMask);

                $("<h2 />").html(chrome.i18n.getMessage("share_userdata_headline")).appendTo(contentBox);
                $("<p />").html(chrome.i18n.getMessage("share_userdata_desc")).appendTo(contentBox);
                $("<p />").html(chrome.i18n.getMessage("share_userdata_desc2")).appendTo(contentBox);

                let noticeText = chrome.i18n.getMessage("share_userdata_notice").replace(/\[u\](.*)\[\/u\]/, "<span>$1</span>");
                $("<p />").addClass(opts.classes.sidebar.shareUserdataNotice).html(noticeText).appendTo(contentBox);

                $("<a href='#' />").data("accept", true).html(chrome.i18n.getMessage("share_userdata_accept")).appendTo(contentBox);
                $("<a href='#' />").data("accept", false).html(chrome.i18n.getMessage("share_userdata_decline")).appendTo(contentBox);
            }
        };


        /*
         * ################################
         * PRIVATE
         * ################################
         */

        let restoreOpenStateRunning = 0;

        /**
         * Creates the basic html markup for the sidebar and the visual
         */
        let initSidebarHtml = () => {
            this.elements.iframe = $('<iframe id="' + this.opts.ids.page.iframe + '" />').appendTo("body");
            this.elements.iframeBody = this.elements.iframe.find("body");
            this.elements.sidebar = $('<section id="' + this.opts.ids.sidebar.sidebar + '" />').appendTo(this.elements.iframeBody);

            this.elements.bookmarkBox = {
                all: this.helper.scroll.add(this.opts.ids.sidebar.bookmarkBox, $("<ul />").appendTo(this.elements.sidebar)),
                search: this.helper.scroll.add(this.opts.ids.sidebar.bookmarkBoxSearch, $("<ul />").appendTo(this.elements.sidebar))
            };

            this.elements.header = $("<header />").prependTo(this.elements.sidebar);
            updateSidebarHeader([]);

            addStylesheet(this.opts.fontHref);
            addStylesheet(chrome.extension.getURL("css/sidebar.css"));

            let entriesLocked = this.helper.model.getData("u/entriesLocked");
            if (entriesLocked === false) {
                this.elements.iframeBody.addClass(this.opts.classes.sidebar.entriesUnlocked);
            }

            this.elements.bookmarkBox["all"].addClass(this.opts.classes.sidebar.active);
            this.updateBookmarkBox();
            this.helper.toggle.init();
        };

        /**
         * Adds a stylesheet to the sidear iframe
         *
         * @param string href
         */
        let addStylesheet = (href) => {
            $("<link />").attr({
                rel: "stylesheet",
                type: "text/css",
                href: href
            }).appendTo(this.elements.iframe.find("head"));
        };


        /**
         * Updates the html for the sidebar header
         *
         * @param {object} bookmarks
         */
        let updateSidebarHeader = (bookmarks) => {
            let bookmarkList = [];
            let processBookmarks = (bookmarks) => {
                for (let i = 0; i < bookmarks.length; i++) {
                    let bookmark = bookmarks[i];
                    if (bookmark.url) {
                        bookmarkList.push(bookmark);
                    } else if (bookmark.children) {
                        processBookmarks(bookmark.children);
                    }
                }
            };
            processBookmarks(bookmarks);

            this.elements.header.text("");
            $("<span />").html("<span>" + bookmarkList.length + "</span> " + chrome.i18n.getMessage("header_bookmarks" + (bookmarkList.length === 1 ? "_single" : ""))).appendTo(this.elements.header);
            $("<a />").addClass(this.opts.classes.sidebar.settings).data("infos", {bookmarks: bookmarkList}).appendTo(this.elements.header);
            $("<a />").addClass(this.opts.classes.sidebar.search).appendTo(this.elements.header);

            $("<div />")
                .addClass(this.opts.classes.sidebar.searchBox)
                .append("<input type='text' placeholder='" + chrome.i18n.getMessage("sidebar_search_placeholder") + "' />")
                .append("<a href='#' class='" + this.opts.classes.sidebar.searchClose + "'></a>")
                .appendTo(this.elements.header);

            this.helper.search.init();
        };


        /**
         * Sets a class to the iframe body and fires an event to indicate, that the extension is loaded completely
         */
        let extensionLoaded = () => {
            let data = this.helper.model.getData(["b/pxTolerance", "a/addVisual"]);

            this.elements.iframeBody.addClass(this.opts.classes.sidebar.extLoaded);
            document.dispatchEvent(new CustomEvent(this.opts.events.loaded, {
                detail: {
                    pxTolerance: data.pxTolerance,
                    addVisual: data.addVisual
                },
                bubbles: true,
                cancelable: false
            }));
        };
    };

})(jsu);