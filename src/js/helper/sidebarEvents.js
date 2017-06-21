($ => {
    "use strict";

    window.SidebarEventsHelper = function (ext) {

        /**
         * Initializes the helper
         */
        this.init = () => {
            initBookmarkEntriesEvents();
            initFilterEvents();
            initKeyboardEvents();
            initGeneralEvents();
        };

        /**
         * Initializes the eventhandlers for keyboard input
         */
        let initKeyboardEvents = () => {
            $([document, ext.elements.iframe[0].contentDocument]).on("keydown", (e) => {
                if (ext.elements.iframe.hasClass(ext.opts.classes.page.visible) && $("iframe#" + ext.opts.ids.page.overlay).length() === 0) {
                    let scrollKeys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", "Space"];

                    if (scrollKeys.indexOf(e.key) > -1 || scrollKeys.indexOf(e.code) > -1) {
                        ext.helper.scroll.focus();
                    } else if (e.key === "c" && (e.ctrlKey || e.metaKey)) { // copy url of currently hovered bookmark
                        e.preventDefault();
                        Object.values(ext.elements.bookmarkBox).forEach((box) => {
                            if (box.hasClass(ext.opts.classes.sidebar.active)) {
                                let elm = box.find("> ul a." + ext.opts.classes.sidebar.hover).eq(0);
                                if (elm.length() > 0) {
                                    let data = ext.helper.entry.getData(elm.attr(ext.opts.attr.id));
                                    if (data && data.url && ext.copyToClipboard(data.url)) {
                                        $(elm).children("span." + ext.opts.classes.sidebar.copied).remove();
                                        let copiedNotice = $("<span />").addClass(ext.opts.classes.sidebar.copied).text(ext.helper.i18n.get("sidebar_copied_to_clipboard")).appendTo(elm);

                                        setTimeout(() => {
                                            $(elm).addClass(ext.opts.classes.sidebar.copied);

                                            setTimeout(() => {
                                                $(elm).removeClass(ext.opts.classes.sidebar.copied);

                                                setTimeout(() => {
                                                    copiedNotice.remove();
                                                }, 500);
                                            }, 1500);
                                        }, 100);
                                    }
                                }
                            }
                        });
                    } else { // focus search field to enter the value of the pressed key there
                        let searchField = ext.elements.header.find("div." + ext.opts.classes.sidebar.searchBox + " > input[type='text']");
                        searchField.data("l", (e.ctrlKey || e.metaKey) ? 0 : searchField[0].value.length);
                        searchField[0].focus();
                    }
                }
            }).on("keyup", () => {
                if (ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) {
                    let searchField = ext.elements.header.find("div." + ext.opts.classes.sidebar.searchBox + " > input[type='text']");
                    let prevLength = searchField.data("l") || 0;
                    let searchVal = searchField[0].value;

                    if (searchVal.length > 0 && !ext.elements.header.hasClass(ext.opts.classes.sidebar.searchVisible)) { // search field is not yet visible but the field is filled
                        ext.helper.contextmenu.close();
                        ext.elements.header.addClass(ext.opts.classes.sidebar.searchVisible);
                    } else {
                        ext.helper.scroll.focus(+prevLength !== searchVal.length); // focus scrollbox if length of search field is unchanged
                    }
                }
            });
        };

        /**
         * Initializes the eventhandlers for the filterbox
         */
        let initFilterEvents = () => {
            ext.elements.filterBox.on("click", "a[" + ext.opts.attr.direction + "]", (e) => { // change sort direction
                e.preventDefault();
                let currentDirection = $(e.target).attr(ext.opts.attr.direction);
                let newDirection = currentDirection === "ASC" ? "DESC" : "ASC";
                ext.helper.list.updateDirection(newDirection);
            }).on("click", "div." + ext.opts.classes.checkbox.box + " + a", (e) => { // trigger checkbox (viewAsTree or mostViewedPerMonth)
                e.preventDefault();
                $(e.target).prev("div[" + ext.opts.attr.name + "]").trigger("click");
            });

            $(ext.elements.iframe[0].contentDocument).on(ext.opts.events.checkboxChanged, (e) => { // set sort specific config and reload list
                let name = e.detail.checkbox.attr(ext.opts.attr.name);

                if (name === "viewAsTree" || name === "mostViewedPerMonth") {
                    ext.helper.model.setData({
                        ["u/" + name]: e.detail.checked
                    }, () => {
                        ext.startLoading();
                        ext.helper.model.call("refreshAllTabs", {scrollTop: true, type: "Sort"});
                    });
                }
            });
        };

        /**
         * Initializes the eventhandlers for the bookmark entries
         */
        let initBookmarkEntriesEvents = () => {
            Object.values(ext.elements.bookmarkBox).forEach((box) => {
                box.children("ul").on("click mousedown", "a", (e) => { // click on a bookmark (link or dir)
                    e.preventDefault();

                    if (!$(e.target).hasClass(ext.opts.classes.drag.trigger) && !$(e.target).hasClass(ext.opts.classes.sidebar.separator) && ((e.which === 1 && e.type === "click") || (e.which === 2 && e.type === "mousedown") || ext.refreshRun)) { // only left click
                        let _self = $(e.currentTarget);
                        let data = ext.helper.entry.getData(_self.attr(ext.opts.attr.id));

                        if (data.isDir && !_self.hasClass(ext.opts.classes.sidebar.dirAnimated)) {  // Click on dir
                            ext.helper.list.toggleBookmarkDir(_self);
                        } else if (!data.isDir) { // Click on link
                            let config = ext.helper.model.getData(["b/newTab", "b/linkAction"]);
                            let newTab = e.which === 2 || config.linkAction === "newtab";

                            if (e.which === 2) {
                                ext.helper.model.call("trackEvent", {
                                    category: "url",
                                    action: "open",
                                    label: "new_tab_middle_click"
                                });
                            } else {
                                ext.helper.model.call("trackEvent", {
                                    category: "url",
                                    action: "open",
                                    label: (newTab ? "new" : "current") + "_tab_default"
                                });
                            }

                            ext.helper.utility.openUrl(data, newTab ? "newTab" : "default", newTab ? config.newTab === "foreground" : true);
                        }
                    }
                }).on("mouseover", "a", (e) => { // add class to currently hovered element
                    box.find("> ul a." + ext.opts.classes.sidebar.hover).removeClass(ext.opts.classes.sidebar.hover);
                    $(e.currentTarget)
                        .addClass(ext.opts.classes.sidebar.hover)
                        .removeClass(ext.opts.classes.sidebar.mark);
                }).on("contextmenu", "a", (e) => { // right click
                    e.preventDefault();
                    let type = "list";
                    if ($(e.target).hasClass(ext.opts.classes.sidebar.separator)) {
                        type = "separator";
                    }
                    ext.helper.contextmenu.create(type, $(e.currentTarget));
                });

                box.children("ul").on("mouseleave", (e) => {
                    $(e.currentTarget).find("a." + ext.opts.classes.sidebar.hover).removeClass(ext.opts.classes.sidebar.hover);
                });
            });
        };

        /**
         * Initializes general events for the sidebar
         */
        let initGeneralEvents = () => {
            $(window).on("beforeunload", () => { // save scroll position before unloading page
                if (ext.elements.sidebar.hasClass(ext.opts.classes.sidebar.openedOnce)) { // sidebar has been open or is still open
                    ext.helper.scroll.updateAll();
                }
            });

            ext.elements.iframe.find("body").on("click", () => {
                ext.helper.contextmenu.close();
            });

            chrome.extension.onMessage.addListener((message) => { // listen for refresh event
                if (message && message.action && message.action === "refresh") {
                    if (!ext.elements.sidebar.hasClass(ext.opts.classes.sidebar.loading)) { // only refresh if the extension is not loading at the moment
                        let delay = 0;
                        if (message.scrollTop) {
                            ext.helper.scroll.setScrollPos(ext.elements.bookmarkBox["all"], 0);
                            delay = 100;
                        }

                        setTimeout(() => {
                            ext.refresh();
                        }, delay);
                    }
                }
            });

            ["menu", "sort"].forEach((type) => {
                ext.elements.header.on("click contextmenu", "a." + ext.opts.classes.sidebar[type], (e) => { // Menu and sort contextmenu
                    e.preventDefault();
                    e.stopPropagation();
                    ext.helper.contextmenu.create(type, $(e.currentTarget));
                });
            });

            ext.elements.iframeBody.on("click", "#" + ext.opts.ids.sidebar.shareUserdata + " a", (e) => { // share userdata mask
                e.preventDefault();
                ext.helper.model.call("shareUserdata", {
                    share: $(e.currentTarget).data("accept")
                });
                ext.elements.iframeBody.find("div#" + ext.opts.ids.sidebar.shareUserdata).addClass(ext.opts.classes.sidebar.hidden);
            });
        };
    };

})(jsu);