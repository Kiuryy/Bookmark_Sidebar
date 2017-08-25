($ => {
    "use strict";

    window.IconHelper = function (b) {

        this.init = () => {
            return new Promise((resolve) => {
                chrome.storage.sync.get(["appearance"], (obj) => {
                    let shape = "bookmark";
                    let color = "rgb(85,85,85)";

                    if (obj && obj.appearance) {

                        if (obj.appearance.iconShape) {
                            shape = obj.appearance.iconShape;
                        }

                        if (obj.appearance.iconColor) {
                            color = obj.appearance.iconColor;
                        }
                    }

                    if (shape !== "logo") {
                        this.set(shape, color);
                    }
                    resolve();
                });
            });
        };


        this.set = (name, color) => {
            return new Promise((resolve) => {
                let canvas = document.createElement("canvas");
                let size = 128;
                canvas.width = size;
                canvas.height = size;
                let ctx = canvas.getContext('2d');

                $.xhr(chrome.extension.getURL("img/icon/menu/icon-" + name + ".svg")).then((obj) => {
                    let svg = obj.responseText;
                    svg = svg.replace(/\#000/, color);

                    let img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, size, size);

                        chrome.browserAction.setIcon({
                            imageData: ctx.getImageData(0, 0, size, size)
                        });

                        resolve();
                    };
                    img.src = "data:image/svg+xml;charset=utf-8," + svg;
                });
            });
        };


    };

})(jsu);