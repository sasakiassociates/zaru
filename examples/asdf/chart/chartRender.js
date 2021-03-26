const growthPercent = 5.8;
let currentData;

const patternFill = (size) => {
    const patternCanvas = new OffscreenCanvas(size, size);
    const patternContext = patternCanvas.getContext('2d');

    const offset = 3;
    // patternContext.fillStyle = '#fff';
    // patternContext.fillRect(0, 0, patternCanvas.width, patternCanvas.height);
    for (let i = 0; i < size; i++) {
        patternContext.globalAlpha = 0.75;
        patternContext.fillStyle = "#000";
        patternContext.fillRect(i, -1 + size - i, 1, 1);
    }
    return patternCanvas;
};

const redraw = (ctx, width, height, {barCount, verticalDensity, growthBreaks}, u_) => {
    if (!currentData) return;
    const {sums, allValues} = currentData;

    const denseUrban = sums.dense.ex + sums.dense.y25 + sums.dense.y30 + sums.dense.gt;
    const verticalGrowth = (verticalDensity / 100) * denseUrban;

    const totalLength = sums.existingUrban + verticalGrowth + allValues.length;
    const maxVal = 70;

    const toW = (score) => {
        return 160 * Math.min(1, score / maxVal);
    };

    const hatchPattern = ctx.createPattern(patternFill(4), 'repeat');

    const gradient = ctx.createLinearGradient(0, 0, width / 2, 0);
    gradient.addColorStop(0, '#37376e');
    gradient.addColorStop(1, '#e8f3ff');

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#909090';
    ctx.fillRect(0, 0, width, height);
    const step = Math.round(totalLength / barCount);
    let ry = 40;

    let colExisting = '#f5ff9f';
    let col2020 = '#e4c609';
    let col2025 = '#ca8f47';

    const drawDensityAreas = (yPos) => {
        let ry = yPos;
        const drawDensityArea = (color, val) => {
            const h = val / step;
            ctx.fillStyle = color;
            ctx.fillRect(200, ry, 24, h);
            ry += h;
        };

        drawDensityArea(colExisting, sums.dense.ex);
        drawDensityArea(col2020, sums.dense.y25);
        drawDensityArea(col2025, sums.dense.y30);
        drawDensityArea('#989ce3', sums.dense.gt);

        ry = yPos;
        drawDensityArea(hatchPattern, verticalGrowth);

    };
    drawDensityAreas(40);

    const growthLines = [];
    let growthVal = sums.existingUrban;
    const breakPoints = {};
    let verticalGrowthShare = 0;//verticalGrowth / 2;
    for (let i = 0; i <= 10; i++) {
        const yPos = ry + barCount * growthVal / totalLength;
        let major = i % 5 === 0;
        let year = 2020 + i;
        growthLines.push({yPos, major, year});
        if (major) {
            const idx = Math.round(growthVal - sums.existingUrban - verticalGrowthShare);
            breakPoints[year] = allValues[idx];
            verticalGrowthShare += verticalGrowth / 2;
        }
        growthVal *= (1 + growthPercent / 100);
    }
    const sections = [];
    const firstPeriodVals = [];
    const secondPeriodVals = [];
    const remainingVals = [];
    sections.push({
        color: colExisting,
        count: sums.existingUrban
    });
    sections.push({
        color: hatchPattern,
        count: Math.round(verticalGrowth / 2)
    });
    sections.push({
        color: col2020,
        values: firstPeriodVals
    });
    sections.push({
        color: hatchPattern,
        count: Math.round(verticalGrowth / 2)
    });
    sections.push({
        color: col2025,
        values: secondPeriodVals
    });
    sections.push({
        color: gradient,
        values: remainingVals
    });
    for (let i = 0; i < allValues.length; i += step) {
        let score = allValues[i];
        if (score > growthBreaks.Break2025) {
            firstPeriodVals.push(score);
        } else if (score > growthBreaks.Break2030) {
            secondPeriodVals.push(score);
        } else {
            remainingVals.push(score);
        }
    }
    sections.forEach((section, i) => {
        ctx.fillStyle = section.color;

        if (section.count) {
            for (let j = 0; j < section.count; j += step) {
                ctx.fillRect(25, ry, toW(maxVal), 1);
                ry += 1;
            }
        }
        if (section.values) {
            section.values.forEach((score, i) => {
                ctx.fillRect(25, ry, toW(score), 1);
                ry += 1;
            });
        }
    });

    growthLines.forEach(({major, yPos, year}) => {
        const rightX = toW(maxVal);
        ctx.globalAlpha = (major) ? 1 : 0.3;
        ctx.fillStyle = '#333333';
        ctx.fillRect(25, yPos, rightX - 25, 1);
        if (major) {
            const textPos = rightX;
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#000000';
            ctx.fillRect(textPos, yPos - 8, 40, 16);
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(year, textPos + 4, yPos + 4);
        }
    });
    return breakPoints;
};

const renderChart = (ctx, grandTotals, {width, height}, settings, u_) => {
    currentData = grandTotals;
    return redraw(ctx, width, height, settings, u_);
};
