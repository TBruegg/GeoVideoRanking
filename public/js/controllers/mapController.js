/**
 * Created by Tobi on 15.09.2016.
 */

angular.module('main').controller('mapCtrl', function($scope, $http, queryService){
    $scope.queryService = queryService;

    map = L.map('map').setView([1.285611, 103.856377], 13);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    // Variable that holds GeoJSON representation of query region
    var queryJson = {};
    var addMarker = function(obj) {
        id = obj['id'];
        console.log(obj['st_asgeojson']);
        //console.log(JSON.parse(obj['st_asgeojson']));
        geometry = JSON.parse(obj['st_asgeojson']);
        L.geoJson(geometry).addTo(map);
    };
    $scope.queryService.setQueryCallback(addMarker);
    // Initialise feature group for drawn query regions
    var drawnItems = new L.FeatureGroup();
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
    var layerControl = L.control.layers({},{"Query Polygons":drawnItems},{position:'bottomleft'}).addTo(map);
    map.addLayer(drawnItems);

    // Initialise draw controls
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
    map.addControl(drawControl);

    // Event listeners
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
