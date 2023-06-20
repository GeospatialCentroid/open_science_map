/**
 * Description. A filter system used to navigate a spreadsheet linked to resources.
    The features include a search system, filter controls, and paging system to navigate rows in a csv linked to html pages.
 *
 * @file   This files defines the Filter_Manager class.
 * @author Kevin Worthington
 *
 * @param {Object} properties     The properties passed as a json object specifying:
    csv     The path to the csv file containing a '
    omit_result_item    An array of items to omit from the details (i.e. values associated with the selected csv row
    omit_filter_item    An array of items to omit from the filter controls
    path_col    The column in the csv containing the file path to the html resource to load
    title_col    The column in the csv containing the title of the resource
    sub_title_col (optional) The column in the csv containing the sub title of the resource. If set, included in search.
 */


class Filter_Manager {
  constructor(properties) {
    //store all the properties passed
    for (var p in properties){
        this[p]=properties[p]
    }
    //keep reference to the the loaded spreadsheet data - source of filtering, selection and display
    this.json_data;
    this.mode='data';
    // store the subset of results for use
    this.subset_data;
    // store the item in the list
    this.page_num;
    // a dictionary of all the filters set
    this.filters={}
    this.progress_interval;
   }
  init() {
    var $this=this
     //simulate progress - load up to 90%
      var current_progress = 0;
      this.progress_interval = setInterval(function() {
          current_progress += 5;
          $("#loader").css("width", current_progress + "%")
          if (current_progress >= 90)
              clearInterval($this.progress_interval);

      }, 100);
    //

    this.load_csv(this.csv,this.process_csv)
    //
    $("#search").focus();
    $("#search_clear").click(function(){
        $("#search").val("")
    })
    ///--------
    $('input[type=radio][name=search_type]').change(function() {
        $this.mode=this.value
    });

     $("#search_but").click(function(){
        if($this.mode=="data"){
           $this.add_filter(false,[$("#search").val()])
           $this.filter()
           //go to results
           $this.slide_position("results")
        }else{
            $.get($this.place_url, { q: $("#search").val() }, function(data) {
                try{
                    $this.show_place_bounds(data[0].boundingbox)
                    $("#search").val(data[0].display_name)
                }catch(e){

                }

          })
        }
    })
    $('#filter_bounds_checkbox').change(
        function(){
             filter_manager.update_bounds_search($(this))
        }
    );
    //
    //date search
    $('#filter_date_checkbox').change(
        function(){
          filter_manager.delay_date_change();
        }
    );
    var start =new Date("1800-01-01T00:00:00")
    var end =new Date();
    $("#filter_start_date").datepicker({ dateFormat: 'yy-mm-dd'}).val($.format.date(start, 'yyyy-MM-dd'))
    $("#filter_end_date").datepicker({ dateFormat: 'yy-mm-dd'}).val($.format.date(end, 'yyyy-MM-dd'))

    $("#filter_start_date").change( function() {
        filter_manager.delay_date_change()

    });
    $("#filter_end_date").change( function() {
      filter_manager.delay_date_change()
    });

    var values = [start.getTime(),end.getTime()]
    $("#filter_date .filter_slider_box").slider({
        range: true,
        min: values[0],
        max: values[1],
        values:values,
        slide: function( event, ui ) {

           $("#filter_start_date").datepicker().val($.format.date(new Date(ui.values[0]), 'yyyy-MM-dd'))
           $("#filter_end_date").datepicker().val($.format.date(new Date(ui.values[1]), 'yyyy-MM-dd'))
           filter_manager.delay_date_change()

     }
    })
  }
   load_csv(file_name,func){
        var $this=this
        $.ajax({
            type: "GET",
            url: file_name,
            dataType: "text",
            success: function(data) {
                func(data,$this);
            }
         });
    }

