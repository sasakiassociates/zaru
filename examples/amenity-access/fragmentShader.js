const _dotDensityShader = (layerIds) => {
    const _repeatStr = (str, num) => {
        let ans = '';
        for (let i = 0; i < num; i++) {
            ans += str.replace(/#/g, i);
            ans += '\r\n';
        }
        return ans;
    };
    const _getFragmentShader = () => {

        //region shader code
        // language=GLSL
        return `
${goldNoiseFns(1)}

//NOTE replacing built-in mod because on phones mod of a float can be subject to precision issues
// float v1 = 8730.;
// float v2 = 212.;
//(mod(v1, v2) == mod(8730., 212.))
float floor2(float val) {
    float rounded = float(int(val));
    if (rounded > val) return rounded - 1.;
    return rounded;
}

float mod2(float n, float d) {
    if (d == 0.) {
        return 0.;
    }
    return n - d * floor2(n / d);
}

//coordinate is the actual pixel coordinate
vec2 applyOffsets(vec2 coordinate, float x, float y, float scale, float idxSide, vec2 idxOffset) {
    float ts = 1.0 / idxSide;
    float ox = idxOffset.x / idxSide;
    float oy = idxOffset.y / idxSide;
    vec2 val = vec2(ox + coordinate.x / (scale * idxSide) + x * ts, oy + coordinate.y / (scale * idxSide) + y * ts);
    return vec2(floor2(val.x * 512.0) / 512.0, floor2(val.y * 512.0) / 512.0);
}

vec2 applyOffsets(vec2 coordinate, float x, float y, float scale) {
    return vec2(coordinate.x / scale + x, coordinate.y / scale + y);
}

int toVal(vec4 texelColor) {
    int r = int(texelColor.r * 255.);
    int g = int(texelColor.g * 255.);
    int b = int(texelColor.b * 255.);

    return r * 256 * 256 + g * 256 + b;
}

vec3 rgb(float r,float g,float b) {
    return vec3(r/255., g/255., b/255.);
}

const int max_its = 1000;//max number of entities on 1 pixel

void main(void) {
    int popVal = toVal(texture2D(uTexture0, applyOffsets(textureCoord, uOffsetX0, uOffsetY0, uImageScale0)));
    int minuteVal1 = toVal(texture2D(uTexture1, applyOffsets(textureCoord, uOffsetX1, uOffsetY1, uImageScale1)));
    int nhood = toVal(texture2D(uTexture2, applyOffsets(textureCoord, uOffsetX2, uOffsetY2, uImageScale2)));
//    int minuteVal2 = toVal(texture2D(uTexture2, applyOffsets(textureCoord, uOffsetX2, uOffsetY2, uImageScale2)));
    
    int minuteVal = minuteVal1; 
//    if (minuteVal2 < minuteVal) {
//        minuteVal = minuteVal2; 
//    }
        
    vec3 colors[1];
    colors[0] = u_colorDot;
        
    float colorCnts[1];
    
    float zoomAdj = 1.;
    
    if (uImageScale0 == 1.) {
            //as we go beyond this zoom, the popVal is consistent and we get visually similar reults
        //but as we zoom out, the popVal counts increase by 4x each time so we need to account for that...
        //basically 4^(13 - uZoom)
        zoomAdj = pow(2., 13. - uZoom); 
    }
    
    colorCnts[0] = sqrt(float(popVal))/(zoomAdj * u_fade * 10.);
    
    int input_minutes = int(u_minutes);
    
    vec4 blendColor = goldNoiseBlend(u_seed, textureCoord, colorCnts, colors, u_fade);

    if (minuteVal == 0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    } else if (input_minutes == minuteVal) {//highlight on edge
        if (blendColor.a == 0.) {
            gl_FragColor = vec4(u_colorBackgroundEdge, 1.);//background
        } else {
            gl_FragColor = vec4(u_colorDotEdge,0.5);// mix(blendColor, vec4(0.2, 0., 0.2, 0.0), 0.5);
        }
    } else if (input_minutes >= minuteVal) {
        
        if (blendColor.a == 0.) {
            if (float(nhood) == u_hood) {
                gl_FragColor = vec4(u_colorBackgroundReachSel, 1.0);//background        
            } else {
                gl_FragColor = vec4(u_colorBackgroundReach, 1.0);//background
            }
        } else {
            gl_FragColor = vec4(u_colorDotReach, 0.7);
        }
    } else {
        if (blendColor.a == 0.) {
            if (float(nhood) == u_hood) {
                gl_FragColor = vec4(u_colorBackgroundSel, 1.0);//background
            } else {
                gl_FragColor = vec4(u_colorBackground, 1.0);//background
            }
            
//            gl_FragColor = nhood;
        } else {
            gl_FragColor = blendColor;        
        }
        

    }
    
    
//    gl_FragColor = maxBlend(u_seed, textureCoord, colorCnts, colors, u_fade);
}
`;
    };
    return {
        getFragmentShader: _getFragmentShader,
    };
};

