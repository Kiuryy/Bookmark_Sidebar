($ => {
    "use strict";

    window.ContextmenuHelper = function (ext) {

        /**
         * Generates a contextmenu of the given type for the given element
         *
         * @param {string} type
         * @param {jsu} elm
         */
        this.create = (type, elm) => {
            elm.addClass(ext.opts.classes.sidebar.active);

            let contextmenu = $("<div />")
                .addClass(ext.opts.classes.contextmenu.wrapper)
                .html("<ul />")
                .attr(ext.opts.attr.type, type)
                .data("elm", elm)
                .appendTo(ext.elements.sidebar);

            switch (type) {
                case "list": {
                    handleListMenu(contextmenu, elm);
                    break;
                }
                case "settings": {
                    handleSettingsMenu(contextmenu, elm);
                    break;
                }
            }

            initEvents(contextmenu);

            setTimeout(() => {
                contextmenu.addClass(ext.opts.classes.contextmenu.visible);

                let topVal = parseInt(contextmenu.css("top"));
                let height = contextmenu.realHeight();
                if (topVal + height >= window.innerHeight) { // no space to show contextmenu on bottom -> show on top instead
                    contextmenu.css("top", topVal - height).addClass(ext.opts.classes.contextmenu.top);
                }
            }, 0);
        };

        /**
         * Closes all open contextmenus
         */
        this.close = () => {
            let contextmenus = ext.elements.iframeBody.find("div." + ext.opts.classes.contextmenu.wrapper);

            contextmenus.forEach((contextmenu) => {
                $(contextmenu).removeClass(ext.opts.classes.contextmenu.visible);
                $(contextmenu).data("elm").removeClass(ext.opts.classes.sidebar.active);
            });

            setTimeout(() => {
                contextmenus.remove();
            }, 500);
        };

        /**
         * Extends the contextmenu with the links which are relevant for the settings
         *
         * @param {jsu} contextmenu
         * @param {jsu} elm
         */
        let handleSettingsMenu = (contextmenu, elm) => {
            contextmenu.children("ul")
                .append("<li><a " + ext.opts.attr.type + "='settings'><span></span>" + chrome.i18n.getMessage("contextmenu_settings") + "</a></li>")
                .append("<li><a " + ext.opts.attr.type + "='bookmarkManager'><span></span>" + chrome.i18n.getMessage("contextmenu_bookmark_manager") + "</a></li>")
                .append("<li><a " + ext.opts.attr.type + "='updateUrls'><span></span>" + chrome.i18n.getMessage("contextmenu_update_urls") + "</a></li>")
                .append("<li><a " + ext.opts.attr.type + "='toggleFix'><span></span>" + chrome.i18n.getMessage("contextmenu_toggle_fix") + "</a></li>");

            let elmBoundClientRect = elm[0].getBoundingClientRect();
            contextmenu.css("top", (elmBoundClientRect.top + elmBoundClientRect.height) + "px");
        };

        /**
         * Extends the contextmenu with the links which are relevant for the bookmark list
         *
         * @param {jsu} contextmenu
         * @param {jsu} elm
         */
        let handleListMenu = (contextmenu, elm) => {
            let infos = elm.data("infos");
            let width = ext.elements.sidebar.realWidth() - elm[0].offsetLeft;
            let computedStyle = window.getComputedStyle(contextmenu[0]);
            width -= parseInt(computedStyle.getPropertyValue('margin-left'));
            width -= parseInt(computedStyle.getPropertyValue('margin-right'));

            contextmenu.css({
                width: width + "px",
                top: (elm[0].getBoundingClientRect().top + elm.realHeight()) + "px",
                left: elm[0].offsetLeft + "px"
            });

            let newTabStr = ext.helper.model.getData("b/newTab");
            contextmenu.data("newTabForeground", newTabStr === "foreground");

            let i18nAppend = !!(infos.children) ? "_dir" : "_bookmark";

            contextmenu.children("ul")
                .append("<li><a " + ext.opts.attr.type + "='infos'><span></span>" + chrome.i18n.getMessage("contextmenu_infos") + "</a></li>")
                .append("<li><a " + ext.opts.attr.type + "='edit'><span></span>" + chrome.i18n.getMessage("contextmenu_edit" + i18nAppend) + "</a></li>")
                .append("<li><a " + ext.opts.attr.type + "='delete'><span></span>" + chrome.i18n.getMessage("contextmenu_delete" + i18nAppend) + "</a></li>");

            if (!(infos.children)) {
                contextmenu.children("ul").prepend("<li><a " + ext.opts.attr.type + "='newTab'><span></span>" + chrome.i18n.getMessage("contextmenu_new_tab") + "</a></li>")
            }
        };


        /**
         * Initializes the events for the contextmenus
         */
        let initEvents = (contextmenu) => {
            contextmenu.find("a").on("click", (e) => {
                e.preventDefault();
                let type = $(e.currentTarget).attr(ext.opts.attr.type);

                switch (type) {
                    case "settings": { // open settings
                        ext.helper.model.call("openLink", {
                            href: "chrome://extensions/?options=" + chrome.runtime.id,
                            newTab: true
                        });
                        break;
                    }
                    case "toggleFix": { // toggle fixation of the entries
                        ext.elements.iframeBody.toggleClass(ext.opts.classes.sidebar.entriesUnlocked);
                        ext.helper.model.setData({
                            "u/entriesLocked": ext.elements.iframeBody.hasClass(ext.opts.classes.sidebar.entriesUnlocked) === false
                        });
                        break;
                    }
                    case "bookmarkManager": { // open bookmark manager
                        ext.helper.model.call("openLink", {
                            href: "chrome://bookmarks",
                            newTab: true,
                            active: true
                        });
                        break;
                    }
                    case "newTab": { // open bookmark in new tab
                        let infos = contextmenu.data("elm").data("infos");
                        ext.helper.model.call("openLink", {
                            parentId: infos.parentId,
                            id: infos.id,
                            href: infos.url,
                            newTab: true,
                            active: contextmenu.data("newTabForeground")
                        });
                        break;
                    }
                    default: { // open overlay of the given type
                        let infos = contextmenu.data("elm").data("infos");
                        ext.helper.overlay.create(type, $(e.currentTarget).text(), infos);
                        break;
                    }
                }
            });
        };
    };

})(jsu);