     process_csv(data,$this){
        // convert the csv file to json and create a subset of the records as needed
       // strip any extraneous tabs
       $this.json_data= $.csv.toObjects(data.replaceAll('\t', ''))

       if($this?.include_col){
        var temp_json=[]
         for (var i=0;i<$this.json_data.length;i++){
            if($this.json_data[i][$this.include_col]=='y'){
                layer_manager.set_usable_links($this.json_data[i])
                temp_json.push($this.json_data[i])
            }
         }
         $this.json_data = temp_json
       }
       //account for comma separated columns, to be treated as separed values
        if($this?.comma_separated_col){
            for (var i=0;i<$this.json_data.length;i++){
                for (var c in $this.comma_separated_col){
                   $this.json_data[i][$this.comma_separated_col[c]] = $this.json_data[i][$this.comma_separated_col[c]].split(",")
                 }
            }
        }
        ///---
        // now that we have the records we need create a filter menu
        $this.generate_filters($this.json_data)
        $this.add_filter_watcher()
        $this.ids_added=true;//to prevent future ids
        if($this.params){
            //populate the filters if set
            browser_control=true
            $this.set_filters()
            $this.filter()
            browser_control=false
        }else{
            $this.populate_search($this.json_data,true);
        }

        //-------------
        //hide loader
        clearInterval($this.progress_interval)
        $("#loader").css("width", 100 + "%")
        setTimeout( function() {

            $(".overlay").fadeOut("slow", function () {
                $(this).css({display:"none",'background-color':"none"});
                 $(".container").show();
                  map_manager.map.invalidateSize();
            });
        },300);
        after_filters();
    }
     generate_filters(_data){
        // create a list of all the unique values
        // then create controls to allow users to filter items
        // these controls will update their counts when filters are selected
        console_log("generate filters")
        $("#filters").empty()
        var $this=this;
        // create a catalog of all the unique options for each of attributes
        this.catalog={}
        // create a separate obj to track the occurrences of each unique option
        this.catalog_counts={}
        for (var i=0;i<_data.length;i++){
            var obj=_data[i]
            //add a unique id, prepend 'item_' for use as a variable, only do this on first pass
            if(!this.ids_added){
              obj["id"]="item_"+i;
            }

            for (var a in obj){
               //start with a check for numeric
               if ($.isNumeric(obj[a])){
                obj[a]=parseInt(obj[a])
               }
               // see if we hve and array
               if ($.isArray(obj[a])){
                    // need to add all the array items into the catalog
                    for (var j = 0; j<obj[a].length;j++){
                        this.add_to_catalog(a,obj[a][j])
                    }
               }else{
                    this.add_to_catalog(a,obj[a])
               }

            }

        }
        // sort all the items
        // create controls - Note column names are used for ids - spaces replaced with '__'
         for (var a in this.catalog){
                // join with counts and sort by prevalence
               var catalog_and_counts=[]
               for(var j=0;j<this.catalog[a].length;j++){
                    catalog_and_counts.push([this.catalog_counts[a][j],this.catalog[a][j]])
               }

                catalog_and_counts.sort(function (a, b) {
                    if (a[0] === b[0]) {
                        return 0;
                    }
                    else {
                        return (a[0] > b[0]) ? -1 : 1;
                    }
                });
               // now extract the values
               this.catalog[a]=[]
               this.catalog_counts[a]=[]
               for(var j=0;j<catalog_and_counts.length;j++){
                    this.catalog[a].push(catalog_and_counts[j][1])
                    this.catalog_counts[a].push(catalog_and_counts[j][0])
               }
               // generate control html based on data type (use last value to workaround blank first values)
               if (this.catalog[a].length>0 && $.inArray(a,$this.omit_filter_item)==-1){
                if( $.isNumeric(this.catalog[a][this.catalog[a].length-1])){
                    //create a range slider for numbers - https://jqueryui.com/slider/#range
                     var min = Math.min.apply(Math, this.catalog[a]);
                     var max = Math.max.apply(Math, this.catalog[a]);
                     $("#filters").append(this.get_range_slider(a,min,max))
                     //to allow  fine-tuning - add min and max values
                     var ext="_slider"
                     $("#"+a.replaceAll(" ", "__")+ext).slider({
                      range: true,
                      min: min,
                      max: max,
                      values: [ min, max ],
                      slide: function( event, ui ) {
                        var id = $(this).attr('id')
                        var _id= id.substring(0,id.length-ext.length)
                        //set handle values
                        $("#"+id+"_handle0").text(ui.values[ 0 ])
                        $("#"+id+"_handle1").text(ui.values[ 1 ])
                        //add the filter
                        $this.add_filter(_id,ui.values)
                        $this.filter()
                      }

                    });
                    // add reference to input element to bind update

                }else{

                    $("#filters").append(this.get_multi_select(a,this.catalog[a],this.catalog_counts[a]))
                }

           }
         }



    }
    add_filter_watcher(){
        var $this=this;
        // watch at the filter list level
        $('.filter_list').change( function() {
           var id = $(this).attr('id')
            // create a new list of selected values
           var vals=[]
           $(this).find(":checked").each(function() {
                vals.push($(this).val())

           })
           if(vals.length==0){
                vals=null
           }
           console_log("add_filter_watcher",$(this).attr('id'),vals)
           $this.add_filter($(this).attr('id'),vals);
           $this.filter()
        });
    }
    add_to_catalog(col,val){
        if(typeof(this.catalog[col])=="undefined"){
               this.catalog[col]=[val]
               this.catalog_counts[col]=[1]
            }else{
                //populate with any new value
                var array_index=$.inArray(val,this.catalog[col])
                if (array_index==-1){
                    this.catalog[col].push(val)
                    this.catalog_counts[col].push(1)
                }else{
                    this.catalog_counts[col][array_index]+=1
                }
            }
    }
     get_multi_select(id,options,counts){
        var html=""
        var _id = id.replaceAll(" ", "__");
        html+="<label class='form-label' for='"+_id+"'>"+id+"</label>"
        html+="<div class='form-group filter_list' name='"+_id+"' id='"+_id+"' >"
        for (var o in options){
            var val = options[o];
            var text=options[o];
            if(text==""){
                text="(blank)"
            }
            var count = ""
            if (counts){
               count = counts[o]
            }
            html+='<label class="list-group-item d-flex justify-content-between list-group-item-action">'
            html+='<span><input class="form-check-input me-1 align-left" type="checkbox" value="'+val+'">'+text+'</span>'
            html+='<span class="badge bg-primary rounded-pill">'+count+'</span></label>'
        }

        html+=" </div>"
        return html

    }
     get_range_slider(id,min,max){
        var _id = id.replaceAll(" ", "__");
        var html=""
        html+="<label class='form-label' for='"+_id+"'>"+id+"</label>"
        html+="<div id='"+_id+"_slider' class='slider-range'><div id='"+_id+"_slider_handle0' class='ui-slider-handle'>"+min+"</div><div id='"+_id+"_slider_handle1' class='ui-slider-handle'>"+max+"</div></div>"
        return html
    }

