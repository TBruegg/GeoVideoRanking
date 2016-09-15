/**
 * Created by Tobi on 25.04.2016.
 */
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var turf = require('turf');

var pg = require('pg');
var dbConnectionString = "postgres://postgres:postgres@127.0.0.1:5432/test";


// API ROUTES
// ----------------------------------------------------------------

// Standard route for delivering main application
app.get('/', function (req, res) {
    res.sendFile( __dirname + "/" + "public/index.html" );
});

app.get('/api/startingPoints', function (req,res) {
   res.send('ROUTE startingPoints');
});

app.get('/api/polygonQuery/:lat_sw/:lng_sw/:lat_ne/:lng_ne', function (req,res) {
    var dbClient = new pg.Client(dbConnectionString);
    dbClient.connect();
    var results = {"result":[]};
    var lat_sw = req.params.lat_sw;
    var lng_sw = req.params.lng_sw;
    var lat_ne = req.params.lat_ne;
    var lng_ne = req.params.lng_ne;
    var polygonWkt = `ST_GeomFromText('POLYGON((${lng_sw} ${lat_sw}, ${lng_sw} ${lat_ne},  
                    ${lng_ne} ${lat_ne}, ${lng_ne} ${lat_sw}, ${lng_sw} ${lat_sw}))',4326)`;
    console.log(polygonWkt);
    var queryString = "SELECT DISTINCT v.id, ST_AsGeoJSON(v.initial_location) FROM points as p " +
                "INNER JOIN fovpolygons_90 as f ON f.camera_location = p.id " +
                "INNER JOIN videos as v ON p.video = v.id " +
                "WHERE ST_Overlaps(f.geometry," + polygonWkt + ");"
    var query = dbClient.query(queryString);
    query.on('row', function (row) {
        console.log(row);
        results.result.push(row);
    });
    query.on('end', function(){
        dbClient.end();
        res.json(results);
    });
    //res.json(results);
});


// ----------------------------------------------------------------


// Listen on Port 80
app.use('/', express.static(__dirname + '/public'));
var server = app.listen(80, function () {

    var host = server.address().address;
    var port = server.address().port;

    console.log("Example app listening at http://%s:%s", host, port);

});

