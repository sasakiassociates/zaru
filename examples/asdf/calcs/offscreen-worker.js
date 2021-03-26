importScripts("pixelCounts.js");

const imageDataByTileId = {};
self.addEventListener('message', function (e) {
    if (e.data.type === 'imageData') {
        const {imageDataById, tileId} = e.data;
        imageDataByTileId[tileId] = imageDataById;
    } else {
        const {currentProps, options, tileId} = e.data;
        processImages(imageDataByTileId[tileId], currentProps, options, (val) => {
            self.postMessage({tileId: tileId, result: val, currentProps});
        });
    }
}, false);
