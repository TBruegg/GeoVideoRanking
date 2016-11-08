/**
 * Created by Tobi on 08.11.2016.
 */

var illuminationRanking = require('./illumination-ranking');
var geo = require('./geo-algorithms');
var turf = require('turf');
var exports = module.exports;
var http = require('http');
var q = require('q');

var OVERPASS_URL = "overpass-api.de";

exports.calculateRankScores = function (video, query) {
    var fovCollection = {"type": "FeatureCollection", "features": video.fovs};
    var M = turf.bbox(fovCollection);
    var n = video["fovs"].length;
    loadObjects(M).then(function (objects) {
            var videoObjects = objects;
            for(var i = 0; i < n; i++){
                var fov = video["fovs"][i];
                var P = fov.properties["camera_location"];
                var d = fov.properties["heading"];
                var M1 = turf.bboxPolygon(turf.bbox(fov));
                var fovObjects = [];
                if(turf.intersect(M1,fov) != undefined){
                    for(var j=0; j< videoObjects.features.length; j++) {
                        var currentObj = videoObjects.features[j];
                        if (turf.intersect(fov, currentObj) != undefined){
                            fovObjects.push(currentObj);
                        }
                    }
                    // borderPoints = borderPoints(query, P, d);
                }
            }
        }
    );
};

var loadObjects = function (bBox) {
    var defer = q.defer();
    var objects = {};
    var box = bBox,
        query = "/api/interpreter?data=[out:json][timeout:10];way("+box[1]+","+box[0]+","+box[3]+","+box[2]+")['building'];(._;>;);out;";
    overpassRequest(OVERPASS_URL, query).then(function (result) {
        objects = result;
        defer.resolve(objects);
    });
    return defer.promise;
};

var osmToGeoJSON = function(json){
    var geoJSON = {
        "type": "FeatureCollection",
        "properties" : {},
        "features" : []
    };
    var nodes = {};
    for(var i=0; i < json["elements"].length; i++){
        el = json.elements[i];
        if(el.type == "node"){
            nodes[el.id] = [el.lon, el.lat];
        }
    }
    for(var i=0; i < json["elements"].length; i++){
        el = json.elements[i];
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

var overpassRequest = function (host, query) {
    var defer = q.defer();
    var options = {
        host: host,
        path: query,
        port: 80,
        method: 'GET',
    };
    console.log("Overpass Request");
    req = http.request(options, function (response) {
        console.log(options.host + ':' + response.statusCode);
        var result = "";
        response.on("data", function (chunk) {
            result += chunk;
        });
        response.on("end", function () {
            result = JSON.parse(result);
            var features = osmToGeoJSON(result);
            defer.resolve(features);
        });
    });
    req.on("error", function (err) {
        console.log("An error occured during object retrieval");
        console.log(err.message);
        defer.reject(err);
        throw err;
    });
    req.end();
    return defer.promise;
};

var borderPoints = function (fov, query) {
    var Q = query;
    var d = fov.properties["heading"];
    var P = fov.properties["camera_location"];
    var theta = fov.properties["visible_angle"];
    var cornerPoints = turf.explode(Q)["features"];
    for(var i=0; i<cornerPoints.length; i++){
        var vertex = cornerPoints[i];
        if(i == 0){
            var angleL = normalizedAngle(turf.bearing(P, vertex)-d);
            var angleR = normalizedAngle(turf.bearing(P, vertex)-d);
            var pointR = vertex;
            var pointL = vertex;
        } else {
            var angle =  normalizedAngle(turf.bearing(P, vertex)-d);
            if(angle < angleL){
                angleL = angle;
                pointL = vertex;
            }
            if(angle > angleR){
                angleR = angle;
                pointR = vertex;
            }
        }
    }
    return {"ptLeft": pointL, "ptRight": pointR};
};

var normalizedAngle = function (angle) {
    if(angle%360 <= 180){
        return angle%360;
    } else {
        return angle%360-360;
    }
};