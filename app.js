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
        resultsToFOVStore(results).then(
            function (value) {
                console.log("FOVStore created succesfully");
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
    var queryString = "SELECT f.id, f.camera_location, f.heading, f.viewable_angle, f.visible_distance, ST_asGeoJSON(f.geometry), " +
                      "f.time, p.video, p.location, p.date, p.latitude, p.longitude " +
                      "FROM fovpolygons_90 AS f " +
                      "INNER JOIN points as p " +
                      "ON f.camera_location = p.id " +
                      "WHERE p.video = '" + id + "'";
    var query = dbClient.query(queryString);
    query.on('row', function (row) {
        fovList.fovs.push(row);
    });
    query.on('end', function(){
        dbClient.end();
        defer.resolve(fovList);
    });
    return defer.promise;
};

var resultsToFOVStore = function (results) {
    var defer = q.defer();
    var fovStore = {};
    it = 0;
    for (var i in results['result']) {
        videoId = results['result'][i].id;
        console.log(videoId);
        videoFOVs(videoId).then(
            function (fovList) {
                fovStore[fovList['id']] = fovList['fovs'];
                if(Object.keys(fovStore).length == results['result'].length){
                    defer.resolve(fovStore);
                } else {
                    console.log(i);
                }
            }
        );
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



