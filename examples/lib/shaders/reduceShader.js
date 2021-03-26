//This shader takes a single 256x256 tile and reduces it to a 128x128 tile while summing the values
//the fbo used should be 128x128, while the input texture should be 256x256
const getReduceShader = function (regl) {
    return regl({
        vert: quadShader.vertexShader(false),
        // language=GLSL
        frag: `
        precision mediump float;
        ${pngDbFns}
        uniform sampler2D texture;
        varying vec2 textureCoord;
        void main () {
            vec2 uvTd = 1.0 - textureCoord;
            vec2 uv0 = uvTd * 2.0;
            vec2 uv1 = vec2(uv0.x + 1.0, uv0.y);
            vec2 uv2 = vec2(uv0.x, uv0.y + 1.0);
            vec2 uv3 = vec2(uv0.x + 1.0, uv0.y + 1.0);
        
            float v0 = toVal(texture2D(texture, uv0));
            float v1 = toVal(texture2D(texture, uv1));
            float v2 = toVal(texture2D(texture, uv2));
            float v3 = toVal(texture2D(texture, uv3));
        
            gl_FragColor = fromVal(v0+v1+v2+v3);
        }`,
        uniforms: {
            texture: regl.prop('texture')
        },
        count: 6,
        attributes: quadShader.attributes,
        elements: quadShader.elements,
        depth: {enable: false},
    });
};
