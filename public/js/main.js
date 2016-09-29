/**
 * Created by Tobi on 29.06.2016.
 */

angular.module('main',['ngAnimate'])
    .factory('resultPanelController', function(){
        var visible = false;
        return {
            toggleResults: function(){
                visible = !visible;
            },
            isVisible: function(){
                return visible
            }
        }
    })
    .factory('queryService', function ($http) {
        var queryButton = {};
        var queryJson = {};
        var mapCtrl = {};
        return {
            setMapCtrl: function (mapCtrl) {
                mapCtrl = mapCtrl;
                console.log(this.mapCtrl);
            },
            setQuery: function (json) {
                queryJson = json;
            },
            setQueryButton: function(button) {
                queryButton = button;
            },
            toggleQueryButton: function(isVisible){
                queryButton.prop('disabled', !isVisible);
            },
            polygonQuery: function () {
                var coordinates = queryJson.geometry.coordinates[0];
                var lat_sw = coordinates[0][1];
                var lng_sw = coordinates[0][0];
                var lat_ne = coordinates[2][1];
                var lng_ne = coordinates[2][0];
                var route = `http://localhost/api/polygonQuery?region=${JSON.stringify(queryJson)}`;
                console.log(route);
                $http.get(route).then(function(result){
                    objects = result.data.result;
                    for(var obj in objects){
                        mapCtrl.addMarker(obj);
                        return obj
                    };
                    return result;
                });
            }
        };
    })
    .controller('mapCtrl', function($scope, $http, queryService){
        $scope.queryService = queryService;
        map = L.map('map').setView([1.285611, 103.856377], 13);
        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        $scope.queryService.setMapCtrl(this);
        console.log(this);
        // Variable that holds GeoJSON representation of query region
        var queryJson = {};

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
            /*
            var coordinates = queryJson.geometry.coordinates[0];
            var lat_sw = coordinates[0][1];
            var lng_sw = coordinates[0][0];
            var lat_ne = coordinates[2][1];
            var lng_ne = coordinates[2][0];
            var route = `http://localhost/api/polygonQuery/${lat_sw}/${lng_sw}/${lat_ne}/${lng_ne}`;
            console.log(route);
            $http.get(route).then(function(result){
                objects = result.data.result;
                for(var i=0; i < objects.length;i++){
                    console.log(objects[i]["st_asgeojson"]);
                    geometry = JSON.parse(objects[i]["st_asgeojson"]);
                    L.geoJson(geometry).addTo(map);
                };
            }); */
        });
        this.addMarker = function(obj) {
            id = obj['id'];
            geometry = JSON.parse(obj['st_asgeojson']);
            L.geoJson(geometry).addTo(map);
        }

    })
    .controller('navCtrl', function($scope, resultPanelController, queryService){
        $scope.resultPanelController = resultPanelController;
        $scope.queryService = queryService;
        var queryBtn = $("#queryButton");
        queryBtn.prop('disabled',true);
        $scope.queryService.setQueryButton(queryBtn);
    })
    .controller('resultCtrl', function($scope, resultPanelController){
        $scope.resultPanelController = resultPanelController;
    });
