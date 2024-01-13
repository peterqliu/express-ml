class ExpressML {
    
    constructor(ml) {

        this.library = ml;
        return this;
    }

    Map(options) {

        const style = this.#blankStyle;

        class ExpressMLMap extends this.library.Map {

            constructor(o) {

                // use blank style as default
                super({style, ...o});
            }
            
            // data structure of a layer object
            #propType = {

                root: ['minzoom', 'maxzoom', 'source', 'source-layer', 'filter'],

                // custom source properties to be bundled into source object
                source: ['geojson', 'vector'],

                // any layer using these props make them layout props
                layout: [
                    'cap', 'join', 'miter', 'round-limit', 'sort', //lines
                    // 'allow-overlap', 'anchor', 'field', 'font', 
                    'visibility'
                ],
            
                // props containing these strings are paint properties 
                // (specifically used for symbol layers)
                symbolPaints:[
                    'color', 'opacity', 'halo', 'translate'
                ],

                symbolLayers:['text', 'icon'],

                // props containing these strings need a `symbol-` prefix,
                // even if they are added as text layers
                obligateSymbolPrefixes: ['placement', 'sort-key', 'avoid-edges', 'spacing', 'z-order']
            }

            // trigger function if map is loaded, or
            // on load event if it's not yet loaded.
            // lets user call any MLExpress method before loading
            #whenLoaded(fn) {
                if (this.loaded() || this.initialLoad) {
                    this.initialLoad = true; 
                    return fn()
                }
                else return this.once('load', fn)   
            }

            #beta = {
                queryFeatures(event, layer, cb) {
                    this.on(event, e=>{
                        const features = this
                            .queryRenderedFeatures(e.point, {layers: [layer]})
                        cb(features)
                    })
    
                    return this
                },
    
                queryOnClick(layers, cb) {
                    this.on('click', e=>{
                        const features = this
                            .queryRenderedFeatures(e.point, {layers})
                        cb(features)
                    })
    
                    return this        
                },
                
                bbox() {
                    return this.getBounds().toArray()
                    .flat();
                }

            }

            addBackground(id, style, after) {
                return this.#addGenericLayer('background', id, null, style, after)
            }

            addCircle(id, style, after) {
                return this.#addGenericLayer('circle', id, style, after)
            }

            addLine(id, style, after) {
                return this.#addGenericLayer('line', id, style, after)
            }

            addFill(id, style, after) {
                return this.#addGenericLayer('fill', id, style, after)
            }

            addSymbol(id, layout, paint, after) {

                const isVTSource = layout['source-layer'];
                return this.#whenLoaded(()=>this.addLayer({
                    id,
                    type: 'symbol',
                    source: this._formatSource(data, isVTSource),
                    layout,
                    paint
                }, after))

            }

            addText(id, style, after) {

                    const isVTSource = style['source-layer'];
                    return this.#whenLoaded(()=>this.addLayer({
                        id,
                        type: 'symbol',
                        ...this.#formatStyle(style, 'text')
                    }, after))

            }

            addIcon(id, style, after) {

                const isVTSource = style['source-layer'];
                return this.#whenLoaded(()=>this.addLayer({
                    id,
                    type: 'symbol',
                    ...this.#formatStyle(style, 'icon')
                }, after))

            }
            remove(id) {
                if (this.getLayer(id)) this.removeLayer(id)
                else console.error(`.remove(): Map has no layer named "${id}"`)
            }

            #addGenericLayer(type, id, style, after) {

                const isVTSource = style?.['source-layer'];

                return this.#whenLoaded(()=>this.addLayer({
                    id,
                    type,
                    ...this.#formatStyle(style, type)
                }, after))
            }

            
            setSourceData(source, data) {
                return this.#whenLoaded(() => {

                    const s = this.getSource(source);
                    
                    if (s) s.setData(this.#formatGeoJSON(data));
                    else console.error(`Source "${source}" not found.`)
                })

            }

            // handles geojson or geojson features array, or url to a remote geojson
            #formatGeoJSON(raw) {

                // url
                if (typeof raw === 'string') return raw

                else if (typeof raw === 'object') {

                    // array
                    if (raw.length) return {type: 'FeatureCollection', features: raw}
                    // full geojson
                    else return raw
                }
            }

            // given a layer type and a property, determine whether it's a
            // paint, layout, source, or root-level property
            #resolvePropType(layerType, prop) {

                const {root, source, layout, symbolPaints} = this.#propType

                // identify root props
                if (root.find(substring=>prop.includes(substring))) return 'root'

                if (source.includes(prop)) return 'source'
                const isSymbolLayer = ('textsymbolicon')
                    .includes(layerType);    

                let isPaintProperty;

                // for symbol layers, check paintprop list 
                if (isSymbolLayer) {
                    isPaintProperty = symbolPaints
                        .find(substring=>prop.includes(substring));
                }

                // for other layer types, check layout props
                else {
                    isPaintProperty = !layout
                        .find(substring=>prop.includes(substring));
                }    

                return isPaintProperty ? 'paint' : 'layout'

            }

            #formatStyle(obj, layerType) {

                const formattedStyle = {
                    source: {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []}
                    },
                    layout: {}, 
                    paint: {}
                };

                if (!obj) return formattedStyle

                const {obligateSymbolPrefixes, symbolLayers} = this.#propType;
                
                // iterate through input properties, append their layer prefixes,
                // and arrange them in the root, or source/layout/paint objects
                Object.entries(obj)
                    .forEach(([property,value]) => {

                        const propType = this.#resolvePropType(layerType, property);
                        if (!propType) console.error(`Unknown property "${property}"`)

                        let prefixedProperty = `${layerType}-${property}`;
                        if (symbolLayers.includes(layerType) && obligateSymbolPrefixes.includes(property)) prefixedProperty = `symbol-${property}`;

                        // handle source parameters (geojson or vector)
                        if (propType === 'source') formattedStyle.source = {
                            type: property,
                            data: value
                        }

                        // apply root properties
                        else if (propType === 'root') formattedStyle[property] = value;

                        // apply layout/paint properties
                        else formattedStyle[propType][prefixedProperty] = value;
                    })

                return formattedStyle
            }

        }

        return new ExpressMLMap(options)
    } 

    #blankStyle = {
        "glyphs": "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        "layers": [],
        "sources": {
    
        },
        "version": 8
    }
}

var test = {foo:true}