    add_filter(_id,value){
        console_log("add_filter with a chip",_id,value)
        if (_id ==false){
            _id = LANG.SEARCH.CHIP_SUBMIT_BUT_LABEL
            // add text to the search field
            $("#search").val(value)
        }
        // remove the __ to get the true id
        var id = _id.replaceAll("__", " ");
        // set the filters value
        this.filters[id]=value
        console_log("And the filters are...",this.filters)
        //create text for filter chip
        var text_val=""
        //for number range use dash - separator
        if (value!=null){
            if($.isNumeric(value[0]) && value.length<=2){
                text_val=value[0]+" - "+value[1]
            }else{
                text_val=value.join(", ")
            }
        }
        this.show_filter_selection(_id.replaceAll( " ", "__"),id+": "+text_val)
        if (value==null){
           this.remove_filter(_id)
        }

    }
     show_filter_selection(_id,text){
        // create chips with the selected property and values
        var obj =this
        var ext = "__chip"
        var id =_id+ext
        // add a close button
        text+="<a class='bi bi-x btn' style='margin-right:-10px;'></a>"
        //create a list of selected filters to easily keep track
        var html="<div class='chip blue lighten-4' id='"+id+"'>"+text+"</div>"
        //if exists update it
        if($( "#"+id ).length) {
            $( "#"+id ).html(text)
        }else{
            $("#filter_box").append(html)
        }

       //set remove functionality
       $("#"+id+" a").click(function(){
            console_log($(this).parent().attr("id"))
            var id=$(this).parent().attr("id")
            var _id= id.substring(0,id.length-ext.length)
            //remove the visual
             obj.reset_filter(_id)
             obj.remove_filter(_id)
             obj.filter();

       })
    }
    save_filter_params(){
        save_params()
    }
    remove_filter(_id){
        var id = _id.replaceAll("__", " ");
        delete this.filters[id]
        //remove filter selection
        this.remove_filter_selection(_id)
    }
    remove_filter_selection(_id){
       $("#"+_id+"__chip").remove()
    }
    filter(){
        // create a subset of the items based on the set filters
        var subset=[]
        //loop though the items in the list
        for (var i=0;i<this.json_data.length;i++){

            // compare each to the filter set to create a subset
            var meets_criteria=true; // a boolean to determine if the item should be included
            var obj=this.json_data[i]
            for (var a in this.filters){
                if (a=="search"){
                    // if search term not found in both title and sub title
//                    if(obj[this.title_col].indexOf(this.filters[a][0]) == - 1 &&  obj[this.sub_title_col].indexOf(this.filters[a][0])==-1){
//                        meets_criteria=false
//                    }
                    // convert to string for search
                    var obj_str = JSON.stringify(obj)
                    if(obj_str.indexOf(this.filters[a][0])==-1){
                        meets_criteria=false
                    }

                }else if (a=='bounds'){
                     if(obj?.[this['bounds_col']]){
                         var b = obj[this['bounds_col']].split(',')
                          var poly1 = turf.polygon([[
                            [b[1],b[0]],
                            [b[1],b[2]],
                            [b[3],b[2]],
                            [b[3],b[0]],
                            [b[1],b[0]]
                            ]])
                          var b = layer_manager.map.getBounds()
                          var poly2 = turf.polygon([[
                          [b._southWest.lat,b._southWest.lng],
                          [b._southWest.lat,b._northEast.lng],
                          [b._northEast.lat,b._northEast.lng],
                          [b._northEast.lat,b._southWest.lng],
                           [b._southWest.lat,b._southWest.lng]
                          ]])

                          if (!turf.booleanIntersects(poly1, poly2)){
                            meets_criteria=false
                          }
                    }else{
                         // no coordinates
                         meets_criteria=false
                    }

                }else if (a!='p'){
                    if ($.isNumeric(this.filters[a][0])){
                        //we are dealing with a numbers - check range
                        if (obj[a]<this.filters[a][0] || obj[a]>this.filters[a][1]){
                             meets_criteria=false
                        }
                    }else{
                        // match the elements
                        // make and exception for searching through array values
                         if ($.isArray(obj[a])){
                            // loop over the filters array checking if its in the object attribute array
                            for(var j=0;j<this.filters[a].length;j++){
                                 if ($.inArray(this.filters[a][j],obj[a])==-1){
                                    meets_criteria=false
                                 }
                            }
                         }else{
                            if ($.inArray(obj[a],this.filters[a])==-1){
                                meets_criteria=false
                            }
                         }
                    }
                }
            }
            if (meets_criteria==true){
                    subset.push(obj)
            }

        }
        this.populate_search(subset)
        this.generate_filters(subset)
        // be sure to set the filter_manager params for setting filters during menu regeneration

        this.params=[this.filters]
        console_log( "params were set",this.filters)
        this.set_filters();
        this.save_filter_params()

        this.add_filter_watcher();
        layer_manager.create_geojson(subset,this.location)

    }

