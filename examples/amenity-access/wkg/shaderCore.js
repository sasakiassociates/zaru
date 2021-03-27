const quadShader = {
    verts: [
        [-1.0, +1.0],
        [+1.0, +1.0],
        [+1.0, -1.0],
        [-1.0, -1.0],
        // [+1.0, -1.0],
        // [-1.0, +1.0]
    ],
    // uvs : [
    //     [0.0, 0.0],
    //     [1.0, 0.0],
    //     [0.0, 1.0],
    //     [0.0, 1.0],
    //     [1.0, 0.0],
    //     [1.0, 1.0]
    // ],
    elements: [2, 1, 0, 2, 0, 3],
    vertexShader: function (flipY) {
        return `
        const vec2 madd = vec2(0.5, 0.5);
        attribute vec2 a_position;
        varying vec2 textureCoord;
        void main() {
           textureCoord = a_position.xy * madd + madd; // scale vertex attribute to [0-1] range
           ${flipY ? 'textureCoord.y = 1.0 - textureCoord.y;' : ''}
           gl_Position = vec4(a_position.xy, 0.0, 1.0);
        }
  `
    }
};
quadShader.attributes = {
    a_position: quadShader.verts,
};

//
//
// // language=GLSL
// const pixelsVertex = `
//     precision mediump float;
//     attribute vec2 position;
//     varying vec2 uv;
//     void main () {
//         uv = position;
//         vec4 pos = vec4(1.0 - 2.0 * position, 0, 1);
// //        pos.y = 2.0 - pos.y;
//         gl_Position = pos;
//     }
//   `;
// let pixelAttributes = {
//     position: [
//         -2, 0,
//         0, -2,
//         2, 2]
// };

// language=GLSL
const pngDbFns = `
float toVal(vec4 texelColour) {
    float prec = 10000.0;
    vec3 dv = texelColour.xyz * 255.0;
    float val = (dv.r * 256.0 * 256.0) + (dv.g * 256.0) + dv.b;
    val = val / prec;

    return val;
}
vec4 fromVal(float val) {
    float prec = 10000.0;
    val = val * prec;

    float r = 0.0;
    float g = 0.0;
    float b = val;

    if (val > 255.0) {
        g = floor(val / 256.0);
        b = b - (g * 256.0);//mod?

        if (g > 255.0) {
            r = floor(g / 256.0);
            g = g - (r * 256.0);
        }
    }

    return vec4(r/255.0, g/255.0, b/255.0, 1.0);
}`;

// language=GLSL
const goldNoiseFns = (count) => {
    return `
float PHI = 1.61803398874989484820459 * 00000.1; // Golden Ratio
float PI  = 3.14159265358979323846264 * 00000.1; // PI
float SQ2 = 1.41421356237309504880169 * 10000.0; // Square Root of Two

float gold_noise(in vec2 coordinate, in float seed){
    return fract(sin(dot(coordinate*(seed+PHI), vec2(PHI, PI)))*SQ2);
}

//direct array access with variable not available in shaders!  https://stackoverflow.com/questions/19529690/index-expression-must-be-constant-webgl-glsl-error
float getData(float[${count}] data, int id) {
    for (int i=0; i<${count}; i++) {
        if (i == id) return data[i];
    }
    return 0.;
}

vec3 getDataV3(vec3[${count}] data, int id) {
    for (int i=0; i<${count}; i++) {
        if (i == id) return data[i];
    }
    return vec3(0.0, 0.0, 0.0);
}

vec4 maxBlend(float seed, vec2 coordinate, float[${count}] values, vec3[${count}] colors, float fade) {
    float total = 0.0;

    for (int i = 0; i < ${count}; i++) {
        total = total + values[i];
    }
    
    if (total > 0.) {
        int maxIdx = 0;
        for (int i = 1; i < ${count}; i++) {
            if (values[i] > getData(values, maxIdx)) {
                maxIdx = i;
            }
        }
        return vec4(getDataV3(colors, maxIdx), 1.);
    } else {
        return vec4(0.0, 0.0, 0.0, 0.0);
    }
}

vec4 goldNoiseBlend(float seed, vec2 coordinate, float[${count}] values, vec3[${count}] colors, float fade) {
    // float total = 0.0;
    //
    // for (int i = 0; i < ${count}; i++) {
    //     total = total + values[i];
    // }
    //
    // //always normalize by total (unlike dot-density) because we need to make sure a dot is represented
    // for (int i = 0; i < ${count}; i++) {
    //     values[i] = values[i] / total;
    // }

    vec4 dotColor = vec4(0.0, 0.0, 0.0, 0.0);

    float random = gold_noise(coordinate, seed);
    if (random == 0.) random = 0.0000001;//avoid random value returning exactly zero
    float breakPt = 0.0;
    for (int i = 0; i < ${count}; i++) {
        breakPt = breakPt + values[i];
        if (random <= breakPt) {
            dotColor = vec4(colors[i], 1.);
            break;
        }
    }

    return dotColor;
}
    `;
};
