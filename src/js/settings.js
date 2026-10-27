($ => {
    "use strict";

    const Settings = function () {

        let unsavedChanges = false;

        /**
         * Constructor
         */
        this.run = async () => {
            initHelpers();
            const loader = this.helper.template.loading().appendTo("body");
            $("body").addClass($.cl.initLoading);

            await this.helper.model.init();
            await this.helper.i18n.init();

            $("body").attr($.attr.settings.userType, this.helper.model.getUserType().startsWith("premium") ? "premium" : "free");
            $("body").parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");

            this.helper.stylesheet.init({defaultVal: true});
            await this.helper.stylesheet.addStylesheets(["settings"], $(document));

            $("body").removeClass($.cl.building);

            await this.helper.form.init();
            parseLangVars();
            this.helper.dialog.init();

            const initialHash = location.hash.slice(1); // read before the tabs helper replaces the hash with the name of the opened tab
            this.helper.tabs.init();
            initEvents();

            this.helper.display.init();
            this.helper.triggerArea.init();
            this.helper.iconPreview.init();
            this.helper.extensionIcon.init();
            this.helper.newtab.init();
            await this.helper.links.init();
            this.helper.tipsTricks.init();
            await this.helper.premium.init();
            await this.helper.shareInfo.init();
            this.helper.importExport.init();
            this.helper.expert.init();
            this.helper.video.init();

            if (/^[\w-]+$/.test(initialHash)) { // opened with the name of a dialog as hash (e.g. #premium from the sidebar or the new tab page) -> the first tab is shown behind the dialog
                this.helper.dialog.open(initialHash);
            }

            // the order matters: the mode can change the open action
            await this.helper.display.applyInitialState();
            this.helper.triggerArea.applyInitialState();
            await this.helper.extensionIcon.applyInitialState();

            await this.helper.preview.init();
            await $.delay(500);

            this.helper.form.updateInitialStates();

            loader.remove();
            $("body").removeClass($.cl.initLoading);
        };

        /**
         * Returns whether the page is still being initialised,
         * changes of the form fields during that time only reflect the stored configuration and are no user changes
         *
         * @returns {boolean}
         */
        this.isInitializing = () => $("body").hasClass($.cl.initLoading);

        /**
         * Opens the given url in a new active tab
         *
         * @param {string} href
         */
        this.openLink = (href) => {
            this.helper.model.call("openLink", {
                href: href,
                newTab: true,
                active: true
            });
        };

        /**
         * Adds the given class to the given elements if the condition is true, or removes it otherwise
         *
         * @param {jsu} elm
         * @param {string} cl
         * @param {boolean} condition
         */
        this.setConditionalClass = (elm, cl, condition) => {
            elm.forEach((node) => {
                node.classList.toggle(cl, !!condition);
            });
        };

        /**
         * Reloads the settings page without asking to confirm unsaved changes (e.g. after the configuration was replaced by an import)
         */
        this.reload = () => {
            unsavedChanges = false;
            location.reload();
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
         * Applies the language variables to the page and the sidebar preview,
         * can be called again after the language has been changed
         */
        const parseLangVars = () => {
            this.helper.i18n.parseHtml(document);
            $("head > title").text($("head > title").text() + " - " + this.helper.i18n.get("extension_name"));
            $("body").parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");

            this.helper.preview.translate();
            this.helper.display.highlightVisibilityRuleWildcards();
        };

        /**
         * Binds the events of the save button, the language selection and the tracking of unsaved changes
         */
        const initEvents = () => {
            $("a#save").on("click", async (e) => {
                e.preventDefault();
                await save();
            });

            $.api.runtime.onMessage.addListener((message) => { // listen for events from the background script
                if (message && message.action && message.action === "reinitialize" && message.type === "premiumActivated") { // premium has been activated -> reload settings
                    $.delay(2000).then(() => {
                        this.reload();
                    });
                }
            });

            $(window).on("beforeunload", (e) => { // Show confirm dialog when trying to exit the settings without saving the changes
                if (unsavedChanges) {
                    const confirmationMessage = "Do you really want to leave without saving your changes?"; // cannot call i18n helper here, since Chrome won't execute this in the beforeunload event
                    e.returnValue = confirmationMessage;
                    return confirmationMessage;
                }
            });

            const languageSelect = this.helper.form.elements.select.language;
            languageSelect.on("change", () => { // the language is no regular setting -> save it instantly instead of waiting for the save button
                if (!this.isInitializing()) {
                    saveLanguage();
                }
            });

            $("input, textarea, select").on("keyup change input", async (e) => {
                if (this.isInitializing() || e.currentTarget === languageSelect[0]) { // the language is saved instantly -> no unsaved changes
                    return;
                }

                if (e.currentTarget.closest(`section.${$.cl.settings.dialog}`)) { // fields in dialogs (e.g. the licence key) are not part of the configuration
                    return;
                }

                this.helper.preview.update();
                await markUnsavedChanges();
            });
        };

        /**
         * Highlights the save button the first time something got changed
         *
         * @returns {Promise}
         */
        const markUnsavedChanges = async () => {
            if (unsavedChanges) {
                return;
            }

            unsavedChanges = true;
            const saveButton = $("a#save");
            const saveWrapper = saveButton.parent("li"); // the pulse is drawn by the wrapper -> the button stays clickable during the animation
            saveWrapper.addClass($.cl.settings.highlight);
            await $.delay(400);
            saveButton.addClass("icon");
            await $.delay(800);
            saveWrapper.removeClass($.cl.settings.highlight);
        };

        /**
         * Saves the configuration and resets the state of the unsaved changes
         *
         * @returns {Promise}
         */
        const save = async () => {
            await this.helper.config.save();

            unsavedChanges = false;
            $("a#save").removeClass("icon");
            this.showMessage("saved_message", "success");
            this.helper.form.updateInitialStates();
        };

        /**
         * Saves the selected language,
         * this is not part of the regular save, since the language is no regular setting
         *
         * @returns {Promise}
         */
        const saveLanguage = async () => {
            let language = this.helper.form.elements.select.language[0].value;
            if (language === this.helper.i18n.getUILanguage()) { // the browser language is selected -> no explicit language needed
                language = "default";
            }
            await $.api.storage.sync.set({language: language});
            await this.helper.model.call("reinitialize"); // let the other pages know about the new language

            const wasRtl = this.helper.i18n.isRtl();
            await this.helper.i18n.init(); // load the variables of the newly selected language
            parseLangVars(); // ... and apply them to the page right away
            this.helper.tipsTricks.refresh(); // the tips/tricks are rendered at runtime -> render the current one again in the new language

            if (this.helper.i18n.isRtl() !== wasRtl) { // the text direction changed -> the sidebar preview needs to be rebuilt
                await this.helper.preview.rebuild();
            }
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
                form: new $.SettingsFormHelper(this),
                config: new $.SettingsConfigHelper(this),
                dialog: new $.SettingsDialogHelper(this),
                tabs: new $.SettingsTabsHelper(this),
                links: new $.SettingsLinksHelper(this),
                display: new $.SettingsDisplayHelper(this),
                triggerArea: new $.SettingsTriggerAreaHelper(this),
                iconPreview: new $.SettingsIconPreviewHelper(this),
                extensionIcon: new $.SettingsExtensionIconHelper(this),
                newtab: new $.SettingsNewtabHelper(this),
                preview: new $.SettingsPreviewHelper(this),
                tipsTricks: new $.SettingsTipsTricksHelper(this),
                premium: new $.SettingsPremiumHelper(this),
                shareInfo: new $.SettingsShareInfoHelper(this),
                importExport: new $.SettingsImportExportHelper(this),
                expert: new $.SettingsExpertHelper(this),
                video: new $.SettingsVideoHelper(this),
            };
        };
    };

    new Settings().run();
})(jsu);
