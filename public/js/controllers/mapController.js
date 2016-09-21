/**
 * Created by Tobi on 15.09.2016.
 */

angular.module('main').controller('mapCtrl', function($scope, $http, queryService){

    var map = L.map('map').setView([1.285611, 103.856377], 13);
    var baseLayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    });
    baseLayer.addTo(map);
    var drawnItems = new L.FeatureGroup();
    var layerControl = L.control.layers({},{"Query Polygons":drawnItems},{position:'bottomleft'}).addTo(map);
    var queryJson = {};
    var addMarker = function(obj) {
        id = obj['id'];
        console.log(obj['st_asgeojson']);
        geometry = JSON.parse(obj['st_asgeojson']);
        marker = L.geoJson(geometry).addTo(map);
        marker.bindPopup('ID: ' + obj['id']);
    };
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

    $scope.queryService = queryService;
    $scope.queryService.setQueryCallback(addMarker);

    map.addLayer(drawnItems);
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
