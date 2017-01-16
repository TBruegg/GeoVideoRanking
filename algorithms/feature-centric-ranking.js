/**
 * Created by Tobi on 08.11.2016.
 */

var illuminationRanking = require('./illumination-ranking');
var distanceRanking = require('./distance-ranking');
var depictionRanking = require('./depiction-ranking');
var geo = require('./geo-algorithms');
var helpers = require('./helpers');
var turf = require('turf');
var exports = module.exports;
var http = require('http');
var q = require('q');

var OVERPASS_URL = "www.overpass-api.de";
var CONNECTIONS = 0;

exports.calculateRankScores = function (video, query, objects) {
    var defer = q.defer();
    var fovCollection = {"type": "FeatureCollection", "features": video.fovs};
    var M = turf.bbox(fovCollection);
    var n = video["fovs"].length;
    var rDist = 0, rVis = 0, rAz = 0, rEl = 0, rDep = 0, nVis = 0;
    var rIl = illuminationRanking.solarAngles(video);
    var azimuth = rIl["az"];
    rEl = rIl["el"];
    var videoObjects = loadVideoObjects(M, objects);
            var def = q.defer();
            var promises = [];
            for(var i = 0; i < n; i++){
                var fov = video["fovs"][i];
                var d = fov.properties["heading"];
                var M1 = turf.bboxPolygon(turf.bbox(fov));
                (function (i, fov) {
                    // Filter step 1
                    if(turf.intersect(M1,query) != undefined) {
                        // Filter step 2
                        if(turf.intersect(fov,query) != undefined){
                            var fovObjects = getSceneObjects(fov, videoObjects);
                            // Get right/left most vertices of Q
                            var borderPts = borderPoints(fov, query);
                            // Compute scores
                            var r_dep = depictionRanking.objectDepiction(fov, query, fovObjects, borderPts);
                            var videoDuration = video.info.duration -  video.fovs[0]["properties"]["time"];
                            rAz += Math.min(Math.abs(d - azimuth), 360 - Math.abs(d - azimuth))/n;
                            rDist += distanceRanking.distanceDeviation(fov, query, borderPts)/n;
                            rDep += r_dep*100;
                            if(r_dep > 0){
                                nVis += 1;
                                if(i != n-1) {
                                    rVis += ((video["fovs"][i + 1].properties.time - fov.properties.time) / videoDuration) * 100;
                                } else {
                                    rVis += ((videoDuration - fov.properties.time) / videoDuration) * 100;
                                }
                            }
                            def.resolve();
                            promises.push(def.promise);
                        } else {
                            promises.push(true);
                        }
                    } else {
                        promises.push(true);
                    }
                })(i, fov);
            }
            q.all(promises).then(function () {
                console.log(rDep + " / " + nVis);
                if(rDep!=0 && nVis != 0){
                    rDep = rDep/nVis;
                }
                defer.resolve({
                    "REl": rEl,
                    "RAZ": rAz,
                    "RDist": rDist,
                    "RDep": rDep,
                    "RVis": rVis
                })
            }).catch(console.log.bind(console));
    return defer.promise;
};

// Get objects of a particular scene from the given object set
var getSceneObjects = function (fov, videoObjects) {
    var fovObjects = [];
    if(Object.keys(videoObjects).length > 0) {
        for (var j = 0; j < videoObjects.features.length; j++) {
            var currentObj = videoObjects.features[j];
            if (turf.intersect(fov, currentObj) != undefined) {
                fovObjects.push(currentObj);
            }
            if (j == videoObjects.features.length - 1) {
                return fovObjects;
            }
        }
    } else {
        return {};
    }
};

// Load objects for the given bbox
var loadObjects = function (bBox) {
    var defer = q.defer();
    var objects = {};
    var box = bBox,
        query = "/api/interpreter?data=[out:json][timeout:10];way("+box[1]+","+box[0]+","+box[3]+","+box[2]+")['building'];(._;>;);out;";
    try{
        overpassRequest(OVERPASS_URL, query).then(function (result) {
            objects = result;
            defer.resolve(objects);
        }).catch(console.log.bind(console));
    } catch (e){
        console.log("Error occured: " + e.message);
    }
    return defer.promise;
};
exports.loadObjects = loadObjects;

// Load video objects
var loadVideoObjects = function (bBox, objects) {
    var geoJSON = {
        "type": "FeatureCollection",
        "properties" : {},
        "features" : []
    };
    var features = objects.features;
    for(var i=0; i < features.length; i++){
        if(turf.intersect(turf.bboxPolygon(bBox),features[i]) != undefined){
            geoJSON.features.push(features[i]);
        }
    }
    return geoJSON;
};

// Convert data gathered from overpass API to GeoJSON
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

// Send a request of buildings to the OSM overpass API
var overpassRequest = function (host, query) {
    var defer = q.defer();
    var path = host+query;
    var options = {
        host: "wwwproxy.uni-muenster.de",
        path: "http://"+path,
        port: 80,
        method: 'GET',
        headers: {
            Host: host
        }
    };
    console.log("Overpass Request");
    httpRequest(options).then(function (result) {
        defer.resolve(result);
    }).catch(console.log.bind(console));
    return defer.promise;
};

// Perform a HTTP GET request
var httpRequest = function (options) {
    ++CONNECTIONS;
    console.log("Open Connections: " + CONNECTIONS);
    var defer = q.defer();
    req = http.request(options, function (response) {
        if(response.statusCode != 200) {
            console.log(options.host + ':' + response.statusCode);
        }
        var result = "";
        response.on("data", function (chunk) {
            result += chunk;
        });
        response.on("end", function () {
            if(response.statusCode == 200) {
                result = JSON.parse(result);
                var features = osmToGeoJSON(result);
                defer.resolve(features);
            } else {
                defer.reject({});
            }
            --CONNECTIONS;
        });
    });
    req.on("error", function (err) {
        --CONNECTIONS;
        console.log(err.message);
        defer.resolve({});
    });
    req.end();
    return defer.promise;
};

// Compute the border points of a query for the given FOVScene
var borderPoints = function (fov, query) {
    var angle;
    var Q = query;
    var d = fov.properties["heading"];
    var P = {
        "type" : "Feature",
        "geometry" : {
            "type": "Point",
            "coordinates": [fov.properties.longitude, fov.properties.latitude]
        },
        "properties": {}
    };
    var cornerPoints = turf.explode(Q)["features"];
    var angleL = 0, angleR = 0, pointL = undefined, pointR = undefined;
    for(var i=0; i<cornerPoints.length; i++){
        var vertex = cornerPoints[i];
        angle = normalizedAngle(turf.bearing(P, vertex), d);
        if(i == 0){
            angleL = angle;
            angleR = angle;
            pointR = vertex;
            pointL = vertex;
        } else {
            if(angle < angleL){
                angleL = angle;
                pointL = vertex;
            }
            if(angle > angleR){
                angleR = angle;
                pointR = vertex;
            }
        }
        if(i == cornerPoints.length-1){
            return {"ptLeft": pointL, "ptRight": pointR};
        }
    }
};

// Compute the normalized angle relative to the given viewing direction
var normalizedAngle = function (angle, direction) {
    angle = helpers.limitDegrees(angle-direction);
    if(angle > 180){
        return angle - 360;
    }
    return angle;
};