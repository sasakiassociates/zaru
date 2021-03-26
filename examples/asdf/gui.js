
const initGui = (updateFn) => {

    var gui = new dat.GUI();

// ag: -10,
// water: -50
// euc_urban: [0,50]
// euc_roads: [0,20]
// plots: 20

// slope: <10, 10
// slope: 10-25, -10
// slope: 25-40, -50
// slope: >40, -100

    const numColors = 5;

    const weightingGrp = gui.addFolder('Weightings');

    const finishFn = (val) => {
        _tileCalcs.updateVisibility(props.UseBreaks);
        updateFn(val, true);
    };

    props.CalcBreak = () => {
        props['Break2025'] = calculatedBreakPoints['2025'];
        props['Break2030'] = calculatedBreakPoints['2030'];
        _tileCalcs.updateChartSettings(props);
        updateFn(0, true);
    };

    weightingsData.forEach((wgt, i) => {
        weightingGrp.add(props, 'Wgt' + wgt.prop, wgt.score.min, wgt.score.max).onChange(updateFn).onFinishChange(finishFn);

        if (wgt.distance) {
            weightingGrp.add(props, 'Max' + wgt.prop, wgt.distance.min, wgt.distance.max).step(1).onChange(updateFn).onFinishChange(finishFn);
        }
        if (wgt.distanceRange) {
            weightingGrp.add(props, 'Min' + wgt.prop, wgt.distanceRange.min.min, wgt.distanceRange.min.max).step(1).onChange(updateFn).onFinishChange(finishFn);
            weightingGrp.add(props, 'Max' + wgt.prop, wgt.distanceRange.max.min, wgt.distanceRange.max.max).step(1).onChange(updateFn).onFinishChange(finishFn);
        }
    });

    const slopeVals = gui.addFolder('Slope Breaks');
    slopeVals.add(props, 'SlopeMult', 0, 250).step(1).onChange(updateFn).onFinishChange(finishFn);
    slopeVals.add(props, 'Slope1', 0, 90).step(1).onChange(updateFn).onFinishChange(finishFn);
    slopeVals.add(props, 'Slope2', 0, 90).step(1).onChange(updateFn).onFinishChange(finishFn);
    slopeVals.add(props, 'Slope3', 0, 90).step(1).onChange(updateFn).onFinishChange(finishFn);

    const colorSettings = gui.addFolder('Color Settings');
    colorSettings.add(props, 'RampMax', 50, 200).step(1).onChange(updateFn).onFinishChange(finishFn);
    colorSettings.add(props, 'Colors', 2, numColors).step(1).onChange(updateFn).onFinishChange(finishFn);

    let updateChartSettings = () => {
        _tileCalcs.updateChartSettings(props);
    };
    let updateChartAndShader = (val) => {
        _tileCalcs.updateChartSettings(props);
        updateFn(val);
    };

    const growthBreaks = gui.addFolder('Growth');
    growthBreaks.add(props, 'VerticalDensity', 0, 100).step(1).onChange(updateChartAndShader);
    growthBreaks.add(props, 'UseBreaks').onChange(updateFn).onFinishChange(finishFn);
    growthBreaks.add(props, 'Break2025', 10, 100).step(0.1).listen().onChange(updateChartAndShader).onFinishChange(finishFn);
    growthBreaks.add(props, 'Break2030', 10, 100).step(0.1).listen().onChange(updateChartAndShader).onFinishChange(finishFn);

    growthBreaks.add(props, 'DenseCorridor', 0, 1000).step(1).listen().onChange(updateChartAndShader).onFinishChange(finishFn);
    growthBreaks.add(props, 'DenseNodes', 0, 1000).step(1).listen().onChange(updateChartAndShader).onFinishChange(finishFn);

    growthBreaks.add(props, 'BreakChartHt', 400, 1400).step(10).onChange(updateChartSettings);
    growthBreaks.add(props, 'CalcBreak');

    for (let i = 1; i <= numColors; i++) {
        colorSettings.addColor(props, 'Color' + i).onChange(updateFn).onFinishChange(finishFn);
    }

    $('.dg.ac').css('zIndex', 800);

};
