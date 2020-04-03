($ => {
    "use strict";

    $.MenuHelper = function (s) {
        let running = false;
        let list = null;
        let currentPath = null;
        let currentPage = null;

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                list = $("<ul />").appendTo(s.elm.aside.children("nav"));
                let menuParsing = s.elm.content.children("div." + $.cl.settings.tabs.content).length();

                const menupointLoaded = () => {
                    menuParsing--;
                    if (menuParsing === 0) {
                        handleNavigationChange().then(() => {
                            resolve();
                        });
                    }
                };

                s.elm.content.children("div." + $.cl.settings.tabs.content).forEach((elm) => {
                    const name = $(elm).attr($.attr.name);
                    const entry = $("<li />").attr($.attr.name, name).html("<a href='#'>" + s.helper.i18n.get("settings_menu_" + name) + "</a>").appendTo(list);
                    const subTabs = $(elm).children("div[" + $.attr.name + "]");

                    if (subTabs.length() > 0) {
                        const subList = $("<ul />").appendTo(entry);

                        subTabs.forEach((subElm) => {
                            const subName = $(subElm).attr($.attr.name);
                            const src = $(subElm).attr($.attr.src);

                            const subEntry = $("<li />")
                                .attr($.attr.name, subName)
                                .html("<a href='#'>" + s.helper.i18n.get("settings_menu_" + name + "_" + subName) + "</a>")
                                .appendTo(subList);

                            if (src) {
                                subEntry.attr($.attr.src, src);
                            }
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

        this.getPath = () => currentPath;

        this.addBreadcrumb = (obj) => {
            s.elm.content[0].scrollTop = 0;

            if (obj.depth && currentPath.length >= obj.depth) { // change the breadcrumb entry at a specific position
                currentPath[obj.depth - 1] = obj.alias;
                s.elm.headline.children("span").forEach((elm, i) => {
                    if (i >= obj.depth - 1) {
                        $(elm).remove();
                    }
                });
            } else {
                currentPath.push(obj.alias);
            }

            s.elm.headline.append("<span>" + obj.label + "</span>");
        };

        const handleNavigationChange = () => {
            return new Promise((resolve) => {
                const hash = location.hash ? location.hash.substr(1) : null;

                if (hash) {
                    showPage(...hash.split("_"));
                } else {
                    list.find("a").eq(0).trigger("click");
                }

                $.delay(300).then(resolve);
            });
        };

        const initEvents = () => {
            list.find("a").on("click", (e) => {
                e.preventDefault();
                const elm = $(e.currentTarget).parent("li");
                const name = elm.attr($.attr.name);
                const src = elm.attr($.attr.src);

                if (src) {
                    s.helper.model.call("openLink", {
                        hrefName: src,
                        newTab: true,
                        params: {lang: s.helper.i18n.getLanguage()}
                    });
                } else if (elm.parents("li").length() > 0) {
                    const parentName = elm.parent("ul").parent("li").attr($.attr.name);
                    showPage(parentName, name);
                } else {
                    showPage(name);
                }
            });

            s.elm.headline.on("click", "span", (e) => {
                const idx = $(e.currentTarget).prevAll().length();
                showPage(...currentPath.slice(0, idx + 1));
            });

            $(window).on("popstate", () => {
                handleNavigationChange();
            });
        };

        const updateHeaderMenu = () => {
            const path = this.getPath();
            const pages = [
                s.elm.content.children("div." + $.cl.settings.tabs.content + "[" + $.attr.name + "='" + path[0] + "']")
            ];

            s.elm.header.attr($.attr.type, path[0]);

            if (path[1]) {
                pages.unshift(pages[0].children("div[" + $.attr.name + "='" + path[1] + "']"));
            }

            ["save", "restore"].forEach((type) => {
                pages.some((page) => {
                    const info = page.attr($.attr.settings[type]);
                    s.elm.buttons[type].addClass($.cl.hidden);

                    if (info) { // attribute is available
                        if (info !== "false") {
                            s.elm.buttons[type]
                                .html(info === "true" ? "" : s.helper.i18n.get(info))
                                .removeClass($.cl.hidden);
                        }

                        return true;
                    }
                });
            });
        };

        const hidePages = () => {
            list.find("li").removeClass($.cl.active);

            const allPages = s.elm.content.children("div." + $.cl.settings.tabs.content);
            allPages.removeClass($.cl.active);
            allPages.children("div[" + $.attr.name + "]").removeClass($.cl.active);

            list.find("ul").css("height", "");
        };

        const showPage = (...path) => {
            return new Promise((resolve) => {
                if (!running) { // prevent popstate and event both running this method
                    running = true;
                    let pathLen = path.length;
                    const breadcrumb = [];
                    let menu = list.children("li[" + $.attr.name + "='" + path[0] + "']");
                    let page = s.elm.content.children("div." + $.cl.settings.tabs.content + "[" + $.attr.name + "='" + path[0] + "']");

                    if (page.length() === 0) { // invalid page -> redirect to startpage of the settings
                        location.href = location.protocol + "//" + location.host + location.pathname;
                        return;
                    }

                    if (pathLen === 1 && page.find("> div[" + $.attr.name + "]").length() > 0) {

                        if (menu.hasClass($.cl.settings.incomplete) && path[0] === "language") { // open translation overview instead of the first sub page, if the current translation is incomplete
                            path.push(page.find("> div[" + $.attr.name + "='translate']").eq(0).attr($.attr.name));
                        } else {
                            path.push(page.find("> div[" + $.attr.name + "]").eq(0).attr($.attr.name));
                        }

                        pathLen++;
                    }

                    if (pathLen >= 2 && path[0] === "sidebar" && path[1] === "toggle" && path[2] === "area") { // open the modal for configuring the toggle area
                        s.elm.buttons.toggleAreaOpen.eq(0).trigger("click");
                    }

                    const hash = path.join("_");
                    hidePages();

                    for (let i = 1; i <= pathLen; i++) {
                        const menuParent = menu.parent("ul");

                        if (menuParent && menuParent.length() > 0) {
                            menu.addClass($.cl.active);
                            page.addClass($.cl.active);
                            breadcrumb.push(menu.children("a").html());

                            let listHeight = 0;
                            menuParent.children("li:not(." + $.cl.hidden + ")").forEach((menuEntry) => {
                                listHeight += $(menuEntry).data("height") || 0;
                            });

                            if (listHeight > 0) {
                                menuParent.css("height", listHeight + "px");
                            }

                            if (i < pathLen) {
                                menu = menu.find("> ul > li[" + $.attr.name + "='" + path[i] + "']");
                                page = page.find("> div[" + $.attr.name + "='" + path[i] + "']");
                            }
                        }
                    }

                    s.elm.headline.html("<span>" + breadcrumb.join("</span><span>") + "</span>");
                    s.elm.body.attr($.attr.type, hash);

                    location.hash = hash;
                    currentPage = page;
                    currentPath = path;

                    s.elm.content[0].scrollTop = 0;
                    updateHeaderMenu();

                    const padding = "padding-" + (s.helper.i18n.isRtl() ? "left" : "right");
                    s.elm.header.css(padding, "");
                    s.elm.content.css(padding, "");

                    document.dispatchEvent(new CustomEvent($.opts.events.pageChanged, {
                        detail: {
                            path: path
                        },
                        bubbles: true,
                        cancelable: false
                    }));

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