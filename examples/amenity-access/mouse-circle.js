const mouseCircle = ($canvas, mouseMarker) => {
    const circleSize = 150;
    const circleRad = circleSize / 2;
    mouseMarker.setRadius(circleRad);


    let canvasSize = {width: circleSize, height: circleSize};
    $canvas.attr(canvasSize);

    const ctx = $canvas[0].getContext('2d');

    const {mouseRect, tileRects} = shaderLayer.getTileRects(mouseLatLng, circleSize);

    let $rects = $('#rects');
    $rects.empty();
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    let areaSum = 0;
    tileRects.forEach((r, i) => {
        if (debugMode) {
            $('<div>').text(JSON.stringify(r)).appendTo($rects);
        }
        areaSum += r.rect.width * r.rect.height;
        if (r.textureImages) {
            const img = r.textureImages[0];
            // r.textureImages.forEach((img, i) => {
            const x = circleRad - r.center.x;
            const y = circleRad - r.center.y;
            ctx.drawImage(img, r.rect.x, r.rect.y, r.rect.width, r.rect.height, x, y, r.rect.width, r.rect.height);
        }
    });
    const circles = [
        {x: circleRad, y: circleRad, r: Math.ceil(mouseRect.width / 2)}
    ];
    const imgd = ctx.getImageData(0, 0, canvasSize.width, canvasSize.height);
    const pix = imgd.data;

    const dist = (a, b) => {
        const da = a.x - b.x;
        const db = a.y - b.y;

        return Math.sqrt(da * da + db * db);
    };

    let cnt = 0;
    let total = 0;
    const n = pix.length;
    for (let i = 0; i < n; i += 4) {
        const a = pix[i + 3];
        if (a > 0) {
            const x = (i / 4) % canvasSize.width;
            const y = Math.floor((i / 4) / canvasSize.width);
            let inside = false;
            circles.forEach((c, i) => {
                if (dist(c, {x: x + 0.5, y: y + 0.5}) <= c.r) {
                    inside = true;
                }
            });
            if (!inside) {//just for validation (not prod)
                pix[i] = 255;
                pix[i + 1] = Math.floor(pix[i + 1] / 2);
                pix[i + 2] = Math.floor(pix[i + 2] / 2);
                continue;
            }

            const px = {r: pix[i], g: pix[i + 1], b: pix[i + 2]};
            const val = indexedPngDb.rgbToVal(px) / field.precision;

            total += val;
            cnt++;
        }
    }

    //Note: putImageData not needed for calcs, but this helps visualize for now...
    ctx.putImageData(imgd, 0, 0);

    return total;

};
