/**
 * Description. A layer object to control what is shown on the map
 *
 * @file   This files defines the Layer_Manager class.
 * @author Kevin Worthington
 *
 * @param {Object} properties     The properties passed as a json object specifying:


*/

class Layer_Manager {
  constructor(properties) {
    //store all the properties passed
    for (var p in properties){
        this[p]=properties[p]
    }

  }
  create_geojson(subset,location_col){
    var geojson={ "type": "FeatureCollection","features": []}

     for (var i=0;i<subset.length;i++){
        var loc =subset[i][location_col].split(",")
       if(loc.length>1){
        geojson.features.push({
          "type": "Feature",
          "properties": {},
          "geometry": {
            "coordinates": [loc[1],loc[0]],
            "type": "Point"
          }
        })
       }


     }
    this.show_json({
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          29.732806781543985,
          14.01518726935133
        ],
        "type": "Point"
      }
    }
  ]
}, L.layerGroup(),1)
  }
   show_json(data,layer_obj,_resource_id){
    var $this = this

    // custom points
    var layer_options ={}
    layer_options.color="#ffffff";
    layer_options.fillColor="#0290ce";
    layer_options.weight=1;
    var resource_marker_class = "_marker_class"+_resource_id

    $("<style type='text/css'> ."+resource_marker_class+"{ border: "+layer_options.weight+"px solid "+layer_options.color+"; background-color:"+layer_options.fillColor+";} </style>").appendTo("head");


    console_log("AJAX","Loaded")
     var markers = L.markerClusterGroup();
     var unique_id=0;
    L["geoJSON"](data,{

        onEachFeature: function(feature, layer){

            var style = {}
            if(feature.properties?.color){
                style.fillColor= feature.properties.color
                style.color= feature.properties.color
                 style.opacity= 0
            }
            // if we don't have an id, add one artificially called '_id'
            // be sure to exclude this from export
            if (!feature.properties?.id){
                feature.properties._id=unique_id++
            }else{
                feature.properties._id = feature.properties.id
            }
            var geo =L.geoJSON(feature, {pane: _resource_id, style: style,
                pointToLayer: function(feature, latlng) {
                    return L.marker(latlng, {
                        icon: map_manager.get_marker_icon(resource_marker_class)
                      });
                },
            })
            // force a layer id for access
            geo._leaflet_id = feature.id;


             //temp add service options

             geo.on('click', function(e) { $this.layer_click(e,_resource_id) });
             markers.addLayer(geo);
        }
    })
    layer_obj.addLayer(markers)
    layer_obj.data = data
    console.log(this.map)
    layer_obj.addTo(this.map);
    //
    console_log(layer_obj)

    //$this.show_bounds(markers.getBounds())

    //$this.layer_load_complete({layer_id:_resource_id})
}

}

