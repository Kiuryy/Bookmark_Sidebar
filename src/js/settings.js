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
                    darkMode: "dark"
                },
                tabs: {
                    content: "tab",
                    active: "active"
                },
                color: {
                    field: "color",
                    mask: "colorMask",
                    suggestion: "suggestion"
                },
                radio: {
                    wrapper: "radioWrapper"
                },
                range: {
                    inactive: "inactive"
                },
                newtab: {
                    hideable: "hideable"
                },
                translation: {
                    select: "languageSelect",
                    category: "category",
                    edit: "edit",
                    progress: "progress",
                    mark: "mark",
                    requiredInfo: "requiredInfo",
                    amountInfo: "amountInfo",
                    empty: "empty",
                    back: "back",
                    hover: "hover",
                    goto: "goto"
                },
                checkbox: {
                    box: "checkbox",
                    active: "active",
                    clicked: "clicked",
                    focus: "focus"
                },
                toggleArea: {
                    preview: "preview",
                    fullHeight: "fullHeight",
                    dragged: "dragged",
                    dragging: "dragging",
                    modal: "toggleAreaModal",
                },
                appearance: {
                    preview: {
                        fullHeight: "blockbyte-bs-fullHeight"
                    }
                },
                feedback: {
                    onlySuggestions: "onlySuggestions",
                    suggestion: "suggestion",
                    answer: "answer",
                    noHeight: "noHeight",
                    absolute: "absolute"
                },
                hidden: "hidden",
                success: "success",
                error: "error",
                building: "building",
                initLoading: "initLoading",
                loading: "loading",
                revert: "revert",
                visible: "visible",
                highlight: "highlight",
                showModal: "showModal",
                small: "small",
                desc: "desc",
                box: "box",
                dialog: "dialog",
                boxWrapper: "boxWrapper",
                contentBox: "contentBox",
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
                    suggestions: "data-suggestions"
                },
                field: {
                    placeholder: "data-placeholder"
                },
                translation: {
                    releaseStatus: "data-status",
                    language: "data-lang"
                }
            },
            elm: {
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
            },
            events: {
                pageChanged: "blockbyte-bs-pageChanged"
            },
            ajax: {
                feedback: {
                    form: "https://extensions.blockbyte.de/ajax/feedback",
                    suggestions: "https://extensions.blockbyte.de/ajax/feedback/suggestions"
                },
                translation: {
                    info: "https://extensions.blockbyte.de/ajax/translation/bs/info",
                    langvars: "https://extensions.blockbyte.de/ajax/translation/bs/langvars",
                    submit: "https://extensions.blockbyte.de/ajax/translation/bs/submit"
                }
            },
            donateLink: "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=2VW2UADL99YEL",
            manifest: chrome.runtime.getManifest()
        };

        this.serviceAvailable = true;
        let restoreTypes = ["behaviour", "appearance", "newtab"];

        /**
         * Constructor
         */
        this.run = () => {
            initHelpers();
            let loader = {
                body: this.helper.template.loading().appendTo(this.opts.elm.body)
            };
            this.opts.elm.body.addClass(this.opts.classes.initLoading);

            this.helper.model.init().then(() => {
                return this.helper.i18n.init();
            }).then(() => {
                this.opts.elm.body.parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");

                this.helper.font.init("default");
                this.helper.stylesheet.init();
                this.helper.stylesheet.addStylesheets(["settings"], $(document));

                return this.helper.form.init();
            }).then(() => {
                this.opts.elm.body.removeClass(this.opts.classes.building);

                this.helper.i18n.parseHtml(document);
                this.opts.elm.title.text(this.opts.elm.title.text() + " - " + this.helper.i18n.get("extension_name"));

                ["translation", "feedback"].forEach((name) => {
                    loader[name] = this.helper.template.loading().appendTo(this.opts.elm[name].wrapper);
                    this.opts.elm[name].wrapper.addClass(this.opts.classes.loading);
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
                this.opts.elm.body.removeClass(this.opts.classes.initLoading);
                this.helper.model.call("trackPageView", {page: "/settings"});

                return this.helper.model.call("websiteStatus");
            }).then((opts) => { // if website is available, feedback form and translation overview can be used
                this.serviceAvailable = opts.status === "available";

                ["translation", "feedback"].forEach((name) => {
                    this.helper[name].init().then(() => {
                        loader[name].remove();
                        this.opts.elm[name].wrapper.removeClass(this.opts.classes.loading);
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
                translation: new window.TranslationHelper(this),
                menu: new window.MenuHelper(this),
                form: new window.FormHelper(this),
                sidebar: new window.SidebarHelper(this),
                newtab: new window.NewtabHelper(this),
                appearance: new window.AppearanceHelper(this),
                feedback: new window.FeedbackHelper(this),
                importExport: new window.ImportExportHelper(this),
                support: new window.SupportHelper(this)
            };
        };

        /**
         * Initialises the eventhandlers
         *
         * @returns {Promise}
         */
        let initEvents = async () => {
            $(document).on("click", () => {
                $("div." + this.opts.classes.dialog).removeClass(this.opts.classes.visible);
            });

            this.opts.elm.header.on("click", "div." + this.opts.classes.dialog, (e) => {
                e.stopPropagation();
            });

            this.opts.elm.header.on("click", "div." + this.opts.classes.dialog + " > a", (e) => {
                e.preventDefault();
                e.stopPropagation();

                let type = $(e.currentTarget).parent("div").attr(this.opts.attr.type);

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
                            $("div." + this.opts.classes.dialog).removeClass(this.opts.classes.visible);
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

            this.opts.elm.advanced.container.css("display", "none");
            this.opts.elm.advanced.toggle.on("click", (e) => {
                let container = $(e.currentTarget).next("div");

                if (container.hasClass(this.opts.classes.visible)) {
                    container.removeClass(this.opts.classes.visible);

                    $.delay(300).then(() => {
                        container.css("display", "none");
                    });
                } else {
                    container.css("display", "flex");

                    $.delay(0).then(() => {
                        container.addClass(this.opts.classes.visible);
                    });
                }
            });

            this.opts.elm.buttons.save.on("click", (e) => { // save button
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

            this.opts.elm.buttons.restore.on("click", (e) => {
                e.preventDefault();
                let path = this.helper.menu.getPath();
                let type = path[0];

                if (type === "sidebar") {
                    type = "behaviour";
                }

                if (restoreTypes.indexOf(type) !== -1) {
                    $("div." + this.opts.classes.dialog).remove();
                    let paddingDir = this.helper.i18n.isRtl() ? "left" : "right";

                    let dialog = $("<div />")
                        .attr(this.opts.attr.type, type)
                        .addClass(this.opts.classes.dialog)
                        .append("<p>" + this.helper.i18n.get("settings_restore_confirm") + "</p>")
                        .append("<span>" + this.helper.i18n.get("settings_menu_" + path[0]) + "</span>")
                        .append("<br />")
                        .append("<a>" + this.helper.i18n.get("settings_restore") + "</a>")
                        .css(paddingDir, this.opts.elm.header.css("padding-" + paddingDir))
                        .appendTo(this.opts.elm.header);

                    $.delay().then(() => {
                        dialog.addClass(this.opts.classes.visible);
                    });
                }
            });
        };
    };

    new window.settings().run();
})(jsu);