const runCalculations = (gridId) => {
    const images = {};

    //TODO optimization: support multiple time grids with the same spatial canvas (current this is repeated for each new time grid)
    const canvasSizeSpatial = {width: 256, height: 256};
    const $canvasSpatial = $(`<canvas id="calc-canvas-spatial-${gridId}">`).attr(canvasSizeSpatial).appendTo('body');
    const canvasSpatial = $canvasSpatial[0];
    const ctxSpatial = canvasSpatial.getContext('2d');

    const canvasSizeTimes = {width: 256, height: 256};
    const $canvasTimes = $(`<canvas id="calc-canvas-time-${gridId}">`).attr(canvasSizeTimes).appendTo('body');
    const canvasTimes = $canvasTimes[0];
    const ctxTimes = canvasTimes.getContext('2d');

    const canvasSizeVal = {width: 256, height: 256};
    const $canvasVal = $(`<canvas id="calc-canvas-time-${gridId}">`).attr(canvasSizeVal).appendTo('body');
    const canvasVal = $canvasVal[0];
    const ctxVal = canvasVal.getContext('2d');

    const loadImages = (zoom, tileBounds, valTiles, spatialTiles, timeGrid, callback) => {
        let tasks = 0;
        const loadImage = (url) => {
            tasks++;
            const image = new Image();
            image.onload = function () {
                if (--tasks === 0) {
                    callback();
                }
            };
            image.onerror = function () {
                image._loadFailed = true;
                if (--tasks === 0) {
                    callback();
                }
            };
            image.src = url;

            return image;
        };

        for (let x = tileBounds.min.x; x <= tileBounds.max.x; x++) {
            for (let y = tileBounds.min.y; y <= tileBounds.max.y; y++) {
                images[`${x}_${y}`] = {
                    val: loadImage(replaceTemplate(valTiles.url, {x: x, y: y, z: valTiles.zoom})),
                    spatial: loadImage(replaceTemplate(spatialTiles.url, {x: x, y: y, z: spatialTiles.zoom})),
                    timeGrid: loadImage(replaceTemplate(timeGrid.url, {x: x, y: y, z: timeGrid.zoom})),
                };
            }
        }
    };

    const replaceTemplate = (str, obj) => {
        Object.keys(obj).forEach((k) => {
            str = str.replace('{' + k + '}', obj[k]);
        });
        return str;
    };
    return (indexedPngDb, zoom, tileBounds, valTiles, spatialTiles, timeGrid, timeGridId) => {
        //loop through tile bounds
        //load images for spatial tiles and timeGrid
        //for each start / stop, iterate through all records (in db.records) and set record "time" property

        loadImages(zoom, tileBounds, valTiles, spatialTiles, timeGrid, () => {
            for (let tx = tileBounds.min.x; tx <= tileBounds.max.x; tx++) {
                for (let ty = tileBounds.min.y; ty <= tileBounds.max.y; ty++) {
                    canvasSpatial.width = canvasSpatial.width;
                    canvasTimes.width = canvasTimes.width;
                    canvasVal.width = canvasVal.width;

                    let tileSet = images[`${tx}_${ty}`];
                    if (!tileSet.spatial._loadFailed) ctxSpatial.drawImage(tileSet.spatial, 0, 0);
                    if (!tileSet.timeGrid._loadFailed) ctxTimes.drawImage(tileSet.timeGrid, 0, 0);
                    if (!tileSet.val._loadFailed) ctxVal.drawImage(tileSet.val, 0, 0);

                    const pix1 = ctxSpatial.getImageData(0, 0, canvasSizeSpatial.width, canvasSizeSpatial.height).data;
                    let n = pix1.length;

                    const pix2 = ctxTimes.getImageData(0, 0, canvasSizeTimes.width, canvasSizeTimes.height).data;
                    const pix3 = ctxVal.getImageData(0, 0, canvasSizeVal.width, canvasSizeVal.height).data;

                    for (let i = 0; i < n; i += 4) {
                        const px = {r: pix1[i], g: pix1[i + 1], b: pix1[i + 2]};
                        if (px.r > 0 || px.g > 0 || px.b > 0) {
                            const x = (i / 4) % canvasSizeTimes.width;
                            const y = Math.floor((i / 4) / canvasSizeTimes.width);

                        }
                    }

                }
            }
        });


    };
};

