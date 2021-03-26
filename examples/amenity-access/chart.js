const chartInfo = {labels:[]};

chartInfo.setCategories = function (uniqueValues, palette) {
    chartInfo.keys = uniqueValues;
    chartInfo.chart = new Chartist.Bar('#mouse-chart', {
        labels: chartInfo.keys,
        series: uniqueValues.map((v) => 0) //fill with zeroes
    }, {
        distributeSeries: true,
        horizontalBars: true,
        width: 600,
        height: 200,
        axisX: {
            scaleMinSpace: 40,
            referenceValue: _max,
        },
        axisY: {
            offset: 60
        }
    });
    chartInfo.chart.on('draw', function(data) {
        if(data.type === 'bar') {
            // if (chartColors[data.index]) {
                data.element._node.setAttribute('style','stroke: ' + palette[uniqueValues[data.seriesIndex]]);
            // }
        }
    });
};
chartInfo.update = function (records, included) {
    const sums = {};
    if (!chartInfo.keys) return;
    chartInfo.keys.forEach((key, i) => {
        sums[key] = 0;
    });
    records.forEach((r, i) => {
        if (!included || included[r.Category]) {
            sums[r.Category]++;
        }
    });
    chartInfo.chart.update({
        labels: chartInfo.keys,
        series: chartInfo.keys.map((k) => sums[k])
    });
};