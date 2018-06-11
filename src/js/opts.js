($ => {
    "use strict";

    $.opts = {
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
            general: {
                active: "active",
                visible: "visible",
                hidden: "hidden",
                success: "success",
                error: "error",
                close: "close",
                hover: "hover",
                loading: "loading",
                building: "building",
                initLoading: "initLoading",
            },
            page: {
                visible: "blockbyte-bs-visible",
                hideMask: "blockbyte-bs-hideMask",
                hover: "blockbyte-bs-hover",
                noscroll: "blockbyte-bs-noscroll",
                hasLeftsideBack: "blockbyte-bs-has-lsb",
                style: "blockbyte-bs-style",
                fullHeight: "blockbyte-bs-fullHeight",
                noAnimations: "noAnimations",
                darkMode: "dark",
                highContrast: "highContrast"
            },
            sidebar: {
                extLoaded: "loaded",
                openedOnce: "openedOnce",
                permanent: "permanent",
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
                fixed: "fixed",
                lockPinned: "lockPinned",
                lastHover: "lastHover",
                copied: "copied",
                filterBox: "filter",
                search: "search",
                searchBox: "searchBox",
                searchClose: "searchClose",
                searchVisible: "searchVisible",
                removeMask: "removeMask",
                removed: "removed",
                restored: "restored"
            },
            tooltip: {
                wrapper: "tooltip"
            },
            contextmenu: {
                wrapper: "contextmenu",
                top: "top",
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
                hideScrollbar: "hideScrollbar",
                scrolled: "scrolled"
            },
            checkbox: {
                box: "checkbox",
                clicked: "clicked",
                focus: "focus"
            },
            overlay: {
                modal: "modal",
                preview: "preview",
                previewUrl: "previewUrl",
                info: "info",
                action: "action",
                progressBar: "progressBar",
                buttonWrapper: "buttons",
                checkUrlProgressLabel: "progressLabel",
                urlCheckLoading: "urlCheckLoading",
                urlCheckList: "urlCheckList"
            },
            newtab: {
                smallContent: "small",
                chromeApps: "chromeApps",
                suggestions: "suggestions",
                edit: "edit",
                add: "add",
                link: "link",
                permanentSidebar: "permanentSidebar",
                remove: "remove",
                infoBar: "infoBar",
                save: "save",
                cancel: "cancel"
            }
        },
        attr: {
            uid: "data-blockbyte-bs-uid",
            src: "data-src",
            position: "data-pos",
            type: "data-type",
            name: "data-name",
            value: "data-value",
            sort: "data-sort",
            direction: "data-direction",
            style: "data-style",
            id: "data-id",
            newtab: {
                perRow: "data-perRow",
            }
        },
        events: {
            loaded: "blockbyte-bs-loaded",
            elementsCreated: "blockbyte-bs-created",
            openSidebar: "blockbyte-bs-sidebar-open",
            sidebarOpened: "blockbyte-bs-sidebar-opened",
            checkboxChanged: "blockbyte-bs-checkbox-changed",
            scrollBoxLastPart: "blockbyte-bs-scrollbox-lastpart",
            lsbLoaded: "blockbyte-lsb-loaded"
        },
        leftsideBackSelector: "div#blockbyte-lsb-indicator.blockbyte-lsb-visible",
        manifest: chrome.runtime.getManifest(),
        demoMode: false
    };

    $.cl = $.opts.classes;
    $.attr = $.opts.attr;
})(jsu);