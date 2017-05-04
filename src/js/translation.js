($ => {
    "use strict";

    window.translation = function () {

        let loader = null;

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.languages = {
            af: "Afrikaans",
            ar: "Arabic",
            hy: "Armenian",
            be: "Belarusian",
            bg: "Bulgarian",
            ca: "Catalan",
            "zh-CN": "Chinese (Simplified)",
            "zh-TW": "Chinese (Traditional)",
            hr: "Croatian",
            cs: "Czech",
            da: "Danish",
            nl: "Dutch",
            en: "English",
            eo: "Esperanto",
            et: "Estonian",
            tl: "Filipino",
            fi: "Finnish",
            fr: "French",
            de: "German",
            el: "Greek",
            iw: "Hebrew",
            hi: "Hindi",
            hu: "Hungarian",
            is: "Icelandic",
            id: "Indonesian",
            it: "Italian",
            ja: "Japanese",
            ko: "Korean",
            lv: "Latvian",
            lt: "Lithuanian",
            no: "Norwegian",
            fa: "Persian",
            pl: "Polish",
            pt: "Portuguese",
            ro: "Romanian",
            ru: "Russian",
            sr: "Serbian",
            sk: "Slovak",
            sl: "Slovenian",
            es: "Spanish",
            sw: "Swahili",
            sv: "Swedish",
            th: "Thai",
            tr: "Turkish",
            uk: "Ukrainian",
            vi: "Vietnamese"
        };

        this.opts = {
            elm: {
                title: $("head > title"),
                header: $("body > header"),
                content: $("section#content"),
                wrapper: {
                    overview: $("section#content > div[data-name='overview']"),
                    langvars: $("section#content > div[data-name='langvars']")
                }
            },
            classes: {
                hidden: "hidden",
                progress: "progress",
                loading: "loading",
                languagesSelect: "languages",
                edit: "edit"
            },
            ajax: {
                info: "https://moonware.de/ajax/extensions/bs/i18n/info",
                langvars: "https://moonware.de/ajax/extensions/bs/i18n/langvars"
            },
            manifest: chrome.runtime.getManifest()
        };

        /**
         * Constructor
         */
        this.run = () => {
            this.opts.elm.wrapper.langvars.addClass(this.opts.classes.hidden);
            initHelpers();
            initHeader();

            this.opts.elm.wrapper.overview.addClass(this.opts.classes.loading);
            loader = this.helper.template.loading().appendTo(this.opts.elm.wrapper.overview);

            this.helper.i18n.init(() => {
                this.helper.template.footer().insertAfter(this.opts.elm.content);
                this.helper.i18n.parseHtml(document);
                this.opts.elm.title.text(this.opts.elm.title.text() + " - " + this.opts.manifest.short_name);
                initOverview();
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
            };
        };

        /**
         * Initialises the language overview
         */
        let initOverview = () => {
            let xhr = new XMLHttpRequest();
            xhr.open("POST", this.opts.ajax.info, true);
            xhr.onload = () => {
                let infos = JSON.parse(xhr.responseText);

                if (infos && infos.languages) {
                    let list = $("<ul />").appendTo(this.opts.elm.wrapper.overview.children("div"));
                    infos.languages.unshift({name: "sw", varsAmount: 111});
                    infos.languages.unshift({name: "pl", varsAmount: 31});
                    infos.languages.unshift({name: "fr", varsAmount: 156});
                    infos.languages.unshift({name: "cs", varsAmount: 179});

                    infos.languages.sort((a, b) => {
                        return b.varsAmount - a.varsAmount;
                    });

                    let missingLanguages = Object.assign({}, this.languages);

                    infos.languages.forEach((lang) => {
                        delete missingLanguages[lang.name];

                        if (this.languages[lang.name]) {
                            let c = Math.PI * 12 * 2;
                            let percentage = lang.varsAmount / infos.varsAmount * 100;

                            // @toDo Info whether draft or released
                            $("<li />")
                                .data("lang", lang.name)
                                .append("<strong>" + this.languages[lang.name] + "</strong>")
                                .append("<a href='#' class='" + this.opts.classes.edit + "' title='" + this.helper.i18n.get("translation_edit") + "'></a>")
                                .append("<svg class=" + this.opts.classes.progress + " width='32' height='32' viewPort='0 0 16 16'><circle r='12' cx='16' cy='16'></circle><circle r='12' cx='16' cy='16' stroke-dashoffset='" + ((100 - percentage) / 100 * c) + "' stroke-dasharray='" + c + "'></circle></svg>")
                                .append("<span class='" + this.opts.classes.progress + "'>" + Math.round(lang.varsAmount / infos.varsAmount * 100) + "%</span>")
                                .appendTo(list);
                        }
                    });

                    let select = $("<select class='" + this.opts.classes.languagesSelect + "' />").appendTo(this.opts.elm.wrapper.overview.children("div"));
                    $("<option value='' />").text("Add language").appendTo(select);

                    Object.keys(missingLanguages).forEach((lang) => {
                        $("<option value='" + lang + "' />").text(this.languages[lang]).appendTo(select);
                    });
                }

                initOverviewEvents();
                setTimeout(() => {
                    loader && loader.remove();
                    this.opts.elm.wrapper.overview.removeClass(this.opts.classes.loading);
                }, 300);
            };
            xhr.send();
        };

        /**
         * Initialises the events for the language overview
         */
        let initOverviewEvents = () => {

            this.opts.elm.wrapper.overview.find("select." + this.opts.classes.languagesSelect).on("change", (e) => {
                let val = e.currentTarget.value;
                console.log(val);
            });

            this.opts.elm.wrapper.overview.find("a." + this.opts.classes.edit).on("click", (e) => {
                e.preventDefault();
                let val = $(e.currentTarget).parent("li").data("lang");
                console.log(val);
            });
        };

    };


    new window.translation().run();

})(jsu);