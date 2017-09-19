/**
 * Created by Tobi on 25.04.2016.
 */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');
var turf = require('turf');
var wkx = require('wkx');
var q = require('q');
var io = require('socket.io')(http);

// Require algorithms
var helpers = require('./algorithms/helpers');

var illuminationRanking = require('./algorithms/illumination-ranking');
var featureCentricRanking = require('./algorithms/feature-centric-ranking');

var algorithms = require('./algorithms/geo-algorithms');
var ranking = require('./algorithms/basic-ranking');

var pg = require('pg');
// var dbConnectionString = "postgres://postgres:postgres@127.0.0.1:5432/test";

// ADJUST THE FOLLOWING PARAMETERS TO MATCH YOUR CONFIGURATION
var dbConnectionString = "postgres://postgres:postgres@127.0.0.1:5432/geovideo";
var fovTableName = "fovpolygons_90";
var video_directory = "F:/Videos GeoVid/videos/";





// API ROUTES
// ----------------------------------------------------------------

// Standard route for delivering main application
app.get('/', function (req, res) {
    res.sendFile( __dirname + "/" + "public/index.html" );
});

app.get('/video/:id', function (req,res) {
    var videoId = req.params.id;
    var url = video_directory + videoId +".mp4";
    // var url = "/home/t_brue09/videos/" + videoId +".mp4";
    var filePath = path.resolve(url);
    var stat = fs.statSync(filePath);
    var total = stat.size;
    if (req.headers['range']) {
        var range = req.headers.range;
        var parts = range.replace(/bytes=/, "").split("-");
        var partialstart = parts[0];
        var partialend = parts[1];

        var start = parseInt(partialstart, 10);
        var end = partialend ? parseInt(partialend, 10) : total-1;
        var chunksize = (end-start)+1;
        // console.log('RANGE: ' + start + ' - ' + end + ' = ' + chunksize);

        var file = fs.createReadStream(filePath, {start: start, end: end});
        res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
                             'Accept-Ranges': 'bytes',
                             'Content-Length': chunksize,
                             'Content-Type': 'video/mp4'
        });
        file.pipe(res);
    } else {
        res.writeHead(200, { 'Content-Length': total, 'Content-Type': 'video/mp4' });
        fs.createReadStream(filePath).pipe(res);
    }
});

app.get('/api/startingPoints', function (req,res) {
   res.send('ROUTE startingPoints');
});

