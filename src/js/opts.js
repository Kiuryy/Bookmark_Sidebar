($ => {
    "use strict";

    // eslint-disable-next-line no-undef
    $.api = typeof chrome === "undefined" ? browser : chrome;

    $.opts = {
        ids: {
            page: {
                iframe: "redeviation-bs-sidebar",
                overlay: "redeviation-bs-overlay",
                newtab: "redeviation-bs-newtab",
                indicator: "redeviation-bs-indicator"
            },
            sidebar: {
                sidebar: "sidebar",
                reloadInfo: "reloadInfo",
                infoBox: "infoBox",
                bookmarkBox: {
                    all: "bookmarkBox",
                    search: "bookmarkBoxSearch",
                }
            },
            overlay: {
                urlCheckResult: "results"
            }
        },
        classes: {
            active: "active",
            visible: "visible",
            hidden: "hidden",
            success: "success",
            selected: "selected",
            premium: "premium",
            error: "error",
            info: "info",
            close: "close",
            hover: "hover",
            loading: "loading",
            building: "building",
            initLoading: "initLoading",
            page: {
                visible: "redeviation-bs-visible",
                hideMask: "redeviation-bs-hideMask",
                hover: "redeviation-bs-hover",
                noscroll: "redeviation-bs-noscroll",
                hasLeftsideBack: "redeviation-bs-has-lsb",
                style: "redeviation-bs-style",
                fullHeight: "redeviation-bs-fullHeight",
                noAnimations: "noAnimations",
                darkMode: "dark",
                highContrast: "highContrast"
            },
            sidebar: {
                extLoaded: "loaded",
                selectionMode: "selectionMode",
                openedOnce: "openedOnce",
                permanent: "permanent",
                cached: "cached",
                mark: "mark",
                hideRoot: "hideRoot",
                dirAnimated: "animated",
                dirOpened: "opened",
                dirArrow: "has-arrow",
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
                breadcrumb: "breadcrumb",
                removeSelected: "removeSelected",
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
                action: "action",
                progressBar: "progressBar",
                buttonWrapper: "buttons",
                checkUrlProgressLabel: "progressLabel",
                urlCheckLoading: "urlCheckLoading",
                urlCheckCategories: "categories",
                urlCheckAction: "urlCheckAction",
                urlCheckResults: "urlCheckResults"
            },
            newtab: {
                customBackground: "customBackground",
                smallContent: "small",
                suggestions: "suggestions",
                edit: "edit",
                add: "add",
                link: "link",
                editLinkTooltip: "editLinkTooltip",
                permanentSidebar: "permanentSidebar",
                listening: "listening",
                remove: "remove",
                infoBar: "infoBar",
                upload: "upload",
                save: "save",
                cancel: "cancel"
            },
            onboarding: {
                slide: "slide",
                skip: "skip",
                close: "close",
                settings: "settings",
                toggleArea: "toggleArea",
                appearance: "appearance",
                hideOpenTypeIcon: "hideOpenType",
                large: "large"
            },
            settings: {
                tabs: {
                    content: "tab"
                },
                color: {
                    field: "color",
                    mask: "colorMask",
                },
                radio: {
                    wrapper: "radioWrapper"
                },
                newtab: {
                    hideable: "hideable"
                },
                translation: {
                    select: "languageSelect",
                    category: "category",
                    thanks: "thanks",
                    edit: "edit",
                    progress: "progress",
                    mark: "mark",
                    requiredInfo: "requiredInfo",
                    amountInfo: "amountInfo",
                    empty: "empty",
                    back: "back",
                    goto: "goto"
                },
                toggleArea: {
                    preview: "preview",
                    fullHeight: "fullHeight",
                    dragged: "dragged",
                    dragging: "dragging",
                    modal: "toggleAreaModal",
                },
                appearance: {
                    preview: {
                        fullHeight: "redeviation-bs-fullHeight"
                    }
                },
                support: {
                    onlySuggestions: "onlySuggestions",
                    answer: "answer",
                    noHeight: "noHeight",
                    absolute: "absolute"
                },
                inactive: "inactive",
                revert: "revert",
                highlight: "highlight",
                showModal: "showModal",
                lazyloaded: "lazyloaded",
                sub: "sub",
                desc: "desc",
                box: "box",
                dialog: "dialog",
                boxWrapper: "boxWrapper",
                contentBox: "contentBox",
                incomplete: "incomplete",
                suggestion: "suggestion"
            }
        },
        attr: {
            uid: "data-redeviation-bs-uid",
            src: "data-src",
            position: "data-pos",
            type: "data-type",
            name: "data-name",
            value: "data-value",
            theme: "data-theme",
            sort: "data-sort",
            direction: "data-direction",
            style: "data-style",
            id: "data-id",
            i18n: "data-i18n",
            i18nReplaces: "data-i18nReplaces",
            onboarding: {
                openType: "data-openType",
                surface: "data-surface"
            },
            settings: {
                appearance: "data-appearance",
                success: "data-successtext",
                hideOnFalse: "data-hideOnFalse",
                save: "data-save",
                restore: "data-restore",
                range: {
                    min: "data-min",
                    max: "data-max",
                    step: "data-step",
                    unit: "data-unit",
                    infinity: "data-infinity"
                },
                color: {
                    alpha: "data-alpha",
                    suggestions: "data-suggestions"
                },
                field: {
                    placeholder: "data-placeholder"
                },
                translation: {
                    releaseStatus: "data-status",
                    language: "data-lang"
                }
            }
        },
        events: {
            loaded: "redeviation-bs-loaded",
            elementsCreated: "redeviation-bs-created",
            openSidebar: "redeviation-bs-sidebar-open",
            sidebarOpened: "redeviation-bs-sidebar-opened",
            overlayClosed: "redeviation-bs-overlay-closed",
            checkboxChanged: "redeviation-bs-checkbox-changed",
            scrollBoxLastPart: "redeviation-bs-scrollbox-lastpart",
            premiumPurchased: "redeviation-bs-premiumPurchased",
            showFeedbackForm: "redeviation-bs-feedback",
            lsbLoaded: "redeviation-lsb-loaded",
            pageChanged: "redeviation-bs-pageChanged"
        },
        website: {
            info: {
                landing: "https://extensions.redeviation.com/",
                privacyPolicy: "https://extensions.redeviation.com/privacy/bs",
                changelog: "https://extensions.redeviation.com/changelog/bs",
                uninstall: "https://extensions.redeviation.com/uninstall/bs",
            },
            premium: {
                checkout: "https://extensions.redeviation.com/premium/bs/checkout",
                checkLicenseKey: "https://extensions.redeviation.com/ajax/premium/bs/check",
            },
            feedback: {
                form: "https://extensions.redeviation.com/ajax/feedback",
                suggestions: "https://extensions.redeviation.com/ajax/feedback/suggestions"
            },
            translation: {
                info: "https://extensions.redeviation.com/ajax/translation/bs/info",
                langvars: "https://extensions.redeviation.com/ajax/translation/bs/langvars",
                submit: "https://extensions.redeviation.com/ajax/translation/bs/submit"
            },
            api: {
                checkStatus: "https://extensions.redeviation.com/ajax/status/bs",
                evaluate: "https://extensions.redeviation.com/api/evaluate/log",
            }
        },
        urlAliases: {
            Edge: {
                "chrome://newtab/": "edge://newtab/",
                "chrome://bookmarks": "edge://favorites",
                "chrome://extensions/shortcuts": "edge://extensions/shortcuts",
                "chrome://settings/syncSetup": "edge://settings/profiles/sync"
            },
            Opera: {
                "chrome://newtab/": "chrome://startpage/",
                "chrome://bookmarks": "opera://bookmarks",
                "chrome://extensions/shortcuts": "opera://settings/keyboardShortcuts"
            }
        },
        leftsideBackSelector: "div#redeviation-lsb-indicator.redeviation-lsb-visible",
        manifest: $.api.runtime.getManifest(),
        demoMode: false
    };

    $.isDev = $.opts.manifest.version_name === "Dev" || !("update_url" in $.opts.manifest);
    $.copyrightDate = 2016;

    $.browserName = "Chrome";
    if (/EDG\//i.test(navigator.userAgent)) {
        $.browserName = "Edge";
    } else if (/OPERA|OPR\//i.test(navigator.userAgent)) {
        $.browserName = "Opera";
    }

    $.cl = $.opts.classes;
    $.attr = $.opts.attr;
})(jsu);