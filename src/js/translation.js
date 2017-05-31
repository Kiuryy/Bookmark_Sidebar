($ => {
    "use strict";

    window.translation = function () {

        let loader = null;
        let languages = {};

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.opts = {
            elm: {
                body: $("body"),
                title: $("head > title"),
                header: $("body > header"),
                content: $("section#content"),
                backToOverview: $("section#content > a.back"),
                save: $("section#content > div[data-name='langvars'] > header > button.save"),
                wrapper: {
                    overview: $("section#content > div[data-name='overview']"),
                    langvars: $("section#content > div[data-name='langvars']")
                }
            },
            classes: {
                hidden: "hidden",
                progress: "progress",
                loading: "loading",
                active: "active",
                langVarCategory: "category",
                languagesSelect: "languages",
                edit: "edit",
                success: "success",
                empty: "empty",
                incomplete: "incomplete"
            },
            attr: {
                success: "data-successtext",
                releaseStatus: "data-status"
            },
            ajax: {
                info: "https://blockbyte.de/ajax/extensions/bs/i18n/info",
                langvars: "https://blockbyte.de/ajax/extensions/bs/i18n/langvars",
                submit: "https://blockbyte.de/ajax/extensions/bs/i18n/submit"
            },
            manifest: chrome.runtime.getManifest()
        };

        /**
         * Constructor
         */
        this.run = () => {
            changeView("overview");
            initHelpers();
            initHeader();
            startLoading();

            this.helper.model.init(() => {
                this.helper.i18n.init(() => {
                    this.helper.font.init();
                    this.helper.stylesheet.init();
                    this.helper.stylesheet.addStylesheets(["translation"], $(document));

                    this.helper.template.footer().insertAfter(this.opts.elm.content);
                    this.helper.i18n.parseHtml(document);
                    this.opts.elm.title.text(this.opts.elm.title.text() + " - " + this.helper.i18n.get("extension_name"));

                    initLanguages(() => {
                        initOverview();
                        initEvents();

                        this.opts.elm.body.removeClass(this.opts.classes.loading);
                    });
                });
            });
        };


        /*
         * ################################
         * PRIVATE
         * ################################
         */

        /**
         * Initialises the header
         */
        let initHeader = () => {
            this.opts.elm.header.prepend('<svg height="48" width="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>');
        };

        /**
         * Initialises the helper objects
         */
        let initHelpers = () => {
            this.helper = {
                template: new window.TemplateHelper(this),
                i18n: new window.I18nHelper(this),
                font: new window.FontHelper(this),
                stylesheet: new window.StylesheetHelper(this),
                model: new window.ModelHelper(this)
            };
        };

        /**
         * Initialises the language information
         *
         * @param {function} callback
         */
        let initLanguages = (callback) => {
            this.helper.model.call("languageInfos", (opts) => {
                languages = opts.infos;
                if (typeof callback === "function") {
                    callback();
                }
            });
        };

        /**
         * Changes the view from the overview to edit form or back to overview
         */
        let changeView = (name) => {
            if (name === "overview") {
                this.opts.elm.backToOverview.addClass(this.opts.classes.hidden);
            } else {
                this.opts.elm.backToOverview.removeClass(this.opts.classes.hidden);
            }

            Object.keys(this.opts.elm.wrapper).forEach((key) => {

                if (key === name) {
                    this.opts.elm.wrapper[key].removeClass(this.opts.classes.hidden);
                } else {
                    this.opts.elm.wrapper[key].addClass(this.opts.classes.hidden);
                }
            });
        };

        /**
         * Adds a loading indicator over the content
         */
        let startLoading = () => {
            Object.keys(this.opts.elm.wrapper).forEach((key) => {
                if (this.opts.elm.wrapper[key].hasClass(this.opts.classes.hidden) === false) {
                    this.opts.elm.wrapper[key].addClass(this.opts.classes.loading);
                    loader = this.helper.template.loading().appendTo(this.opts.elm.wrapper[key]);
                }
            });
        };

        /**
         * Removes the loading indicator from the content after the given time
         *
         * @param {int} timeout
         */
        let endLoading = (timeout = 300) => {
            setTimeout(() => {
                loader && loader.remove();
                Object.keys(this.opts.elm.wrapper).forEach((key) => {
                    if (this.opts.elm.wrapper[key].hasClass(this.opts.classes.hidden) === false) {
                        this.opts.elm.wrapper[key].removeClass(this.opts.classes.loading);
                    }
                });
            }, timeout);
        };

        /**
         * Initialises the language overview
         */
        let initOverview = () => {
            this.opts.elm.wrapper.overview.find("> div.scrollBox > div > ul").remove();
            this.opts.elm.wrapper.overview.find("> div.scrollBox > div > select." + this.opts.classes.languagesSelect).remove();

            let xhr = new XMLHttpRequest();
            xhr.open("POST", this.opts.ajax.info, true);
            xhr.onload = () => {
                let infos = JSON.parse(xhr.responseText);

                if (infos && infos.languages) {
                    let list = $("<ul />").appendTo(this.opts.elm.wrapper.overview.find("> div.scrollBox > div"));

                    infos.languages.sort((a, b) => {
                        if (b.varsAmount !== a.varsAmount) {
                            return b.varsAmount - a.varsAmount
                        }

                        if (languages[a.name] && languages[b.name]) {
                            return languages[a.name].label > languages[b.name].label ? 1 : -1;
                        }

                        return 1;
                    });

                    let missingLanguages = Object.assign({}, languages);

                    infos.languages.forEach((lang) => {
                        delete missingLanguages[lang.name];

                        if (languages[lang.name]) {
                            let c = Math.PI * 12 * 2;
                            let percentage = lang.varsAmount / infos.varsAmount * 100;
                            let status = "draft";

                            if (languages[lang.name].available) {
                                status = hasImcompleteCategories(lang.categories, infos.categories) ? "incomplete" : "released";
                            }

                            $("<li />")
                                .data("lang", lang.name)
                                .append("<strong>" + languages[lang.name].label + "</strong>")
                                .append("<a href='#' class='" + this.opts.classes.edit + "' title='" + this.helper.i18n.get("translation_edit") + "'></a>")
                                .append("<svg class=" + this.opts.classes.progress + " width='32' height='32' viewPort='0 0 16 16'><circle r='12' cx='16' cy='16'></circle><circle r='12' cx='16' cy='16' stroke-dashoffset='" + ((100 - percentage) / 100 * c) + "' stroke-dasharray='" + c + "'></circle></svg>")
                                .append("<span class='" + this.opts.classes.progress + "'>" + Math.round(lang.varsAmount / infos.varsAmount * 100) + "%</span>")
                                .append("<span " + this.opts.attr.releaseStatus + "='" + status + "' title='" + this.helper.i18n.get("translation_status_" + status) + "'></span>")
                                .appendTo(list);
                        }
                    });

                    addSelectForMissingLangs(missingLanguages);
                }

                initOverviewEvents();
                endLoading();
            };
            xhr.send();
        };

        /**
         * Adds a dropdown select for all missing languages below the list of available languages
         *
         * @param {object} langs
         */
        let addSelectForMissingLangs = (langs) => {
            let select = $("<select class='" + this.opts.classes.languagesSelect + "' />").appendTo(this.opts.elm.wrapper.overview.find("> div.scrollBox > div"));
            $("<option value='' />").text("Add language").appendTo(select);

            let optionList = [];

            Object.keys(langs).forEach((lang) => {
                optionList.push({
                    elm: $("<option value='" + lang + "' />").text(languages[lang].label),
                    label: languages[lang].label
                });
            });

            optionList.sort((a, b) => {
                return a.label > b.label ? 1 : -1;
            });

            optionList.forEach((obj) => {
                obj.elm.appendTo(select);
            });
        };

        /**
         * Returns true if a category of the given language is missing some variables
         *
         * @param {object} langCategories
         * @param {object} allCategories
         * @returns {boolean}
         */
        let hasImcompleteCategories = (langCategories, allCategories) => {
            let ret = false;

            Object.keys(langCategories).some((name) => {
                if ((name !== "Settings" || langCategories[name] / allCategories[name] * 100 > 75) && allCategories[name] > langCategories[name]) {
                    ret = true;
                    return true;
                }
            });

            return ret;
        };

        /**
         * Returns all language variables of the given language,
         * also return the variables of the default language if the given language is not the default one
         *
         * @param {string} lang
         * @param {function} callback
         */
        let getLanguageInfos = (lang, callback) => {
            let xhr = new XMLHttpRequest();
            xhr.open("POST", this.opts.ajax.langvars, true);
            xhr.onload = () => {
                let infos = JSON.parse(xhr.responseText);

                if (infos && Object.getOwnPropertyNames(infos).length > 0) {
                    let ret = {[lang]: infos};
                    let defaultLang = this.helper.i18n.getDefaultLanguage();

                    if (lang !== defaultLang) {
                        getLanguageInfos(defaultLang, (infos) => {
                            ret.default = infos[defaultLang];
                            if (typeof callback === "function") {
                                callback(ret);
                            }
                        });
                    } else if (typeof callback === "function") {
                        callback(ret);
                    }
                } else {
                    callback(null);
                }
            };

            let formData = new FormData();
            formData.append('lang', lang);
            xhr.send(formData);
        };

        /**
         * Initialises the form with all language variables
         *
         * @param {string} lang
         */
        let initEditForm = (lang) => {
            this.opts.elm.wrapper.langvars.data("lang", lang);
            this.opts.elm.wrapper.langvars.find("div." + this.opts.classes.langVarCategory).remove();
            this.opts.elm.wrapper.langvars.find("> header > h2").text("");

            changeView("langvars");
            startLoading();

            getLanguageInfos(lang, (obj) => {
                if (obj) {
                    let infos = obj[lang];
                    let totalFilled = 0;

                    Object.keys(infos).forEach((category) => {
                        let wrapper = $("<div />")
                            .addClass(this.opts.classes.langVarCategory)
                            .append("<a href='#' />")
                            .append("<strong>" + category + "</strong>")
                            .appendTo(this.opts.elm.wrapper.langvars.find("> div.scrollBox > div"));

                        let list = $("<ul />").appendTo(wrapper);
                        let varsAmount = {
                            total: infos[category].length,
                            filled: 0
                        };

                        infos[category].forEach((field, i) => {
                            if (field.value) {
                                varsAmount.filled++;
                                totalFilled++;
                            }

                            let entry = $("<li />")
                                .append("<label>" + field.label + "</label>")
                                .appendTo(list);

                            if (obj.default && obj.default[category] && obj.default[category][i]) {
                                $("<span />").html("<span>" + languages[this.helper.i18n.getDefaultLanguage()].label + ":</span>" + obj.default[category][i].value || "").appendTo(entry);
                            }

                            let val = field.value || "";
                            let textarea = $("<textarea />").data({
                                initial: val,
                                name: field.name
                            }).text(val).appendTo(entry);

                            if (val.length === 0) { // mark empty fields
                                entry.addClass(this.opts.classes.empty);
                            }
                        });

                        $("<span />").html("<span>" + varsAmount.filled + "</span>/" + varsAmount.total).insertBefore(list);

                        if (languages[lang].available && varsAmount.filled > 0 && varsAmount.total > varsAmount.filled) { // incomplete notice for already released translations
                            wrapper.addClass(this.opts.classes.incomplete);
                            wrapper.children("a").attr("title", this.helper.i18n.get("translation_incomplete_info"));
                        }
                    });

                    this.opts.elm.wrapper.langvars.find("> header > h2").text(this.helper.i18n.get("translation_" + (totalFilled === 0 ? "add" : "edit")) + " (" + languages[lang].label + ")");
                    initFormEvents();
                } else {
                    changeView("overview");
                }
                endLoading();
            });
        };

        /**
         * Initialises general eventhandlers
         */
        let initEvents = () => {
            this.opts.elm.backToOverview.on("click", (e) => {
                e.preventDefault();
                changeView("overview");
            });

            this.opts.elm.save.on("click", (e) => {
                e.preventDefault();

                let loadStartTime = +new Date();
                let loader = this.helper.template.loading().appendTo(this.opts.elm.body);
                this.opts.elm.body.addClass(this.opts.classes.loading);

                let vars = {};
                this.opts.elm.wrapper.langvars.find("textarea").forEach((textarea) => {
                    let value = textarea.value;
                    if (value && value.trim().length > 0) {
                        let initial = $(textarea).data("initial");
                        value = value.trim();

                        if (value !== initial) {
                            let name = $(textarea).data("name");
                            vars[name] = value;
                        }
                    }
                });

                let xhr = new XMLHttpRequest();
                xhr.open("POST", this.opts.ajax.submit, true);
                xhr.onload = () => {
                    setTimeout(() => { // load at least 1s
                        loader.remove();
                        this.opts.elm.body.attr(this.opts.attr.success, this.helper.i18n.get("translation_submit_message"));
                        this.opts.elm.body.addClass(this.opts.classes.success);
                        setTimeout(() => {
                            this.opts.elm.body.removeClass(this.opts.classes.loading);
                            this.opts.elm.body.removeClass(this.opts.classes.success);
                            location.reload(true);
                        }, 1500);
                    }, Math.max(0, 1000 - (+new Date() - loadStartTime)));
                };

                let formData = new FormData();
                formData.append('lang', this.opts.elm.wrapper.langvars.data("lang"));
                formData.append('vars', JSON.stringify(vars));
                xhr.send(formData);
            });
        };

        /**
         * Initialises the events for the translation overview
         */
        let initOverviewEvents = () => {
            this.opts.elm.wrapper.overview.find("select." + this.opts.classes.languagesSelect).on("change", (e) => {
                initEditForm(e.currentTarget.value);
            });

            this.opts.elm.wrapper.overview.find("a." + this.opts.classes.edit).on("click", (e) => {
                e.preventDefault();
                initEditForm($(e.currentTarget).parent("li").data("lang"));
            });
        };

        /**
         * Initialises the events for the translation form
         */
        let initFormEvents = () => {
            this.opts.elm.wrapper.langvars.find("div." + this.opts.classes.langVarCategory + " > a").on("click", (e) => {
                e.preventDefault();
                let wrapper = $(e.currentTarget).parent();
                wrapper.toggleClass(this.opts.classes.active);

                if (wrapper.hasClass(this.opts.classes.active) && wrapper.hasClass(this.opts.classes.incomplete)) { // scroll to the first incomplete field of the clicked category
                    this.opts.elm.wrapper.langvars.children("div.scrollBox")[0].scrollTop = wrapper[0].offsetTop + wrapper.find("li." + this.opts.classes.empty)[0].offsetTop - 50;
                }
            });

            this.opts.elm.wrapper.langvars.find("textarea").on("change input", (e) => {
                e.preventDefault();
                let category = $(e.currentTarget).parents("div." + this.opts.classes.langVarCategory).eq(0);
                let filled = 0;
                category.find("textarea").forEach((textarea) => {
                    if (textarea.value && textarea.value.trim().length > 0) {
                        filled++;
                    }
                });
                category.find("> span > span").text(filled);
            });
        };

    };


    new window.translation().run();

})(jsu);