const debugMode = false;

const tileDir = 'http://tiles.sasaki.com/data/asdf';
let mapOptions = {
    minZoom: 11,
    maxZoom: 17
};
const fl = (v) => {
    let str = v.toString();
    if (str.indexOf('.') < 0) {
        str += '.';
    }
    return str;
};
const v4hex = (hex, a) => {
    const [r, g, b] = chroma(hex).rgb().map(v => v / 255);
    return `vec4(${fl(r)}, ${fl(g)}, ${fl(b)}, ${fl(a)})`;
};
let startCenter = [34.1964, 62.20939];

var tileSize = 256;

var map = L.map('map', {fadeAnimation: false}).setView(startCenter, 11);

// const baselayer = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 18,
//     attribution: 'Map data &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
// }).addTo(map);
var OpenMapSurfer_Grayscale = L.tileLayer('https://api.mapbox.com/styles/v1/tadiraman/cjngcli4u047x2rp4ru6v7703/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoidGFkaXJhbWFuIiwiYSI6IktzUnNGa28ifQ.PY_hnRMhS94SZmIR2AIgug', {
    maxZoom: 19,
    attribution: 'Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
let calculatedBreakPoints;
let _tileCalcs;
let _euclideanCanvasRender;

const setupShaderLayer = (fragmentShader) => {
    console.log(fragmentShader);
    const getUniformProps = (includeRamp) => {
        const ans = {
            wgt_slope: props.SlopeMult / 100,
            rampMax: props.RampMax,
            gr_brk_enabled: props.UseBreaks ? 1 : 0,
            gr_brk_2025: props.Break2025,
            gr_brk_2030: props.Break2030,
            br_slope1: props.Slope1,
            br_slope2: props.Slope2,
            br_slope3: props.Slope3,
            vertical_density: props.VerticalDensity,
            dense_corr: props.DenseCorridor,
            dense_nodes: props.DenseNodes,
        };
        weightingsData.forEach((wgt, i) => {
            ans['wgt_' + wgt.tileId] = props['Wgt' + wgt.prop];
            if (wgt.distance) {
                ans['max_' + wgt.tileId] = props['Max' + wgt.prop];
            }
            if (wgt.distanceRange) {
                ans['min_' + wgt.tileId] = props['Min' + wgt.prop];
                ans['max_' + wgt.tileId] = props['Max' + wgt.prop];
            }
        });
        if (includeRamp) ans.gradient = {image: gradient.gradientImage};
        return ans;
    };

    const tileUrls = [];
    const limits = [];
    const uniformPropTypes = {};
    tileIds.forEach((tileName, i) => {
        tileUrls.push(`${tileDir}/asdf-${tileName}/tile_{x}_{y}_{z}.png`);
        limits.push({zoom: 11});
        // uniformProps[`wgt_${tileName}`] = 10
    });
    _euclideanCanvasRender = {
        canvasSize: {width: 512, height: 512},
        render: (neededOverride) => {
            if (!_euclideanCanvasRender.canvasSets) return;
            Object.keys(_euclideanCanvasRender.canvasSets).forEach((tileId) => {
                console.log('RERENDER: ' + tileId);
                const canvasSet = _euclideanCanvasRender.canvasSets[tileId];
                if (canvasSet.needsRender || neededOverride) {
                    canvasSet.needsRender = false;
                    const ctx = canvasSet.canvas.getContext('2d');
                    if (renderCanvas({ctx, coords: canvasSet.coords})) {
                        canvasSet.needsUpdate = true;//generate new texture for regl
                    }
                }
            });
            if (shaderLayer) shaderLayer.renderAll();
        },
        onLoad: () => {
            Object.keys(_euclideanCanvasRender.canvasSets).forEach((tileId) => {
                const canvasSet = _euclideanCanvasRender.canvasSets[tileId];
                // $(canvasSet.canvas).appendTo('body');
            });
            _euclideanCanvasRender.render();
        }
    };
    tileUrls.push({canvasRender: _euclideanCanvasRender});
    limits.push({zoom: 13});//limit is arbitrary, but avoid drawing too much detail for large geometries

    const gradient = setupGradient(uniformPropTypes);

    const uniformProps = getUniformProps(true);

    var shaderLayer = L.tileLayer.regl({
        uniformProps,
        fragmentShader,
        uniformPropTypes,
        tileUrls,
        limits
    }).addTo(map);

    const updateFn = function (val, finished) {
        const changeCanvas = gradient.drawCanvas();

        let currentProps = getUniformProps(changeCanvas);
        shaderLayer.setUniformProperty(currentProps);

        updateCalcs(currentProps, {
            tileIds,
            graduatedIds,
            graduatedRangeIds,
            flatVals,
            simpleSumIds,
            textures,
            finished
        });
    };

    initGui(updateFn);
    _tileCalcs = tileCalcs({status: {loading: {total: 0, complete: 0}}}, (breakPoints) => {
        calculatedBreakPoints = breakPoints;
    });
    _tileCalcs.updateChartSettings(props);
    _tileCalcs.updateVisibility(props.UseBreaks);

    updateFn(0, true);

    //TODO account for 'vertical area' growth density within urban corridors (including existing urban area)

    setupDrawingMode(map);

    if (debugMode) {
        L.GridLayer.DebugCoords = L.GridLayer.extend({
            createTile: function (coords) {
                const tile = document.createElement('div');
                tile.className = "debug-tile";
                $('<div class="debug-tile-txt">').text([coords.x, coords.y, coords.z].join(', ')).appendTo(tile);
                // $('<div>').text([coords.x, Math.pow(2, coords.z) - coords.y, coords.z].join(', ')).appendTo(tile);
                return tile;
            }
        });

        L.gridLayer.debugCoords = function (opts) {
            return new L.GridLayer.DebugCoords(opts);
        };

        map.addLayer(L.gridLayer.debugCoords());

    }
};

// const test_tiles = [
//     'ag',
//     'elev',
//     'ex_urb',
//     'major_rd',
//     'plots',
//     'slope',
//     'urban',
//     'water',
// ];


const props = {
    'Animate': false,
    'SlopeMult': 100,
    'Slope1': 10,
    'Slope2': 25,
    'Slope3': 40,
    'RampMax': 100,
    'UseBreaks': true,
    'VerticalDensity': 50,
    'Break2025': 36,
    'Break2030': 24,
    'DenseCorridor': 500,
    'DenseNodes': 500,
    'BreakChartHt': 800,
    'Colors': 5,
    'Color1': '#b30034',
    'Color2': '#f38b69',
    'Color3': '#ffffe0',
    'Color4': '#689b9b',
    'Color5': '#003468',
};

weightingsData.forEach((wgt, i) => {
    props['Wgt' + wgt.prop] = wgt.score.initial;
    if (wgt.distance) {
        props['Max' + wgt.prop] = wgt.distance.initial;
    }
    if (wgt.distanceRange) {
        props['Min' + wgt.prop] = wgt.distanceRange.min.initial;
        props['Max' + wgt.prop] = wgt.distanceRange.max.initial;
    }
});

// const calcs = new SAS.SummingRegl(map, shaderLayer);

function logEvent(e) {
    console.log(e.type);
}

map.on('mousemove', function (ev) {
    document.getElementById('x').innerHTML = ev.latlng.lng;
    document.getElementById('y').innerHTML = ev.latlng.lat;
});

map.on('zoomend', function (ev) {
    document.getElementById('zoom').innerHTML = map.getZoom();
});

loadShader();