    populate_search(data){
       // to make it easy to select a dataset, an autocomplete control is used and populated based on entered values

       var $this = this
        // loop over the data and add 'value' and 'key' items for use in the autocomplete input element
       this.subset_data =
       $.map(data, function(item){
            var label =item[$this.title_col]
            console.log()
            if ($this.hasOwnProperty('sub_title_col') && item[$this.sub_title_col]!=""){
                label +=" ("+item[$this.sub_title_col]+")"
            }

            return {
                label: label,
                value: item["id"]
            };
        });

      $( "#search" ).autocomplete({
          source: this.subset_data,
          minLength: 0,
          select: function( event, ui ) {
                event.preventDefault();
                $("#search").val(ui.item.label.substring(0,ui.item.label.indexOf("(")-1));
                $("#search_but").trigger("click")
            },
        focus: function(event, ui) {
            event.preventDefault();
            $("#search").val(ui.item.label);
        }

      });
      $(document).on("keydown", "#search", function(e) {
            if(e.keyCode==13){
                $("#search_but").trigger("click")
            }
        })

      this.show_results()

      //update counts
      this.update_results_info(this.subset_data.length)
    }

    show_results(){
         // loop over the subset of items and create entries in the 'results_view'
        var html= '<ul class="list-group"' +'">'
        for (var s in this.subset_data){
             var id = this.subset_data[s].value
             html += "<li class='list-group-item d-flex justify-content-between list-group-item-action' "
             html +=  "onmouseleave='filter_manager.hide_bounds()' "
             html+= "onmouseenter='filter_manager.show_bounds(\""+id+"\")' >"
             html+= this.subset_data[s].label
             html +="<span><button type='button' class='btn btn-primary' onclick='filter_manager.select_item(\""+id+"\")'>"+"Details"+"</button>"

             html+="</span>"

             html+="</li>"
        }
        html+="</ul>"

         $("#results_view").html(html)
         $("#results_view").scrollTop()
    }
    select_item(id){
        // use the id of the csv
        var match = this.get_match(id)

        this.show_match(match)
        //for reference track the selected page
        this.page_id=id
        this.page_num=this.get_page_num(id)
        // add the page number to the address for quicker access via link sharing
        //this.filters['p']=this.page_num
        this.save_filter_params()

        //
        this.slide_position("details")
    }
    show_bounds(_resource_id){
        var resource = this.get_match(_resource_id)
        // parse the envelope - remove beginning and end
        if(resource?.[this['bounds_col']]){
             var b = resource[this['bounds_col']].split(',')
              map_manager.show_highlight_rect([[b[1],b[0]],[b[3],b[2]]])
        }

    }
    zoom_layer(geom){
        console_log("Zoom layer",geom)
        var b = geom.split(',')

        var bounds = L.latLngBounds([[b[1],b[0]],[b[3],b[2]]])
        map_manager.zoom_rect(bounds)
    }
     hide_bounds(){
        map_manager.hide_highlight_rect()
    }
      show_place_bounds(b){
        var sw = L.latLng(Number(b[0]), Number(b[2])),
            ne = L.latLng(Number(b[1]), Number(b[3])),
            bounds = L.latLngBounds(sw, ne);
            map_manager.map_zoom_event(bounds)

            map_manager.show_copy_link(b[2],b[0],b[3],b[1])

  }
    bounds_change_handler(){

        // when the map bounds changes and the search tab is visible
        if ($('#filter_bounds_checkbox').is(':checked') && "search_tab"==$("#tabs").find(".active").attr("id")){
         this.update_bounds_search()


        }

    }
    update_bounds_search(){
        if ($('#filter_bounds_checkbox').is(':checked')){
            var b =layer_manager.map.getBounds()
            //search lower-left corner as the start of the range and the upper-right corner as the end of the range
            filter_manager.add_filter("bounds",[b._southWest.lat.toFixed(3),b._southWest.lng.toFixed(3),b._northEast.lat.toFixed(3),b._northEast.lng.toFixed(3)])
        }else{
           //Remove bound filter
           this.remove_filter('bounds')
        }
        this.filter()
    }
     update_results_info(num){

        $(".total_results").text("Found"+" "+num+" "+"results")
        $(".spinner-border").hide();


    }
    get_page_num(id){
        //the page number is based on the item position in the filtered list
       //look for the id in the subset and return the position
        for (var i=0;i<this.subset_data.length;i++){
            if(id==this.subset_data[i].value){
                //set the page num
                return i;
            }
        }

    }
    go_to_page(val){
       //@param val: the page number to go to
       // use the subset list to determine the page
       //find out where we are in the list and show page number
        if(typeof(this.subset_data[this.page_num+val])!="undefined"){
            this.select_item(this.subset_data[this.page_num+val].value)
            this.save_filter_params()
        }

    }

