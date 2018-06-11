($ => {
    "use strict";

    let Settings = function () {

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.elm = {
            body: $("body"),
            title: $("head > title"),
            aside: $("body > section#wrapper > aside"),
            content: $("body > section#wrapper > main"),
            header: $("body > header"),
            headline: $("body > header > h1"),
            advanced: {
                toggle: $("div.advanced > h3"),
                container: $("div.advanced > div")
            },
            buttons: {
                save: $("body > header > menu > li > button.save"),
                restore: $("body > header > menu > li > button.restore"),
                keyboardShortcut: $("div.tab[data-name='sidebar'] a.keyboardShortcut"),
                toggleAreaOpen: $("div.tab[data-name='sidebar'] div.toggleAreaDesc > a.button"),
                toggleAreaSave: $("div.toggleAreaModal a.save"),
                toggleAreaCancel: $("div.toggleAreaModal a.cancel"),
                "import": $("body a.import > input[type='file']"),
                "export": $("body a.export"),
            },
            sidebar: {
                filterPatters: $("div.tab[data-name='sidebar'] div[data-name='filter'] div.patterns"),
                filterExplanation: $("div.tab[data-name='sidebar'] div[data-name='filter'] div.patternExplanation")
            },
            appearance: {
                content: $("div.tab[data-name='appearance']"),
                presetWrapper: $("div.tab[data-name='appearance'] div.presets")
            },
            newtab: {
                content: $("div.tab[data-name='newtab']"),
            },
            feedback: {
                wrapper: $("div.tab[data-name='feedback']"),
                form: $("section.form"),
                send: $("section.form button[type='submit']"),
                feedback: $("div.tab[data-name='feedback'] div.feedbackWrapper"),
                showForm: $("div.tab[data-name='feedback'] div.suggestedAnswers > a"),
                suggestions: $("div.tab[data-name='feedback'] div.suggestedAnswers")
            },
            translation: {
                wrapper: $("div.tab[data-name='language'] > div[data-name='translate']"),
                goto: $("div.tab[data-name='language'] > div[data-name='general'] a.button"),
                overview: $("div.tab[data-name='language'] > div[data-name='translate'] > div.overview"),
                langvars: $("div.tab[data-name='language'] > div[data-name='translate'] > div.langvars"),
                unavailable: $("div.tab[data-name='language'] > div[data-name='translate'] > div.unavailable")
            },
            formElement: $("div.formElement"),
            support: {
                shareInfoWrapper: $("div.tab[data-name='support'] div.shareInformation"),
                donate: $("div.tab[data-name='support'] a.donate")
            },
            preview: {},
            checkbox: {},
            range: {},
            select: {},
            color: {},
            textarea: {},
            field: {},
            radio: {}
        };

        this.serviceAvailable = true;
        let restoreTypes = ["behaviour", "appearance", "newtab"];

        /**
         * Constructor
         */
        this.run = () => {
            initHelpers();
            let loader = {
                body: this.helper.template.loading().appendTo(this.elm.body)
            };
            this.elm.body.addClass($.cl.general.initLoading);

            this.helper.model.init().then(() => {
                return this.helper.i18n.init();
            }).then(() => {
                this.elm.body.parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");

                this.helper.font.init("default");
                this.helper.stylesheet.init();
                this.helper.stylesheet.addStylesheets(["settings"], $(document));

                return this.helper.form.init();
            }).then(() => {
                this.elm.body.removeClass($.cl.general.building);

                this.helper.i18n.parseHtml(document);
                this.elm.title.text(this.elm.title.text() + " - " + this.helper.i18n.get("extension_name"));

                ["translation", "feedback"].forEach((name) => {
                    loader[name] = this.helper.template.loading().appendTo(this.elm[name].wrapper);
                    this.elm[name].wrapper.addClass($.cl.general.loading);
                });

                return Promise.all([
                    this.helper.menu.init(),
                    this.helper.sidebar.init(),
                    this.helper.appearance.init(),
                    this.helper.newtab.init(),
                    this.helper.support.init(),
                    this.helper.importExport.init(),
                ]);
            }).then(() => { // initialise events and remove loading mask
                initEvents();

                loader.body.remove();
                this.elm.body.removeClass($.cl.general.initLoading);
                this.helper.model.call("trackPageView", {page: "/settings"});

                return this.helper.model.call("websiteStatus");
            }).then((opts) => { // if website is available, feedback form and translation overview can be used
                this.serviceAvailable = opts.status === "available";

                ["translation", "feedback"].forEach((name) => {
                    this.helper[name].init().then(() => {
                        loader[name].remove();
                        this.elm[name].wrapper.removeClass($.cl.general.loading);
                    });
                });
            });
        };

        /**
         * Shows the given success message for 1.5s
         *
         * @param {string} i18nStr
         */
        this.showSuccessMessage = (i18nStr) => {
            this.elm.body.attr($.attr.settings.success, this.helper.i18n.get("settings_" + i18nStr));
            this.elm.body.addClass($.cl.general.success);

            $.delay(1500).then(() => {
                this.elm.body.removeClass($.cl.general.success);
            });
        };

        /*
         * ################################
         * PRIVATE
         * ################################
         */

        /**
         * Initialises the helper objects
         */
        let initHelpers = () => {
            this.helper = {
                model: new $.ModelHelper(this),
                checkbox: new $.CheckboxHelper(this),
                template: new $.TemplateHelper(this),
                i18n: new $.I18nHelper(this),
                font: new $.FontHelper(this),
                stylesheet: new $.StylesheetHelper(this),
                translation: new $.TranslationHelper(this),
                menu: new $.MenuHelper(this),
                form: new $.FormHelper(this),
                sidebar: new $.SidebarHelper(this),
                newtab: new $.NewtabHelper(this),
                appearance: new $.AppearanceHelper(this),
                feedback: new $.FeedbackHelper(this),
                importExport: new $.ImportExportHelper(this),
                support: new $.SupportHelper(this)
            };
        };

        /**
         * Initialises the eventhandlers
         *
         * @returns {Promise}
         */
        let initEvents = async () => {
            $(document).on("click", () => {
                $("div." + $.cl.settings.dialog).removeClass($.cl.general.visible);
            });

            this.elm.header.on("click", "div." + $.cl.settings.dialog, (e) => {
                e.stopPropagation();
            });

            this.elm.header.on("click", "div." + $.cl.settings.dialog + " > a", (e) => {
                e.preventDefault();
                e.stopPropagation();

                let type = $(e.currentTarget).parent("div").attr($.attr.type);

                if (restoreTypes.indexOf(type) !== -1) {
                    let promises = [];

                    if (type === "appearance") { // restore custom css aswell
                        promises.push(new Promise((resolve) => {
                            chrome.storage.local.get(["utility"], (obj) => {
                                let utility = obj.utility || {};
                                delete utility.customCss;

                                chrome.storage.local.set({utility: utility}, () => {
                                    resolve();
                                });
                            });
                        }));
                    }

                    promises.push(new Promise((resolve) => {
                        chrome.storage.sync.remove([type], () => {
                            this.showSuccessMessage("restored_message");
                            this.helper.model.call("reloadIcon");
                            $("div." + $.cl.settings.dialog).removeClass($.cl.general.visible);
                            resolve();
                        });
                    }));

                    Promise.all(promises).then(() => {
                        return $.delay(1500);
                    }).then(() => {
                        this.helper.model.call("reinitialize");
                        location.reload(true);
                    });
                }
            });

            this.elm.advanced.container.css("display", "none");
            this.elm.advanced.toggle.on("click", (e) => {
                let container = $(e.currentTarget).next("div");

                if (container.hasClass($.cl.general.visible)) {
                    container.removeClass($.cl.general.visible);

                    $.delay(300).then(() => {
                        container.css("display", "none");
                    });
                } else {
                    container.css("display", "flex");

                    $.delay(0).then(() => {
                        container.addClass($.cl.general.visible);
                    });
                }
            });

            this.elm.buttons.save.on("click", (e) => { // save button
                e.preventDefault();
                let path = this.helper.menu.getPath();

                if (path[1] === "translate") {
                    this.helper.translation.submit();
                } else {
                    Promise.all([
                        this.helper.sidebar.save(),
                        this.helper.appearance.save(),
                        this.helper.newtab.save()
                    ]).then(() => {
                        this.showSuccessMessage("saved_message");
                        return this.helper.model.call("reinitialize");
                    }).then(() => {
                        this.helper.model.call("reloadIcon");
                        this.helper.model.call("reloadContextmenus");
                    });
                }
            });

            this.elm.buttons.restore.on("click", (e) => {
                e.preventDefault();
                let path = this.helper.menu.getPath();
                let type = path[0];

                if (type === "sidebar") {
                    type = "behaviour";
                }

                if (restoreTypes.indexOf(type) !== -1) {
                    $("div." + $.cl.settings.dialog).remove();
                    let paddingDir = this.helper.i18n.isRtl() ? "left" : "right";

                    let dialog = $("<div />")
                        .attr($.attr.type, type)
                        .addClass($.cl.settings.dialog)
                        .append("<p>" + this.helper.i18n.get("settings_restore_confirm") + "</p>")
                        .append("<span>" + this.helper.i18n.get("settings_menu_" + path[0]) + "</span>")
                        .append("<br />")
                        .append("<a>" + this.helper.i18n.get("settings_restore") + "</a>")
                        .css(paddingDir, this.elm.header.css("padding-" + paddingDir))
                        .appendTo(this.elm.header);

                    $.delay().then(() => {
                        dialog.addClass($.cl.general.visible);
                    });
                }
            });
        };
    };

    new Settings().run();
})(jsu);