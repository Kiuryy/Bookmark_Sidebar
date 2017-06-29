(() => {
    "use strict";

    global.path = {
        src: "src/",
        dist: "dist/",
        tmp: "tmp/"
    };

    require('./_func');
    require('./_build');

    console.log("Building release...");

    let start = +new Date();
    build.release().then(() => {
        console.log("Release built successfully (" + (+new Date() - start) + "ms)")
    });

    // Update devDependencies -> ncu -a
    // SCSS Filewatcher -> <PATH_TO_GLOBAL_NPM>/npm/node-sass.cmd --source-map true -o src/css src/scss
})();

