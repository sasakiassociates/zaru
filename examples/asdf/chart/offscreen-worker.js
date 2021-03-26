importScripts("chartRender.js");

const tileTotals = {};

let offscreenCanvas;
let lastProps;
let canvasSize;
let ctx;
let settings;

const updateChart = (info) => {
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#f9f9ff';
    ctx.fillText(info, 10, 20);
};

const updateOutputs = (currentProps) => {
    lastProps = currentProps;
    const grandTotals = {allValues: [], sums: {}};
    Object.keys(tileTotals).forEach((k) => {
        const tileTotal = tileTotals[k];
        Object.keys(tileTotal.sums).forEach((k) => {
            if (tileTotal.sums[k] instanceof Object) {
                if (!grandTotals.sums[k]) grandTotals.sums[k] = {};
                Object.keys(tileTotal.sums[k]).forEach((j) => {
                    if (!grandTotals.sums[k][j]) grandTotals.sums[k][j] = 0;
                    grandTotals.sums[k][j] += tileTotal.sums[k][j];
                });
            } else {
                if (!grandTotals.sums[k]) grandTotals.sums[k] = 0;
                grandTotals.sums[k] += tileTotal.sums[k];
            }
        });
        [].push.apply(grandTotals.allValues, tileTotal.values);
    });
    grandTotals.allValues.sort((a, b) => b - a);
    //console.log('CW> ' + grandTotals.allValues.length + ': median = ' + grandTotals.allValues[Math.floor(grandTotals.allValues.length / 2)]);
    //updateBar(grandTotals);
    return renderChart(ctx, grandTotals, canvasSize, settings, currentProps);
    // updateChart('CW> ' + grandTotals.allValues.length + ': median = ' + grandTotals.allValues[Math.floor(grandTotals.allValues.length / 2)]);
};

self.addEventListener('message', function (e) {
    if (e.data.canvas) {
        offscreenCanvas = e.data.canvas;
        canvasSize = e.data.size;
        ctx = offscreenCanvas.getContext('2d');
        return;
    }
    if (e.data.settings) {
        settings = e.data.settings;
        const breakPoints = redraw(ctx, canvasSize.width, canvasSize.height, settings, lastProps);
        self.postMessage({breakPoints});
        return;
    }
    if (e.data.working) {
        updateChart('Working...');
        return;
    }
    const {tileId, totals, currentProps} = e.data;
    tileTotals[tileId] = totals;
    const breakPoints = updateOutputs(currentProps);
    self.postMessage({breakPoints});
}, false);
