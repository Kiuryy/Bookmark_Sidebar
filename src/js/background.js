try {
    new jsu.Background().run();
} catch (e) {
    console.error("Failed to load service worker");
    console.error(e);
}