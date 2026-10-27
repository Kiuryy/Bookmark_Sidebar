module.exports = {
    bookmark_bar: [
        {
            title: "Daily",
            children: [
                {title: "Gmail", url: "https://mail.google.com/"},
                {title: "Google Calendar", url: "https://calendar.google.com/"},
                {title: "Weather", url: "https://weather.com/"},
                {title: "The Guardian", url: "https://www.theguardian.com/"},
                {title: "BBC News", url: "https://www.bbc.com/news"}
            ]
        },
        {
            title: "Development",
            children: [
                {title: "GitHub", url: "https://github.com/"},
                {title: "Stack Overflow", url: "https://stackoverflow.com/"},
                {title: "MDN Web Docs", url: "https://developer.mozilla.org/"},
                {title: "Can I use", url: "https://caniuse.com/"},
                {
                    title: "Extensions",
                    children: [
                        {title: "Chrome Extensions docs", url: "https://developer.chrome.com/docs/extensions"},
                        {title: "Chrome Web Store", url: "https://chromewebstore.google.com/"},
                        {title: "Firefox Add-ons", url: "https://addons.mozilla.org/"}
                    ]
                }
            ]
        },
        {
            title: "Travel",
            children: [
                {title: "Google Maps", url: "https://www.google.com/maps"},
                {title: "Booking.com", url: "https://www.booking.com/"},
                {title: "Airbnb", url: "https://www.airbnb.com/"},
                {title: "Tripadvisor", url: "https://www.tripadvisor.com/"}
            ]
        },
        {
            title: "Recipes",
            children: [
                {title: "Allrecipes", url: "https://www.allrecipes.com/"},
                {title: "BBC Good Food", url: "https://www.bbcgoodfood.com/"},
                {title: "Serious Eats", url: "https://www.seriouseats.com/"}
            ]
        },
        {title: "YouTube", url: "https://www.youtube.com/"},
        {title: "Wikipedia", url: "https://en.wikipedia.org/"},
        {title: "Reddit", url: "https://www.reddit.com/"},
        {title: "Amazon", url: "https://www.amazon.com/"},
        {title: "Spotify", url: "https://open.spotify.com/"},
        {title: "Netflix", url: "https://www.netflix.com/"},
        {
            title: "Videos", // empty folder, for the bookmark checker
            children: []
        }
    ],
    other: [
        {title: "Unsplash", url: "https://unsplash.com/"},
        {title: "Dribbble", url: "https://dribbble.com/"},
        {title: "GitHub", url: "https://github.com/"} // duplicate of Bookmarks bar > Development > GitHub, for the bookmark checker
    ]
};
