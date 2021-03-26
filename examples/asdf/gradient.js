const setupGradient = (uniformPropTypes) => {
    let lastRamp = '';
    function drawCanvas() {
        const rampColors = [];
        for (let i = 1; i <= props.Colors; i++) {
            rampColors.push(props['Color' + i]);
        }
        const ramp = rampColors.join('_');
        if (ramp === lastRamp) {
            return false;
        }
        lastRamp = ramp;

        const comfortScale = chroma.scale(rampColors).mode('lch');

        const ctx = gradientCanvas.getContext("2d");
        const imgData = ctx.createImageData(256, 1);
        let i;
        for (i = 0; i < imgData.data.length; i += 4) {
            const color = comfortScale(i / imgData.data.length).rgb();
            imgData.data[i + 0] = color[0];
            imgData.data[i + 1] = color[1];
            imgData.data[i + 2] = color[2];
            imgData.data[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);

        return true;
    }

    let gradientCanvas;
    const $canvas = $('<canvas class="gradient-canvas" width="256" height="1">').appendTo('body');
    gradientCanvas = $canvas[0];
    drawCanvas();

    uniformPropTypes.gradient = 'sampler2D';

    return {
        drawCanvas: drawCanvas,
        gradientImage: gradientCanvas,
    };
};
