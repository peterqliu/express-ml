# express-ml

A library of convenience methods for MapLibre GL. Greatly simplifies working with layers at runtime.

    - Specify all layer properties (source, filter, paint, layout, minzoom, etc) and mouse events in a single shallow object. No
    - Add layers without source data, or regard for asynchronous load events

## Usage

```
const map = new ExpressML(library)
    .Map(options);
```

Instantiates a new map object.

`library`: a MapLibre or MapboxGL library class
`options`: map options object, equivalent to the one consumed by `maplibregl.Map`

Returns an instance of `ExpressMLMap`, with all the features of `maplibregl.Map` plus the following.

## `ExpressMLMap` API

### `.add{layerType}(id[, options, after])`

Add layer of the corresponding type, on map load (if not already loaded). 

`layerType`: one of `Circle`, `Line`, `Fill`, `Text`, `Icon`, `Background`. Text and Icon are actually symbol layers, but handy when needing just one or the other. To add symbol layers with both text and icons, use the vanilla `map.addLayer()` method.

`id`: string. name of layer

`options` (optional): a shallow object of all layer properties (except id). All parameters optional.

Sources: one of the following. If none, uses an empty geojson source by default.
`source`: string. reference to an existing layer, much like the vanilla implementation of `layer.source` 
`geojson`: string or object (geojson). GeoJSON source by url string, or literal geojson object.
`vector` + `source-layer`: string. vector tile source, plus source layer.

most other params of `map.addLayer()` can be added similarly, without nesting into source/layout/paint sub-objects. 


For example, these two operations are equivalent:

```
map.on('load', () => {
    map.addLayer({
        id: 'name', 
        type: 'symbol',
        minzoom: 12,
        source: {
            type: 'geojson',
            data: 'https://www.example.com/data.geojson'
        }, 
        layout: {
            'text-field': 'label', 
            'symbol-placement': 'line'
        }
        paint: {
            'text-color': 'blue'
        }
    })
    .on('click', 'name', e => console.log(e.features[0]))
})

```

```
// no load event necessary
map.addText(                                                
    'name', 
    {
        geojson: 'https://www.example.com/data.geojson',    // put geojson source directly in object
        field: 'label',                                     // infers the "text-" prefix automatically, from layer type
        placement: 'line',                                  // ...while also handling obligatory "symbol-" prefixes
        minzoom: 12,                                        // accepts root-level layer properties
        color: 'blue'                                       // paint properties too 
        onClick: ft => console.log(ft)                      // plus mouse events
    }
)
```

see `example.html` for more usage examples.

Mouse events: 
Events on layers can also be added to the options object.

`on{Click|Mouseover|Mouseout|Mouseenter|MouseLeave|Mouseup|Mousemove|Dblclick|Contextmenu}(fn(firstFeature, event))`

Add a mouse event handler to the layer. The callback function receives two arguments: the first feature returned, and the mouse event object. To illustrate, these are equivalent

```
    {
        ...,
        onClick: (firstElement, event) => {console.log(firstElement, event)}
    }
```

```
    map.on('click', {layerName}, e=>{
        console.log(e.features[0], e)
    }), 
```

### `.remove(id)`

Remove a layer.
`id`: string. ID of layer to remove

### `.setSourceData(id, data)`

Shorthand for `map.getSource(id).setData(data)`. GeoJSON sources only.
