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
                    ee: "ee"
                },
                tabs: {
                    content: "tab",
                    list: "tabBar",
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
                configEntry: "configEntry",
                success: "success",
                error: "error",
                loading: "loading",
                revert: "revert",
                visible: "visible",
                gotoFeedback: "gotoFeedback",
                howto: "howto",
                action: "action",
                incomplete: "incomplete"
            },
            attr: {
                type: "data-type",
                appearance: "data-appearance",
                name: "data-name",
                i18n: "data-i18n",
                value: "data-value",
                tab: "data-tab",
                success: "data-successtext",
                style: "data-style",
                hideOnFalse: "data-hideOnFalse",
                classOnTrue: "data-classOnTrue",
                pos: "data-pos",
                bg: "data-bg",
                range: {
                    min: "data-min",
                    max: "data-max",
                    step: "data-step",
                    unit: "data-unit",
                    infinity: "data-infinity"
                },
                color: {
                    alpha: "data-alpha"
                },
                field: {
                    placeholder: "data-placeholder"
                }
            },
            elm: {
                body: $("body"),
                title: $("head > title"),
                header: $("body > header"),
                content: $("section#content"),
                tab: $("section#content > div.tab"),
                contentTabs: $("ul.labels > li"),
                contentTabSections: $("ul.labels ~ div[data-name]"),
                copyrightDate: $("a#copyright > span"),
                keyboardShortcutInfo: $("p.shortcutInfo"),
                formElement: $("div.formElement"),
                appearance: {
                    content: $("div.tab[data-name='appearance']"),
                    backgroundChanger: $("menu.backgroundChanger > a"),
                },
                contribute: {
                    translationTabLink: $("div.tab[data-name='contribute'] ul.labels > li[data-type='translation'] > a"),
                    translationTabContent: $("div.tab[data-name='contribute'] div[data-name='translation']"),
                    action: $("div.tab[data-name='contribute'] a.action")
                },
                feedback: {
                    textarea: $("textarea#feedback"),
                    email: $("input#feedbackEmail"),
                    faq: $("div.faq")
                },
                button: {
                    save: $("div.tab > header > button.save"),
                    restore: $("div.tab > header > button.restore")
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
                checkboxChanged: "blockbyte-bs-checkboxChanged",
                contentTabChanged: "blockbyte-bs-contentTabChanged"
            },
            ajax: {
                feedback: "https://blockbyte.de/ajax/extensions/feedback",
                translationInfo: "https://blockbyte.de/ajax/extensions/bs/i18n/info"
            },
            donateLink: "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=2VW2UADL99YEL",
            manifest: chrome.runtime.getManifest()
        };

        /**
         * Constructor
         */
        this.run = () => {
            initHelpers();
            initHeader();

            this.helper.model.init(() => {
                this.helper.i18n.init(() => {
                    this.helper.font.init();
                    this.helper.stylesheet.init();
                    this.helper.stylesheet.addStylesheets(["settings"], $(document));
                    initHeaderTabs();

                    this.helper.form.init(() => {
                        this.helper.template.footer().insertAfter(this.opts.elm.content);
                        this.helper.i18n.parseHtml(document);
                        this.opts.elm.title.text(this.opts.elm.title.text() + " - " + this.helper.i18n.get("extension_name"));

                        this.helper.behaviour.init();
                        this.helper.appearance.init();
                        this.helper.feedback.init();
                        this.helper.contribute.init();
                        this.helper.help.init();

                        initButtonEvents();
                        initContentTabs();

                        this.opts.elm.body.removeClass(this.opts.classes.loading);
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
            setTimeout(() => {
                this.opts.elm.body.removeClass(this.opts.classes.success);
            }, 1500);
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
                form: new window.FormHelper(this),
                behaviour: new window.BehaviourHelper(this),
                appearance: new window.AppearanceHelper(this),
                feedback: new window.FeedbackHelper(this),
                contribute: new window.ContributeHelper(this),
                help: new window.HelpHelper(this)
            };
        };

        /**
         * Initialises the header
         */
        let initHeader = () => {
            this.opts.elm.header.prepend('<svg height="48" width="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>');
        };

        /**
         * Initialises the content tabs
         */
        let initContentTabs = () => {
            this.opts.elm.contentTabs.children("a").on("click", (e) => {
                e.preventDefault();
                let tabElm = $(e.currentTarget).parent("li");
                let headerTabName = tabElm.parents("div." + this.opts.classes.tabs.content).eq(0).attr(this.opts.attr.name);
                let tabName = tabElm.attr(this.opts.attr.type);

                tabElm.siblings("li").removeClass(this.opts.classes.tabs.active);
                tabElm.addClass(this.opts.classes.tabs.active);

                $(e.currentTarget).parents("ul").eq(0).siblings("div[" + this.opts.attr.name + "]").forEach((section) => {
                    let name = $(section).attr(this.opts.attr.name);

                    if (name === tabName) {
                        $(section).removeClass(this.opts.classes.hidden);
                    } else {
                        $(section).addClass(this.opts.classes.hidden);
                    }
                });

                document.dispatchEvent(new CustomEvent(this.opts.events.contentTabChanged, {
                    detail: {
                        headerTab: headerTabName,
                        contentTab: tabName
                    },
                    bubbles: true,
                    cancelable: false
                }));
            });

            this.opts.elm.contentTabSections.addClass(this.opts.classes.hidden);

            setTimeout(() => {
                this.opts.elm.contentTabs.forEach((contentTab) => {
                    if ($(contentTab).hasClass(this.opts.classes.tabs.active)) {
                        $(contentTab).children("a").trigger("click");
                    }
                });
            }, 0);
        };

        /**
         * Initialises the header tab bar
         */
        let initHeaderTabs = () => {
            let tabBar = $("<ul />").addClass(this.opts.classes.tabs.list).prependTo(this.opts.elm.header);

            this.opts.elm.tab.forEach((elm) => {
                let name = $(elm).attr(this.opts.attr.name);
                $("<li />").attr(this.opts.attr.name, name).html("<a href='#'>" + this.helper.i18n.get("settings_tab_" + name) + "</a>").appendTo(tabBar);
            });

            tabBar.find("> li > a").on("click", (e) => {
                e.preventDefault();
                tabBar.children("li").removeClass(this.opts.classes.tabs.active);
                let tabElm = $(e.currentTarget).parent("li");
                let tabName = tabElm.attr(this.opts.attr.name);
                tabElm.addClass(this.opts.classes.tabs.active);

                this.opts.elm.tab.forEach((tab) => {
                    let name = $(tab).attr(this.opts.attr.name);

                    if (name === tabName) {
                        $(tab).removeClass(this.opts.classes.hidden);
                    } else {
                        $(tab).addClass(this.opts.classes.hidden);
                    }
                });

                location.hash = tabName;
                this.opts.elm.body.attr(this.opts.attr.tab, tabName);
            });

            let hash = location.hash ? location.hash.substr(1) : null;
            tabBar.find("> li > a").eq(0).trigger("click");

            if (hash) {
                tabBar.find("> li[" + this.opts.attr.name + "='" + hash + "'] > a").trigger("click");
            }
        };

        /**
         * Initialises the eventhandler for the buttons
         */
        let initButtonEvents = () => {
            this.opts.elm.button.save.on("click", (e) => {
                e.preventDefault();

                switch (this.opts.elm.body.attr(this.opts.attr.tab)) {
                    case "behaviour": {
                        this.helper.behaviour.save();
                        break;
                    }
                    case "appearance": {
                        this.helper.appearance.save();
                        break;
                    }
                    case "feedback": {
                        this.helper.feedback.send();
                        break;
                    }
                }
            });

            this.opts.elm.button.restore.attr("title", this.helper.i18n.get("settings_restore"));

            this.opts.elm.button.restore.on("click", (e) => {
                e.preventDefault();
                let tabName = this.opts.elm.body.attr(this.opts.attr.tab);

                switch (tabName) {
                    case "behaviour":
                    case "appearance": {
                        chrome.storage.sync.remove([tabName], () => {
                            this.helper.model.call("refreshAllTabs", {type: "Settings"});
                            this.showSuccessMessage("restored_message");
                            setTimeout(() => {
                                location.reload(true);
                            }, 1500);
                        });
                        break;
                    }
                }
            });
        };
    };


    new window.settings().run();

})(jsu);