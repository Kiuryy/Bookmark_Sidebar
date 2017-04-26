($ => {
    "use strict";

    window.SidebarEventsHelper = function (ext) {

        /**
         * Initializes the helper
         */
        this.init = () => {
            initEvents();
        };

        /**
         * Opens the url of the given bookmark
         *
         * @param {object} infos
         * @param {string} type
         * @param {boolean} active
         */
        this.openUrl = (infos, type = "default", active = true) => {
            if (type === "incognito") {
                ext.helper.model.call("openLink", {
                    href: infos.url,
                    incognito: true
                });
            } else {
                ext.helper.model.call("openLink", {
                    parentId: infos.parentId,
                    id: infos.id,
                    href: infos.url,
                    newTab: type === "newTab",
                    active: active
                });
            }
        };

        /**
         * Initializes the events for the sidebar
         */
        let initEvents = () => {
            $(window).on("beforeunload", () => { // save scroll position before unloading page
                if (ext.elements.sidebar.hasClass(ext.opts.classes.sidebar.openedOnce)) { // sidebar has been open or is still open
                    ext.helper.scroll.updateAll(true, true);
                }
            }).on("resize", () => {
                ext.helper.scroll.updateAll(true);
            });

            $([document, ext.elements.iframe[0].contentDocument]).on("keydown", (e) => { // scroll to top with pos1
                if (e.key === "Home" && ext.elements.iframe.hasClass(ext.opts.classes.page.visible)) {
                    e.preventDefault();
                    ext.helper.scroll.setAllScrollPos(0);
                }
            });

            ext.elements.iframe.find("body").on("click", () => {
                ext.helper.contextmenu.close();
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

            Object.values(ext.elements.bookmarkBox).forEach((box) => {
                box.children("ul").on("click mousedown", "a", (e) => { // click on a bookmark (link or dir)
                    e.preventDefault();

                    if (!$(e.target).hasClass(ext.opts.classes.drag.trigger) && ((e.which === 1 && e.type === "click") || (e.which === 2 && e.type === "mousedown") || ext.firstRun)) { // only left click
                        let _self = $(e.currentTarget);
                        let data = ext.helper.entry.getData(_self.attr(ext.opts.attr.id));

                        if (data.isDir && !_self.hasClass(ext.opts.classes.sidebar.dirAnimated)) {  // Click on dir
                            ext.helper.list.toggleBookmarkDir(_self);
                        } else if (!data.isDir) { // Click on link
                            let config = ext.helper.model.getData(["b/newTab", "b/linkAction"]);
                            let newTab = e.which === 2 || config.linkAction === "newtab";
                            this.openUrl(data, newTab ? "newTab" : "default", newTab ? config.newTab === "foreground" : true);
                        }
                    }
                }).on("mouseover", "a", (e) => {
                    if ($(e.currentTarget).hasClass(ext.opts.classes.sidebar.mark)) {
                        $(e.currentTarget).removeClass(ext.opts.classes.sidebar.mark);
                    }
                }).on("contextmenu", "a", (e) => { // right click
                    e.preventDefault();
                    ext.helper.contextmenu.create("list", $(e.currentTarget));
                });

                box.children("div." + ext.opts.classes.sidebar.filterBox).on("click", "a[" + ext.opts.attr.direction + "]", (e) => { // change sort direction
                    e.preventDefault();
                    let currentDirection = $(e.target).attr(ext.opts.attr.direction);
                    let newDirection = currentDirection === "ASC" ? "DESC" : "ASC";
                    ext.helper.list.updateDirection(newDirection);
                }).on("click", "div." + ext.opts.classes.checkbox.box + " + a", (e) => { // trigger checkbox (viewAsTree or mostViewedPerMonth)
                    e.preventDefault();
                    $(e.target).prev("div[" + ext.opts.attr.name + "]").trigger("click");
                });
            });

            $(ext.elements.iframe[0].contentDocument).on(ext.opts.events.checkboxChanged, (e) => { // set sort specific config and reload list
                let name = e.detail.checkbox.attr(ext.opts.attr.name);

                if (name === "viewAsTree" || name === "mostViewedPerMonth") {
                    ext.helper.model.setData({
                        ["u/" + name]: e.detail.checked
                    }, () => {
                        ext.helper.list.updateBookmarkBox(true);
                    });
                }
            });
        };
    };

})(jsu);