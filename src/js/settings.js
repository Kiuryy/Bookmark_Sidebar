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
                initLoading: "initLoading",
                loading: "loading",
                revert: "revert",
                visible: "visible",
                gotoFeedback: "gotoFeedback",
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
                header: $("body > header"),
                content: $("section#content"),
                tab: $("section#content > div.tab"),
                contentTabs: $("ul.labels > li"),
                contentTabSections: $("ul.labels ~ div[data-name]"),
                keyboardShortcutInfo: $("p.shortcutInfo"),
                formElement: $("div.formElement"),
                menuLink: $("body > header > a"),
                menuContainer: $("section#menu"),
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
                    form: $("section.form"),
                    textarea: $("textarea#feedback"),
                    email: $("input#feedbackEmail"),
                    send: $("div.tab[data-name='feedback'] > header > button.save"),
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
                contentTabChanged: "blockbyte-bs-contentTabChanged"
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
            initHeader();

            this.helper.model.init().then(() => {
                return this.helper.i18n.init();
            }).then(() => {
                this.helper.font.init();
                this.helper.stylesheet.init();
                this.helper.stylesheet.addStylesheets(["settings"], $(document));
                initHeaderTabs();

                return this.helper.form.init();
            }).then(() => {
                this.helper.template.footer().insertAfter(this.opts.elm.content);
                this.helper.i18n.parseHtml(document);
                this.opts.elm.title.text(this.opts.elm.title.text() + " - " + this.helper.i18n.get("extension_name"));
                this.opts.elm.button.restore.attr("title", this.helper.i18n.get("settings_restore"));
                this.opts.elm.body.removeClass(this.opts.classes.initLoading);

                return Promise.all([
                    this.helper.behaviour.init(),
                    this.helper.appearance.init(),
                    this.helper.feedback.init(),
                    this.helper.contribute.init(),
                    this.helper.importExport.init(),
                ]);
            }).then(() => {
                initEvents();
                initContentTabs();

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
                form: new window.FormHelper(this),
                behaviour: new window.BehaviourHelper(this),
                appearance: new window.AppearanceHelper(this),
                feedback: new window.FeedbackHelper(this),
                importExport: new window.ImportExportHelper(this),
                contribute: new window.ContributeHelper(this)
            };
        };

        /**
         * Initialises the header
         *
         * @returns {Promise}
         */
        let initHeader = async () => {
            this.helper.template.svgByName("icon-settings").then((svg) => {
                this.opts.elm.header.prepend(svg);
            });
        };

        /**
         * Initialises the content tabs
         *
         * @returns {Promise}
         */
        let initContentTabs = async () => {
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

            $.delay().then(() => {
                this.opts.elm.contentTabs.forEach((contentTab) => {
                    if ($(contentTab).hasClass(this.opts.classes.tabs.active)) {
                        $(contentTab).children("a").trigger("click");
                    }
                });
            });
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

                this.helper.model.call("trackEvent", {
                    category: "settings",
                    action: "tab",
                    label: tabName
                });
            });

            let hash = location.hash ? location.hash.substr(1) : null;

            if (hash) {
                tabBar.find("> li[" + this.opts.attr.name + "='" + hash + "'] > a").trigger("click");
            } else {
                tabBar.find("> li > a").eq(0).trigger("click");
            }
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

            this.opts.elm.button.save.on("click", (e) => { // save button
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

            this.opts.elm.button.restore.on("click", (e) => {
                e.preventDefault();
                let tabName = this.opts.elm.body.attr(this.opts.attr.tab);

                switch (tabName) {
                    case "behaviour":
                    case "appearance": {
                        chrome.storage.sync.remove([tabName], () => {
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