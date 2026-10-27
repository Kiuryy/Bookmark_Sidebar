($ => {
    "use strict";

    $.SettingsTipsTricksHelper = function (s) {

        let wrapper = null;
        let list = [];
        let idx = 0;
        let lastRenderId = 0;

        const SLIDE_DURATION = 450; // has to match the transition duration in _tipsTricks.scss

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            wrapper = $("section[data-name='overview'] div.tips-tricks");
            list = getRandomListOfTipsTricks(await getTipsTricks());
            idx = 0;

            $(`section[${$.attr.name}='overview'] a.${$.cl.settings.tipsTricks.next}`).on("click", async (e) => { // show the next tip/trick from the shuffled list
                e.preventDefault();
                idx = (idx + 1) % list.length;
                await this.refresh();
            });

            await this.refresh();
        };

        /**
         * Renders the currently selected tip/trick again, e.g. after the language has been changed
         *
         * @returns {Promise}
         */
        this.refresh = async () => {
            if (list.length === 0) { // not initialised yet
                return;
            }

            const uid = list[idx];
            const tipsTricks = await getTipsTricks();
            await displayTipTrick(uid, tipsTricks[uid]);
        };

        /**
         * Returns the definitions of all tips/tricks,
         * the image of each entry is located at img/settings/tips-tricks/<uid>.png
         *
         * @returns {Promise<object>}
         */
        const getTipsTricks = async () => {
            const ctrlKey = "<i>" + s.helper.i18n.get("keyboard_shortcuts_key_" + ($.ua().os === "macOS" ? "cmd" : "ctrl")) + "</i>";

            return {
                synchronization: {
                    action: {label: "settings_sync_settings_link", dest: "chrome://settings/syncSetup"}
                },
                activation_area: {
                    action: {label: "settings_trigger_area_configure", dest: "#settings", scrollTo: "section.trigger-area"},
                    condition: ["overlay", "both"].includes(s.helper.model.getData("b/mode"))
                },
                i18n: {
                    action: {label: "more_link", dest: $.api.runtime.getURL("html/translations.html")},
                    i18nReplaces: [await getLanguageAmount()]
                },
                separators: {
                    i18nReplaces: ["<i>about:blank</i>", "<i>------</i>", "<i>--- Example ---</i>", "<span></span>"]
                },
                about: {
                    action: {label: "more_link", dest: $.opts.website.knowledgebase.aboutMe}
                },
                right_click: {},
                quick_bookmarking: {
                    i18nReplaces: ["<span></span>"]
                },
                hide_entries: {
                    i18nReplaces: ["<span></span>"]
                },
                quick_url_copy: {
                    i18nReplaces: [ctrlKey + "+<i>c</i>"]
                },
                open_all_bookmarks: {
                    i18nReplaces: [ctrlKey]
                },
                version: {},
                keyboard_shortcuts: {
                    i18nReplaces: ["<span></span>"]
                },
                expand_all_subfolders: {},
                quick_search: {},
                share_data: {
                    action: {label: "more_link", dest: $.opts.website.knowledgebase.shareData}
                },
                multiselect: {},
                privacy: {
                    action: {label: "more_link", dest: $.opts.website.info.privacyPolicy}
                },
            };
        };

        /**
         * Displays the given tip/trick by sliding the current one out to the left and the new one in from the right
         *
         * @param {string} uid
         * @param {object} obj
         * @returns {Promise}
         */
        const displayTipTrick = async (uid, obj) => {
            const renderId = ++lastRenderId;
            const imgSrc = $.api.runtime.getURL("img/settings/tips-tricks/" + uid + ".png");
            await preloadImage(imgSrc); // the image should be there right from the start of the transition

            if (renderId !== lastRenderId) { // another tip/trick has been requested in the meantime
                return;
            }

            const prevSlides = wrapper.children("div." + $.cl.settings.tipsTricks.slide + ":not(." + $.cl.settings.tipsTricks.leaving + ")");
            const slide = $("<div></div>")
                .addClass($.cl.settings.tipsTricks.slide)
                .attr($.attr.type, uid)
                .appendTo(wrapper);

            const infoBox = $("<div></div>").addClass($.cl.info).appendTo(slide);
            $("<img/>").attr("src", imgSrc).appendTo(slide);

            const headline = s.helper.i18n.get("settings_tips_tricks_" + uid);
            if (headline) {
                $("<label></label>").html(headline).addClass("large").appendTo(infoBox);
            }

            const desc = $("<p></p>").html(s.helper.i18n.get("settings_tips_tricks_" + uid + "_desc", obj.i18nReplaces || [])).appendTo(infoBox);

            if (obj.action && obj.action.label && obj.action.dest) { // add an action link to the entry
                $("<a></a>")
                    .text(s.helper.i18n.get(obj.action.label))
                    .addClass("btn")
                    .insertAfter(desc)
                    .on("click", (e) => {
                        e.preventDefault();
                        openActionDest(obj.action);
                    });
            }

            await nextFrame(); // let the browser render the initial state first, so the transition is visible
            prevSlides.removeClass($.cl.visible).addClass($.cl.settings.tipsTricks.leaving);
            slide.addClass($.cl.visible);

            await $.delay(SLIDE_DURATION);
            prevSlides.remove();
        };

        /**
         * Resolves once the given image has been loaded (or failed to load)
         *
         * @param {string} src
         * @returns {Promise}
         */
        const preloadImage = (src) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = resolve;
                img.onerror = resolve;
                img.src = src;
            });
        };

        /**
         * Resolves after the browser rendered the next frame
         *
         * @returns {Promise}
         */
        const nextFrame = () => {
            return new Promise((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(resolve));
            });
        };

        /**
         * Opens the given destination of an action link,
         * hashes select the matching tab of this page (and scroll to the element matching the optional scrollTo selector),
         * everything else is opened in a new tab
         *
         * @param {object} action
         */
        const openActionDest = (action) => {
            const dest = action.dest;

            if (dest.startsWith("#")) {
                const tabName = dest.substring(1);
                if (s.helper.tabs.open(tabName)) {
                    const target = action.scrollTo ? $(`section.tab[${$.attr.name}="${tabName}"] ${action.scrollTo}`) : null;
                    if (target && target.length() > 0) { // the header is sticky -> keep the target below it
                        const headerHeight = $("body > header")[0].offsetHeight;
                        window.scrollTo({
                            top: target[0].getBoundingClientRect().top + window.scrollY - headerHeight,
                            behavior: "smooth"
                        });
                    }
                }
                return;
            }

            s.openLink(dest);
        };

        /**
         * Returns the keys of the tipsTricks object in randomized order
         *
         * @param {object} tipsTricks
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
    };

})(jsu);
