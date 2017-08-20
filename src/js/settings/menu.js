($ => {
    "use strict";

    window.MenuHelper = function (s) {
        let list = null;
        let currentPath = null;
        let currentPage = null;

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                list = $("<ul />").appendTo(s.opts.elm.aside.children("nav"));
                let menuParsing = s.opts.elm.content.children("div." + s.opts.classes.tabs.content).length();

                let menupointLoaded = () => {
                    menuParsing--;
                    if (menuParsing === 0) {
                        handleNavigationChange().then(resolve);
                    }
                };

                s.opts.elm.content.children("div." + s.opts.classes.tabs.content).forEach((elm) => {
                    let name = $(elm).attr(s.opts.attr.name);
                    let entry = $("<li />").attr(s.opts.attr.name, name).html("<a href='#'>" + s.helper.i18n.get("settings_menu_" + name) + "</a>").appendTo(list);
                    let subTabs = $(elm).children("div[" + s.opts.attr.name + "]");

                    if (subTabs.length() > 0) {
                        let subList = $("<ul />").appendTo(entry);

                        subTabs.forEach((subElm) => {
                            let subName = $(subElm).attr(s.opts.attr.name);
                            $("<li />")
                                .attr(s.opts.attr.name, subName)
                                .html("<a href='#'>" + s.helper.i18n.get("settings_menu_" + name + "_" + subName) + "</a>")
                                .appendTo(subList);
                        });

                        $.delay(500).then(() => {
                            subList.data("height", subList[0].scrollHeight + "px");
                            menupointLoaded();
                        });
                    } else {
                        menupointLoaded();
                    }
                });

                initEvents();
            });
        };

        this.getPage = () => {
            return currentPage || $();
        };

        this.getPath = () => {
            return currentPath;
        };

        let handleNavigationChange = () => {
            return new Promise((resolve) => {
                let hash = location.hash ? location.hash.substr(1) : null;

                if (hash) {
                    showPage(...hash.split("_"));
                } else {
                    list.find("a").eq(0).trigger("click");
                }

                $.delay(300).then(resolve);
            });
        };

        let initEvents = () => {
            list.find("a").on("click", (e) => {
                e.preventDefault();
                let elm = $(e.currentTarget).parent("li");
                let name = elm.attr(s.opts.attr.name);

                if (elm.parents("li").length() > 0) {
                    let parentName = elm.parent("ul").parent("li").attr(s.opts.attr.name);
                    showPage(parentName, name);
                } else {
                    showPage(name);
                }
            });

            $(window).on("popstate", () => {
                handleNavigationChange();
            });
        };

        let updateHeaderMenu = (pageName) => {
            let page = s.opts.elm.content.children("div." + s.opts.classes.tabs.content + "[" + s.opts.attr.name + "='" + pageName + "']");

            ["save", "restore"].forEach((type) => {
                let info = page.attr(s.opts.attr.buttons[type]);

                if (info && info !== "false") {
                    s.opts.elm.buttons[type]
                        .html(info === "true" ? "" : s.helper.i18n.get(info))
                        .removeClass(s.opts.classes.hidden);
                } else {
                    s.opts.elm.buttons[type].addClass(s.opts.classes.hidden);
                }
            });
        };

        let hidePages = () => {
            list.find("li").removeClass(s.opts.classes.tabs.active);

            let allPages = s.opts.elm.content.children("div." + s.opts.classes.tabs.content);
            allPages.removeClass(s.opts.classes.tabs.active);
            allPages.children("div[" + s.opts.attr.name + "]").removeClass(s.opts.classes.tabs.active);

            list.find("ul").css("height", "");
        };

        let showPage = (...path) => {
            hidePages();

            let pathLen = path.length;
            let breadcrumb = [];
            let menu = list.children("li[" + s.opts.attr.name + "='" + path[0] + "']");
            let page = s.opts.elm.content.children("div." + s.opts.classes.tabs.content + "[" + s.opts.attr.name + "='" + path[0] + "']");

            if (pathLen === 1 && page.find("> div[" + s.opts.attr.name + "]").length() > 0) {
                path.push(page.find("> div[" + s.opts.attr.name + "]").eq(0).attr(s.opts.attr.name));
                pathLen++;
            }

            for (let i = 1; i <= pathLen; i++) {
                menu.addClass(s.opts.classes.tabs.active);
                page.addClass(s.opts.classes.tabs.active);
                breadcrumb.push(menu.children("a").html());

                let menuParent = menu.parent("ul");
                if (menuParent.data("height")) {
                    menuParent.css("height", menuParent.data("height"));
                }

                if (i < pathLen) {
                    menu = menu.find("> ul > li[" + s.opts.attr.name + "='" + path[i] + "']");
                    page = page.find("> div[" + s.opts.attr.name + "='" + path[i] + "']");
                }
            }

            updateHeaderMenu(path[0]);
            s.opts.elm.headline.html("<span>" + breadcrumb.join("</span><span>") + "</span>");
            s.opts.elm.body.attr(s.opts.attr.type, path.join("_"));

            location.hash = path.join("_");
            currentPage = page;
            currentPath = path;

            s.opts.elm.header.css("padding-right", "");
            s.opts.elm.content.css("padding-right", "");

            document.dispatchEvent(new CustomEvent(s.opts.events.pageChanged, {
                detail: {
                    path: path
                },
                bubbles: true,
                cancelable: false
            }));

            s.helper.model.call("trackEvent", {
                category: "settings",
                action: "page",
                label: path.join("_")
            });
        };
    };

})(jsu);