/**
 * Created by Tobi on 15.09.2016.
 */

angular.module('main').controller('mapCtrl', function($scope, $http, $rootScope, $q, queryService, resultPanelService){
    var createTooltip = function (el, title, pos) {
        el.tooltip({
            animation: true,
            delay: {"show": 500, "hide": 100},
            placement: pos,
            title: title
        });
        el.click(function(){el.tooltip('hide')});
    };

    // Initialize map
    var map = L.map('map').setView([1.2871374742069617, 103.86577606201172], 15);
    $rootScope.map = map;
    $rootScope.L = L;
    var baseLayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    });
    baseLayer.addTo(map);

    var overpassURL = "http://overpass-api.de/api/interpreter?data=";
    // Feature groups for query region and video marker, layer control, object for query
    var drawnItems = new L.FeatureGroup();
    var viewsheds = new L.FeatureGroup();
    $rootScope.drawnItems = drawnItems;
    var videoMarkers = new L.FeatureGroup();
    var layerControl = L.control.layers({},{
        "Query Polygons":drawnItems,
        "Videos":videoMarkers,
        "Viewsheds": viewsheds
        },{
            position:'bottomleft'
        }).addTo(map);
    var queryJson = {};
    createTooltip($("#selectFeatureButton"), "Click here to select a feature on the map", "right");
    createTooltip($("#orderSelect"), "Sort results by ranking metric", "bottom");
    createTooltip($("#queryButton"), "Search geovideos for marked building", "bottom");

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
        // console.log(obj['geometry']);
        geometry = JSON.parse(obj['geometry']);
        marker = L.geoJson(geometry);
        videoMarkers.addLayer(marker);
        marker.bindPopup('ID: ' + obj['id']);
    };
    var drawPolygon = function (polygon, leafletLayer) {
        var style = {
            "color": "#ff7800",
            "weight": 5,
            "opacity": 0.65
        };
        var layer = L.geoJson(polygon, {style: style});
        leafletLayer.addLayer(layer);
    };
    $rootScope.drawPolygons = function (polygonArray) {
        $rootScope.clearPolygons();
        for(var i in polygonArray){
            var fov = polygonArray[i];
            drawPolygon(fov, viewsheds);
        }
    };

    $rootScope.clearPolygons = function () {
        viewsheds.clearLayers();
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
    map.addLayer(viewsheds);
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

    var onFeatureSelect = function (e) {
        var r = 0.0003;
        var lat = e.latlng.lat;
        var lng = e.latlng.lng;
        var query = `[out:json][timeout:10];way(${lat-r},${lng-r},${lat+r},${lng+r})["building"];(._;>;);out;`;
        var point = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lng, lat]
            },
            "properties": {}
        };
        console.log(lat + ", " + lng);
        var features = queryService.overpassRequest(overpassURL+query, queryService.osmToGeoJSON);
            features.then(function (features) {
                if(features != undefined) {
                    console.log(features);
                    drawnItems.clearLayers();
                    var building;
                    for(var i=0; i < features.features.length; i++){
                        if(turf.intersect(point, features.features[i]) != undefined){
                            building = features.features[i];
                        }
                    }
                    //var building = features.features[0];
                    $scope.queryService.setQuery(building);
                    drawPolygon(building, drawnItems);
                }
            });
        //L.geoJSON(features.features, {style: style}).addTo(map);
        $rootScope.map.off('click', onFeatureSelect);
        $("#map").css("cursor", "-webkit-grab");
    };

    $scope.selectFeature = function () {
        console.log("select feature");
        $("#map").css("cursor", "crosshair");
        $rootScope.map.on('click', onFeatureSelect);
    }

});
