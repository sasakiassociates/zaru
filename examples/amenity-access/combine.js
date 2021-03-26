let _$compositeImageCanvas;
const combineMinValue = (ctx, imagesById, ids) => {//NOTE this runs synchronously - we could create more canvases to run in \\
    const w = 256;
    const h = 256;
    if (!_$compositeImageCanvas) {
        _$compositeImageCanvas = $('<canvas class="composite-image-canvas">').attr({width: w, height: h});
        // _$compositeImageCanvas.appendTo('body');
    }
    if (ids.length === 1) {
        const timeGrid = ids[0];
        if (imagesById[timeGrid]) {
            ctx.drawImage(imagesById[timeGrid].image, 0, 0);
            return true;
        }
        return false;
    }

    const ctxDraw = _$compositeImageCanvas[0].getContext("2d");

    const n = 4 * w * h;

    const imageDatas = [];
    ids.forEach((id, i) => {
        if (!imagesById[id]) return;
        ctxDraw.drawImage(imagesById[id].image, 0, 0);
        const imageData = ctxDraw.getImageData(0, 0, w, h).data;
        imageDatas.push(imageData);
    });
    if (imageDatas.length === 0) return false;

    const image1 = ctxDraw.getImageData(0, 0, w, h);
    const imageData1 = image1.data;
    for (let i = 0; i < n; i += 4) {
        let minVal = indexedPngDb.MAX_VALUE;
        imageDatas.forEach((pix, j) => {
            const val = indexedPngDb.rgbToVal({r: pix[i], g: pix[i + 1], b: pix[i + 2]});
            minVal = Math.min(minVal, val);
        });
        const rgb = indexedPngDb.valToRGB(minVal);
        imageData1[i] = rgb[0];
        imageData1[i + 1] = rgb[1];
        imageData1[i + 2] = rgb[2];
        imageData1[i + 3] = 255;


    }

    image1.data = imageData1;
    ctx.putImageData(image1, 0, 0);
    return true;
};

