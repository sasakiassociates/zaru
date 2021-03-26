getDrawTextureShader = function (num, size, flipY) {
    if (num <= 1) {
        return regl({
            vert: quadShader.vertexShader(flipY),
            // language=GLSL
            frag: `
        precision mediump float;
        uniform sampler2D texture;
        uniform float xOffset;
        uniform float yOffset;
        varying vec2 textureCoord;
        void main () {
            vec2 mUv = vec2(textureCoord.x + xOffset, textureCoord.y + yOffset);
            gl_FragColor = texture2D(texture, mUv);
        }`,
            uniforms: {
                texture: regl.prop('texture'),
                xOffset: regl.prop('x'),
                yOffset: regl.prop('y')
            },
            count: 6,
            attributes: quadShader.attributes,
            elements: quadShader.elements,
            depth: {enable: false},
        });
    } else {
        const declarations = [];
        const uniforms = {};

        for (let i = 0; i < num; i++) {
            uniforms[`texture${i}`] = regl.prop(`texture${i}`);
            uniforms[`xOffset${i}`] = regl.prop(`x${i}`);
            uniforms[`yOffset${i}`] = regl.prop(`y${i}`);
            declarations.push(`uniform sampler2D texture${i};`);
            declarations.push(`uniform float xOffset${i};`);
            declarations.push(`uniform float yOffset${i};`);
        }

        uniforms['uSize'] = size;

        return regl({
            vert: quadShader.vertexShader(flipY),
            // language=GLSL
            frag: `
        precision mediump float;
        ${declarations.join('\n')}
        uniform float uSize;
        varying vec2 textureCoord;
        void main () {
            vec2 uv = textureCoord;//vec2(1.0 - textureCoord.x, textureCoord.y);//use left->right bottom->down coordinates
            vec2 mUv0 = vec2(uv.x - xOffset0, uv.y - yOffset0);
            vec2 mUv1 = vec2(uv.x - xOffset1, uv.y - yOffset1);
            vec2 mUv2 = vec2(uv.x - xOffset2, uv.y - yOffset2);
            vec2 mUv3 = vec2(uv.x - xOffset3, uv.y - yOffset3);

            vec2 mUv;
            if (mUv0.x >= 0.0 && mUv0.x < uSize && mUv0.y >= 0.0 && mUv0.y < uSize) {
                gl_FragColor = texture2D(texture0, mUv0);
            } else if (mUv1.x > 0.0 && mUv1.x < uSize && mUv1.y > 0.0 && mUv1.y < uSize) {
                gl_FragColor = texture2D(texture1, mUv1);
            } else if (mUv2.x > 0.0 && mUv2.x < uSize && mUv2.y > 0.0 && mUv2.y < uSize) {
                gl_FragColor = texture2D(texture2, mUv2);
            } else if (mUv3.x > 0.0 && mUv3.x < uSize && mUv3.y > 0.0 && mUv3.y < uSize) {
                gl_FragColor = texture2D(texture3, mUv3);
            } else {
                gl_FragColor = vec4(0.0);
            }
           

            
            
        }`,
            uniforms: uniforms,
            count: 6,
            attributes: quadShader.attributes,
            elements: quadShader.elements,
            depth: {enable: false},
        });
    }
};