let shaderLayer;
let dotDensityShader;

const tileDir = 'http://tiles.sasaki.com/data/amenity-access';

const debugMode = true;
let mobileMode = false;
let _activeTimeIds = [];

let mapOptions = {
    minZoom: 13,
    maxZoom: 17
};
let startCenter = [33.758678, -84.397274];

const _listView = listView();

function hexToArr(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
    ] : null;
}

//endregion

const tileSize = 256;

const $reachCounts = $('<div class="reach-counts">').appendTo('body');//.toggle(debugMode);
const $legend = $('<div class="legend">').appendTo('body');
const $minutes = $('<div class="time-info">').appendTo('body');

const map = L.map('map', {fadeAnimation: false}).setView(startCenter, 13);
// const basemap = L.tileLayer('https://api.mapbox.com/styles/v1/bradrbarnett/cj7d98skc0o502sln1io8j0sa/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYnJhZHJiYXJuZXR0IiwiYSI6ImNqNGJhYnR6NjA4N2MzMnFwOWs2NjZ5ZzUifQ.ZtaKJSasjfx5Pl5D3raQkQ', {
//     maxZoom: 19,
//     attribution: 'Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
// }).addTo(map);

if (!transparentOverlayMap) {
    L.tileLayer('https://api.mapbox.com/styles/v1/tadiraman/cjz92acg8491i1cp84b3lb82o/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoidGFkaXJhbWFuIiwiYSI6IktzUnNGa28ifQ.PY_hnRMhS94SZmIR2AIgug', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
    }).addTo(map);
}
const addGeoJson = (cat, file, color, label) => {
    var geojsonMarkerOptions = {
        radius: 3.5,
        fillColor: color,
        color: "#000",
        weight: 0.5,
        opacity: 1,
        fillOpacity: 0.8
    };

    let geoJsonLayer;

    $.ajax({
        dataType: "json",
        url: file,
        success: function (data) {
            geoJsonLayer = L.geoJSON(data.features, {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, geojsonMarkerOptions);
                }
            }).addTo(map);
        }
    });

    const $legendItem = $('<div class="legend-item">').appendTo($legend);
    const $dot = $('<div class="legend-item-dot">').css({background: color}).appendTo($legendItem);

    $legendItem.click(() => {
        props.Layers[cat] = !props.Layers[cat];
        _setActiveTimeId(props.Layers);
        updateFn();
    });

    $('<div class="legend-item-label">').text(label).appendTo($legendItem);

    $dot.data('update', () => {
        $dot.css({background: props.Layers[cat] ? color : '#333333'});
        if (props.Layers[cat]) {
            map.addLayer(geoJsonLayer);
        } else {
            map.removeLayer(geoJsonLayer);
        }
    });
};


addGeoJson('basketball', './data/geojson/basketball.geojson', "#de9249", 'Basketball Courts');
addGeoJson('playgrounds', './data/geojson/playgrounds.geojson', "#59ccdc", 'Playgrounds');
addGeoJson('tennis', './data/geojson/tennis.geojson', "#becd5c", 'Tennis Courts');

if (mobileMode) {
    $('#mouse-over-info').hide();
}

const population = 'http://s3.amazonaws.com/tiles.sasaki.com/raster/tmp/population';

// const population = 'http://tiles.sasaki.com/raster/population';

function logEvent(e) {
    console.log(e.type);
}

let _timeGridCanvasRender = {
    urls: [],
    render: (neededOverride) => {
        if (!_timeGridCanvasRender.canvasSets) return;
        Object.keys(_timeGridCanvasRender.canvasSets).forEach((tileId) => {
            const canvasSet = _timeGridCanvasRender.canvasSets[tileId];
            if (canvasSet.needsRender || neededOverride) {
                console.log('*** RERENDER ' + tileId, canvasSet.needsRender, neededOverride);
                canvasSet.needsRender = false;
                // console.log(_timeGridCanvasRender.canvasSets);
                const ctx = canvasSet.canvas.getContext('2d');
                //TODO upper level canvas with combined min values should be shared between tile canvases
                if (combineMinValue(ctx, canvasSet.images, _activeTimeIds)) {
                    canvasSet.needsUpdate = true;//generate new texture for regl
                }
            }
        });
        if (shaderLayer) shaderLayer.renderAll();
    },
    onLoad: () => {
        Object.keys(_timeGridCanvasRender.canvasSets).forEach((tileId) => {
            const canvasSet = _timeGridCanvasRender.canvasSets[tileId];
            // $(canvasSet.canvas).appendTo('body');
        });
        _timeGridCanvasRender.render(false);

    }
};
let _orderedCategories = ['population'];//TODO
dotDensityShader = _dotDensityShader();

