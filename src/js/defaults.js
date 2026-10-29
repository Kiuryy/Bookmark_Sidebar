($ => {
    "use strict";

    /**
     * Default colors per theme and surface (light/dark), the "default" entry is the fallback for the other themes
     */
    const colors = {
        "default": {
            textColor: {
                light: "#646464",
                dark: "#c8c8c8"
            },
            bookmarksDirColor: {
                light: "#646464",
                dark: "#c8c8c8"
            },
            sidebarMaskColor: {
                light: "rgba(255, 255, 255, 0.8)",
                dark: "rgba(0, 0, 0, 0.6)"
            },
            overlayMaskColor: {
                light: "rgba(0, 0, 0, 0.5)",
                dark: "rgba(0, 0, 0, 0.5)"
            },
            hoverColor: {
                light: "#f5f5f5",
                dark: "#555555"
            },
            colorScheme: {
                light: "#1b82f1",
                dark: "#1f4d80"
            },
            foregroundColor: {
                light: "#ffffff",
                dark: "#333333"
            },
            icon: {
                forLight: "#555555",
                forDark: "#eeeeee"
            }
        },
        glass: {
            sidebarMaskColor: {
                light: "rgba(0, 0, 0, 0)",
                dark: "rgba(0, 0, 0, 0)"
            },
            overlayMaskColor: {
                light: "rgba(255, 255, 255, 0.5)",
                dark: "rgba(0, 0, 0, 0.5)"
            },
            textColor: {
                light: "#444444",
                dark: "#dfdfdf"
            },
            bookmarksDirColor: {
                light: "#444444",
                dark: "#dfdfdf"
            },
            hoverColor: {
                light: "rgba(0, 0, 0, 0.05)",
                dark: "rgba(255, 255, 255, 0.1)"
            }
        },
        soft: {
            colorScheme: { // the counter in the header uses the color scheme as text color, the dark blue is hard to read on the dark background
                light: "#1b82f1",
                dark: "#1b82f1"
            },
            overlayMaskColor: {
                light: "rgba(170, 180, 195, 0.5)",
                dark: "rgba(10, 12, 15, 0.6)"
            },
            textColor: {
                light: "#5a6474",
                dark: "#c9ced6"
            },
            bookmarksDirColor: {
                light: "#5a6474",
                dark: "#c9ced6"
            },
            hoverColor: {
                light: "rgba(0, 0, 0, 0.05)",
                dark: "rgba(255, 255, 255, 0.08)"
            }
        }
    };

    /**
     * Default configuration, keyed by the model aliases (u = utility, b = behaviour, a = appearance, n = newtab)
     */
    const config = {
        u: { // utility -> saved locally
            openStates: {},
            hiddenEntries: {},
            additionalInfo: {},
            scrollPos: 0,
            separators: {},
            customCss: "",
            pinnedEntries: {},
            translationHelp: true,
            translationThanked: false,
            entryAmounts: {},
            linkcheckerIgnored: {},
            lastOpened: null,
            sort: {
                name: "custom",
                dir: "ASC"
            },
            mostViewedPerMonth: false,
            viewAsTree: true
        },
        b: { // behaviour -> synced across devices
            animations: true,
            preventPageScroll: false,
            triggerWidth: 2,
            triggerWidthWindowed: 20,
            triggerHeight: 100,
            triggerOffsetTop: 0,
            blacklist: [],
            whitelist: [],
            mode: "sidepanel",
            sidebarPosition: "left",
            openAction: "mousedown",
            newTab: "foreground",
            newTabPosition: "afterCurrent",
            visibility: "always",
            linkAction: "current",
            dirAccordion: false,
            preventWindowed: false,
            preventWebapp: false,
            rememberState: "openStatesAndPos",
            rememberOpenStatesSubDirectories: true,
            newEntryPosition: "append",
            tooltipDelay: 0.5,
            tooltipContent: "all",
            tooltipAdditionalInfo: true,
            dndCreationDialog: false,
            closeOnTabChange: true,
            openChildrenWarnLimit: 10,
            dirOpenDuration: 0.35,
            scrollBarHide: 1.5,
            openDelay: 0,
            closeTimeout: 1,
            dndOpenDirDelay: 0.5,
            lockPinned: true,
            refocusWebsite: false
        },
        a: { // appearance -> synced across devices
            theme: "default",
            surface: "light",
            highContrast: false,
            directoryArrows: false,
            styles: {
                colorScheme: colors["default"].colorScheme.light,
                foregroundColor: colors["default"].foregroundColor.light,
                textColor: null,
                hoverColor: null,
                indicatorWidth: "24px",
                indicatorIconSize: "24px",
                indicatorIconColor: "#ffffff",
                indicatorColor: "rgba(0,0,0,0.5)",
                iconShape: "bookmark",
                iconColor: "auto",
                sidebarWidth: "350px",
                sidebarHeaderHeight: "50px",
                sidebarMaskColor: null,
                bookmarksFontSize: "14px",
                directoriesIconSize: "16px",
                bookmarksIconSize: "16px",
                bookmarksLineHeight: "38px",
                bookmarksDirIcon: "dir-1",
                bookmarksDirColor: null,
                bookmarksDirIndentation: "25px",
                bookmarksHorizontalPadding: "16px",
                scrollBarWidth: "11px",
                tooltipFontSize: "9px",
                overlayMaskColor: null,
                overlayHeaderHeight: "50px",
                fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif",
                // styles for glass theme
                backgroundTransparency: 0.8,
                backgroundBlur: "7px"
            }
        },
        n: { // new tab -> synced across devices
            faviconShape: "new-1",
            faviconColor: "#545454",
            faviconBackground: "transparent",
            faviconPadding: 10,
            autoOpen: true,
            focusOmnibox: false,
            searchSuggestQueries: true,
            searchSuggestBookmarks: true,
            searchSuggestHistory: false,
            searchField: "show",
            searchEngine: "google",
            searchEngineCustom: {
                title: "",
                homepage: "",
                queryUrl: ""
            },
            gridType: "recentlyUsed",
            gridMaxCols: 4,
            gridMaxRows: 2,
            customGridLinks: [],
            topLinks: [],
            topLinksPosition: "right",
            website: "",
            searchSuggestionNextKeys: ["ArrowDown", "Tab"],
            searchSuggestionPrevKeys: ["ArrowUp", "Tab"]
        }
    };

    $.defaults = {colors: colors, config: config};

})(jsu);
