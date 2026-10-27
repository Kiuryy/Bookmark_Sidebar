/**
 * Extension settings merged into the storage after the installation (see demo/launch-browser.mjs),
 * uncomment one of the theme blocks to demo the sidebar with the values the settings page stores for that theme
 */
module.exports = {
    sync: {
        demoUserType: "premium", // only used in demo mode: free, pre2018, pre2026 or premium

        behaviour: {
            tooltipDelay: -1,

            // focus theme: no animation when opening/closing folders
            // dirOpenDuration: 0
        },
        appearance: {
            surface: "auto",

            // focus theme: smaller sizes, no sidebar header
            // theme: "focus",
            // styles: {
            //     sidebarHeaderHeight: "0px",
            //     bookmarksFontSize: "12px",
            //     directoriesIconSize: "14px",
            //     bookmarksIconSize: "14px",
            //     bookmarksLineHeight: "26px",
            //     bookmarksDirIndentation: "20px",
            //     bookmarksHorizontalPadding: "10px"
            // }

            // glass theme: transparent, blurred background, higher sidebar header
            // theme: "glass",
            // styles: {
            //     sidebarHeaderHeight: "60px",
            //     backgroundTransparency: 0.8,
            //     backgroundBlur: "7px"
            // }

            // soft theme: soft shadows, floating semi-transparent header with separate buttons
            // theme: "soft",
            // styles: {
            //     sidebarHeaderHeight: "60px",
            //     bookmarksLineHeight: "36px",
            //     bookmarksHorizontalPadding: "14px"
            // }
        }
    },
    local: {
        utility: {}
    }
};
