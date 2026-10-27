($ => {
    "use strict";

    $.SettingsNewtabHelper = function (s) {

        const faviconPadding = {regular: 18, transparent: 10};

        const recommendedExtensions = [
            {
                name: "Custom New Tab",
                url: {
                    Chrome: "https://chrome.google.com/webstore/detail/lfjnnkckddkopjfgmbcpdiolnmfobflj",
                    Edge: "https://microsoftedge.microsoft.com/addons/detail/mhbdgafkbjagobahdhphkahiejfmchpb"
                },
                icon: "Custom-New-Tab.png"
            },
            {
                name: "New Tab Redirect",
                url: {
                    Chrome: "https://chrome.google.com/webstore/detail/icpgjfneehieebagbmdbhnlpiopdcmna",
                    Edge: "https://microsoftedge.microsoft.com/addons/detail/gjlfnhchoeaikgkpcahljapmloehmldb"
                },
                icon: "New-Tab-Redirect.png"
            },
            {
                name: "Custom New Tab URL",
                url: {
                    Chrome: "https://chromewebstore.google.com/detail/mmjbdbjnoablegbkcklggeknkfcjkjia"
                },
                icon: "Custom-New-Tab-URL.png"
            },
            {
                name: "Custom New Tab URL",
                url: {
                    Edge: "https://microsoftedge.microsoft.com/addons/detail/oeibmbobgpgnbnlbaffdgebpeepfbnhi"
                },
                icon: "Custom-New-Tab-URL-2.png"
            }
        ];

        /**
         * Initialises the new tab tab: the url of the new tab page, the links to open it,
         * the recommended extensions to set it as new tab page and the favicon preview
         */
        this.init = () => {
            const newtabUrl = $.api.runtime.getURL("html/newtab.html");
            $(`section[${$.attr.name}='newtab'] div.url`).text(newtabUrl);

            $(`section[${$.attr.name}='newtab'] div.buttons a.btn`).on("click", (e) => {
                e.preventDefault();
                s.openLink(newtabUrl + ($(e.currentTarget).attr($.attr.name) === "styling" ? "#edit" : ""));
            });

            initExtensionRecommendations($.browserName);
            initFaviconPreview();
        };

        /**
         * Returns the padding of the favicon of the new tab page,
         * a transparent background needs less padding, since the icon can be larger then
         *
         * @param {string} background
         * @returns {number}
         */
        this.getFaviconPadding = (background) => faviconPadding[background === "transparent" ? "transparent" : "regular"];

        /**
         * Fills the extension recommendation list with the entries matching the current browser,
         * falling back to the Chrome suggestions if none are available for it
         *
         * @param {string} browserName
         */
        const initExtensionRecommendations = (browserName) => {
            const wrapper = $(`section[${$.attr.name}='newtab'] section.extension-recommendations`);

            recommendedExtensions.filter(extension => extension.url[browserName]).forEach((extension) => {
                $("<a></a>")
                    .text(extension.name)
                    .attr("href", extension.url[browserName])
                    .attr("target", "_blank")
                    .addClass("btn")
                    .prepend("<img src='" + $.api.runtime.getURL("img/external/" + extension.icon) + "' />")
                    .appendTo(wrapper);
            });

            if (wrapper.children().length() === 0 && browserName !== "Chrome") {
                initExtensionRecommendations("Chrome");
            }
        };

        /**
         * Renders the preview of the favicon of the new tab page and updates it when changing one of the favicon fields
         */
        const initFaviconPreview = () => {
            const elements = s.helper.form.elements;

            const renderPreview = s.helper.iconPreview.create("div.newtab-favicon-preview", () => {
                const background = s.helper.form.getColorValue("faviconBackground", elements.color.faviconBackground[0].value).color;
                return {
                    shape: elements.radio.faviconShape[0].value,
                    color: s.helper.form.getColorValue("faviconColor", elements.color.faviconColor[0].value).color,
                    background: background,
                    padding: this.getFaviconPadding(background)
                };
            });

            [elements.color.faviconColor, elements.color.faviconBackground, elements.radio.faviconShape].forEach((elm) => {
                elm.on("change input", renderPreview);
            });

            renderPreview();
        };
    };

})(jsu);