app.get('/api/polygonQuery', function (req,res) {
    console.log("Received query");
    var queryRegion = JSON.parse(req.query.region);
    var dbClient = new pg.Client(dbConnectionString);
    dbClient.connect();
    var results = {"result":[]};
    var queryResults = {};
    var polygonGeoJSON = wkx.Geometry.parseGeoJSON(queryRegion.geometry);
    var polygonWkt = polygonGeoJSON.toWkt();
    var queryString = "SELECT DISTINCT v.id, v.duration, ST_AsGeoJSON(v.initial_location) as geometry FROM points as p " +
                "INNER JOIN " + fovTableName + " as f ON f.camera_location = p.id " +
                "INNER JOIN videos as v ON p.video = v.id " +
                "WHERE ST_Overlaps(f.geometry, ST_GeomFromText('" + polygonWkt + "',4326)) ORDER BY v.duration LIMIT 20;";
    var query = dbClient.query(queryString);
    query.on('row', function (row) {
        console.log(row);
        results.result.push(row);
    });
    query.on('end', function(){
        dbClient.end();
        res.json(results);
        if(results["result"].length == 0){
            io.emit('void', {});
            return;
        }
        io.emit('loadUpdate', 'Loading FOV data...');
        createVideoStore(results).then(
            function (geoVideoCollection) {
                console.log("FOVStore created succesfully");
                // TODO: Nur an zugehörigen Client senden
                io.emit('loadUpdate', 'Calculating rank scores...');
                var queryResults = geoVideoCollection;
                loadOsmObjects(queryResults).then(function (objects) {
                    (function () {
                        var defer = q.defer();
                        var counter = 0;
                        for (var i = 0; i < Object.keys(queryResults).length; i++) {
                            var key = Object.keys(queryResults)[i];
                            var video = queryResults[key];
                            video.info["geometry"] = JSON.parse(video.info["geometry"]);

                            (function (i, video) {
                                var rankScores = ranking.calculateRankScores(video, queryRegion);
                                var loadOsmObjects = {};
                                featureCentricRanking.calculateRankScores(video, queryRegion, objects).then(
                                    function (scores) {
                                        for (var key in scores) {
                                            rankScores[key] = scores[key];
                                        }
                                        io.emit('loadUpdate', 'Calculating scores for video ' + i + '/' + Object.keys(queryResults).length);
                                        console.log((i + 1) + "/" + Object.keys(queryResults).length + ": " + JSON.stringify(rankScores));
                                        video['rankings'] = {};
                                        for (var j = 0; j < Object.keys(rankScores).length; j++) {
                                            var rkey = Object.keys(rankScores)[j];
                                            video.rankings[rkey] = Math.round(rankScores[rkey] * 100) / 100;
                                            //video.rankings[rkey] = rankScores[rkey];
                                        }
                                        //console.log(JSON.stringify(video['rankings']));
                                        //console.log("Calculated rank scores for " + Object.keys(video.info.id));
                                        if (counter == Object.keys(queryResults).length - 1) {
                                            defer.resolve(queryResults);
                                        } else {
                                            console.log("Processed video " + (i + 1) + "/" + Object.keys(queryResults).length);
                                        }
                                        counter++;
                                    }
                                )//.catch(console.log.bind(console));
                            })(i, video);
                        }
                        return defer.promise;
                    })().then(function (queryResults) {
                        console.log("Return results");
                        io.emit('rankingFinished', queryResults);
                        return;
                    });//.catch(console.log.bind(console));
                });
                // TODO: Nur an zugehörigen Client senden
                //io.emit('rankingFinished', queryResults);
                // testing.txt goes here
            }
        ).catch(console.log.bind(console));
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
        var geometry = JSON.parse(row['geometry']);
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
    var queryString = "SELECT id, file, os, duration, min_height, min_width, ST_asGeoJSON(initial_location) as geometry, " +
                      "orientation, starttime, gps_accuracy, geomagnetic_declination, number FROM videos WHERE id = '" + id + "'";
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
        (function (i) {
            var videoId = results['result'][i].id;
            console.log(videoId);
            videoInfo(videoId).then(
                function (info) {
                    if (!fovStore[info.id]) {
                        fovStore[info.id] = {};
                        fovStore[info.id]['info'] = info;
                    } else {
                        fovStore[info.id]['info'] = info;
                    }
                    fovStore[info.id]['fovs'] = {};
                    //return videoInfo(videoId);
                    return info;
                }
            ).then(videoFOVs(videoId).then(
                function (fovList) {
                    fovStore[fovList['id']]['fovs'] = fovList['fovs'];
                    ++it;
                    if (it == results['result'].length) {
                        defer.resolve(fovStore);
                    }
                }
            )).catch(console.log.bind(console));
        })(i);
    }
    return defer.promise;
};

var loadOsmObjects = function (queryResults) {
    var union = undefined;
    for(var i in queryResults){
        var fovs = queryResults[i]["fovs"];
        var fovCollection = {"type": "FeatureCollection", "features": fovs};
        var M = turf.bboxPolygon(turf.bbox(fovCollection));
        if (union != undefined){
            union = turf.union(union,M);
        } else {
            union = M;
        }
    }
    var bbox = turf.bbox(union);
    return featureCentricRanking.loadObjects(bbox);
};


// Web Sockets
// ----------------------------------------------------------------

io.on('connection', function (socket) {
    console.log('Client connected');
    socket.on('disconnect', function () {
        console.log('Client disconnected');
    })
});


// Listen on Port 80
// ----------------------------------------------------------------

app.use('/', express.static(__dirname + '/public'));
var server = http.listen(80, function () {

    var host = server.address().address;
    var port = server.address().port;

    console.log("Example app listening at http://%s:%s", host, port);

});

app.use(function noCache(req, res, next){
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires",0);
    next();
});



