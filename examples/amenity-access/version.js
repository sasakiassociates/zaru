const field = {precision: 1000, name: 'population', arrayCount: 3};

const updateInterval = 90;

const transparentOverlayMap = true;
const maxMinutes = 30;
const maxMinutesAnim = 15;
const stepX = 135 / maxMinutes;

const isochronePoints = [
    {id: 'atl-walk-basketball'},
    {id: 'atl-walk-playgrounds'},
    {id: 'atl-walk-tennis'},
];
const timeGrids = isochronePoints.map((p) => p.id);

const onMap = (map) => {

};

const tileGridZoom = 11;
const tileGridBounds = {
    zoom: 12,
    min: {x: 1086, y: 1637},
    max: {x: 1088, y: 1641},
};

const _hidden = [];
const amenityTypes = [
    "basketball",
    "playgrounds",
    "tennis",
];
const palette = {
};

const _max = 1750;
const isoModeLabel = 'trip';

//--------------------------------------

function initOutputChart(outputChart) {
    // const totals = {};
    // amenityTypes.forEach((cat, i) => {
    //     totals[cat] = _max;
    // });
    // outputChart.setTotals(totals);
}