    get_match(id){
         //@param id: the id of the csv
        //returns the json object
        //search through the collection matching with the unique id
        for (var i=0;i<this.json_data.length;i++){
           if(this.json_data[i]["id"]==id){
            return this.json_data[i]
           }

        }

    }
     show_match(match){
        // when a selection is made, fade-in the overlay and then looad
        // @param match: a json object with details (including a page path to load 'path_col')

        var obj=this

         $("#result_total .spinner-border").show();
         this.show_details(match)
    }

    show_details(match){
        // @param match: a json object with details (including a page path to load 'path_col')
        //create html details to show
        var html="";
        var id =match.id

        for (var i in match){
            if ($.inArray(i,this.omit_result_item)==-1){
                var link = match[i]
                if ((typeof link === 'string' || link instanceof String) && link.indexOf("http")==0){
                   link="<a href='"+link+"' target='_blank'>"+link+"</a>"
                }
                html+="<span class='fw-bold'>"+i+":</span> "+link+"<br/>"
            }
        }
        // generate a table from the table_data_cols
        // these could be any number of columns of the same size so they can be combined into a table
        var table_data =[]
        for (var c in this.table_data_col){
            if(match[this.table_data_col[c]].indexOf(",")>-1){
                table_data.push(match[this.table_data_col[c]].split(','))
            }else{
                table_data.push(match[this.table_data_col[c]])
            }

        }

      //check that there is data
      if(table_data[0].length==1 && match.usable_links.length>0){
         // temporarily get the details from the ESRI metadata
         this.load_json(match.usable_links[0][0]+"?f=json",this.show_loaded_columns)

      }else{
            html+=this.table_manager.get_combined_table_html(this.table_data_col,table_data)

        }
        $("#details_view").html(html)
    }
    show_loaded_columns(data){
         console_log("show_loaded_columns",data)
        //table_data_col:["column name","column field name","column types","column description"],
        //ESRI .alias,.name,
        //.type (to be converted to conform with Socrata)
        var type_conversions= [["Number",["esriFieldTypeInteger","esriFieldTypeDouble","esriFieldTypeOID"]],["Calendar date",["esriFieldTypeDate"]],["Text",["esriFieldTypeString"]]];
        //https://doc.arcgis.com/en/insights/latest/get-started/supported-types-from-databases.htm
         var table_data =[[],[],[],[]]
         for(var i=0;i<data.fields.length;i++){
            table_data[0].push(data.fields[i].alias);
            table_data[1].push(data.fields[i].name);
            //convert type
            var type = data.fields[i].type
            for(var j=0;j<type_conversions.length;j++){
                if($.inArray(type, type_conversions[j][1])>-1){
                    type=type_conversions[j][0]
                }
            }
            table_data[2].push(type);

            var desc= ""
            if(data.fields[i].domain!=null && data.fields[i].domain?.codedValues){
                 //.domain if available look for .codedValues array - convert to format codedValues:name=code;

                 for(var j=0;j<data.fields[i].domain.codedValues.length;j++){
                    //only add the domain if it contains added value
                    if(data.fields[i].domain.codedValues[j].name!=data.fields[i].domain.codedValues[j].code){
                        desc+=data.fields[i].domain.codedValues[j].name+"="+data.fields[i].domain.codedValues[j].code+"; "
                    }
                 }
                 if(desc!=""){
                     desc="Values: "+desc
                 }
            }
            table_data[3].push(desc);
         }
        // now inject the table
         var html="<table ><tr>"
          html+="<td>"+table_data[0]+"</td>"
          html+="<td>"+table_data[1]+"</td>"
          html+="<td>"+table_data[2]+"</td>"
          html+="<td>"+table_data[3]+"</td>"
          html+="</tr></table>"

          //show the last modified date
          if(data?.editingInfo?.lastEditDate){
            var last_edit_date = new Date(data.editingInfo.lastEditDate);
            $("#details_view").append($.format.date(last_edit_date, 'yyyy-MM-dd')+"<br/>")
          }

           var copy_link =" <a href='javascript:navigator.clipboard.writeText(\""+html+"\")' >copy</a>"
          $("#details_view").append(copy_link+table_manager.get_combined_table_html(filter_manager.table_data_col,table_data));
          //also show the extent
          map_manager.show_copy_link(data.extent.xmin,data.extent.ymin,data.extent.xmax,data.extent.ymax)
    }

