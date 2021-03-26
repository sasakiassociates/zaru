const processImages = (imageDataById, currentProps, options, callback) => {
    const tileSize = 256;

    const getPixelAlpha = (imgData, x, y, gx, gy, gridSize) => {
        const pos = {
            x: tileSize * gx + x,
            y: tileSize * gy + y,
        };
        const idx = (pos.y * tileSize * gridSize + pos.x) * 4;
        return imgData[idx + 3];
    };
    const getPixelVal = (id, x, y, gx, gy, gridSize) => {
        const imgData = imageDataById[id];
        if (!imgData) return 0;
        const pos = {
            x: tileSize * gx + x,
            y: tileSize * gy + y,
        };
        let width = tileSize * gridSize;
        const idx = (pos.y * width + pos.x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const a = imgData[idx + 3];
        if (a === 0) return -1;
        const rawVal = r * 256 * 256 + g * 256 + b;
        const precision = precisions[id] || 1;
        return rawVal / precision;
    };

    const isIncluded = (x, y) => {
        const v_aoi = getPixelVal('aoi', x, y, 0, 0, 1);
        return v_aoi > 0.;
    };
    const isExistingUrban = (x, y) => {
        const v_ex_urb = getPixelVal('ex_urb', x, y, 0, 0, 1);
        return v_ex_urb === 1.;
    };
    const isDensityZone = (x, y) => {
        const v_corr = getPixelVal('corr', x, y, 0, 0, 1);
        const v_nodes = getPixelVal('nodes', x, y, 0, 0, 1);
        return v_corr < u_['dense_corr'] || v_nodes < u_['dense_nodes'];
    };

    const totals = {values: [], sums: {existingUrban: 0, dense: {ex: 0, y25: 0, y30: 0, gt: 0}}};
    const precisions = {};

    //replicate uniforms in shader code as closely as possible
    const u_ = {};
    Object.keys(currentProps).forEach((k) => {
        u_[k] = currentProps[k];
    });

    const processPixel = (x, y) => {
        if (!isIncluded(x, y)) return;
        let isDense = isDensityZone(x, y);

        if (isExistingUrban(x, y)) {
            totals.sums.existingUrban++;
            if (isDense) {
                totals.sums.dense.ex++;
            }
            return;
        }

        //replicate pixel shader code as closely as possible
        const v_ = {};
        const s_ = {};

        const {tileIds, graduatedIds, graduatedRangeIds, flatVals, textures, simpleSumIds} = options;

        tileIds.forEach((id, i) => {
            s_[id] = 0;
            v_[id] = getPixelVal(id, x, y, 0, 0, 1);
        });

        textures.forEach(({key, precision}, i) => {
            precisions[key] = precision;
        });

        graduatedIds.forEach((gradId, i) => {
            if (v_[gradId] >= 0) {
                if (v_[gradId] < u_['max_' + gradId]) {
                    const normDist = 1 - v_[gradId] / u_['max_' + gradId];
                    s_[gradId] = normDist * u_['wgt_' + gradId];
                }
            }
        });

        graduatedRangeIds.forEach((gradId, i) => {
            //Note: assumes that default value is 1 (should probably be in settings)
            s_[gradId] = 1;
            if (v_[gradId] < u_['min_' + gradId]) {
                s_[gradId] = u_['wgt_' + gradId];
            } else if (v_[gradId] < u_['max_' + gradId]) {
                const normDist = 1. - (v_[gradId] - u_['min_' + gradId]) / (u_['max_' + gradId] - u_['min_' + gradId]);
                s_[gradId] = 1. + normDist * (u_['wgt_' + gradId] - 1.);
            }
        });

        flatVals.forEach((wgt, i) => {
            s_[wgt.tileId] = 0.;
            if (v_[wgt.tileId] === wgt.match) {
                s_[wgt.tileId] = u_['wgt_' + wgt.tileId];
            }
        });
        let score = 0;
        simpleSumIds.forEach((id, i) => {
            score += s_[id];
        });
        score += s_['urban_core'] * s_['urban'];
        if (v_['slope'] < u_['br_slope1']) {
            score += 10. * u_['wgt_slope'];
        } else if (v_['slope'] < u_['br_slope2']) {
            score -= 10. * u_['wgt_slope'];
        } else if (v_['slope'] < u_['br_slope3']) {
            score -= 50. * u_['wgt_slope'];
        } else {
            score -= 100. * u_['wgt_slope'];
        }
        totals.values.push(score);

        if (isDense) {
            if (score > u_['gr_brk_2025']) {
                totals.sums.dense.y25++;
            } else if (score > u_['gr_brk_2030']) {
                totals.sums.dense.y30++;
            } else {
                totals.sums.dense.gt++;
            }
        }
    };

    for (let x = 0; x < tileSize; x++) {
        for (let y = 0; y < tileSize; y++) {
            //process everything 1 pixel at a time so this mirrors the shader approach
            processPixel(x, y);
        }
    }
    if (callback) callback(totals);
};


