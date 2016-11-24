/**
 * Created by Tobi on 15.09.2016.
 */

angular.module('main').factory('queryService', function ($http, $rootScope, $q) {
    var queryButton = {};
    var queryJson = {};
    var queryCallback;
    var featureSelectCallback;
    var cursor = $("#map").css("cursor");
    var overpassURL = "http://overpass-api.de/api/interpreter?data=";
    var HOST = "localhost";
    // var HOST = "giv-project15.uni-muenster.de";
    var osmToGeoJSON = function(json){
        var geoJSON = {
            "type": "FeatureCollection",
            "properties" : {},
            "features" : []
        };
        var nodes = {};
        for(var i=0; i < json.data["elements"].length; i++){
            el = json.data.elements[i];
            if(el.type == "node"){
                nodes[el.id] = [el.lon, el.lat];
            }
        }
        for(var i=0; i < json.data["elements"].length; i++){
            el = json.data.elements[i];
            if(el.type == "way" && el.tags["building"]){
                var featureJSON = {
                    "type" : "Feature",
                    "geometry" : {
                        "type": "Polygon",
                        "coordinates": [[]]
                    },
                    "properties": {}
                };
                var vertices = el["nodes"];
                for(var j=0; j < vertices.length; j++){
                    vertexId = vertices[j];
                    featureJSON.geometry.coordinates[0].push(nodes[vertexId]);
                }
                geoJSON["features"].push(featureJSON);
            }
        }
        return geoJSON;
    };
    var overpassRequest = function (URL) {
        var defer = $q.defer();
        $http.get(URL).then(function(result){
            if(result.data.elements.length == 0){
                defer.resolve(undefined);
            }
            var features = osmToGeoJSON(result);
            defer.resolve(features);
        });
        return defer.promise;
    };
    var drawBuildings = function(geojson){
        var featureLayer = $rootScope.L.geoJson(geojson);
        $rootScope.drawnItems.addLayer(featureLayer);
    };
    var onFeatureSelect = function (e) {
        var r = 0.0003;
        var lat = e.latlng.lat;
        var lng = e.latlng.lng;
        var query = `[out:json][timeout:10];way(${lat-r},${lng-r},${lat+r},${lng+r})["building"];(._;>;);out;`;
        console.log(lat + ", " + lng);
        var features = overpassRequest(overpassURL+query, osmToGeoJSON);
        drawBuildings(features);
        $rootScope.map.off('click', onFeatureSelect);
        $("#map").css("cursor", "-webkit-grab");
    };
    return {
        setQueryCallback: function (callback) {
            queryCallback = callback;
        },
        setFeatureSelectCallback: function(callback){
            featureSelectCallback = callback;
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
            var route = `http://${HOST}/api/polygonQuery?region=${JSON.stringify(queryJson)}`;
            console.log(route);
            $("#loadingPage").css('display', 'block');
            $("#resultPage").css('display', 'none');
            $("#hint").text('Loading...');
            $http.get(route).then(function(result){
                objects = result.data.result;
                queryCallback(objects);
                return result;
            }, function (err) {
                console.log(err);
            }).catch(console.log.bind(console));
        },
        onClick: function(e){
            $("#map").css("cursor", "-webkit-grab");
        },
        selectFeature: function () {
            $("#map").css("cursor", "crosshair");
            $rootScope.map.on('click', onFeatureSelect);
        },
        overpassRequest: overpassRequest
    };
});