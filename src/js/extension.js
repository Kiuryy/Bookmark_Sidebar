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
        this.entries = {};

        /**
         * Constructor
         */
        this.run = () => {
            initHelpers();

            this.helper.model.init(() => {
                this.helper.stylesheet.init();

                initSidebar();

                this.helper.sidebarEvents.init();
                this.helper.dragndrop.init();

                if (document.referrer === "") {
                    this.helper.model.call("addViewAmount", {url: location.href});
                }
            });
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
         * Returns false for all entries which are not in the entries object
         *
         * @param {int} id
         * @returns {boolean}
         */
        this.isEntryVisible = (id) => {
            return typeof this.entries.bookmarks[id] === "object" || typeof this.entries.directories[id] === "object";
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
         * Returns the translated string matching the given message
         *
         * @param msg
         * @returns {string}
         */
        this.lang = (msg) => {
            return chrome.i18n.getMessage(msg);
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
                    let id = +node.replace(/^node_/, ""); // @deprecated replace not needed anymore
                    let entry = list.find("> li > a." + this.opts.classes.sidebar.bookmarkDir + "[" + this.opts.attr.id + "='" + id + "']");

                    if (entry.length() > 0) {
                        opened++;
                        this.helper.sidebarEvents.toggleBookmarkDir(entry);
                    }
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
         * @returns {int} amount of entries added to the list
         */
        this.addBookmarkDir = (bookmarks, list) => {
            let ret = 0;
            let sidebarOpen = this.elements.iframe.hasClass(this.opts.classes.page.visible);
            let showBookmarkIcons = this.helper.model.getData("a/showBookmarkIcons");

            bookmarks.forEach((bookmark, idx) => {
                if (this.isEntryVisible(bookmark.id) && (bookmark.children || bookmark.url)) { // is dir or link -> fix for search results (chrome returns dirs without children and without url)
                    if (opts.demoMode) {
                        if (bookmark.children) {
                            bookmark.title = "Directory " + (idx + 1);
                        } else {
                            bookmark.title = "Bookmark " + (idx + 1);
                            bookmark.url = "https://example.com/";
                        }
                    }

                    let entry = $("<li />").appendTo(list);
                    let entryContent = $("<a />")
                        .html("<span class='" + this.opts.classes.sidebar.bookmarkLabel + "'>" + bookmark.title + "</span><span class='" + this.opts.classes.drag.trigger + "' />")
                        .attr(this.opts.attr.id, bookmark.id)
                        .appendTo(entry);

                    bookmark.element = entryContent;

                    if (bookmark.children) { // dir
                        bookmark.icon = chrome.extension.getURL("img/dir.webp");

                        entryContent
                            .data("infos", bookmark)
                            .attr("title", bookmark.title + "\n-------------\n" + bookmark.children.length + " " + this.lang("sidebar_dir_children"))
                            .addClass(this.opts.classes.sidebar.bookmarkDir);

                        if (showBookmarkIcons) {
                            entryContent.prepend("<img " + (sidebarOpen ? "src" : this.opts.attr.src) + "='" + bookmark.icon + "' />")
                        }
                    } else { // link
                        entryContent
                            .data("infos", bookmark)
                            .attr("title", bookmark.title + "\n-------------\n" + bookmark.url)
                            .addClass(this.opts.classes.sidebar.bookmarkLink);

                        if (showBookmarkIcons) {
                            this.helper.model.call("favicon", {url: bookmark.url}, (response) => { // retrieve favicon of url
                                if (opts.demoMode) {
                                    response.img = chrome.extension.getURL("img/demo/favicon-" + (Math.floor(Math.random() * 10) + 1  ) + ".webp");
                                }

                                if (response.img) { // favicon found -> add to entry
                                    bookmark.icon = response.img;

                                    entryContent
                                        .data("infos", bookmark)
                                        .prepend("<img " + (sidebarOpen ? "src" : this.opts.attr.src) + "='" + bookmark.icon + "' />")
                                }
                            });
                        }
                    }

                    ret++;
                }
            });

            return ret;
        };

        /**
         * Initialises the not yet loaded images in the sidebar
         */
        this.initImages = () => {
            this.elements.sidebar.find("img[" + this.opts.attr.src + "]").forEach((_self) => {
                let img = $(_self);
                let src = img.attr(this.opts.attr.src);
                img.removeAttr(this.opts.attr.src);
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

                    updateEntriesInfo(response.bookmarks[0].children);
                    this.helper.search.init();
                    this.addBookmarkDir(response.bookmarks[0].children, list);

                    if (list.children("li").length() === 1) { // hide root directory if it's the only one
                        list.addClass(this.opts.classes.sidebar.hideRoot);
                    }

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

                $("<h2 />").html(this.lang("share_userdata_headline")).appendTo(contentBox);
                $("<p />").html(this.lang("share_userdata_desc")).appendTo(contentBox);
                $("<p />").html(this.lang("share_userdata_desc2")).appendTo(contentBox);

                let noticeText = this.lang("share_userdata_notice").replace(/\[u\](.*)\[\/u\]/, "<span>$1</span>");
                $("<p />").addClass(opts.classes.sidebar.shareUserdataNotice).html(noticeText).appendTo(contentBox);

                $("<a href='#' />").data("accept", true).html(this.lang("share_userdata_accept")).appendTo(contentBox);
                $("<a href='#' />").data("accept", false).html(this.lang("share_userdata_decline")).appendTo(contentBox);
            }
        };


        /*
         * ################################
         * PRIVATE
         * ################################
         */

        let restoreOpenStateRunning = 0;

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
            this.helper.stylesheet.addStylesheets(["content"]);

            this.elements.iframe = $('<iframe id="' + this.opts.ids.page.iframe + '" />').appendTo("body");
            this.elements.iframeBody = this.elements.iframe.find("body");
            this.elements.sidebar = $('<section id="' + this.opts.ids.sidebar.sidebar + '" />').appendTo(this.elements.iframeBody);

            this.elements.bookmarkBox = {
                all: this.helper.scroll.add(this.opts.ids.sidebar.bookmarkBox, $("<ul />").appendTo(this.elements.sidebar)),
                search: this.helper.scroll.add(this.opts.ids.sidebar.bookmarkBoxSearch, $("<ul />").appendTo(this.elements.sidebar))
            };

            this.elements.header = $("<header />").prependTo(this.elements.sidebar);
            this.helper.stylesheet.addStylesheets(["sidebar"], this.elements.iframe);

            let entriesLocked = this.helper.model.getData("u/entriesLocked");
            if (entriesLocked === false) {
                this.elements.iframeBody.addClass(this.opts.classes.sidebar.entriesUnlocked);
            }

            this.elements.bookmarkBox["all"].addClass(this.opts.classes.sidebar.active);
            this.updateBookmarkBox();
            this.helper.toggle.init();
        };

        /**
         * Updates the object with all bookmarks and directories,
         * stores the infos off all entries in a one dimensional object excluding the hidden bookmarks or directories
         *
         * @param {Array} bookmarkTree
         */
        let updateEntriesInfo = (bookmarkTree) => {
            let hiddenBookmarks = this.helper.model.getData("u/hiddenBookmarks");

            this.entries = {
                bookmarks: {},
                directories: {}
            };

            let processEntries = (bookmarkObj, parents) => {
                for (let i = 0; i < bookmarkObj.length; i++) {
                    let bookmark = bookmarkObj[i];
                    if (hiddenBookmarks[bookmark.id] !== true) {
                        let thisParents = [...parents];

                        if (bookmark.parentId !== "0") {
                            thisParents.push(bookmark.parentId);
                        }

                        bookmark.parents = thisParents;
                        if (bookmark.url) {
                            this.entries.bookmarks[bookmark.id] = bookmark;
                        } else if (bookmark.children) {
                            this.entries.directories[bookmark.id] = bookmark;
                            processEntries(bookmark.children, thisParents);
                        }
                    }
                }
            };
            processEntries(bookmarkTree, []);
            updateSidebarHeader();
        };

        /**
         * Updates the html for the sidebar header
         */
        let updateSidebarHeader = () => {
            this.elements.header.text("");
            let bookmarkAmount = Object.keys(this.entries.bookmarks).length;

            $("<span />").html("<span>" + bookmarkAmount + "</span> " + this.lang("header_bookmarks" + (bookmarkAmount === 1 ? "_single" : ""))).appendTo(this.elements.header);
            $("<a />").addClass(this.opts.classes.sidebar.settings).appendTo(this.elements.header);
            $("<a />").addClass(this.opts.classes.sidebar.search).appendTo(this.elements.header);

            $("<div />")
                .addClass(this.opts.classes.sidebar.searchBox)
                .append("<input type='text' placeholder='" + this.lang("sidebar_search_placeholder") + "' />")
                .append("<a href='#' class='" + this.opts.classes.sidebar.searchClose + "'></a>")
                .appendTo(this.elements.header);
        };


        /**
         * Sets a class to the iframe body and fires an event to indicate, that the extension is loaded completely
         */
        let extensionLoaded = () => {
            let data = this.helper.model.getData(["b/pxTolerance", "a/showIndicator"]);

            this.elements.iframeBody.addClass(this.opts.classes.sidebar.extLoaded);
            document.dispatchEvent(new CustomEvent(this.opts.events.loaded, {
                detail: {
                    pxTolerance: data.pxTolerance,
                    showIndicator: data.showIndicator
                },
                bubbles: true,
                cancelable: false
            }));
        };
    };

})(jsu);