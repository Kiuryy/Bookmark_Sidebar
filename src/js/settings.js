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
            videos: $("body video[data-src]"),
            advanced: {
                toggle: $("div.advanced > h3"),
                container: $("div.advanced > div")
            },
            buttons: {
                save: $("body > header > menu > li > button.save"),
                restore: $("body > header > menu > li > button.restore"),
                keyboardShortcut: $("div.tab[data-name='sidebar'] a.keyboardShortcut"),
                sidepanelSettings: $("div.tab[data-name='sidebar'] a.sidepanelSettings"),
                toggleAreaGoto: $("body a.gotoToggleArea"),
                "import": $("body a.import"),
                "export": $("body a.export")
            },
            dashboard: {
                tipsTricks: $("div.tab[data-name='dashboard'] div.tipsTricks"),
                links: $("div.tab[data-name='dashboard'] div.links > ul > li > a"),
                footerVersion: $("div.tab[data-name='dashboard'] footer a.version"),
                footerLastUpdate: $("div.tab[data-name='dashboard'] footer span.lastUpdate"),
                footerCopyright: $("div.tab[data-name='dashboard'] footer div.copyright")
            },
            sidebar: {
                previewVideos: $("div.tab[data-name='sidebar'] div.preview video"),
                previewVideoOverlay: $("div.tab[data-name='sidebar'] div.preview div.video[data-type='overlay']"),
                overlayContent: $("div.tab[data-name='sidebar'] > div[data-name='overlay']"),
                toggleArea: $("div.tab[data-name='sidebar'] div.toggleArea"),
                rememberOpenStatesSubDirectories: $("div.tab[data-name='sidebar'] div.rememberOpenStatesSubDirectories"),
                filterOptions: $("div.tab[data-name='sidebar'] div.filterOptions")
            },
            appearance: {
                content: $("div.tab[data-name='appearance']"),
                selectedTheme: $("div.tab[data-name='appearance'] div.selectedTheme"),
                showThemes: $("div.tab[data-name='appearance'] a.showThemes"),
                themeListWrapper: $("div.tab[data-name='appearance'] div.themeList"),
                surfaceWrapper: $("div.tab[data-name='appearance'] div.surface"),
                presetWrapper: $("div.tab[data-name='appearance'] div.presets"),
                iconShapeWrapper: $("div.tab[data-name='appearance'] div[data-name='icon'] div.iconShapeWrapper"),
                iconColorWrapper: $("div.tab[data-name='appearance'] div[data-name='icon'] div.iconColorWrapper"),
            },
            newtab: {
                content: $("div.tab[data-name='newtab']"),
                buttons: $("div.tab[data-name='newtab'] div.buttons"),
                extensionRecommendations: $("div.tab[data-name='newtab'] section.extensionRecommendations"),
                url: $("div.tab[data-name='newtab'] div.url"),
                faviconShapeWrapper: $("div.faviconOptions div.iconShapeWrapper"),
                faviconPreview: $("div.faviconOptions > aside > canvas")
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
            support: {
                wrapper: $("div.tab[data-name='support']"),
                faq: $("div.tab[data-name='support'] > div.faq"),
                form: $("section.form"),
                send: $("section.form button[type='submit']"),
                feedback: $("div.tab[data-name='support'] div.feedbackWrapper"),
                showForm: $("div.tab[data-name='support'] div.suggestedAnswers > a"),
                uploadField: $("div.upload > input[type='file']"),
                uploadedFiles: $("ul.uploadedFiles"),
                suggestions: $("div.tab[data-name='support'] div.suggestedAnswers")
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
        this.run = async () => {
            initHelpers();
            const loader = {
                body: this.helper.template.loading().appendTo(this.elm.body)
            };
            this.elm.body.addClass($.cl.initLoading);

            await this.helper.model.init();
            await this.helper.i18n.init();

            this.elm.body.parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");

            this.helper.stylesheet.init({defaultVal: true});

            await Promise.all([
                this.helper.form.init(),
                this.helper.stylesheet.addStylesheets(["settings"], $(document))
            ]);

            this.elm.body.removeClass($.cl.building);

            this.helper.i18n.parseHtml(document);
            this.elm.title.text(this.elm.title.text() + " - " + this.helper.i18n.get("extension_name"));

            ["translation", "support"].forEach((name) => {
                loader[name] = this.helper.template.loading().appendTo(this.elm[name].wrapper);
                this.elm[name].wrapper.addClass($.cl.loading);
            });

            await this.helper.menu.init();

            await Promise.all([
                this.helper.dashboard.init(),
                this.helper.sidebar.init(),
                this.helper.appearance.init(),
                this.helper.newtab.init(),
                this.helper.infos.init(),
                this.helper.premium.init(),
                this.helper.expert.init(),
                this.helper.importExport.init(),
            ]);

            this.elm.videos.forEach((_self) => {
                const video = $(_self);
                const src = video.attr($.attr.src);
                this.helper.model.call("parsedUrl", {
                    href: src
                }).then((parsedSrc) => {
                    video.removeAttr($.attr.src);
                    $("<source/>")
                        .attr("src", parsedSrc)
                        .attr("type", "video/mp4")
                        .appendTo(video);
                });
            });

            // initialise events and remove loading mask
            initEvents();

            loader.body.remove();
            this.elm.body.removeClass($.cl.initLoading);

            // if website is available, feedback form and translation overview can be used
            const opts = await this.helper.model.call("websiteStatus");
            this.serviceAvailable = opts.status === "available";

            for (const name of ["translation", "support"]) {
                await this.helper[name].init();
                loader[name].remove();
                this.elm[name].wrapper.removeClass($.cl.loading);
            }
        };

        /**
         * Adds a box with a info that the feature is only available with premium to the given element
         *
         * @param {jsu} elm
         */
        this.addNoPremiumText = (elm) => {
            const desc = $("<p></p>")
                .addClass($.cl.premium)
                .html("<span>" + this.helper.i18n.get("premium_restricted_text") + "</span>")
                .appendTo(elm);

            const link = $("<a></a>").text(this.helper.i18n.get("more_link")).appendTo(desc);

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
        this.showSuccessMessage = async (i18nStr) => {
            unsavedChanges = false;
            this.elm.buttons.save.removeClass($.cl.info);

            this.elm.body.attr($.attr.settings.success, this.helper.i18n.get("settings_" + i18nStr));
            this.elm.body.addClass($.cl.success);

            await $.delay(1500);
            this.elm.body.removeClass($.cl.success);
        };

        /**
         * Highlights the save button to indicate, that there are unsaved changes
         */
        this.highlightUnsavedChanges = async () => {
            if (unsavedChanges === false) {
                unsavedChanges = true;
                this.elm.buttons.save.addClass([$.cl.settings.highlight, $.cl.info]);

                await $.delay(1000);
                this.elm.buttons.save.removeClass($.cl.settings.highlight);
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
                dashboard: new $.DashboardHelper(this),
                sidebar: new $.SidebarHelper(this),
                newtab: new $.NewtabHelper(this),
                appearance: new $.AppearanceHelper(this),
                support: new $.SupportHelper(this),
                premium: new $.PremiumHelper(this),
                utility: new $.UtilityHelper(this),
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
            $.api.runtime.onMessage.addListener(async (message) => { // listen for events from the background script
                if (message && message.action && message.action === "reinitialize" && message.type === "premiumActivated") { // premium has been activated -> reload settings
                    unsavedChanges = false;
                    await $.delay(2000);
                    location.reload(true);
                }
            });

            $(window).on("beforeunload", (e) => { // Show confirm dialog when trying to exit the settings without saving the changes
                if (unsavedChanges) {
                    const confirmationMessage = "Do you really want to leave without saving your changes?"; // cannot call i18n helper here, since Chrome won't execute this in the beforeunload event
                    e.returnValue = confirmationMessage;
                    return confirmationMessage;
                }
            });

            $("img[loading='lazy']").on("load", (e) => { // add class for lazyloaded images
                $(e.currentTarget).addClass($.cl.settings.lazyloaded);
            }).forEach((img) => { // add the class for all already loaded images as well
                if (img.complete && img.naturalHeight !== 0) {
                    $(img).addClass($.cl.settings.lazyloaded);
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

            this.elm.body.on("click", "div." + $.cl.settings.dialog + " > a", async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const type = $(e.currentTarget).parent("div").attr($.attr.type);

                if (restoreTypes.indexOf(type) !== -1) {
                    let configToRemove = [type];

                    if (type === "appearance") { // restore custom css aswell
                        const obj = await $.api.storage.local.get(["utility"]);
                        const utility = obj.utility || {};
                        delete utility.customCss;

                        await $.api.storage.local.set({utility: utility});
                    } else if (type === "expert") { // restore all configuration
                        configToRemove = ["behaviour", "appearance", "newtab"];
                    }

                    await $.api.storage.sync.remove(configToRemove);

                    this.showSuccessMessage("restored_message");
                    $("div." + $.cl.settings.dialog).removeClass($.cl.visible);

                    await this.helper.model.call("reinitialize");
                    await $.delay(1500);
                    this.helper.model.call("reloadIcon");
                    this.helper.model.call("reloadBrowserAction");

                    location.reload(true);
                }
            });

            this.elm.advanced.container.css("display", "none");
            this.elm.advanced.toggle.on("click", async (e) => {
                const container = $(e.currentTarget).next("div");

                if (container.hasClass($.cl.visible)) {
                    container.removeClass($.cl.visible);

                    await $.delay(300);
                    container.css("display", "none");
                } else {
                    container.css("display", "flex");

                    await $.delay(0);
                    container.addClass($.cl.visible);
                }
            });

            this.elm.buttons.save.on("click", async (e) => { // save button
                e.preventDefault();
                const path = this.helper.menu.getPath();

                if (path[1] === "translate") {
                    this.helper.translation.submit();
                } else if (path[0] === "expert") {
                    await this.helper.expert.save();
                    await this.showSuccessMessage("saved_message");

                    await this.helper.model.call("reinitialize");
                    await $.delay(1500);
                    this.helper.model.call("reloadIcon");
                    this.helper.model.call("reloadBrowserAction");

                    await $.delay(0);
                    location.reload(true);
                } else {
                    await Promise.all([
                        this.helper.sidebar.save(),
                        this.helper.appearance.save(),
                        this.helper.newtab.save()
                    ]);

                    await this.showSuccessMessage("saved_message");
                    await this.helper.model.call("reinitialize");

                    this.helper.model.call("reloadIcon");
                    this.helper.model.call("reloadBrowserAction");
                    await this.helper.model.init();

                    this.helper.expert.updateRawConfigList();
                }
            });

            this.elm.buttons.restore.attr("title", this.helper.i18n.get("settings_restore"));
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

                    const dialog = $("<div></div>")
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