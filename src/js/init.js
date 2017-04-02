($ => {
    "use strict";

    let opts = {
        ids: {
            page: {
                iframe: "moonware-bs-sidebar",
                overlay: "moonware-bs-overlay",
                visual: "moonware-bs-visual"
            },
            sidebar: {
                sidebar: "sidebar",
                bookmarkBox: "bookmarkBox",
                bookmarkBoxSearch: "bookmarkBoxSearch",
                shareUserdata: "shareUserdata"
            },
            overlay: {
                urlList: "urlList"
            }
        },
        classes: {
            page: {
                addVisual: "moonware-bs-add-visual",
                visible: "moonware-bs-visible",
                hover: "moonware-bs-hover",
                hasLeftsideBack: "moonware-bs-has-lsb"
            },
            sidebar: {
                extLoaded: "loaded",
                active: "active",
                entriesUnlocked: "entriesUnlocked",
                dirAnimated: "animated",
                dirOpened: "opened",
                bookmarkDir: "dir",
                bookmarkLink: "link",
                bookmarkLabel: "label",
                settings: "settings",
                search: "search",
                searchBox: "searchBox",
                searchClose: "searchClose",
                searchVisible: "searchVisible",
                searchLoading: "searchLoading",
                shareUserdataNotice: "shareNotice",
                shareUserdataHidden: "hidden"
            },
            contextmenu: {
                wrapper: "contextmenu",
                top: "top",
                visible: "visible",
            },
            drag: {
                trigger: "drag",
                helper: "dragHelper",
                isDragged: "isDragged",
                cancel: "dragCancel",
                snap: "snap",
                dragInitial: "dragInitial"
            },
            scrollBox: {
                wrapper: "scrollBox",
                scrollbar: "scrollbar",
                inactive: "inactive",
                hidden: "hidden",
                scrolled: "scrolled",
                scrolledEnd: "scrolledEnd",
                scrollDrag: "scrollDrag",
                scrollTrackpad: "scrollTrackpad"
            },
            checkbox: {
                box: "checkbox",
                active: "active",
                clicked: "clicked",
                focus: "focus"
            },
            overlay: {
                modal: "modal",
                visible: "visible",
                preview: "preview",
                previewUrl: "previewUrl",
                action: "action",
                close: "close",
                hasTooltip: "tooltip",
                inputError: "error",
                progressBar: "progressBar",
                checkUrlProgressLabel: "progressLabel",
                urlCheckLoading: "urlCheckLoading",
                urlCheckFinished: "urlCheckFinished"
            }
        },
        attr: {
            src: "data-src",
            position: "data-pos",
            type: "data-type",
            id: "data-id"
        },
        events: {
            loaded: "moonware-bs-loaded",
            lsbLoaded: "moonware-lsb-loaded"
        },
        leftsideBackSelector: "div#moonware-lsb-main.moonware-lsb-add-visual",
        fontHref: "https://fonts.googleapis.com/css?family=Roboto:100,300,500,100i,300i,500i",
        manifest: chrome.runtime.getManifest(),
        demoMode: false
    };


    new window.ext(opts).run();
})(jsu);