    toggle_filters(elm){
        //$("#filter_area").width()<250
        if(!$("#filter_area").is(":visible")){
            $(elm).text("Hide Filters")
            //todo would be nice to slide reveal
            //$("#filter_area").css("width", "250px");
             $("#filter_area").show();
             $("#filter_control_spacer").show();

            $("#filter_header").slideDown()
        }else{
            $(elm).text("Show Filters")
            $("#filter_area").hide();
             $("#filter_control_spacer").hide();
            //$("#filter_area").css("width", "0px")
            //only hide this if there are no filters set
            if ($.isEmptyObject(this.filters)){
                $("#filter_header").slideUp()
            }

        }
    }

    toggle_details(elm){

        if(!$("#details").is(":visible")){
            $(elm).text("Hide Details")

             $("#details").show();

        }else{
            $(elm).text("Show Details")
            $("#details").hide();

        }
    }
    reset(){
        // clears the form
        $('.slider-range').each(function(){
          var options = $(this).slider( 'option' );
          $(this).slider( 'values', [ options.min, options.max ] );
        });
       $(".form-check-input").prop('checked', false);
       this.filters={}
       this.filter()
       $("#filter_box").empty()

  }
    set_filters(){
        console_log("set_filters",this.params[0])
        var select_item =true
        //loop over all the set url params and set the form

        var filters=this.params[0]
        for(var a in filters){
            var val = filters[a]
            var id = a.replaceAll(" ", "__");
            this.set_filter(id,val)

            // make exception for page
            if (a=='p'){
                this.filters[id]=val
                this.page_num=Number(val)
                select_item =false
            }else if(a=="bounds"){
                  $("#filter_bounds_checkbox").prop("checked", true)
            }else{
                this.add_filter(a,val)
            }

        }


        if(!select_item){
            //use the page_num to go to the param page
            this.go_to_page(0)
        }

    }
    set_filter(id,list){
     console_log("set_filter",id,list)
     //check if numeric
     if(list.length>1 && $.isNumeric(list[0])){
        $("#"+id+'_slider').each(function(){
            $(this).slider( 'values', [ list[0], list[1] ] );
            //set handle values
            $("#"+$(this).attr("id")+"_handle0").text(list[ 0 ])
            $("#"+$(this).attr("id")+"_handle1").text(list[ 1 ])
        });

     }else{
        for(var l = 0;l<list.length;l++){
             $("#"+id+" input[value='"+list[l]+"']").prop('checked', true);
        }

     }
  }
  reset_filter(id){
        // take the id (maybe dropdown or slider) and remove the selection
        //TODO - make this more specific to variable type (i.e numeric vs categorical)

        $("#"+id+" input").prop('checked', false);

        $("#"+id+'_slider').each(function(){
          var options = $(this).slider( 'option' );

          $(this).slider( 'values', [ options.min, options.max ] );
        });

  }
  new_window(){
    //take the currently opened resource and open in a new window
    var match = this.get_match(this.page_id)

    var win = window.open(match[this.path_col], '_blank');
  }


