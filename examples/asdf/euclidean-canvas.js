const pointLineDist = ({x, y}, {x1, y1, x2, y2}) => {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) //in case of 0 length line
        param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
};
const dist = (x1, y1, x2, y2) => {
    let dx = x2 - x1;
    let dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
};
const toNorm = (latLng, {tileCenter, tileCorner}) => {
    const w = 2 * (tileCenter.lng - tileCorner.lng);
    const h = 2 * (tileCenter.lat - tileCorner.lat);
    return {
        x: (latLng.lng - tileCorner.lng) / w,
        y: (latLng.lat - tileCorner.lat) / h,
    }
};
const getPoint = (latLng, tileInfo) => {
    const pt = toNorm(latLng, tileInfo);
    return {
        type: 'point', distanceTo: (px) => {
            return dist(pt.x, pt.y, px.x, px.y) * tileInfo.toM;
        }
    };
};
const pngDb = pngDbEncodings();
let coordsToLatLng;

const getSegment = (latLngA, latLngB, tileInfo) => {
    const normA = toNorm(latLngA, tileInfo);
    const normB = toNorm(latLngB, tileInfo);

    const segment = {
        x1: normA.x,
        y1: normA.y,
        x2: normB.x,
        y2: normB.y,
    };
    return {
        type: 'segment', distanceTo: (px) => {
            return pointLineDist(px, segment) * tileInfo.toM;
        }
    }
};
const drawnItems = new L.FeatureGroup();

const setupDrawingMode = (map) => {

    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
        draw: {
            rectangle: false,
            polygon: false,
            circle: false,
            circlemarker: false
        },
        edit: {
            featureGroup: drawnItems
        }
    });
    map.addControl(drawControl);
    map.on(L.Draw.Event.CREATED, function (event) {
        const layer = event.layer;
        layer.options.metaData = {distance: 2000, layerType: event.layerType === 'marker' ? 'node' : 'corridor'};
        drawnItems.addLayer(layer);
        _euclideanCanvasRender.render(true);
    });
    map.on(L.Draw.Event.EDITED, function (event) {
        _euclideanCanvasRender.render(true);
    });

    coordsToLatLng = (x, y, z) => {
        const point = L.point(x * 256, y * 256);
        return map.unproject(point, z)
    };
};

const renderCanvas = ({tile, ctx, coords}) => {
    if (!coordsToLatLng) return;
    console.log('RENDERCANVAS');
    const width = 256;
    ctx.clearRect(0, 0, width * 2, width * 2);
    // ctx.fillStyle = 'white';
    // ctx.fillRect(20, 20, 100, 100);
    const pointsInReach = [];

    const tileCorner = coordsToLatLng(coords.x, coords.y, coords.z);
    const tileCenter = coordsToLatLng(coords.x + 0.5, coords.y + 0.5, coords.z);
    const tileDiagonalDist = tileCenter.distanceTo(tileCorner);
    const tileMaxDist = tileDiagonalDist;
    const toM = tileDiagonalDist / (Math.sqrt(2) / 2);
    // const maxReach = maxReachM * toM;

    const center = {x: 0.5, y: 0.5};

    const tileInfo = {coords, tileCenter, tileCorner, tileMaxDist, toM};

    drawnItems.eachLayer(function (layer) {
        if (!layer.getLatLng && !layer.getLatLngs) return;
        if (layer.getLatLng) {
            const {distance, layerType} = layer.options.metaData;
            const pt = getPoint(layer.getLatLng(), tileInfo);

            //the furthest point that could show up would be on the diagonal to the corner of the tile
            if (pt.distanceTo(center) < distance + tileMaxDist) {
                pointsInReach.push({elem: pt, distance, layerType});
            }
        } else if (layer.getLatLngs) {
            const {distance, layerType} = layer.options.metaData;
            let latLngs = layer.getLatLngs();
            //break into segments and render individually
            for (let i = 0; i < latLngs.length - 1; i++) {
                const latLngA = latLngs[i];
                const latLngB = latLngs[i + 1];
                const segment = getSegment(latLngA, latLngB, tileInfo);
                if (segment.distanceTo(center) < distance + tileMaxDist) {
                    pointsInReach.push({elem: segment, distance, layerType});
                }
            }
        }
    });

    const minDist = (x, y, layerTypeFilter) => {
        let minDist = Number.MAX_VALUE;
        if (pointsInReach.length === 0) {
            return -1;
        }
        const pixelPt = {x: x / 256, y: y / 256};
        let maxDist = 2000;
        pointsInReach.forEach(({elem, distance, layerType}, i) => {
            if (layerTypeFilter !== layerType) return;
            let d = elem.distanceTo(pixelPt);
            if (d <= distance) {
                minDist = Math.min(minDist, d);
            }
        });
        if (minDist > maxDist) return -1;
        return minDist;
    };

    const layerTypes = ['corridor', 'node'];

    layerTypes.forEach((type, idx) => {
        let layerType = layerTypes[idx];
        const xPos = idx * width;
        const yPos = 0;
        // const imageData = ctx.getImageData(xPos, yPos, width, width);
        const imageData = ctx.createImageData(width, width);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            let pos = i / 4;
            const dist = minDist(pos % width, Math.floor(pos / width), layerType);
            const {r, g, b} = (dist < 0) ? {r: 255, g: 255, b: 255} : pngDb.valueToEncoded({}, dist);
            data[i] = r; // red
            data[i + 1] = g; // green
            data[i + 2] = b; // blue
            data[i + 3] = 255;// alpha
        }

        ctx.putImageData(imageData, xPos, yPos);
    });

    return true;
};
