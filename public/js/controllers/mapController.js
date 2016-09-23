/**
 * Created by Tobi on 15.09.2016.
 */

angular.module('main').controller('mapCtrl', function($scope, $http, queryService){
    // Initialize map
    var map = L.map('map').setView([1.285611, 103.856377], 13);
    var baseLayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    });
    baseLayer.addTo(map);

    // Feature groups for query region and video marker, layer control, object for query
    var drawnItems = new L.FeatureGroup();
    var videoMarkers = new L.FeatureGroup();
    var layerControl = L.control.layers({},{"Query Polygons":drawnItems, "Videos":videoMarkers},{position:'bottomleft'}).addTo(map);
    var queryJson = {};

    // Function definitions
    // ----------------------------------------------------
    var drawMarkers = function (videoList) {
        videoMarkers.clearLayers();
        for(var i=0; i < videoList.length; i++){
            drawMarker(videoList[i]);
        }
    };
    var drawMarker = function(obj) {
        id = obj['id'];
        console.log(obj['st_asgeojson']);
        geometry = JSON.parse(obj['st_asgeojson']);
        marker = L.geoJson(geometry);
        videoMarkers.addLayer(marker);
        marker.bindPopup('ID: ' + obj['id']);
    };

    // Add draw control to map
    var drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems,
            edit: false
        },
        draw: {
            polyline: false,
            circle: false,
            marker: false,
            polygon :{
                shapeOptions: {
                    color: '#0000FF'
                }
            },
            rectangle: {
                shapeOptions: {
                    color: '#0000FF'
                }
            }
        }
    });

    // Set callback method for drawing markers
    $scope.queryService = queryService;
    $scope.queryService.setQueryCallback(drawMarkers);

    // Add feature groups and draw controls to map view
    map.addLayer(drawnItems);
    map.addLayer(videoMarkers);
    map.addControl(drawControl);


    // ----------------------------------------------
    // Event Handler
    // ----------------------------------------------

    drawnItems.on('layeradd', function(l){
        isVisible = drawnItems.getLayers().length;
        $scope.queryService.toggleQueryButton(isVisible);
    });

    drawnItems.on('layerremove', function(l){
        isVisible = drawnItems.getLayers().length;
        if(isVisible == 0){
            $scope.queryService.setQuery({});
        }
        $scope.queryService.toggleQueryButton(isVisible);
        console.log(queryJson);
    });

    map.on('draw:created', function(e){
        var type = e.layerType;
        var layer = e.layer;
        drawnItems.clearLayers();
        drawnItems.addLayer(layer);
        queryJson = drawnItems.toGeoJSON();
        queryJson = queryJson.features[0];
        $scope.queryService.setQuery(queryJson);
    });


});
