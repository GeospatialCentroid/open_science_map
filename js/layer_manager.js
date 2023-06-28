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
     this.layers=[]
     this.first_load=true;// to control the initial zooming while the map is initializing
  }
  create_geojson(subset,location_col,popup_properties){
    var geojson={ "type": "FeatureCollection","features": []}
     for (var i=0;i<subset.length;i++){
        var loc =subset[i][location_col].split(",")
        var props={}

        // extract the properties for popup display
        for(var p in popup_properties){
            props[popup_properties[p]]=subset[i][popup_properties[p]]
        }
       if(loc.length>1){
        geojson.features.push({
          "type": "Feature",
          "properties": props,
          "geometry": {
            "coordinates": [loc[1],loc[0]],
            "type": "Point"
          }
        })
       }


     }
    this.show_json(geojson, L.layerGroup(),1)
  }
   show_json(data,layer_obj,_resource_id){
    var $this = this
    if(this.layers.length>0){
         this.map.removeLayer(this.layers[0].layer_obj);
         this.layers=[]
    }

    this.layers.push({ "id":_resource_id,"layer_obj":layer_obj});
    // custom points
    var layer_options ={}
    layer_options.color="#ffffff";
    layer_options.fillColor="#0290ce";
    layer_options.weight=1;
    var resource_marker_class = "_marker_class"+_resource_id

    $("<style type='text/css'> ."+resource_marker_class+"{ border: "+layer_options.weight+"px solid "+layer_options.color+"; background-color:"+layer_options.fillColor+";} </style>").appendTo("head");
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
            // create an accessible alt_name
            var alt_name="";
             if(feature.properties){
                alt_name = feature.properties[Object.keys(feature.properties)[0]]
             }

            var geo =L.geoJSON(feature, {pane: _resource_id, style: style,
                pointToLayer: function(feature, latlng) {
                    return L.marker(latlng, {
                        icon: map_manager.get_marker_icon(resource_marker_class),
                        alt: alt_name
                      })
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
    layer_obj.addTo(this.map);
    //
    console_log(layer_obj)
    // center map to bounds
    var timeout=0
    if(this.first_load){
        timeout = 1000;
        this.first_load=false;

    }

    setTimeout(function() {
        $this.map.fitBounds(markers.getBounds());
    }, timeout);

}
layer_click(e,_resource_id){
        map_manager.layer_clicked=true
        map_manager.selected_layer_id=_resource_id

        map_manager.click_lat_lng = e.latlng
        map_manager.click_x_y=e.containerPoint

        map_manager.popup_show();
       // try{
              map_manager.selected_feature_id=layer_manager.get_object_id(e.layer.feature);
              console.log( map_manager.selected_feature_id)
              map_manager.show_popup_details([e.layer.feature])
        //}catch(error){
            // could be an artificial click
             console_log("error",e)
       // }
         //map_manager.layer_clicked=false
  }
  get_layer_obj(_resource_id){
      for(var i =0;i<this.layers.length;i++){
            var temp_layer = this.layers[i]
            if (temp_layer.id==_resource_id){
                return temp_layer

            }
      }
      // if no layer was returned - maybe we are controls
     if(_resource_id =="basemap"){
        return {"layer_obj":this.basemap_layer,"type":"basemap"}

     }

  }
  is_on_map(_resource_id){
    var layer = this.get_layer_obj(_resource_id)
    if (layer){
        return true;
    }else{
        return false;
    }
  }
  get_object_id(_feature){
        // as the objectid might not be consistent between layers, we'll to no consistently determine what it is
        if(!_feature?.id ){
            if( _feature?.properties && _feature.properties?.id){
                 return  _feature.properties.id
            }else{
                return  _feature.properties._id
            }
        }
        return _feature["id"]
  }

}

