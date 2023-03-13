($ => {
    "use strict";

    $.DashboardHelper = function (s) {

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            await initTipsAndTricks();
            await initFooter();
            initLinks();
        };

        const initTipsAndTricks = async () => {
            const ctrlKeyLabel = navigator.platform.indexOf("Mac") > -1 ? "cmd" : "ctrl";

            const tipsTricks = {
                synchronization: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/synchronization.png",
                    action: {label: "settings_tips_tricks_synchronization_action", dest: "chrome://settings/syncSetup"}
                },
                activation_area: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/activation_area.png",
                    action: {label: "settings_toggle_area", dest: "#sidebar_toggle_area"}
                },
                i18n: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/i18n.png",
                    action: {label: "more_link", dest: "#language_translate"},
                    i18nReplaces: [await getLanguageAmount()]
                },
                separators: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/separators.png",
                    i18nReplaces: ["<i>about:blank</i>", "<i>------</i>", "<i>--- Example ---</i>", "<span></span>"]
                },
                about: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/about.png",
                    action: {label: "more_link", dest: "#infos_aboutme"}
                },
                right_click: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/right_click.png"
                },
                quick_bookmarking: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/quick_bookmarking.png",
                    i18nReplaces: ["<span></span>"]
                },
                hide_entries: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/hide_entries.png",
                    i18nReplaces: ["<span></span>"]
                },
                quick_url_copy: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/quick_url_copy.png",
                    i18nReplaces: ["<i>" + s.helper.i18n.get("keyboard_shortcuts_key_" + ctrlKeyLabel) + "</i>+<i>c</i>"]
                },
                open_all_bookmarks: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/open_all_bookmarks.png",
                    i18nReplaces: ["<i>" + s.helper.i18n.get("keyboard_shortcuts_key_" + ctrlKeyLabel) + "</i>"]
                },
                version: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/version.png",
                    headline: "settings_tips_tricks_facts"
                },
                keyboard_shortcuts: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/keyboard_shortcuts.png",
                    i18nReplaces: ["<span></span>"]
                },
                expand_all_subfolders: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/expand_all_subfolders.png",
                },
                quick_search: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/quick_search.png",
                },
                share_data: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/share_data.png",
                    action: {label: "more_link", dest: "#infos_permissions"}
                },
                multiselect: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/multiselect.png"
                },
                newtab: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/newtab.png",
                    action: {label: "newtab_title", dest: $.api.runtime.getURL("html/newtab.html")},
                    condition: s.helper.model.getData("n/override"),
                    i18nReplaces: ["<span></span>"]
                },
                privacy: {
                    img: "https://extensions.redeviation.com/img/tips-tricks/privacy.png",
                    action: {label: "more_link", dest: $.opts.website.info.privacyPolicy}
                },
            };

            let idx = 0;
            const randomListOfTipsTricks = getRandomListOfTipsTricks(tipsTricks);
            displayTipTrick(randomListOfTipsTricks[idx], tipsTricks[randomListOfTipsTricks[idx]]);

            s.elm.dashboard.tipsTricks.children("button").on("click", (e) => { // show the next tip/trick from the shuffled list
                e.preventDefault();
                idx = (idx + 1) % randomListOfTipsTricks.length;
                const uid = randomListOfTipsTricks[idx];
                displayTipTrick(uid, tipsTricks[uid]);
            });
        };

        /**
         * Displays the given tip/trick by hiding the currently displayed first and then render the new one
         *
         * @param uid
         * @param obj
         */
        const displayTipTrick = (uid, obj) => {
            s.elm.dashboard.tipsTricks.addClass($.cl.loading);
            const loader = s.helper.template.loading().appendTo(s.elm.dashboard.tipsTricks);

            $.delay(300).then(() => {
                return new Promise((resolve) => {
                    s.elm.dashboard.tipsTricks.children("div." + $.cl.info).remove();
                    s.elm.dashboard.tipsTricks.children("img").remove();

                    if (obj.img) {
                        const img = $("<img/>").prependTo(s.elm.dashboard.tipsTricks);
                        img
                            .on("load", resolve)
                            .on("error", resolve)
                            .attr("src", obj.img);
                    } else {
                        $.delay(50).then(resolve);
                    }

                    const infoBox = $("<div></div>").addClass($.cl.info).prependTo(s.elm.dashboard.tipsTricks);

                    let headline = s.helper.i18n.get("settings_tips_tricks_facts");
                    const subHeadline = s.helper.i18n.get("settings_tips_tricks_" + uid);
                    if (subHeadline) {
                        headline += "&ensp;<span>... " + subHeadline + "</span>";
                    }
                    $("<h2></h2>").html(headline).appendTo(infoBox);

                    const desc = $("<p></p>").html(s.helper.i18n.get("settings_tips_tricks_" + uid + "_desc", obj.i18nReplaces || [])).appendTo(infoBox);

                    if (obj.action && obj.action.label && obj.action.dest) { // add an action link to the entry
                        const action = $("<a></a>").text(s.helper.i18n.get(obj.action.label)).insertAfter(desc);
                        action.on("click", (e) => {
                            e.preventDefault();
                            if (obj.action.dest.startsWith("#")) {
                                location.hash = obj.action.dest.substring(1);
                            } else {
                                s.helper.model.call("openLink", {
                                    href: obj.action.dest,
                                    newTab: true,
                                    active: true
                                });
                            }
                        });
                    }

                });
            }).then(() => {
                return $.delay(100);
            }).then(() => {
                s.elm.dashboard.tipsTricks
                    .attr($.attr.type, uid)
                    .removeClass($.cl.loading);

                loader.remove();
            });
        };

        /**
         * Returns the keys of the tipsTricks object in randomized order
         *
         * @param tipsTricks
         * @returns {string[]}
         */
        const getRandomListOfTipsTricks = (tipsTricks) => {
            const arr = [];

            for (const key in tipsTricks) {
                if (typeof tipsTricks[key].condition === "undefined" || tipsTricks[key].condition === true) { // ignore the tips/tricks which condition is not fulfilled
                    arr.push(key);
                }
            }

            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };

        /**
         * Returns the number of languages the extension is available for
         *
         * @returns {Promise<number>}
         */
        const getLanguageAmount = async () => {
            const obj = await s.helper.model.call("languageInfos");
            if (obj && obj.infos) {
                return Object.values(obj.infos).filter((o) => o.available).length;
            }
            return -1;
        };

        /**
         * Initialises the eventhandler for the links on the dashboard
         */
        const initLinks = () => {
            $(s.elm.dashboard.links).on("click", (e) => { // check if the link has a data-src attribute (=named website) and open a new tab to this URL if clicked
                const src = $(e.currentTarget).attr($.attr.src);

                if (src) {
                    e.preventDefault();
                    s.helper.model.call("openLink", {
                        hrefName: src,
                        newTab: true,
                        params: {lang: s.helper.i18n.getLanguage()}
                    });
                }
            });
        };

        /**
         * Initialises the footer of the dashboard
         *
         * @returns {Promise<void>}
         */
        const initFooter = async () => {
            // Version
            s.elm.dashboard.footerVersion
                .html(s.helper.i18n.get("extension_version") + " " + "<span>" + $.opts.manifest.version_name + "</span>")
                .on("click", (e) => {
                    e.preventDefault();
                    s.helper.model.call("openLink", {
                        hrefName: "changelog",
                        newTab: true,
                        params: {lang: s.helper.i18n.getLanguage()}
                    });
                });

            // Last updated on ...
            const lastUpdateDate = await s.helper.model.call("lastUpdateDate");
            s.elm.dashboard.footerLastUpdate.html(s.helper.i18n.get("extension_last_update", [s.helper.i18n.getLocaleDate(lastUpdateDate)]));


            // Copyright
            s.elm.dashboard.footerCopyright.html("&copy; " + $.copyrightDate + " - " + (new Date().getFullYear()) + " <span>" + s.helper.i18n.get("extension_author") + "</span>");
        };

    };

})(jsu);