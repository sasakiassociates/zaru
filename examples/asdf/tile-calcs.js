let updateCalcs = (currentProps, options) => {
};

const tileCalcs = (store, onCalc) => {

    let running;
    let tileCount = 0;
    let loaded = false;

    const templates = [];

    tileIds.forEach((id, i) => {
        templates.push({size: 256, id: id, url: (x, y, z) => `${tileDir}/asdf-${id}/tile_${x}_${y}_${z}.png`});
    });

    let cnt = 0;

    const calcWorker = new Worker('calcs/offscreen-worker.js');
    const chartWorker = new Worker('chart/offscreen-worker.js');

    let canvasSize = {width: 250, height: 800};
    const $chartCanvas = $('<canvas class="chart-canvas">').attr(canvasSize).appendTo('body');
    const offscreen = $chartCanvas[0].transferControlToOffscreen();

    chartWorker.postMessage({canvas: offscreen, size: canvasSize}, [offscreen]);

    calcWorker.addEventListener('message', function (e) {
        chartWorker.postMessage({tileId: e.data.tileId, totals: e.data.result, currentProps: e.data.currentProps});
    }, false);

    chartWorker.addEventListener('message', function (e) {
        onCalc(e.data.breakPoints);
    }, false);

    const updateImageDataOnWorker = (x, y, z) => {
        const imageDataById = {};
        let tileId = x + '_' + y + '_' + z;
        templates.forEach((template, i) => {
            cnt++;
            let src = template.url(x, y, z);
            if (offscreenCanvasData[src]) {
                imageDataById[template.id] = offscreenCanvasData[src];
            }
        });
        calcWorker.postMessage({type: 'imageData', imageDataById, tileId});
    };

    const runTile = (currentProps, options, x, y, z) => {
        running++;
        let tileId = x + '_' + y + '_' + z;
        runImage(currentProps, options, tileId);
    };

    const offscreenCanvasData = {};
    const runImage = (currentProps, options1, tileId) => {
        const options = JSON.parse(JSON.stringify(options1));
        calcWorker.postMessage({currentProps, options, tileId});
    };

    const ranges = {
        x: [1376, 1378],
        y: [816, 817],
    };

    let loadAllTiles = (callback) => {
        store.status.loading = {total: 0, complete: 0};
        let pending;
        pending = 0;
        const done = () => {
            store.status.loading.complete++;
            if (--pending === 0) {
                store.status.loading = false;
                loaded = true;
                if (callback) callback();
            }
        };
        const loadImage = (src, size) => {
            pending++;
            store.status.loading.total++;
            let img = new Image();
            img.onload = function () {
                const canvas = new OffscreenCanvas(size, size);
                const ctx = canvas.getContext('2d');

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const imgd = ctx.getImageData(0, 0, size, size);
                const data = imgd.data;
                offscreenCanvasData[src] = data;
                done();
                // console.log('Loaded tile: '+src);

            };
            img.onerror = function () {
                console.log('Skipping missing tile: ' + src);
                done();
            };
            img.crossOrigin = "Anonymous";
            img.src = src;
        };
        const loadTile = (x, y, z) => {
            templates.forEach((template, i) => {
                loadImage(template.url(x, y, z), template.size);
            });
        };
        for (let x = ranges.x[0]; x <= ranges.x[1]; x++) {
            for (let y = ranges.y[0]; y <= ranges.y[1]; y++) {
                tileCount++;
                loadTile(x, y, 11);
            }
        }
    };
    //setTimeout(loadAllTiles, 1000);//may not need timeout...

    let next = false;
    // setInterval(() => {
    //     if (!next) return;
    //     console.log('NEXT');
    //     next();
    //     next = false;
    // }, 5000);

    updateCalcs = (currentProps, options) => {
        console.log('UPDATE CALCS');
        console.log(currentProps);
        if (!loaded) {
            loadAllTiles(() => {
                for (let x = ranges.x[0]; x <= ranges.x[1]; x++) {
                    for (let y = ranges.y[0]; y <= ranges.y[1]; y++) {
                        updateImageDataOnWorker(x, y, 11);
                    }
                }
                updateCalcs(currentProps, options);//should only call once after load...
            });
            return;
        }
        next = () => {
            chartWorker.postMessage({working: true});
            for (let x = ranges.x[0]; x <= ranges.x[1]; x++) {
                for (let y = ranges.y[0]; y <= ranges.y[1]; y++) {
                    runTile(currentProps, options, x, y, 11);
                }
            }
        };
        if (options.finished) {
            next();
        }
    };

    return {
        updateChartSettings: ({BreakChartHt, VerticalDensity, Break2025, Break2030}) => {
            chartWorker.postMessage({
                settings: {
                    barCount: BreakChartHt,
                    verticalDensity: VerticalDensity,
                    growthBreaks: {Break2025, Break2030}
                }
            });
        },
        updateVisibility: (visible) => {
            $chartCanvas.toggle(visible);
        }
    };
};
