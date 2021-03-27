/*
 * @class GridLayer.GL
 * @inherits GridLayer
 *
 * This `GridLayer` runs some WebGL code on each grid cell, and puts an image
 * with the result back in place.
 *
 * The contents of each cell can be purely synthetic (based only on the cell
 * coordinates), or be based on some remote tiles (used as textures in the WebGL
 * shaders).
 *
 * The fragment shader is assumed to receive two `vec2` attributes, with the CRS
 * coordinates and the texture coordinates: `aCRSCoords` and `aTextureCoords`.
 * If textures are used, they are accesed through the uniforms `uTexture0` through `uTexture7`
 * There will always be four vertices forming two triangles (a quad).
 *
 */


L.TileLayer.Regl = L.GridLayer.extend({

    options: {
        // @option tileUrls: Array
        // Array of tile URL templates (as in `L.TileLayer`), between zero and 8 elements.
        tileUrls: [],

        measurePixels: false,

        // @option fragmentShader: String
        // A string representing the GLSL fragment shader to be run.
        // This must NOT include defining the variants or the texture uniform.
        fragmentShader: 'void main(void) {gl_FragColor = vec4(0.2,0.2,0.2,1.0);}',

        subdomains: ['a', 'b', 'c', 'd']
    },

    // On instantiating the layer, it will initialize all the GL context
    //   and upload the shaders to the GPU, along with the vertex buffer
    //   (the vertices will stay the same for all tiles).
    initialize: function (options) {
        options = L.setOptions(this, options);

        this._renderer = L.DomUtil.create('canvas');
        this._renderer.width = this._renderer.height = options.tileSize;
        // document.body.appendChild(this._renderer);

        this._tileImagesCache = {};
        this._tileRenders = {};
        this._tileImages = {};
        this._tileCanvasCache = {};

        this._uniformProperties = {};
        this._uniformTypes = {};

        const gl = this._renderer.getContext("webgl", {preserveDrawingBuffer: true, antialias: false});//antialias: false,

        regl = createREGL({gl: gl});
        this._regl = regl;

        Object.keys(this.options.uniformProps).forEach((k) => {
            let uniformProp = this.options.uniformProps[k];
            if (uniformProp.image) {
                const texture = regl.texture(uniformProp.image);
                this._uniformProperties[k] = regl.framebuffer({
                    color: texture
                })
            } else {
                this._uniformProperties[k] = uniformProp;
            }
            if (this.options.uniformPropTypes) {
                this._uniformTypes[k] = this.options.uniformPropTypes[k] || 'float';
            } else {
                this._uniformTypes[k] = 'float';
            }


        });

        const quadVerts = [
            [-1.0, -1.0],
            [+1.0, -1.0],
            [-1.0, +1.0],
            [-1.0, +1.0],
            [+1.0, -1.0],
            [+1.0, +1.0]
        ];

        const declarations = [];
        const uniforms = {};

        for (let i = 0; i < this.options.tileUrls.length && i < 8; i++) {
            declarations.push(`uniform sampler2D uTexture${i};`);
            uniforms[`uTexture${i}`] = regl.prop(`texture${i}`);

            declarations.push(`uniform float uImageScale${i};`);
            uniforms[`uImageScale${i}`] = regl.prop(`imageScale${i}`);

            declarations.push(`uniform float uOffsetX${i};`);
            uniforms[`uOffsetX${i}`] = regl.prop(`offsetX${i}`);

            declarations.push(`uniform float uOffsetY${i};`);
            uniforms[`uOffsetY${i}`] = regl.prop(`offsetY${i}`);
        }
        uniforms['uZoom'] = regl.prop('zoom');
        declarations.push(`uniform float uZoom;`);

        Object.keys(this._uniformProperties).forEach((k) => {
            uniforms['u_' + k] = regl.prop(k);
            const type = this._uniformTypes[k];
            declarations.push(`uniform ${type} ${'u_' + k};`);
        });

        const attributes = {};
        attributes['aCRSCoords'] = [];//regl.prop('crsData');
        attributes['aLatLngCoords'] = [];//regl.prop('latLngData');
        attributes['a_position'] = quadVerts;

        this._draw = regl({
            // language=GLSL
            vert: `
        const vec2 madd = vec2(0.5, 0.5);
        attribute vec2 a_position;
        attribute vec2 aCRSCoords;
        attribute vec2 aLatLngCoords;
        varying vec2 vCRSCoords;
        varying vec2 vLatLngCoords;
        varying vec2 textureCoord;
        
        void main() {
           textureCoord = a_position.xy * madd + madd; // scale vertex attribute to [0-1] range
           textureCoord.y = 1.0 - textureCoord.y;
           gl_Position = vec4(a_position.xy, 0.0, 1.0);
           //vCRSCoords = aCRSCoords; //TODO figure out how to pass these in REGL (not using for now though...)
//           vLatLngCoords = aLatLngCoords;
        }
  `,

            // language=GLSL
            frag: `
        precision mediump float;
        ${declarations.join('\n')}
        varying vec2 textureCoord;
        varying vec2 vCRSCoords;
        varying vec2 vLatLngCoords;
        ${this.options.fragmentShader}
  `,
            attributes: attributes,
            uniforms: uniforms,
            // elements: indices,
            count: 6
        });

        /*
        // language=GLSL
        const vertexShaderCode =
            `
            const vec2 madd = vec2(0.5, 0.5);
			attribute vec2 aPosition;
//			attribute vec2 aTextureCoords;
			attribute vec2 aCRSCoords;
			attribute vec2 aLatLngCoords;
			varying vec2 vTextureCoords;
			varying vec2 vCRSCoords;
			varying vec2 vLatLngCoords;
			void main(void) {
                gl_Position = vec4(aPosition.xy, 0.0, 1.0);

                vTextureCoords = aPosition.xy * madd + madd; // scale vertex attribute to [0-1] range
                vTextureCoords.y = 1.0 - vTextureCoords.y;
                vCRSCoords = aCRSCoords;
                vLatLngCoords = aLatLngCoords;
			}
        `;

        const imageDeclarations = [];
        const uniforms = {};

        for (let i = 0; i < this.options.tileUrls.length && i < 8; i++) {
            imageDeclarations.push(`uniform sampler2D uTexture${i};`);
            uniforms[`uTexture${i}`] = regl.prop(`texture${i}`);
        }

        // language=GLSL
        let fragmentShaderHeader =
            `
            precision highp float;
            varying vec2 vTextureCoords;
            varying vec2 vCRSCoords;
            varying vec2 vLatLngCoords;
            ${imageDeclarations.join('\n')}
            uniform int uZoom;
            uniform float uHeight;
            `;

        const attributes = {};
        // attributes['aTextureCoords'] = regl.buffer([
        //     1.0, 0.0,
        //     0.0, 0.0,
        //     1.0, 1.0,
        //     0.0, 1.0,
        // ]);
        // attributes['aPosition'] = regl.buffer([
        //     -2, 0,
        //     0, -2,
        //     2, 2
        // ]);
        attributes['aPosition'] = quadVerts;

        attributes['aCRSCoords'] = regl.prop('crsData');
        attributes['aLatLngCoords'] = regl.prop('latLngData');

        uniforms['uZoom'] = regl.prop('zoom');
        uniforms['uHeight'] = regl.prop('height');

        // let reglOptions = {
        //     vert: vertexShaderCode,
        //     frag: fragmentShaderHeader + this.options.fragmentShader,
        //     attributes: attributes,
        //     uniforms: uniforms,
        //     count: 3
        // };
        let reglOptions = {
            vert: vertexShaderCode,
            frag: fragmentShaderHeader + this.options.fragmentShader,
            attributes: attributes,
            uniforms: uniforms,
            count: 6
        };

        this._draw = regl(reglOptions);
        */
    },

    // @method getGlError(): String|undefined
    // If there was any error compiling/linking the shaders, returns a string
    // with information about that error. If there was no error, returns `undefined`.
    getGlError: function () {
        return this._glError;
    },

    // This is called once per tile - uses the layer's GL context to
    //   render a tile, passing the complex space coordinates to the
    //   GPU, and asking to render the vertexes (as triangles) again.
    // Every pixel will be opaque, so there is no need to clear the scene.
    _render: function (coordsId, coords, textureImages) {
        const tileBounds = this._tileCoordsToBounds(coords);
        const west = tileBounds.getWest(),
            east = tileBounds.getEast(),
            north = tileBounds.getNorth(),
            south = tileBounds.getSouth();

        // Create data array for LatLng buffer
        const latLngData = [
            // Vertex 0
            east, north,

            // Vertex 1
            west, north,

            // Vertex 2
            east, south,

            // Vertex 3
            west, south,
        ];

        // ...also create data array for CRS buffer...
        // Kinda inefficient, but doesn't look performance-critical
        const crs = this._map.options.crs;
        const min = crs.project(L.latLng(south, west));
        const max = crs.project(L.latLng(north, east));

        const crsData = [
            // Vertex 0
            max.x, max.y,

            // Vertex 1
            min.x, max.y,

            // Vertex 2
            max.x, min.y,

            // Vertex 3
            min.x, min.y,
        ];

        let props = {
            latLngData: latLngData,
            crsData: crsData,
            zoom: this._tileZoom,
        };

        Object.keys(this._uniformProperties).forEach((k) => {
            props[k] = this._uniformProperties[k];
        });

        if (textureImages) {
            const tileSize = this.getTileSize();
            textureImages.forEach((textureImage, i) => {
                props[`texture${i}`] = textureImage.texture();
                const offsetAndScale = this.calculateOffsetAndScale(coords, textureImage.textureCoords);
                props[`offsetX${i}`] = offsetAndScale.offset.x / offsetAndScale.scale;
                props[`offsetY${i}`] = offsetAndScale.offset.y / offsetAndScale.scale;
                props[`imageScale${i}`] = offsetAndScale.scale;
            });
        }

        regl.clear({
            color: [0, 0.2, 0, 1],
            depth: 1
        });
        this._draw(props);

    },

    // Monkey-patch some of the L.TileLayer methods so we can call getTileUrl
    // without errors
    _getSubdomain: L.TileLayer.prototype._getSubdomain,
    _getZoomForUrl: function () {
        return this._tileZoom;
    },

    setUniformProperty: function (props) {
        Object.keys(props).forEach((k) => {
            this._uniformProperties[k] = props[k];
        });
        // this._tileUpdater();
        // this.redraw();

        this.renderAll();
    },

    getRegl: function (callback) {
        callback(this._regl, this._tileImagesCache);
    },

    getTileRects: function (latlng, size) {
        const z = this._map.getZoom();

        const tileSize = {x: 256, y: 256};
        const pixelPoint = this._map.project(latlng, z);
        const coords = pixelPoint.unscaleBy(tileSize);
        coords.z = z;
        const coordsFl = {x: Math.floor(coords.x), y: Math.floor(coords.y), z: z};

        let limitZoom = z;
        let textureCoordsFl;
        if (this.options.tileRectZoom) {
            limitZoom = this.options.tileRectZoom;
        }
        textureCoordsFl = this.getOverlappingTile(z, coordsFl);
        let textureCoords = coords;
        if (limitZoom < z) {
            const texPixelPoint = this._map.project(latlng, limitZoom);
            textureCoords = texPixelPoint.unscaleBy(tileSize);
            textureCoordsFl = this.getOverlappingTile(limitZoom, coordsFl);
        }
        //coordsFl is the zoom for the output image (including zooms beyond)
        //textureCoords is the zoom for the source image tile being rendered
        //we normalize the mouse rectangle into the source image space (the rectangle gets smaller for larger zooms)
        const offsetAndScale = this.calculateOffsetAndScale(coordsFl, textureCoordsFl);
        const {scale} = offsetAndScale;

        const tileRenderSize = {x: tileSize.x * scale, y: tileSize.y * scale};

        const tileImages = [];

        // Object.keys(this._tileImages).forEach((k) => {
        //     const arr = this._tileImages[k];
        //     arr.forEach((im, i) => {
        //         textureCoordsFl = im.textureCoords;
        //     });
        // });
        const addTileImages = (center, rect, offset) => {
            const coordsOffset = {x: coordsFl.x + offset.x, y: coordsFl.y + offset.y, z: z};
            const ttCoords = this.getOverlappingTile(limitZoom, coordsOffset);
            const coordsId = `${ttCoords.x}:${ttCoords.y}:${ttCoords.z}`;
            let textureImages;
            if (this._tileImages[coordsId]) {
                textureImages = this._tileImages[coordsId].map(t => t.image)
            }
            tileImages.push({
                center: center,
                rect: rect,
                offset: offset,
                textureImages: textureImages,
                coords: [coordsOffset.x, coordsOffset.y, coordsOffset.z],
                textureCoords: [ttCoords.x, ttCoords.y, ttCoords.z]
            });
        };

        //we use the position within the texture tile (based off the current mouse position) as the 'center' for the rect
        const center = {
            x: tileRenderSize.x * (textureCoords.x - textureCoordsFl.x),
            y: tileRenderSize.y * (textureCoords.y - textureCoordsFl.y)
        };

        //and then scale the rect down to account for the relative scale of the texture tiles
        center.x /= scale;
        center.y /= scale;

        const rect = {
            x: center.x - (size / scale) / 2,
            y: center.y - (size / scale) / 2,
            width: size / scale,
            height: size / scale,
        };

        const addTileRect = (ox, oy) => {
            const right = rect.x + rect.width;
            const bottom = rect.y + rect.height;

            // console.log(tileRenderSize, tileSize);
            if (ox < 0 && rect.x >= 0) return;
            if (oy < 0 && rect.y >= 0) return;

            if (ox > 0 && right <= tileSize.x) return;
            if (oy > 0 && bottom <= tileSize.y) return;

            const center = {x: rect.width / 2, y: rect.height / 2};


            let x = rect.x;
            let width = rect.width;
            if (ox === 0) {
                if (rect.x < 0) {
                    x = 0;
                    width = rect.x + rect.width;
                    center.x += rect.x;
                }
                if (right > tileSize.x) {
                    width = tileSize.x - rect.x;
                }
            }
            if (ox < 0 && rect.x < 0) {
                x = tileSize.x + rect.x;
                width = -rect.x;
            }
            if (ox > 0 && right > tileSize.x) {
                x = 0;
                width = right - tileSize.x;
                center.x = width - rect.width / 2;
            }

            let y = rect.y;
            let height = rect.height;
            if (oy === 0) {
                if (rect.y < 0) {
                    y = 0;
                    height = rect.y + rect.height;
                    center.y += rect.y;
                }
                if (bottom > tileSize.y) {
                    height = tileSize.y - rect.y;
                }
            }
            if (oy < 0 && rect.y < 0) {
                y = tileSize.y + rect.y;
                height = -rect.y;
            }

            if (oy > 0 && bottom > tileSize.y) {
                y = 0;
                height = bottom - tileSize.y;
                center.y = height - rect.height / 2;
            }
            addTileImages({
                x: Math.round(center.x),
                y: Math.round(center.y),
            }, {
                x: Math.floor(x),
                y: Math.floor(y),
                width: Math.ceil(width),
                height: Math.ceil(height)
            }, {x: ox, y: oy});

        };

        //inspect all 9 tiles around the mouse. up to 4 will be added depending on mouse position
        //these offsets are used in texture tile coordinate space (not current tile zoom)
        //and rely on the resizing of the mouse-rectangle to determine if adjacent coords are needed
        for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
                addTileRect(ox, oy);
            }
        }

        return {
            mouseRect: rect,
            tileRects: tileImages
        }
    },

    renderAll: function () {
        const renderedIds = [];
        const notRenderedIds = [];
        Object.keys(this._tileRenders).forEach((coordsId) => {
            if (!this._tiles[coordsId]) {
                //don't rerender if tile has been unloaded using _removeTile
                // console.log('NOT rendering offscreen tile: ' + coordsId);
                notRenderedIds.push(coordsId);
                return;
            }
            const renderFn = this._tileRenders[coordsId];
            renderFn();
            renderedIds.push(coordsId);
        });
        // console.log('renderAll: TOTAL NOT RENDERED: ' + notRenderedIds.length + ': ' + notRenderedIds.join('; '));
        // console.log('renderAll: TOTAL RENDERED: ' + renderedIds.length + ': ' + renderedIds.join('; '));
        this.totalPixelsRendered = renderedIds.length * 256 * 256;
    },
    getOverlappingTile: function (zoom, coords) {
        if (coords.z <= zoom) {
            return coords;
        } else {
            const scale = Math.pow(2, (coords.z - zoom));
            const posX = Math.floor(coords.x / scale);
            const posY = Math.floor(coords.y / scale);
            const point = L.point(posX, posY);
            point.z = zoom;
            return point;
        }
    },
    calculateOffsetAndScale: function (tileCoords, textureCoords) {
        if (!textureCoords || tileCoords.z === textureCoords.z) {
            return {offset: {x: 0, y: 0}, scale: 1};
        }

        if (tileCoords.z > textureCoords.z) {
            const scale = Math.pow(2, (tileCoords.z - textureCoords.z));
            const posX = Math.floor(textureCoords.x * scale);
            const posY = Math.floor(textureCoords.y * scale);
            return {offset: {x: tileCoords.x - posX, y: tileCoords.y - posY}, scale: scale};
        }
    },
    createTile: function (coords, done) {
        let coordsId = this._tileCoordsToKey(coords);
        let tile = this._tileCanvasCache[coordsId];
        if (!tile) {
            // console.log('createTile ' + coordsId);
            tile = L.DomUtil.create('canvas', 'leaflet-tile');
            tile.width = tile.height = this.options.tileSize;
            tile.onselectstart = tile.onmousemove = L.Util.falseFn;
            this._tileCanvasCache[coordsId] = tile;
        } else {

        }

        const ctx = tile.getContext('2d');
        if (this.options.tileUrls.length === 0) {
            this._render(coordsId, coords);
            ctx.drawImage(this._renderer, 0, 0);
            setTimeout(done, 50);
        } else {
            const texFetches = [];

            const getUrl = (url, textureCoords) => {
                this._url = url;
                return L.TileLayer.prototype.getTileUrl.call(this, textureCoords);
            };

            for (let i = 0; i < this.options.tileUrls.length && i < 8; i++) {
                const tileSource = this.options.tileUrls[i];
                let limits = {};
                let textureCoords = coords;
                if (this.options.limits) {
                    limits = this.options.limits[i];
                    if (limits.zoom < coords.z) {
                        textureCoords = this.getOverlappingTile(limits.zoom, coords);
                    }
                }

                if (tileSource.canvasRender) {
                    //a canvas renderer can be used to pre-compose tiles to be used before sending them to the GPU
                    //this is slower than direct GPU, but allows for CPU-based logic and overcomes restrictions in total # of
                    //images used on each tile

                    const cr = tileSource.canvasRender;
                    if (!cr.loadedImages) {
                        console.log('GENERATING loadedImages (should happen once only)');
                        cr.loadedImages = {};//use a centralized cache based on the canvasRenderer being shared between tiles
                    }
                    const tileId = textureCoords.x + '_' + textureCoords.y + '_' + textureCoords.z;
                    if (!cr.loadedImages[tileId]) {
                        console.log(`-- GENERATING canvas for tileId ${tileId} (should happen once per tile id)`);
                        //we only make one canvas per tileId (can be shared between multiple tiles if zoom mismatch)
                        const canvasTile = L.DomUtil.create('canvas', 'leaflet-canvas-tile');
                        canvasTile.width = canvasTile.height = this.options.tileSize;
                        cr.loadedImages[tileId] = {
                            canvas: canvasTile,
                            cache: {},
                            images: {},
                            needsRender: true,
                            needsUpdate: true
                        };
                    }
                    const canvasTexFetches = [];

                    const canvasSet = cr.loadedImages[tileId];
                    Object.keys(cr.urls).forEach((id) => {
                        const tileUrl = cr.urls[id];
                        canvasTexFetches.push(new Promise(function (resolve, reject) {
                            const fullSrc = getUrl(tileUrl, textureCoords);
                            if (canvasSet.cache[fullSrc]) {
                                let cacheElement = canvasSet.cache[fullSrc];
                                resolve(cacheElement);
                                return;
                            }
                            const tile = document.createElement('img');
                            tile.crossOrigin = '';
                            tile.src = fullSrc;
                            L.DomEvent.on(tile, 'load', () => {
                                canvasSet.images[id] = canvasSet.cache[fullSrc] = {
                                    tileUrl: tileUrl,
                                    image: tile,
                                    textureCoords: textureCoords
                                };
                                resolve(canvasSet.cache[fullSrc]);
                            });
                            L.DomEvent.on(tile, 'error', () => {
                                canvasSet.cache[fullSrc] = {error: 'load failed'};
                                resolve(canvasSet.cache[fullSrc]);//resolve with an error for more consistent handling of sets
                            });
                        }));


                    });

                    Promise.all(canvasTexFetches)
                        .catch(function (tileError) {
                            console.log(tileError);
                        })
                        .then(function (canvasTextureImages) {
                            //Note that onload will be called once for each tile e.g. z level 14
                            //(but canvasRender should batch renders so we only update each source zoom tile once)
                            cr.onLoad(canvasTextureImages);
                        });


                    texFetches.push(new Promise(function (resolve, reject) {//Not a real 'fetch' but treat the same for the promises handling
                        const getTex = () => {
                            if (cr.loadedImages[tileId].needsUpdate) {
                                console.log('REGL NEW canvas texture ' + tileId);
                                cr.loadedImages[tileId].texture = regl.texture(cr.loadedImages[tileId].canvas);
                                cr.loadedImages[tileId].needsUpdate = false;//will update when
                            }
                            return cr.loadedImages[tileId].texture;
                        };
                        resolve({
                            image: cr.loadedImages[tileId].canvas,
                            texture: getTex,
                            textureCoords: textureCoords
                        });
                    }));
                    continue;
                }

                texFetches.push(new Promise(function (resolve, reject) {
                    //TODO the current implementation relies on a modification of leaflet source in getTileUrl
                    const fullSrc = getUrl(tileSource, textureCoords);//uses this._url
                    if (this._tileImagesCache[fullSrc]) {
                        let cacheElement = this._tileImagesCache[fullSrc];
                        resolve(cacheElement);
                        return;
                    }
                    const tile = document.createElement('img');
                    tile.crossOrigin = '';
                    tile.src = fullSrc;
                    // L.DomEvent.on(tile, 'load', resolve.bind(this, tile));

                    L.DomEvent.on(tile, 'load', () => {
                        const texture = regl.texture(tile);
                        console.log('REGL NEW image texture ' + fullSrc);
                        this._tileImagesCache[fullSrc] = {
                            image: tile,
                            texture: () => texture,
                            textureCoords: textureCoords
                        };
                        resolve(this._tileImagesCache[fullSrc]);
                    });
                    L.DomEvent.on(tile, 'error', () => {
                        this._tileImagesCache[fullSrc] = {error: 'load failed'};
                        resolve(this._tileImagesCache[fullSrc]);//resolve with an error for more consistent handling of sets
                    });
                    console.log('reload tile image');
                }.bind(this)));
            }

            Promise.all(texFetches)
                .catch(function (tileError) {
                    console.log(tileError);
                })
                .then(function (textureImages) {
                    //called once per tile, but includes all texture images specified (up to 8)
                    if (!this._map) {
                        done();
                        return;
                    }

                    if (!textureImages || this.options.tileUrls.length !== textureImages.length) {
                        // console.log('Missing images');
                        done();
                        return;
                    }
                    let hasError = false;
                    textureImages.forEach((t, i) => {
                        if (t.error) hasError = true;
                    });

                    if (hasError) {
                        done();
                        return;
                    }

                    if (!this._tileRenders[coordsId]) {
                        this._tileRenders[coordsId] = () => {
                            // noinspection SillyAssignmentJS
                            tile.width = tile.width;//clear canvas
                            this._render(coordsId, coords, textureImages);
                            ctx.drawImage(this._renderer, 0, 0);
                        };
                        this._tileImages[coordsId] = textureImages;
                    }
                    this._tileRenders[coordsId]();

                    done();
                }.bind(this));
        }

        return tile;
    },


});


L.tileLayer.regl = function (opts) {
    return new L.TileLayer.Regl(opts);
};
