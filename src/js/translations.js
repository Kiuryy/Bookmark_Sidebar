($ => {
    "use strict";

    const Translations = function () {

        let path = {lang: null, category: null};
        let serviceAvailable = false;
        let saving = false;
        let thanksInfo = null;

        /**
         * Constructor
         */
        this.run = async () => {
            initHelpers();
            const loader = this.helper.template.loading().appendTo("body");
            $("body").addClass($.cl.initLoading);

            await this.helper.model.init();
            await this.helper.i18n.init();

            $("body").parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");

            this.helper.stylesheet.init({defaultVal: true});
            await this.helper.stylesheet.addStylesheets(["settings"], $(document));

            $("body").removeClass($.cl.building);

            parseLangVars();
            this.helper.dialog.init();

            await this.helper.data.init();
            this.helper.language.init();
            this.helper.category.init();

            initEvents();
            initThanksDialog();

            try {
                await this.helper.data.loadInfos();
                serviceAvailable = true;
            } catch (err) {
                console.error(err);
            }

            await render(parseHash());

            await $.delay(500);

            loader.remove();
            $("body").removeClass($.cl.initLoading);
        };

        /**
         * Returns the url hash pointing to the given layer, without arguments it's pointing to the language overview
         *
         * @param {string} lang
         * @param {string} category
         * @returns {string}
         */
        this.getHash = (lang = null, category = null) => {
            return "#" + [lang, category].filter((part) => part).map(encodeURIComponent).join("/");
        };

        /**
         * Returns a progress bar with the given percentage and the given text next to it
         *
         * @param {int} percentage
         * @param {string} text
         * @returns {jsu}
         */
        this.getProgressBar = (percentage, text) => {
            const progress = $("<div></div>").addClass($.cl.settings.translation.progress);
            const bar = $("<div></div>").appendTo(progress);
            $("<div></div>").css("width", percentage + "%").appendTo(bar);
            $("<span></span>").text(text).appendTo(progress);
            return progress;
        };

        /**
         * Shows the given message
         *
         * @param {string} i18nStr
         * @param {string} type
         */
        this.showMessage = async (i18nStr, type) => {
            $("body > div.message").remove();

            const msgElm = $("<div></div>")
                .html("<span>" + this.helper.i18n.get("settings_" + i18nStr) + "</span>")
                .attr($.attr.type, type)
                .addClass("message")
                .appendTo("body");
            await $.delay(100);

            msgElm.addClass($.cl.visible);
            await $.delay(2000);

            msgElm.removeClass($.cl.visible);
            await $.delay(500);

            msgElm.remove();
        };

        /**
         * Applies the language variables to the page
         */
        const parseLangVars = () => {
            this.helper.i18n.parseHtml(document);
            $("head > title").text($("head > title").text() + " - " + this.helper.i18n.get("extension_name"));
        };

        /**
         * Returns the layer the url hash is pointing to
         *
         * @returns {{lang: string|null, category: string|null}}
         */
        const parseHash = () => {
            let parts = [];
            try {
                parts = location.hash.replace(/^#/, "").split("/").map(decodeURIComponent);
            } catch (e) {
                // malformed hash -> show the overview
            }
            return {lang: parts[0] || null, category: (parts[0] && parts[1]) || null};
        };

        /**
         * Shows the layer of the given path, falls back to the next higher layer if the language or category doesn't exist
         *
         * @param {{lang: string|null, category: string|null}} target
         * @returns {Promise}
         */
        const render = async (target) => {
            let loader = null;
            const loaderTimeout = setTimeout(() => { // only show a loading indicator if the data isn't cached already
                loader = this.helper.template.loading().appendTo("body");
                $("body").addClass($.cl.initLoading);
            }, 150);

            let view = "overview";
            target = Object.assign({}, target);

            try {
                if (!serviceAvailable) {
                    view = "unavailable";
                    target = {lang: null, category: null};
                } else {
                    if (target.lang && !this.helper.data.isLanguage(target.lang)) {
                        target = {lang: null, category: null};
                    }

                    if (target.category) {
                        if (await this.helper.category.render(target.lang, target.category)) {
                            view = "category";
                        } else {
                            target.category = null;
                        }
                    }

                    if (target.lang && !target.category) {
                        if (await this.helper.language.render(target.lang)) {
                            view = "language";
                        } else {
                            target.lang = null;
                        }
                    }

                    if (!target.lang) {
                        this.helper.overview.render();
                    }
                }
            } catch (err) { // the translation service didn't respond as expected
                console.error(err);
                view = "unavailable";
                target = {lang: null, category: null};
            }

            clearTimeout(loaderTimeout);
            if (loader) {
                loader.remove();
                $("body").removeClass($.cl.initLoading);
            }

            path = target;
            replaceHash(); // the requested layer might not exist -> correct the url

            $("body").attr($.attr.settings.translation.view, view);
            updateBreadcrumb();
            window.scrollTo(0, 0);

            if (view === "category") {
                this.helper.category.afterShow();
            } else { // the changes of a left category have been discarded -> they must not count as unsaved changes anymore
                this.helper.category.clear();
            }
        };

        /**
         * Updates the url hash to match the current layer without adding a history entry
         */
        const replaceHash = () => {
            const hash = this.getHash(path.lang, path.category);
            if ((location.hash || "#") !== hash) {
                history.replaceState(null, "", hash === "#" ? location.pathname + location.search : hash);
            }
        };

        /**
         * Updates the breadcrumb in the header, each entry links to its layer
         */
        const updateBreadcrumb = () => {
            const menu = $("menu#breadcrumb").html("");
            const items = [{label: this.helper.i18n.get("settings_translation_overview"), i18n: "settings_translation_overview", hash: this.getHash()}];

            if (path.lang) {
                items.push({label: this.helper.data.getLabel(path.lang), hash: this.getHash(path.lang)});
            }

            if (path.category) {
                items.push({label: path.category, hash: this.getHash(path.lang, path.category)});
            }

            items.forEach((item, i) => {
                const link = $("<a></a>").attr("href", item.hash).text(item.label);

                if (item.i18n) {
                    link.attr($.attr.i18n, item.i18n);
                }

                if (i === items.length - 1) {
                    link.addClass($.cl.active);
                }

                const entry = $("<li></li>").appendTo(menu);
                link.appendTo(entry);
            });
        };

        /**
         * Initialises the navigation between the layers and the save button
         */
        const initEvents = () => {
            $(window).on("hashchange", async () => {
                const target = parseHash();
                if (target.lang === path.lang && target.category === path.category) {
                    return;
                }

                if (this.helper.category.hasUnsavedChanges() && !window.confirm(this.helper.i18n.get("settings_translation_unsaved_confirm"))) {
                    replaceHash(); // stay on the current layer
                    return;
                }

                await render(target);
            });

            $(window).on("beforeunload", (e) => { // Show confirm dialog when trying to exit the page without submitting the changes
                if (this.helper.category.hasUnsavedChanges()) {
                    const confirmationMessage = "Do you really want to leave without submitting your changes?"; // cannot call i18n helper here, since Chrome won't execute this in the beforeunload event
                    e.returnValue = confirmationMessage;
                    return confirmationMessage;
                }
            });

            $("menu#actions a#save").on("click", (e) => {
                e.preventDefault();
                save();
            });
        };

        /**
         * Submits the changed variables of the current category and returns to the category overview of the language
         *
         * @returns {Promise}
         */
        const save = async () => {
            if (saving || !path.category) {
                return;
            }

            const lang = path.lang;
            const vars = this.helper.category.getChangedVars();

            if (Object.keys(vars).length > 0) {
                saving = true;
                const loadStartTime = +new Date();
                const loader = this.helper.template.loading().appendTo("body");
                $("body").addClass($.cl.initLoading);

                let translatedAmount = null;
                try {
                    translatedAmount = await this.helper.data.submit(lang, vars);
                    await $.delay(Math.max(0, 800 - (+new Date() - loadStartTime))); // load at least a moment, so the user notices the submission
                } catch (err) {
                    console.error(err);
                }

                loader.remove();
                $("body").removeClass($.cl.initLoading);
                saving = false;

                if (translatedAmount === null) { // keep the changes, so the user can try again
                    this.showMessage("translation_submit_error", "error");
                    return;
                }

                this.helper.category.clear();
                this.showMessage("translation_submit_message", "success");

                if (this.helper.data.shouldThank(translatedAmount)) {
                    openThanksDialog(lang, translatedAmount);
                }
            }

            location.hash = this.getHash(lang);
        };

        /**
         * Initialises the dialog where users can leave their email address to receive a license key as thank you for their translation
         */
        const initThanksDialog = () => {
            const dialog = $("section#thanks-dialog");
            const input = dialog.find("input[type='email']");

            dialog.find(`a[${$.attr.type}='close']`).on("click", (e) => {
                e.preventDefault();
                this.helper.dialog.close();
            });

            input.on("input", () => {
                input.removeClass($.cl.error);
            });

            dialog.find(`a[${$.attr.type}='submit']`).on("click", async (e) => {
                e.preventDefault();
                const email = input[0].value.trim();

                if (!email || !input[0].checkValidity()) {
                    input.addClass($.cl.error);
                    return;
                }

                this.helper.dialog.setLoading("thanks", true);

                try {
                    await Promise.all([
                        this.helper.data.submitEmail(thanksInfo.lang, email, thanksInfo.translatedAmount),
                        $.delay(500)
                    ]);
                    this.showMessage("saved_message", "success");
                } catch (err) {
                    console.error(err);
                    this.showMessage("translation_submit_error", "error");
                }

                this.helper.dialog.setLoading("thanks", false);
                this.helper.dialog.close();
            });
        };

        /**
         * Opens the thank you dialog, which is only shown once
         *
         * @param {string} lang
         * @param {int} translatedAmount
         */
        const openThanksDialog = (lang, translatedAmount) => {
            thanksInfo = {lang, translatedAmount};
            this.helper.model.setData({"u/translationThanked": true});
            this.helper.dialog.open("thanks");
        };

        /**
         * Initialises the helper objects
         */
        const initHelpers = () => {
            this.helper = {
                i18n: new $.I18nHelper(this),
                font: new $.FontHelper(this),
                stylesheet: new $.StylesheetHelper(this),
                template: new $.TemplateHelper(this),
                utility: new $.UtilityHelper(this),
                model: new $.ModelHelper(this),
                checkbox: new $.CheckboxHelper(this),
                dialog: new $.SettingsDialogHelper(this),
                data: new $.TranslationsDataHelper(this),
                overview: new $.TranslationsOverviewHelper(this),
                language: new $.TranslationsLanguageHelper(this),
                category: new $.TranslationsCategoryHelper(this),
            };
        };
    };

    new Translations().run();

})(jsu);
