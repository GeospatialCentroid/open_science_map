//create a filter manager to control the selection of items from a CSV file
var filter_manager;
var table_manager;
var usp={};// the url params object to be populated
var LANG;
var map_manager;
var layer_manager;
var analytics_manager;
if (typeof(params)=="undefined"){
    var params = {}
}
var last_params={}
var usp={};// the url params object to be populated

var browser_control=false; //flag for auto selecting to prevent repeat cals

$( function() {

   initialize_interface()
});

function initialize_interface(){
   setup_params()
   setup_map();
   setup_filters()

}

function setup_params(){
    if (window.location.search.substring(1)!="" && $.isEmptyObject(params)){
        usp = new URLSearchParams(window.location.search.substring(1).replaceAll("~", "'").replaceAll("+", " "))

        if (usp.get('f')!=null){
            params['f'] = rison.decode("!("+usp.get("f")+")")
        }
        if (usp.get('e')!=null){
            params['e'] =  rison.decode(usp.get('e'))
        }
        // debug mode
        if (usp.get('d')!=null){
           DEBUGMODE=true
        }
    }
}
function setup_map(){
    map_manager = new Map_Manager(
     {params:params['e'] ,
        lat:36.25408922222581,
        lng: -98.7485718727112,
        z:8,
        limit:100 // max results for identify
        })

     map_manager.init()
    layer_manager = new Layer_Manager({map:map_manager.map});
}
function setup_filters(){
    filter_manager = new Filter_Manager({
        csv:"https://docs.google.com/spreadsheets/d/e/2PACX-1vQmgyPcmSUv0wrEUCtMFEZIl1rabVGl_fh94hzH4hhONkii-BWIgQvNy0uQzAIfDnU4RfPtSXdJO6UJ/pub?gid=1117849997&single=true&output=csv",
        omit_result_item:["id","Hex Value for Category (CSV)","Category","lat,lng","Timestamp","Name","Email:"], // define which attributes not to show when a selection is made
        omit_filter_item:["id","Hex Value for Category (CSV)","lat,lng","Title","Timestamp","Name","Email:","Start date","End date","URL","Description","How this supports NASA's Year of Open Science goals"],
        path_col:"Link to Project",// the url to the dataset landing page
        popup_properties:["Title","Institution"],
        title_col:"Title",
        sub_title_col:"Institution",
        location:"lat,lng",
        date:["start date","end date"],
        params:params['f'],
        comma_separated_col:["Category","Hex Value for Category (CSV)"],
        color:["Hex Value for Category (CSV)"],
        category:["Category"]
     })


     // initialize this filtering system

     filter_manager.init();
}
function after_filters(){
        run_resize()
        analytics_manager = new Analytics_Manager();


}

function run_resize(){
    $( window ).resize( window_resize);
    setTimeout(function(){
             $( window ).trigger("resize");

             // leave on the dynamic links - turn off the hrefs
             $("#browse_panel .card-body a").attr('href', "javascript: void(0)");

             // rely on scroll advance for results
             $("#next_link").hide();

             map_manager.map.invalidateSize()
    },100)
        //update the height of the results area when a change occurs
        $('#side_header').bind('resize', function(){
        $("#result_wrapper").height($("#panels").height()-$("#result_total").height()- $('#side_header'))
    });
}
function window_resize() {
        var data_table_height=0
         if( $("#data_table_wrapper").is(":visible")){
           data_table_height= $("#data_table_wrapper").height()
        }
        var header_height=$("#header").outerHeight();
        var window_height= $(window).outerHeight()
        var window_width= $(window).width()


       var scroll_height=window_height-header_height-$("#side_header").outerHeight()-$("#tabs").outerHeight()-$("#nav_wrapper").outerHeight()-20
       $("#panels").height(scroll_height)
       $(".panel").height(scroll_height)
       $("#result_wrapper").height(scroll_height)


        $("#map_panel_wrapper").height(window_height-$("#tabs").height()-header_height)
        $("#map_panel_scroll").height(window_height-$("#tabs").height()-header_height)

            //
//       $("#tab_panels").css({'top' : ($("#tabs").height()+header_height) + 'px'});

//       .col-xs-: Phones (<768px)
//        .col-sm-: Tablets (≥768px)
//        .col-md-: Desktops (≥992px)
//        .col-lg-: Desktops (≥1200px)


       if (window_width >768){

            // hide the scroll bars
//            $('html, body').css({
//                overflow: 'hidden',
//                height: '100%'
//            });
            $(".leaflet-control-zoom ").show()
            map_manager.map.scrollWheelZoom.enable();
       }else{
             //mobile view

             // scroll as needed
             $('html, body').css({
                overflow: 'auto',
                height: 'auto'
            });

            // drop the map down for mobile
            $("#map_wrapper").width("100%")

            $(".leaflet-control-zoom ").hide()


            map_manager.map.scrollWheelZoom.disable();
       }

        if(map_manager){
            map_manager.map.invalidateSize()
        }

 }
 function save_params(){
    // access the managers and store the info URL sharing

    var p = "?f="+encodeURIComponent(rison.encode(filter_manager.filters))
    +"&e="+rison.encode(map_manager.params)


    if(layer_manager && typeof(layer_manager.layers_list)!="undefined"){
        p+="&l="+rison.encode(layer_manager.layers_list)
    }

    if(typeof(filter_manager.panel_name)!="undefined"){
        // add the panel if available
        p+="/"+filter_manager.panel_name;
    }
    if(typeof(filter_manager.display_resource_id)!="undefined"){
        // add the display_resource_id if available
        p+="/"+filter_manager.display_resource_id;
    }

    if (filter_manager.page_rows){
        p +="&rows="+(filter_manager.page_start+filter_manager.page_rows)
    }
    if (filter_manager.page_start){
        p +="&start=0"
    }
    if (filter_manager.sort_str){
        p +="&sort="+filter_manager.sort_str
    }
//    if (filter_manager.fq_str){
//        p +="&fq="+filter_manager.fq_str
//    }
    // retain debug mode
    if (DEBUGMODE){
        p +="&d=1"
    }

    // before saving the sate, let's make sure they are not the same
    if(JSON.stringify(p) != JSON.stringify(last_params) && !browser_control){
       window.history.pushState(p, null, window.location.pathname+p.replaceAll(" ", "+").replaceAll("'", "~"))
        last_params = p
    }

}