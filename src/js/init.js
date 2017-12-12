($ => {
    "use strict";

    let opts = {
        ids: {
            page: {
                iframe: "blockbyte-bs-sidebar",
                overlay: "blockbyte-bs-overlay",
                indicator: "blockbyte-bs-indicator"
            },
            sidebar: {
                sidebar: "sidebar",
                shareInfo: "shareInfo",
                reloadInfo: "reloadInfo",
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
                visible: "blockbyte-bs-visible",
                hideMask: "blockbyte-bs-hideMask",
                hover: "blockbyte-bs-hover",
                noscroll: "blockbyte-bs-noscroll",
                hasLeftsideBack: "blockbyte-bs-has-lsb",
                style: "blockbyte-bs-style",
                noAnimations: "noAnimations",
                darkMode: "dark"
            },
            sidebar: {
                extLoaded: "loaded",
                openedOnce: "openedOnce",
                active: "active",
                cached: "cached",
                mark: "mark",
                hideRoot: "hideRoot",
                dirAnimated: "animated",
                dirOpened: "opened",
                bookmarkDir: "dir",
                dirIcon: "icon",
                separator: "separator",
                bookmarkLink: "link",
                bookmarkLabel: "label",
                entryPinned: "pinned",
                menu: "menu",
                sort: "sort",
                hidden: "hidden",
                hover: "hover",
                fixed: "fixed",
                lockPinned: "lockPinned",
                lastHover: "lastHover",
                loading: "loading",
                copied: "copied",
                filterBox: "filter",
                search: "search",
                searchBox: "searchBox",
                searchClose: "searchClose",
                searchVisible: "searchVisible"
            },
            tooltip: {
                wrapper: "tooltip",
                visible: "visible"
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
                dragHover: "dragHover",
                snap: "snap",
                dragInitial: "dragInitial"
            },
            scrollBox: {
                wrapper: "scrollBox",
                scrollbar: "scrollbar",
                inactive: "inactive",
                hideScrollbar: "hideScrollbar",
                hidden: "hidden",
                scrolled: "scrolled"
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
                info: "info",
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
            style: "data-style",
            id: "data-id"
        },
        events: {
            loaded: "blockbyte-bs-loaded",
            sidebarOpened: "blockbyte-bs-sidebar-opened",
            checkboxChanged: "blockbyte-bs-checkbox-changed",
            scrollBoxLastPart: "blockbyte-bs-scrollbox-lastpart",
            lsbLoaded: "blockbyte-lsb-loaded"
        },
        leftsideBackSelector: "div#blockbyte-lsb-indicator.blockbyte-lsb-visible",
        manifest: chrome.runtime.getManifest(),
        demoMode: false
    };

    new window.ext(opts).run();
})(jsu);