    go_back(){

        // based on the panel position choose the movement
        var go_to_panel=""
        if(this.panel_name == 'results'){
            go_to_panel = "browse"
        }else if(this.panel_name == 'browse'){
            go_to_panel = "results"
        }else if(this.panel_name == 'details'){
            go_to_panel = "results"
        }else if(this.panel_name == 'layers'){
            go_to_panel = "results"
        }else if(this.panel_name == 'sub_details'){
            go_to_panel = "layers"
        }else{
            go_to_panel = "results"
        }
        this.slide_position(go_to_panel)
    }

    update_parent_toggle_buttons(elm){
       $(elm).find("[id$='_toggle']").each(function( index ) {
            var arr = $(this).attr("data-child_arr").split(",")
            //if any of the child layers are shown - update the button text
            var child_count=0
            for (var i=0;i<arr.length;i++){
                for (var j=0;j<layer_manager.layers.length;j++){
                    if(layer_manager.layers[j].id==arr[i]){
                        child_count+=1

                    }
                }
            }
            $(this).find("span").first().text(child_count)
        });


    }

    delay_date_change(){
        var $this=this
        // prevent multiple calls when editing filter parameters
        if(this.timeout){
            clearTimeout(this.timeout);
        }
        this.timeout=setTimeout(function(){
              $this.update_date_filter()
              $this.timeout=false

        },500)
     }
     //todo add date filtering
    update_date_filter(){
         // Add date filter
         if ($('#filter_date_checkbox').is(':checked')){
            var start = $.format.date(new Date($("#filter_start_date").val()), 'yyyy-MM-dd')//T00:00:00Z
            var end = $.format.date(new Date($("#filter_end_date").val()), 'yyyy-MM-dd')//T00:00:00Z

            filter_manager.add_filter("dct_issued_s","[ "+start+" TO "+end+" ]")

         }else{
            this.remove_and_update_filters('dct_issued_s')
        }
    }
    load_json(file_name,call_back,extra){
        // A generic loader of json
        $.ajax({
            type: "GET",
            extra:extra,
            url: file_name,
            dataType: "json",
            success: function(data) {
                // store the facet json for future use

                call_back(data,extra)
            },
            error: function(xhr, status, error) {
                try{
                    var err = eval("(" + xhr.responseText + ")");
                    console_log(err.Message);
                }catch(e){
                    console_log("ERROR",xhr)
                }

            }
         });
    }
}
 


