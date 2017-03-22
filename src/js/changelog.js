/**
 *
 * @param {jsu} $
 */
($ => {
    "use strict";

    let classes = {
        visible: "visible",
        flipped: "flipped"
    };

    let elm = {
        body: $("body"),
        title: $("head > title"),
        infobox: $("section.infobox"),
        copyright: $("a#copyright"),
        close: $("a.close"),
        showChangelog: $("a.showChangelog")
    };


    /**
     * Initialises the language variables in the document
     */
    let initLanguage = () => {
        let prefix = "changelog_";

        $("[data-i18n]").forEach((elm) => {
            let val = $(elm).attr("data-i18n");
            let key = val.search(/^share_userdata/) === 0 ? val : prefix + val;
            $(elm).html(chrome.i18n.getMessage(key).replace(/\[u\](.*)\[\/u\]/, "<span>$1</span>"));
        });

        let manifest = chrome.runtime.getManifest();
        elm.title.text(elm.title.text() + " - " + manifest.short_name);
    };


    /**
     * Initialises the eventhandlers
     */
    let initEvents = () => {
        elm.close.on("click", (e) => {
            e.preventDefault();
            window.close();
        });

        elm.showChangelog.on("click", (e) => {
            e.preventDefault();
            elm.infobox.addClass(classes.flipped);
        });
    };


    /**
     *
     */
    (() => {
        initLanguage();
        initEvents();

        elm.infobox.addClass(classes.visible);
    })();

})(jsu);