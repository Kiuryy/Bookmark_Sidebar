($ => {
    "use strict";

    let opts = {
        ids: {
            page: {
                iframe: "blockbyte-bs-sidebar",
                overlay: "blockbyte-bs-overlay",
                visual: "blockbyte-bs-visual"
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
                addVisual: "blockbyte-bs-add-visual",
                visible: "blockbyte-bs-visible",
                hover: "blockbyte-bs-hover",
                hasLeftsideBack: "blockbyte-bs-has-lsb"
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
                hover: "hover",
                loading: "loading",
                copied: "copied",
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
            dragCancel: "data-dragCancel",
            id: "data-id"
        },
        events: {
            loaded: "blockbyte-bs-loaded",
            checkboxChanged: "blockbyte-bs-checkboxChanged",
            scrollBoxLastPart: "blockbyte-bs-scrollBoxLastPart",
            lsbLoaded: "blockbyte-lsb-loaded"
        },
        leftsideBackSelector: "div#blockbyte-lsb-main.blockbyte-lsb-add-visual",
        fontHref: "https://fonts.googleapis.com/css?family=Roboto:100,200,300,400,500,100i,200i,300i,400i,500i",
        manifest: chrome.runtime.getManifest(),
        demoMode: false
    };


    new window.ext(opts).run();
})(jsu);