const limits = [{zoom: 13}];
const tileUrls = [`${population}/{z}/{x}/{y}.png`];
timeGrids.forEach((timeGrid, i) => {
    // limits.push({zoom: tileGridZoom});
    _timeGridCanvasRender.urls[timeGrid] = `./data/time-grid/${timeGrid}/{x}_{y}_{z}.png`;
    // tileUrls.push(`./data/time-grid/${timeGrid}/{x}_{y}_{z}.png`);
});
limits.push({zoom: tileGridZoom});
tileUrls.push({canvasRender: _timeGridCanvasRender});

limits.push({zoom: 14});
tileUrls.push(`${tileDir}/neighborhoods/{z}/{x}/{y}.png`);

shaderLayer = L.tileLayer.regl({
    uniformProps: {
        filter: 0b1111111,//all checked
        seed: props.RandomSeed,
        fade: props.Fade,
        minutes: props.Time,
        hood: props.Neighborhood,
        colorBackground: hexToArr(props.Background),
        colorBackgroundSel: hexToArr(props.BackgroundSel),
        colorBackgroundEdge: hexToArr(props.BackgroundEdge),
        colorBackgroundReach: hexToArr(props.BackgroundReach),
        colorBackgroundReachSel: hexToArr(props.BackgroundReachSel),
        colorDot: hexToArr(props.Dot),
        colorDotEdge: hexToArr(props.DotEdge),
        colorDotReach: hexToArr(props.DotReach),
    },
    uniformPropTypes: {
        dataTileOpen: 'sampler2D',
        dataTileClose: 'sampler2D',
        dataTile: 'sampler2D',
        colorBackground: 'vec3',
        colorBackgroundSel: 'vec3',
        colorBackgroundEdge: 'vec3',
        colorBackgroundReach: 'vec3',
        colorBackgroundReachSel: 'vec3',
        colorDot: 'vec3',
        colorDotEdge: 'vec3',
        colorDotReach: 'vec3',

    },
    fragmentShader: dotDensityShader.getFragmentShader(),
    tileUrls: tileUrls,
    tileRectZoom: 13,
    limits: limits,//max = 14
}).addTo(map);

if (transparentOverlayMap) {
    L.tileLayer('https://api.mapbox.com/styles/v1/tadiraman/cjzitexu44blk1cs97fvyqk4k/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoidGFkaXJhbWFuIiwiYSI6IktzUnNGa28ifQ.PY_hnRMhS94SZmIR2AIgug', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
    }).addTo(map);
}

if (debugMode) {
    L.GridLayer.DebugCoords = L.GridLayer.extend({
        createTile: function (coords) {
            const tile = document.createElement('div');
            tile.className = "debug-tile";
            $('<div>').text([coords.x, coords.y, coords.z].join(', ')).appendTo(tile);
            $('<div>').text([coords.x, Math.pow(2, coords.z) - coords.y, coords.z].join(', ')).appendTo(tile);
            return tile;
        }
    });

    L.gridLayer.debugCoords = function (opts) {
        return new L.GridLayer.DebugCoords(opts);
    };

    map.addLayer(L.gridLayer.debugCoords());
}

onMap(map);

if (chartInfo) {
    chartInfo.setCategories(_orderedCategories, palette);
}

