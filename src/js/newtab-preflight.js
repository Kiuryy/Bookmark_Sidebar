window.cachedKeys = [];
document.addEventListener("keypress", (e) => {
    window.cachedKeys.push(e.key);
});