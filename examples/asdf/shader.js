// float v_ag = toVal(texture2D(uTexture0, textureCoord), 1.);
// float v_plots = toVal(texture2D(uTexture1, textureCoord), 1.);
// float v_water = toVal(texture2D(uTexture2, textureCoord), 1.);
// float v_urban = toVal(texture2D(uTexture3, textureCoord), 0.25);//0.25 is precision used in QGIS
// float v_major_rd = toVal(texture2D(uTexture4, textureCoord), 0.2);//0.2 is precision used in QGIS
// float v_slope = toVal(texture2D(uTexture5, textureCoord), 20.);//precision used in QGIS
// float v_ex_urb = toVal(texture2D(uTexture6, textureCoord), 1.);
const textures = [];
const graduatedIds = [];
const graduatedRangeIds = [];
const simpleSumIds = [];
const flatVals = [];

// language=GLSL
const fragmentShader = () => `
    precision lowp float;
    float toVal(vec4 texelColour, float prec) {
        vec3 dv = texelColour.xyz * 255.0;
        float val = (dv.r * 256.0 * 256.0) + (dv.g * 256.0) + dv.b;
        val = val / prec;

        return val;
    }

    vec2 applyOffsets(vec2 coordinate, float x, float y, float scale) {
        return vec2(coordinate.x / scale + x, coordinate.y / scale + y);
    }
    
    vec2 applyArrayOffsets(vec2 coordinate, float tx, float ty, float num) {
        //see array tile diagram in gfx/array mini tiles.svg
        return vec2(coordinate.x / num + tx / num, coordinate.y / num + ty / num);
    }
    
    vec3 hatchColor(bool backslash, int spacing, float darken, vec3 color) {
        vec3 outColor = vec3( 0.0 );
    
        float w = float(spacing);
        float diff = gl_FragCoord.x - gl_FragCoord.y;
        if (backslash) {
            diff = gl_FragCoord.y + gl_FragCoord.x;
        }
        float m = mod(diff , w );
    
        if( m == 0.0 ) {
            outColor = color * darken;
        } else {
            outColor = color;
        }
        
        return outColor;    
    }
    
    void main () {

        ${textureStr()}

        ${flatScores()}
        
        ${graduatedRanges()}
        
        ${graduatedRanges2()}
        
        float score = 0.;
                
        ${simpleSums()}
                
        score += s_urban_core * s_urban;
        if (v_slope < u_br_slope1) {
            score += 10. * u_wgt_slope;
        } else if (v_slope < u_br_slope2) {
            score -= 10. * u_wgt_slope;
        } else if (v_slope < u_br_slope3) {
            score -= 50. * u_wgt_slope;
        } else {
            score -= 100. * u_wgt_slope;
        }

        vec2 tilePos11 = applyOffsets(textureCoord, uOffsetX11, uOffsetY11, uImageScale11);
        vec2 tilePos11_corr = applyArrayOffsets(tilePos11, 0.,0.,2.);
        vec2 tilePos11_node = applyArrayOffsets(tilePos11, 1.,0.,2.);
        float v_corr_d = toVal(texture2D(uTexture11, tilePos11_corr), 1.);
        float v_node_d = toVal(texture2D(uTexture11, tilePos11_node), 1.);

        float norm = score / u_rampMax;
        norm = 0.5 + norm / 2.;//center zero on ramp's center

        if (u_gr_brk_enabled == 1.) {
            if (v_aoi > 0.) {
                vec3 color = vec3(0.);
                if (v_ex_urb == 1.) {
                    color = vec3(245./255., 1., 159./255.);                    
                } else {
                    if (score > u_gr_brk_2025) {
                        color = vec3(228./255., 198./255., 9./255.);                    
                    } else if (score > u_gr_brk_2030) {
                        color = vec3(202./255., 143./255., 71./255.);                   
                    } else {
                        color = vec3(norm, norm, norm*1.25);
                    }                    
                }     
                if (v_node_d < u_dense_nodes || v_corr_d < u_dense_corr) {  
                    if (u_vertical_density == 0.) {
                        gl_FragColor = vec4(color, 1.);
                    } else {
                        float darkness = 0.15 + 0.65 * u_vertical_density / 100.;
                        gl_FragColor = vec4(hatchColor(false, 4, 1.-darkness, color), 1.);
                    }                    
                } else {
                    gl_FragColor = vec4(color, 1.);                    
                }           
            } else {
                 gl_FragColor = vec4(norm, norm, norm, 1.);                
            }
        } else {
            gl_FragColor = texture2D(u_gradient, vec2(norm, 0.5));
        }        
    }
`;
const loadShader = () => {
    weightingsData.forEach((wgt, i) => {
        if (wgt.graduated) {
            if (wgt.distance) {
                graduatedIds.push(wgt.tileId);
            }
            if (wgt.distanceRange) {
                graduatedRangeIds.push(wgt.tileId);
            }
            if (!wgt.specialMath) {
                simpleSumIds.push(wgt.tileId);
            }
        } else if (wgt.match) {
            simpleSumIds.push(wgt.tileId);
            flatVals.push(wgt);
        }
    });
    let cnt = tileIds.length;
    tileIds.forEach((tileId, i) => {
        $.getJSON(`${tileDir}/asdf-${tileId}/field.json`, (data) => {
            textures[i] = {key: tileId, precision: data.precision};
            if (--cnt === 0) {
                setupShaderLayer(fragmentShader());
            }
        });
    });
};

const shaderFloat = (num) => {
    let str = `${num}`;
    if (str.indexOf('.') < 0) {
        str += '.';
    }
    return str;
};
const textureStr = () => {
    let str = '';
    textures.forEach(({key, precision}, i) => {
        str += `    vec2 tilePos${i} = applyOffsets(textureCoord, uOffsetX${i}, uOffsetY${i}, uImageScale${i});` + '\n';
        str += `    float v_${key} = toVal(texture2D(uTexture${i}, tilePos${i}), ${shaderFloat(precision)});` + '\n';
    });
    return str;
};
const graduatedRanges = () => {
    let str = '';
    graduatedIds.forEach((gradId, i) => {
        str += `float s_${gradId};
        if (v_${gradId} >= 0.) { //graduated range...
        if (v_${gradId} < u_max_${gradId}) {
            float normDist = 1. - v_${gradId} / u_max_${gradId};
            s_${gradId} = normDist * u_wgt_${gradId};
        }
    }
    `;
    });
    return str;
};
const graduatedRanges2 = () => {
    let str = '';
    graduatedRangeIds.forEach((gradId, i) => {
        //Note: assumes that default value is 1 (should probably be in settings)
        str += `float s_${gradId} = 1.;
        if (v_${gradId} < u_min_${gradId}) { 
            s_${gradId} = u_wgt_${gradId};
        } else if (v_${gradId} < u_max_${gradId}) {
            float normDist = 1. - (v_${gradId} - u_min_${gradId}) / (u_max_${gradId} - u_min_${gradId});
            s_${gradId} = 1. + normDist * (u_wgt_${gradId} - 1.);
        }
    `;
    });
    return str;
};
const flatScores = () => {
    let str = '';
    flatVals.forEach((wgt, i) => {
        str += `
        float s_${wgt.tileId} = 0.;
        if (v_${wgt.tileId} == ${shaderFloat(wgt.match)}) {
            s_${wgt.tileId} = u_wgt_${wgt.tileId};
        }
    `;
    });

    return str;
};
const simpleSums = () => {
    let str = '';
    simpleSumIds.forEach((id, i) => {
        str += `score += s_${id};       
    `;
    });
    return str;
};
