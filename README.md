# MBTiles.js Pure JavaScript MBTiles parser. 

MBTiles.js is a pure JavaScript [MBTiles](http://mapbox.com/developers/mbtiles/), based on compiling the SQLite C code with [Emscripten](https://github.com/kripken/emscripten).

SQLite is public domain, MBTiles.js is MIT licensed.

## Conception

[Making the library which can parse MBTiles by Browser JavaScript](http://d.hatena.ne.jp/kochizufan/20130324/1364093952)

## Example

[JavaScript MBTiles Parser](http://jsfiddle.net/kochizufan/rj4Eh/)

## Usage

```javascript
var mbt = MBTiles.load(
  'http://t.tilemap.jp/jcp_maps/shimabara.mbtiles',
  function(me) {
    var centerVal = me.metadata('center').split(",");
    var boundVal  = me.metadata('bounds').split(",");
    var bounds    = new L.LatLngBounds( new L.LatLng(boundVal[1],boundVal[0]), new L.LatLng(boundVal[3],boundVal[2]) );
    console.log(boundVal);
    var MBLayer = L.TileLayer.extend({
      options: {
        minZoom: me.metadata('minzoom'),
        maxZoom: me.metadata('maxzoom'),
        tileSize: 256,
        tms: true,
        errorTileUrl: '',
        attribution: me.metadata('attribution'),
        zoomOffset: 0,
        opacity: 1,
        bounds: bounds,
        continuousWorld: true,
        unloadInvisibleTiles: L.Browser.mobile,
        updateWhenIdle: L.Browser.mobile
      },
      getTileUrl: function (tilePoint) {
        this._adjustTilePoint(tilePoint);
        var tile = me.getTileImage(tilePoint.x, tilePoint.y, this._getZoomForUrl());
        return tile;
      }
    }); 
    
    var MBLayerObj = new MBLayer('dummy',{tms:true});
    var map = new L.Map('map',
      {
        minZoom: me.metadata('minzoom'),
        maxZoom: me.metadata('maxzoom')
      }
    );
    console.log(me.metadata('minzoom'));
    map.addLayer(MBLayerObj);
    console.log(centerVal);
    //map.setView(new L.LatLng(parseFloat(centerVal[1]),parseFloat(centerVal[0])),parseInt(centerVal[2]));
    map.fitBounds(bounds);
  }
);
```

## System requirement (checked)

* working on: IE10 on Windows 7, Chrome25 on Mac, Safari6.0.3 on Mac, FireFox19.0.2 on Mac, Opera12.14 on Mac, and Mobile Safari on iOS6
* not working on: IE9 and Android(Both native browser and Chrome)

