var gui = new dat.GUI();
let maxHeight = 100;

const outputChart = new SAS.OutputChart(palette, _hidden);


initOutputChart(outputChart);


const props = {
    'RandomSeed': 128,
    'Fade': 7,
    'Neighborhood': 0,
    'Background': '#8989ff',
    'BackgroundSel': '#6184c2',
    'BackgroundEdge': '#f5f0d8',
    'BackgroundReach': '#ffe0a4',
    'BackgroundReachSel': '#eecf94',
    'Dot': '#b622b6',
    'DotEdge': '#e158c5',
    'DotReach': '#fc949a',
    'Animate': false,
    'Time': 1,
    'Layers': {}
};

// Background
// #b3b3de
// BackgroundEdge
// #bbfff7
// BackgroundReach
// #e3fff7
// Dot
// #bb39bb
// DotEdge
// #cd96ff
// DotReach
// #7571b3


function hexToArr(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
    ] : null;
}


const minuteStep = 1;

const updateFn = function (value) {
    shaderLayer.setUniformProperty({
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
    });
    updateInfo();

};

let dir = 1;
setInterval(() => {
    if (!props.Animate) return;
    props.Time += dir * minuteStep;
    if (props.Time >= maxMinutesAnim) {
        dir = -1;
    }
    if (props.Time < 1) {
        dir = 1;
    }
    updateFn();
}, updateInterval);

gui.add(props, 'Fade', 1, 20).onChange(updateFn);
gui.add(props, 'Neighborhood', 0, 24).step(1).onChange(updateFn);
gui.add(props, 'RandomSeed', 100, 300).onChange(updateFn);
gui.add(props, 'Time', 1, maxMinutes).step(1).listen().onChange(updateFn);
// gui.add(props, 'NormalizeY').onChange(updateFn);
gui.add(props, 'Animate').onChange(updateFn);

gui.addColor(props, 'Background').onChange(updateFn);
gui.addColor(props, 'BackgroundSel').onChange(updateFn);
gui.addColor(props, 'BackgroundEdge').onChange(updateFn);
gui.addColor(props, 'BackgroundReach').onChange(updateFn);
gui.addColor(props, 'BackgroundReachSel').onChange(updateFn);
gui.addColor(props, 'Dot').onChange(updateFn);
gui.addColor(props, 'DotEdge').onChange(updateFn);
gui.addColor(props, 'DotReach').onChange(updateFn);


amenityTypes.forEach((cat, i) => {
    props.Layers[cat] = true;
    if (_hidden.indexOf(cat) >= 0) return;
    gui.add(props.Layers, cat).onChange(() => {
        _setActiveTimeId(props.Layers);
        updateFn();
    });
});
setTimeout(() => {
    _setActiveTimeId(props.Layers);
}, 1500);//hack to fix initial check state

$('.dg.ac').css('zIndex', 800);
