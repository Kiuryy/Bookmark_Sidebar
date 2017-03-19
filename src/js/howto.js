/**
 *
 * @param {jsu} $
 */
($ => {
    "use strict";

    let elm = {
        body: $("body"),
        title: $("head > title"),
        copyright: $("a#copyright")
    };


    /**
     * Initialises the language variables in the document
     */
    let initLanguage = () => {
        $("[data-i18n]").forEach((elm) => {
            let val = $(elm).attr("data-i18n");
            let key = val.search(/^share_userdata/) === 0 ? val : "howto_" + val;
            $(elm).html(chrome.i18n.getMessage(key).replace(/\[u\](.*)\[\/u\]/, "<span>$1</span>"));
        });

        let manifest = chrome.runtime.getManifest();
        elm.title.text(elm.title.text() + " - " + manifest.short_name);
    };


    /**
     *
     */
    (() => {
        let createdDate = +elm.copyright.children("span.created").text();
        let currentYear = new Date().getFullYear();

        if (currentYear > createdDate) {
            elm.copyright.children("span.created").text(createdDate + " - " + currentYear);
        }

        initLanguage();
    })();

})(jsu);