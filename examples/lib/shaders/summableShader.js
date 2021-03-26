

const generateSummableShader = function (summables) {
    const uniforms = {};
    const imageDeclarations = [];
    const valueDeclarations = [];
    const sumParts = [];
    for (let i = 0; i < summables.length; i++) {
        uniforms[`texture${i}`] = summables[i];//framebuffer
        imageDeclarations.push(`uniform sampler2D texture${i};`);
        valueDeclarations.push(`float v${i} = toVal(texture2D(texture${i}, textureCoord));`);
        sumParts.push(`v${i}`);
    }

    if (summables.length === 0) throw 'Cannot generate summable shader with 0 components';

    return {
        uniforms: uniforms,
        // language=GLSL
        fragmentShader: `
precision mediump float;
${imageDeclarations.join('\n')}
${pngDbFns}
varying vec2 textureCoord;
void main () {
    ${valueDeclarations.join('\n')}
    gl_FragColor = fromVal(${sumParts.join('+')});
}
        `
    };
};