timeGrids.forEach((timeGrid, i) => {
    runCalculations(timeGrid)(indexedPngDb, tileGridZoom, tileGridBounds,
        {url: `http://tiles.sasaki.com/raster/population/{z}/{x}/{y}.png`, zoom: 13},
        {url: `${tileDir}/neighborhoods/{z}/{x}/{y}.png`, zoom: 14},
        {url: `${tileDir}/time-grid/${timeGrid}/{x}_{y}_{z}.png`, zoom: tileGridZoom}, timeGrid);
});

const mouseMarker = L.circleMarker(startCenter, {
    clickable: false,
    fill: false,
    opacity: 0.5,
    color: '#eeeeee',
    weight: 2
}).addTo(map);

const $canvas = $('<canvas id="mouse-canvas">').appendTo('body');

if (!debugMode) {
    $('#mouse-over-info').hide();
    $canvas.hide();
    $('#debugInfo').hide();
}

let mouseLatLng = false;
map.on('mousemove', function (ev) {
    if (mobileMode) return;
    document.getElementById('x').innerHTML = ev.latlng.lng;
    document.getElementById('y').innerHTML = ev.latlng.lat;

    mouseMarker.setLatLng(ev.latlng);

    mouseLatLng = ev.latlng;

    updateInfo();
});

map.on('zoomend', function (ev) {
    document.getElementById('zoom').innerHTML = map.getZoom();
});

map.on('move', function (ev) {
    if (!mobileMode) return;
    const latLng = map.getCenter();
    mouseMarker.setLatLng(latLng);
    mouseLatLng = latLng;
    updateInfo();
});

const _setActiveTimeId = (ids) => {
    _activeTimeIds = [];
    Object.keys(ids).forEach((k) => {
        if (ids[k]) {
            _activeTimeIds.push('atl-walk-' + k);
        }
    });
    _timeGridCanvasRender.render(true);
    updateInfo();
};

function activeTime(record) {
    if (!record._times) return 0;
    let minTime = record._times[_activeTimeIds[0]];
    _activeTimeIds.forEach((timeId, i) => {
        minTime = Math.min(record._times[timeId], minTime);
    });
    return minTime;
}

function updateReachCounts() {
    const counts = {};
    Object.keys(props.Layers).forEach((k) => {
        if (_hidden.indexOf(k) >= 0) return;
        counts[k] = 0;
    });
    const timeRecords = [];
    indexedPngDb.withRecords((record) => {
        if (!record._times) return;
        if (_hidden.indexOf(record.Category) >= 0) return;
        if (props.Time >= activeTime(record)) {
            counts[record.Category]++;
            timeRecords.push(record);
        }
    });

    if (chartInfo) {
        chartInfo.update(timeRecords, props.Layers);
        // chartInfo.setCategories(_orderedCategories, counts);
    }
    outputChart.normalizeYValues(props.NormalizeY);
    outputChart.filterKeys(props.Layers);
    outputChart.setTitle(`${props.Time} minute ${isoModeLabel}`);
    outputChart.setCurrentX(props.Time * stepX);
    outputChart.setSeries(props.Time * stepX, counts, true);

    // $reachCounts.text(JSON.stringify(counts));
}

function updateInfoNow() {
    if (!shaderLayer) return;
    if (!mouseLatLng) return;

    updateReachCounts();

    const total = Math.round(mouseCircle($canvas, mouseMarker));
    const suffix = (total === 1) ? 'person' : 'people';
    $reachCounts.text(total.toLocaleString() + ' ' + suffix);

    $minutes.text(`${props.Time} minute walk`);

    $('.legend-item-dot').each(function () {
        $(this).data('update')();
    });
}

let needsUpdate = false;//used for debounce because we can have a mix of animation and mousemove events coming in
function updateInfo() {
    needsUpdate = true;
}

setInterval(() => {
    if (needsUpdate) {
        updateInfoNow();
        needsUpdate = false;
    }
}, updateInterval);//10 fps

_setActiveTimeId(timeGrids[0]);


//NOTE
//the easiest way to calculate isochrone-reached points would be to run a single pass across all images and pre-calculate all yelp records hit at each time...
//we can borrow some of the code from the mouse-over circle...
