($ => {
    "use strict";

    $.SettingsLinksHelper = function (s) {

        /**
         * Initialises the static links of the page, which either open an external page or one of the dialogs
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initKnowledgebaseLinks();
            initPageLinks();
            await initInfoLinks();
        };

        /**
         * Opens the linked knowledge base pages when clicking the links of the teasers in the overview tab or in the dialogs,
         * and the details links of the two modes in the settings tab,
         * the links in the share information dialog and below the custom css field are part of a language variable and get recreated with each parse,
         * so the listener is bound to the surrounding paragraph and only reacts to clicks on the link inside
         */
        const initKnowledgebaseLinks = () => {
            const links = {
                "a.knowledgebase-link": $.opts.website.knowledgebase.overview,
                "a.support-link": $.opts.website.knowledgebase.support,
                "p.share-info-link": $.opts.website.knowledgebase.shareData,
                "p.custom-css-link": $.opts.website.knowledgebase.customCss,
                [`div.col.mode[${$.attr.name}='overlay'] a.btn.external`]: $.opts.website.knowledgebase.overlayMode,
                [`div.col.mode[${$.attr.name}='sidepanel'] a.btn.external`]: $.opts.website.knowledgebase.sidepanelMode
            };

            Object.entries(links).forEach(([selector, href]) => {
                $(selector).on("click", (e) => {
                    if (!e.target.closest("a")) {
                        return;
                    }

                    e.preventDefault();
                    s.openLink(href);
                });
            });
        };

        /**
         * Initialises the links to other pages of the extension and to the browser settings,
         * and the link of the teaser in the overview tab, which opens the dialog about sharing information
         */
        const initPageLinks = () => {
            const links = {
                "div.translation-cta a.translate": $.api.runtime.getURL("html/translations.html"),
                ".btn.sidepanel-position": "chrome://settings/appearance#:~:text=Side%20panel",
                ".btn.keyboard-shortcut": "chrome://extensions/shortcuts"
            };

            Object.entries(links).forEach(([selector, href]) => {
                $(selector).on("click", (e) => {
                    e.preventDefault();
                    s.openLink(href);
                });
            });

            $("a.share-link").on("click", (e) => {
                e.preventDefault();
                s.helper.dialog.open("share-info");
            });
        };

        /**
         * Initialises the links to the privacy policy, the permissions article, the changelog and the import/export dialog in the overview tab,
         * the changelog link shows the current version and the date of the last update
         *
         * @returns {Promise}
         */
        const initInfoLinks = async () => {
            const wrapper = $(`div.${$.cl.settings.infoLinks.wrapper}`);
            const version = $.opts.demoMode ? $.opts.manifest.version : ($.opts.manifest.version_name || $.opts.manifest.version);
            wrapper.find(`span.${$.cl.settings.infoLinks.version}`).text(version);

            const lastUpdateDate = await s.helper.model.call("lastUpdateDate");
            if (lastUpdateDate) { // keep the i18n attributes, so the text gets updated when the language is changed
                const date = s.helper.i18n.getLocaleDate(lastUpdateDate);
                wrapper.find(`span.${$.cl.settings.infoLinks.lastUpdate}`)
                    .attr($.attr.i18n, "extension_last_update")
                    .attr($.attr.i18nReplaces, date)
                    .text(s.helper.i18n.get("extension_last_update", [date]));
            }

            wrapper.find(`a[${$.attr.name}]`).on("click", (e) => {
                e.preventDefault();
                const name = $(e.currentTarget).attr($.attr.name);

                if (name === "importExport") {
                    s.helper.dialog.open("import-export");
                } else if (name === "permissions") {
                    s.openLink($.opts.website.knowledgebase.permissions);
                } else { // privacyPolicy and changelog are known to the background script by name
                    s.helper.model.call("openLink", {
                        hrefName: name,
                        newTab: true,
                        active: true,
                        params: {lang: s.helper.i18n.getLanguage()}
                    });
                }
            });
        };
    };

})(jsu);
