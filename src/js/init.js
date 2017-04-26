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
                shareUserdata: "shareUserdata",
                bookmarkBox: {
                    all: "bookmarkBox",
                    search: "bookmarkBoxSearch",
                }
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
                openedOnce: "openedOnce",
                active: "active",
                mark: "mark",
                hideRoot: "hideRoot",
                entriesUnlocked: "entriesUnlocked",
                showHidden: "showHidden",
                dirAnimated: "animated",
                dirOpened: "opened",
                bookmarkDir: "dir",
                dirIcon: "icon",
                bookmarkLink: "link",
                bookmarkLabel: "label",
                menu: "menu",
                sort: "sort",
                hidden: "hidden",
                loading: "loading",
                filterBox: "filter",
                search: "search",
                searchBox: "searchBox",
                searchClose: "searchClose",
                searchVisible: "searchVisible",
                shareUserdataNotice: "shareNotice"
            },
            contextmenu: {
                wrapper: "contextmenu",
                top: "top",
                visible: "visible",
                list: "list",
                icons: "icons",
                right: "right",
                separator: "separator"
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
                success: "success",
                progressBar: "progressBar",
                buttonWrapper: "buttons",
                checkUrlProgressLabel: "progressLabel",
                urlCheckLoading: "urlCheckLoading",
                urlCheckList: "urlCheckList"
            }
        },
        attr: {
            src: "data-src",
            position: "data-pos",
            type: "data-type",
            name: "data-name",
            value: "data-value",
            sort: "data-sort",
            direction: "data-direction",
            id: "data-id"
        },
        events: {
            loaded: "moonware-bs-loaded",
            checkboxChanged: "moonware-bs-checkboxChanged",
            scrollBoxLastPart: "moonware-bs-scrollBoxLastPart",
            lsbLoaded: "moonware-lsb-loaded"
        },
        leftsideBackSelector: "div#moonware-lsb-main.moonware-lsb-add-visual",
        fontHref: "https://fonts.googleapis.com/css?family=Roboto:100,200,300,400,500,100i,200i,300i,400i,500i",
        manifest: chrome.runtime.getManifest(),
        demoMode: false
    };


    new window.ext(opts).run();
})(jsu);