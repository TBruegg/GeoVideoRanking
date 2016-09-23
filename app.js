/**
 * Created by Tobi on 25.04.2016.
 */
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var turf = require('turf');
var wkx = require('wkx');
var q = require('q');
async = require('async');

var algorithms = require('./algorithms/geo-algorithms');

var pg = require('pg');
var dbConnectionString = "postgres://postgres:postgres@127.0.0.1:5432/test";
var fovTableName = "fovpolygons_90";

// API ROUTES
// ----------------------------------------------------------------

// Standard route for delivering main application
app.get('/', function (req, res) {
    res.sendFile( __dirname + "/" + "public/index.html" );
});

app.get('/api/startingPoints', function (req,res) {
   res.send('ROUTE startingPoints');
});

app.get('/api/polygonQuery', function (req,res) {
    var queryRegion = JSON.parse(req.query.region);
    var dbClient = new pg.Client(dbConnectionString);
    dbClient.connect();
    var results = {"result":[]};
    var queryResults = {};
    var polygonGeoJSON = wkx.Geometry.parseGeoJSON(queryRegion.geometry);
    var polygonWkt = polygonGeoJSON.toWkt();
    var queryString = "SELECT DISTINCT v.id, ST_AsGeoJSON(v.initial_location) FROM points as p " +
                "INNER JOIN " + fovTableName + " as f ON f.camera_location = p.id " +
                "INNER JOIN videos as v ON p.video = v.id " +
                "WHERE ST_Overlaps(f.geometry, ST_GeomFromText('" + polygonWkt + "',4326));";
    var query = dbClient.query(queryString);
    query.on('row', function (row) {
        console.log(row);
        results.result.push(row);
    });
    query.on('end', function(){
        dbClient.end();
        res.json(results);
        createVideoStore(results).then(
            function (geoVideoCollection) {
                console.log("FOVStore created succesfully");
                queryResults = geoVideoCollection;
                var sampleFOV = queryResults[Object.keys(queryResults)[0]]['fovs'][0];
                console.log(sampleFOV);
                var c_loc = turf.point([sampleFOV.properties['longitude'],sampleFOV.properties['latitude']]);
                console.log("c_loc: " + JSON.stringify(c_loc));
                var corners = algorithms.fovCornerPoints(c_loc, sampleFOV.properties['heading'], sampleFOV.properties['viewable_angle'],
                                                         sampleFOV.properties['visible_distance']);
                console.log("corners: " + corners);
                var pointInFOV = algorithms.pointFOVIntersect(c_loc, sampleFOV);
                console.log("Point in FOV: " + pointInFOV);
                var pointInPolygon = algorithms.pointPolygonIntersect(c_loc, sampleFOV);
                console.log("Point in Polygon: " + pointInPolygon);
                var line = {
                    "type": "Feature",
                    "properties": {
                        "name": "Coors Field",
                        "amenity": "Baseball Stadium",
                        "popupContent": "This is where the Rockies play!"
                    },
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[-100, 40], [-105, 45], [-110, 55]]
                    }
                };
                var circle = algorithms.lineCircleIntersect(line,c_loc,0.2);
                console.log(circle);
                var p = {
                    "type":"Feature",
                    "id":4,
                    "geometry":
                    {"type": "Point", "coordinates": [103.8646389098524736, 1.28951273898685304]},
                    "properties": {}
                };
                var p2 = {
                    "type":"Feature",
                    "id":6,
                    "geometry":
                    {"type": "Point", "coordinates": [103.86512669857167168, 1.28823344404404216]},
                    "properties":null
                };
                var p3 = {
                    "type":"Feature",
                    "id":5,
                    "geometry":
                    {"type": "Point", "coordinates": [103.8648045739457757, 1.28981645649126131]},
                    "properties":null
                };
                var p4 = {
                    "type":"Feature",
                    "id":7,
                    "geometry":
                    {"type": "Point", "coordinates": [103.86340563271335213, 1.28731308797007782]},
                    "properties":null
                };
                var a1 = isWithinAngle(p, c_loc, 134.798138, 60);
                var a2 = isWithinAngle(p2, c_loc, 134.798138, 60);
                var a3 = isWithinAngle(p3, c_loc, 134.798138, 60);
                var a4 = isWithinAngle(p4, c_loc, 134.798138, 60);
                var arc = algorithms.estimateArc(corners[1],corners[2],c_loc);
            }
        );
    });
    //res.json(results);
});

// Helper functions
// ----------------------------------------------------------------

var videoFOVs = function (id) {
    var defer = q.defer();
    var fovList = {"id":id,"fovs":[]};
    var dbClient = new pg.Client(dbConnectionString);
    dbClient.connect();
    var queryString = "SELECT f.id, f.camera_location, f.heading, f.viewable_angle, f.visible_distance, ST_asGeoJSON(f.geometry) as geometry, " +
                      "f.time, p.video, p.location, p.date, p.latitude, p.longitude " +
                      "FROM fovpolygons_90 AS f " +
                      "INNER JOIN points as p " +
                      "ON f.camera_location = p.id " +
                      "WHERE p.video = '" + id + "'";
    var query = dbClient.query(queryString);
    query.on('row', function (row) {
        geometry = JSON.parse(row['geometry']);
        delete row['geometry'];
        geoJson = {"type": "Feature",
                    "properties": row,
                    "geometry": geometry
                   };
        fovList.fovs.push(geoJson);
    });
    query.on('end', function(){
        dbClient.end();
        defer.resolve(fovList);
    });
    return defer.promise;
};

var videoInfo = function (id) {
    var videoInfo;
    var defer = q.defer();
    var dbClient = new pg.Client(dbConnectionString);
    dbClient.connect();
    var queryString = "SELECT * FROM videos WHERE id = '" + id + "'";
    var query = dbClient.query(queryString);
    query.on('row', function (row) {
        videoInfo = row;
    });
    query.on('end', function(){
        dbClient.end();
        defer.resolve(videoInfo);
    });
    return defer.promise;
};

var createVideoStore = function (results) {
    var defer = q.defer();
    var fovStore = {};
    it = 0;
    for (var i in results['result']) {
        videoId = results['result'][i].id;
        console.log(videoId);
        videoInfo(videoId).then(
            function (info) {
                if (!fovStore[info.id]){
                    fovStore[info.id] = {};
                    fovStore[info.id]['info'] = info;
                } else {
                    fovStore[info.id]['info'] = info;
                }
                fovStore[info.id]['fovs'] = {};
                return videoInfo(videoId);
            }
        ).then(videoFOVs(videoId).then(
            function (fovList) {
                fovStore[fovList['id']]['fovs'] = fovList['fovs'];
                ++it;
                if(it == results['result'].length){
                    defer.resolve(fovStore);
                } else {
                    console.log(i);
                }
            }
        ));
    }
    return defer.promise;
};


// Listen on Port 80
// ----------------------------------------------------------------

app.use('/', express.static(__dirname + '/public'));
var server = app.listen(80, function () {

    var host = server.address().address;
    var port = server.address().port;

    console.log("Example app listening at http://%s:%s", host, port);

});



