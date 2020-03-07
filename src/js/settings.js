($ => {
    "use strict";

    const Settings = function () {

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
                "import": $("body a.import"),
                "export": $("body a.export")
            },
            sidebar: {
                filterPatters: $("div.tab[data-name='sidebar'] div[data-name='filter'] div.patterns"),
                filterExplanation: $("div.tab[data-name='sidebar'] div[data-name='filter'] div.patternExplanation"),
                rememberOpenStatesSubDirectories: $("div.tab[data-name='sidebar'] div.rememberOpenStatesSubDirectories")
            },
            appearance: {
                content: $("div.tab[data-name='appearance']"),
                selectedTheme: $("div.tab[data-name='appearance'] div.selectedTheme"),
                showThemes: $("div.tab[data-name='appearance'] a.showThemes"),
                themeListWrapper: $("div.tab[data-name='appearance'] div.themeList"),
                presetWrapper: $("div.tab[data-name='appearance'] div.presets"),
                iconColorWrapper: $("div.tab[data-name='appearance'] div.iconColorWrapper"),
            },
            newtab: {
                content: $("div.tab[data-name='newtab']")
            },
            importExport: {
                content: $("div.tab[data-name='export']")
            },
            expert: {
                content: $("div.tab[data-name='expert']"),
                search: $("div.tab[data-name='expert'] input.search"),
                template: $("div.tab[data-name='expert'] > template")
            },
            premium: {
                wrapper: $("div.tab[data-name='premium']"),
            },
            feedback: {
                wrapper: $("div.tab[data-name='feedback']"),
                faq: $("div.tab[data-name='feedback'] > div.faq"),
                form: $("section.form"),
                send: $("section.form button[type='submit']"),
                feedback: $("div.tab[data-name='feedback'] div.feedbackWrapper"),
                showForm: $("div.tab[data-name='feedback'] div.suggestedAnswers > a"),
                uploadField: $("div.upload > input[type='file']"),
                uploadedFiles: $("ul.uploadedFiles"),
                suggestions: $("div.tab[data-name='feedback'] div.suggestedAnswers")
            },
            translation: {
                wrapper: $("div.tab[data-name='language'] > div[data-name='translate']"),
                goto: $("div.tab[data-name='language'] > div[data-name='general'] a.button"),
                overview: $("div.tab[data-name='language'] > div[data-name='translate'] > div.overview"),
                langvars: $("div.tab[data-name='language'] > div[data-name='translate'] > div.langvars"),
                thanks: $("div.tab[data-name='language'] > div[data-name='translate'] > div.thanks"),
                unavailable: $("div.tab[data-name='language'] > div[data-name='translate'] > div.unavailable")
            },
            formElement: $("div.formElement"),
            infos: {
                aboutWrapper: $("div.tab[data-name='infos'] div[data-name='aboutme']"),
                shareInfoWrapper: $("div.tab[data-name='infos'] div.shareInformation"),
                permissionsWrapper: $("div.tab[data-name='infos'] div.permissions")
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
        const restoreTypes = ["behaviour", "appearance", "newtab", "expert"];
        let unsavedChanges = false;

        /**
         * Constructor
         */
        this.run = () => {
            initHelpers();
            const loader = {
                body: this.helper.template.loading().appendTo(this.elm.body)
            };
            this.elm.body.addClass($.cl.initLoading);

            this.helper.model.init().then(() => {
                return this.helper.i18n.init();
            }).then(() => {
                this.elm.body.parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");

                this.helper.font.init();
                this.helper.stylesheet.init({defaultVal: true});

                return Promise.all([
                    this.helper.form.init(),
                    this.helper.stylesheet.addStylesheets(["settings"], $(document))
                ]);
            }).then(() => {
                this.elm.body.removeClass($.cl.building);

                this.helper.i18n.parseHtml(document);
                this.elm.title.text(this.elm.title.text() + " - " + this.helper.i18n.get("extension_name"));

                ["translation", "feedback"].forEach((name) => {
                    loader[name] = this.helper.template.loading().appendTo(this.elm[name].wrapper);
                    this.elm[name].wrapper.addClass($.cl.loading);
                });

                return this.helper.menu.init();
            }).then(() => {
                return Promise.all([
                    this.helper.sidebar.init(),
                    this.helper.appearance.init(),
                    this.helper.newtab.init(),
                    this.helper.infos.init(),
                    this.helper.premium.init(),
                    this.helper.expert.init(),
                    this.helper.importExport.init(),
                ]);
            }).then(() => { // initialise events and remove loading mask
                initEvents();

                loader.body.remove();
                this.elm.body.removeClass($.cl.initLoading);

                return this.helper.model.call("websiteStatus");
            }).then((opts) => { // if website is available, feedback form and translation overview can be used
                this.serviceAvailable = opts.status === "available";

                ["translation", "feedback"].forEach((name) => {
                    this.helper[name].init().then(() => {
                        loader[name].remove();
                        this.elm[name].wrapper.removeClass($.cl.loading);
                    });
                });
            });
        };

        /**
         * Loads the images of the given wrapper by replacing the data-src attribute with src attributes
         *
         * @param wrapper
         */
        this.loadImages = (wrapper) => {
            wrapper.find("img[" + $.attr.src + "]").forEach((_self) => {
                const img = $(_self);
                const src = img.attr($.attr.src);
                img.removeAttr($.attr.src);
                img.attr("src", src);

                $.delay().then(() => {
                    img.addClass($.cl.visible);
                });
            });
        };

        /**
         * Adds a box with a info that the feature is only available with premium to the given element
         *
         * @param {jsu} elm
         */
        this.addNoPremiumText = (elm) => {
            const desc = $("<p />")
                .addClass($.cl.premium)
                .html("<span>" + this.helper.i18n.get("premium_restricted_text") + "</span>")
                .appendTo(elm);

            const link = $("<a />").text(this.helper.i18n.get("more_link")).appendTo(desc);

            link.on("click", (e) => { // show info page
                e.preventDefault();
                location.href = "#premium";
            });
        };

        /**
         * Shows the given success message for 1.5s
         *
         * @param {string} i18nStr
         */
        this.showSuccessMessage = (i18nStr) => {
            unsavedChanges = false;
            this.elm.buttons.save.removeClass($.cl.info);

            this.elm.body.attr($.attr.settings.success, this.helper.i18n.get("settings_" + i18nStr));
            this.elm.body.addClass($.cl.success);

            $.delay(1500).then(() => {
                this.elm.body.removeClass($.cl.success);
            });
        };

        /**
         * Highlights the save button to indicate, that there are unsaved changes
         */
        this.highlightUnsavedChanges = () => {
            if (unsavedChanges === false) {
                this.elm.buttons.save.addClass([$.cl.settings.highlight, $.cl.info]);

                $.delay(1000).then(() => {
                    this.elm.buttons.save.removeClass($.cl.settings.highlight);
                });

                unsavedChanges = true;
            }
        };

        /*
         * ################################
         * PRIVATE
         * ################################
         */

        /**
         * Initialises the helper objects
         */
        const initHelpers = () => {
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
                premium: new $.PremiumHelper(this),
                importExport: new $.ImportExportHelper(this),
                expert: new $.ExpertHelper(this),
                infos: new $.InfosHelper(this)
            };
        };

        /**
         * Initialises the eventhandlers
         *
         * @returns {Promise}
         */
        const initEvents = async () => {
            $(window).on("beforeunload", (e) => { // Show confirm dialog when trying to exit the settings without saving the changes
                if (unsavedChanges) {
                    const confirmationMessage = "Do you really want to leave without saving your changes?";
                    e.returnValue = confirmationMessage;
                    return confirmationMessage;
                }
            });

            $.api.extension.onMessage.addListener((message) => { // listen for events from the background script
                if (message && message.action && message.action === "reinitialize" && message.type === "premiumActivated") { // premium has been activated -> reload settings
                    $.delay(2000).then(() => {
                        unsavedChanges = false;
                        location.reload(true);
                    });
                }
            });

            $("input, textarea, select").on("keyup change input", (e) => { // highlight save button the first time something got changed
                if ($(e.currentTarget).parent("[" + $.attr.type + "='licenseKey']").length() > 0 ||
                    $(e.currentTarget).parent("[" + $.attr.name + "='translationInfo']").length() > 0 ||
                    e.currentTarget === this.elm.expert.search[0] ||
                    $(e.currentTarget).parents("div." + $.cl.settings.translation.thanks).length() > 0
                ) {
                    return;
                }

                this.highlightUnsavedChanges();
            });

            $(document).on("click", () => {
                $("div." + $.cl.settings.dialog).removeClass($.cl.visible);
            });

            this.elm.body.on("click", "div." + $.cl.settings.dialog, (e) => {
                e.stopPropagation();
            });

            this.elm.body.on("click", "div." + $.cl.settings.dialog + " > a", (e) => {
                e.preventDefault();
                e.stopPropagation();

                const type = $(e.currentTarget).parent("div").attr($.attr.type);

                if (restoreTypes.indexOf(type) !== -1) {
                    const promises = [];
                    let configToRemove = [type];

                    if (type === "appearance") { // restore custom css aswell
                        promises.push(new Promise((resolve) => {
                            $.api.storage.local.get(["utility"], (obj) => {
                                const utility = obj.utility || {};
                                delete utility.customCss;

                                $.api.storage.local.set({utility: utility}, () => {
                                    resolve();
                                });
                            });
                        }));
                    } else if (type === "expert") { // restore all configuration
                        configToRemove = ["behaviour", "appearance", "newtab"];
                    }

                    promises.push(new Promise((resolve) => {
                        $.api.storage.sync.remove(configToRemove, () => {
                            this.showSuccessMessage("restored_message");
                            this.helper.model.call("reloadIcon");
                            $("div." + $.cl.settings.dialog).removeClass($.cl.visible);
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
                const container = $(e.currentTarget).next("div");

                if (container.hasClass($.cl.visible)) {
                    container.removeClass($.cl.visible);

                    $.delay(300).then(() => {
                        container.css("display", "none");
                    });
                } else {
                    container.css("display", "flex");

                    $.delay(0).then(() => {
                        container.addClass($.cl.visible);
                    });
                }
            });

            this.elm.buttons.save.on("click", (e) => { // save button
                e.preventDefault();
                const path = this.helper.menu.getPath();

                if (path[1] === "translate") {
                    this.helper.translation.submit();
                } else if (path[0] === "expert") {
                    this.helper.expert.save().then(() => {
                        this.showSuccessMessage("saved_message");
                        return this.helper.model.call("reinitialize");
                    }).then(() => {
                        return $.delay(1500);
                    }).then(() => {
                        this.helper.model.call("reloadIcon");
                        this.helper.model.call("reloadContextmenus");
                        return $.delay(0);
                    }).then(() => {
                        location.reload(true);
                    })["catch"](() => {
                        // something went wrong saving
                    });
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
                        return this.helper.model.init();
                    }).then(() => {
                        this.helper.expert.updateRawConfigList();
                    });
                }
            });

            this.elm.buttons.restore.on("click", (e) => { // restore button
                e.preventDefault();
                const path = this.helper.menu.getPath();
                let type = path[0];

                if (type === "sidebar") {
                    type = "behaviour";
                }

                if (restoreTypes.indexOf(type) !== -1) {
                    $("div." + $.cl.settings.dialog).remove();
                    const rect = e.currentTarget.getBoundingClientRect();

                    const dialog = $("<div />")
                        .attr($.attr.type, type)
                        .addClass($.cl.settings.dialog)
                        .append("<p>" + this.helper.i18n.get("settings_restore_confirm") + "</p>")
                        .append("<span>" + this.helper.i18n.get("settings_menu_" + path[0]) + "</span>")
                        .append("<br />")
                        .append("<a>" + this.helper.i18n.get("settings_restore") + "</a>")
                        .css("left", rect.left + "px")
                        .appendTo(this.elm.body);

                    if (type === "expert") { // when restoring from the expert page, all configuration will be restored
                        dialog.children("span").remove();
                    }

                    $.delay().then(() => {
                        dialog.addClass($.cl.visible);
                    });
                }
            });
        };
    };

    new Settings().run();
})(jsu);