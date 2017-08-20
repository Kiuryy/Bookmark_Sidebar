($ => {
    "use strict";

    window.settings = function () {

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.opts = {
            classes: {
                page: {
                    darkMode: "dark",
                    ee: "ee"
                },
                tabs: {
                    content: "tab",
                    active: "active"
                },
                color: {
                    field: "color"
                },
                range: {
                    inactive: "inactive"
                },
                checkbox: {
                    box: "checkbox",
                    active: "active",
                    clicked: "clicked",
                    focus: "focus"
                },
                hidden: "hidden",
                success: "success",
                error: "error",
                building: "building",
                initLoading: "initLoading",
                loading: "loading",
                revert: "revert",
                visible: "visible",
                small: "small",
                desc: "desc",
                box: "box",
                action: "action",
                incomplete: "incomplete"
            },
            attr: {
                type: "data-type",
                appearance: "data-appearance",
                name: "data-name",
                i18n: "data-i18n",
                value: "data-value",
                success: "data-successtext",
                style: "data-style",
                hideOnFalse: "data-hideOnFalse",
                pos: "data-pos",
                bg: "data-bg",
                buttons: {
                    save: "data-save",
                    restore: "data-restore"
                },
                range: {
                    min: "data-min",
                    max: "data-max",
                    step: "data-step",
                    unit: "data-unit",
                    infinity: "data-infinity"
                },
                color: {
                    alpha: "data-alpha",
                    style: "data-color"
                },
                field: {
                    placeholder: "data-placeholder"
                }
            },
            elm: {
                body: $("body"),
                title: $("head > title"),
                aside: $("body > section#wrapper > aside"),
                content: $("body > section#wrapper > main"),
                header: $("body > header"),
                headline: $("body > header > h1"),
                buttons: {
                    save: $("body > header > menu > button.save"),
                    restore: $("body > header > menu > button.restore")
                },
                feedback: {
                    form: $("section.form"),
                    send: $("section.form button[type='submit']"),
                    faq: $("div.faq")
                },
                //
                //
                //
                tab: $("section#content > div.tab"),
                contentTabs: $("ul.labels > li"),
                contentTabSections: $("ul.labels ~ div[data-name]"),
                keyboardShortcutInfo: $("p.shortcutInfo"),
                formElement: $("div.formElement"),
                menuLink: $("body > header > a"),
                menuContainer: $("section#menu"),
                appearance: {
                    content: $("div.tab[data-name='appearance']"),
                    backgroundChanger: $("menu.backgroundChanger > a"), // OLD
                },
                contribute: {
                    translationTabLink: $("div.tab[data-name='contribute'] ul.labels > li[data-type='translation'] > a"),
                    translationTabContent: $("div.tab[data-name='contribute'] div[data-name='translation']"),
                    donateButton: $("div.tab[data-name='support'] button[type='submit']")
                },

                preview: {},
                checkbox: {},
                range: {},
                select: {},
                color: {},
                textarea: {},
                field: {}
            },
            events: {
                pageChanged: "blockbyte-bs-pageChanged"
            },
            ajax: {
                feedback: "https://extensions.blockbyte.de/ajax/feedback",
                translationInfo: "https://extensions.blockbyte.de/ajax/bs/i18n/info"
            },
            donateLink: "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=2VW2UADL99YEL",
            manifest: chrome.runtime.getManifest()
        };

        /**
         * Constructor
         */
        this.run = () => {
            initHelpers();
            let loader = this.helper.template.loading().appendTo(this.opts.elm.body);
            this.opts.elm.body.addClass(this.opts.classes.initLoading);


            this.helper.model.init().then(() => {
                return this.helper.i18n.init();
            }).then(() => {
                this.helper.font.init();
                this.helper.stylesheet.init();
                this.helper.stylesheet.addStylesheets(["settings"], $(document));

                initHeader();
                //this.helper.template.footer().appendTo(this.opts.elm.content);

                return this.helper.form.init();
            }).then(() => {
                this.opts.elm.body.removeClass(this.opts.classes.building);

                this.helper.i18n.parseHtml(document);
                this.opts.elm.title.text(this.opts.elm.title.text() + " - " + this.helper.i18n.get("extension_name"));
                this.opts.elm.buttons.restore.attr("title", this.helper.i18n.get("settings_restore"));

                return Promise.all([
                    this.helper.menu.init(),
                    this.helper.behaviour.init(),
                    this.helper.appearance.init(),
                    this.helper.feedback.init(),
                    this.helper.contribute.init(),
                    this.helper.importExport.init(),
                ]);
            }).then(() => {
                initEvents();

                loader.remove();
                this.opts.elm.body.removeClass(this.opts.classes.initLoading);
                this.helper.model.call("trackPageView", {page: "/settings"});

            });
        };

        /**
         * Shows the given success message for 1.5s
         *
         * @param {string} i18nStr
         */
        this.showSuccessMessage = (i18nStr) => {
            this.opts.elm.body.attr(this.opts.attr.success, this.helper.i18n.get("settings_" + i18nStr));
            this.opts.elm.body.addClass(this.opts.classes.success);

            $.delay(1500).then(() => {
                this.opts.elm.body.removeClass(this.opts.classes.success);
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
                model: new window.ModelHelper(this),
                checkbox: new window.CheckboxHelper(this),
                template: new window.TemplateHelper(this),
                i18n: new window.I18nHelper(this),
                font: new window.FontHelper(this),
                stylesheet: new window.StylesheetHelper(this),
                menu: new window.MenuHelper(this),
                form: new window.FormHelper(this),
                behaviour: new window.BehaviourHelper(this),
                appearance: new window.AppearanceHelper(this),
                feedback: new window.FeedbackHelper(this),
                importExport: new window.ImportExportHelper(this),
                contribute: new window.ContributeHelper(this)
            };
        };

        let initHeader = () => {
            this.helper.template.svgByName("icon-settings").then((svg) => {
                this.opts.elm.header.prepend(svg);
            });
        };

        /**
         * Initialises the eventhandlers
         *
         * @returns {Promise}
         */
        let initEvents = async () => {
            $(document).on("click", () => {
                this.opts.elm.menuContainer.removeClass(this.opts.classes.visible);
            });

            this.opts.elm.menuLink.on("click", (e) => { // show menu with import/export links
                e.preventDefault();
                e.stopPropagation();

                this.opts.elm.menuContainer.addClass(this.opts.classes.visible);
            });

            this.opts.elm.menuContainer.find("> ul > li > a[" + this.opts.attr.name + "='close']").on("click", (e) => { // close settings
                e.preventDefault();
                window.close();
            });

            this.opts.elm.buttons.save.on("click", (e) => { // save button
                e.preventDefault();
                let path = this.helper.menu.getPath();

                switch (path[0]) {
                    case "settings": {
                        this.helper.behaviour.save();
                        break;
                    }
                    case "appearance": {
                        this.helper.appearance.save();
                        break;
                    }
                   // case "feedback": {
                        //this.helper.feedback.send();
                        //break;
                   // }
                }
            });

            this.opts.elm.buttons.restore.on("click", (e) => {
                e.preventDefault();
                let path = this.helper.menu.getPath();

                switch (path[0]) {
                    case "settings":
                    case "appearance": {
                        chrome.storage.sync.remove([path[0]], () => {
                            this.helper.model.call("refreshAllTabs", {type: "Settings"});
                            this.showSuccessMessage("restored_message");
                            $.delay(1500).then(() => {
                                location.reload(true);
                            });
                        });
                        break;
                    }
                }
            });
        };
    };

    new window.settings().run();
})(jsu);