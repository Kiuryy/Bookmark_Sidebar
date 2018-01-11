($ => {
    "use strict";

    window.MenuHelper = function (s) {
        let running = false;
        let initial = true;
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
                        handleNavigationChange().then(() => {
                            initial = false;
                            resolve();
                        });
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
                            subList.children("li").forEach((elm) => {
                                $(elm).data("height", elm.scrollHeight);
                            });

                            menupointLoaded();
                        });
                    } else {
                        menupointLoaded();
                    }
                });

                initEvents();
            });
        };

        this.getPage = () => currentPage || $();
        this.getPath = () => currentPath;

        this.addBreadcrumb = (obj) => {
            s.opts.elm.content[0].scrollTop = 0;

            if (obj.depth && currentPath.length >= obj.depth) { // change the breadcrumb entry at a specific position
                currentPath[obj.depth - 1] = obj.alias;
                s.opts.elm.headline.children("span").forEach((elm, i) => {
                    if (i >= obj.depth - 1) {
                        $(elm).remove();
                    }
                });
            } else {
                currentPath.push(obj.alias);
            }

            s.opts.elm.headline.append("<span>" + obj.label + "</span>");
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

            s.opts.elm.headline.on("click", "span", (e) => {
                let idx = $(e.currentTarget).prevAll().length();
                showPage(...currentPath.slice(0, idx + 1));
            });

            $(window).on("popstate", () => {
                handleNavigationChange();
            });
        };

        let updateHeaderMenu = () => {
            let path = this.getPath();
            let pages = [
                s.opts.elm.content.children("div." + s.opts.classes.tabs.content + "[" + s.opts.attr.name + "='" + path[0] + "']")
            ];

            s.opts.elm.header.attr(s.opts.attr.type, path[0]);

            if (path[1]) {
                pages.unshift(pages[0].children("div[" + s.opts.attr.name + "='" + path[1] + "']"));
            }

            ["save", "restore"].forEach((type) => {
                pages.some((page) => {
                    let info = page.attr(s.opts.attr.buttons[type]);
                    s.opts.elm.buttons[type].addClass(s.opts.classes.hidden);

                    if (info) { // attribute is available
                        if (info !== "false") {
                            s.opts.elm.buttons[type]
                                .html(info === "true" ? "" : s.helper.i18n.get(info))
                                .removeClass(s.opts.classes.hidden);
                        }

                        return true;
                    }
                });
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
            return new Promise((resolve) => {
                if (!running) { // prevent popstate and event both running this method
                    running = true;
                    let pathLen = path.length;
                    let breadcrumb = [];
                    let menu = list.children("li[" + s.opts.attr.name + "='" + path[0] + "']");
                    let page = s.opts.elm.content.children("div." + s.opts.classes.tabs.content + "[" + s.opts.attr.name + "='" + path[0] + "']");

                    if (pathLen === 1 && page.find("> div[" + s.opts.attr.name + "]").length() > 0) {

                        if (menu.hasClass(s.opts.classes.incomplete) && path[0] === "language") { // open translation overview instead of the first sub page, if the current translation is incomplete
                            path.push(page.find("> div[" + s.opts.attr.name + "='translate']").eq(0).attr(s.opts.attr.name));
                        } else {
                            path.push(page.find("> div[" + s.opts.attr.name + "]").eq(0).attr(s.opts.attr.name));
                        }

                        pathLen++;
                    }

                    let hash = path.join("_");
                    hidePages();

                    for (let i = 1; i <= pathLen; i++) {
                        let menuParent = menu.parent("ul");

                        if (menuParent && menuParent.length() > 0) {
                            menu.addClass(s.opts.classes.tabs.active);
                            page.addClass(s.opts.classes.tabs.active);
                            breadcrumb.push(menu.children("a").html());

                            let listHeight = 0;
                            menuParent.children("li:not(." + s.opts.classes.hidden + ")").forEach((menuEntry) => {
                                listHeight += $(menuEntry).data("height") || 0;
                            });

                            if (listHeight > 0) {
                                menuParent.css("height", listHeight + "px");
                            }

                            if (i < pathLen) {
                                menu = menu.find("> ul > li[" + s.opts.attr.name + "='" + path[i] + "']");
                                page = page.find("> div[" + s.opts.attr.name + "='" + path[i] + "']");
                            }
                        }
                    }

                    s.opts.elm.headline.html("<span>" + breadcrumb.join("</span><span>") + "</span>");
                    s.opts.elm.body.attr(s.opts.attr.type, hash);

                    location.hash = hash;
                    currentPage = page;
                    currentPath = path;

                    s.opts.elm.content[0].scrollTop = 0;
                    updateHeaderMenu();

                    let padding = "padding-" + (s.helper.i18n.isRtl() ? "left" : "right");
                    s.opts.elm.header.css(padding, "");
                    s.opts.elm.content.css(padding, "");

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
                        label: hash
                    });

                    $.delay().then(() => {
                        running = false;
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        };
    };

})(jsu);