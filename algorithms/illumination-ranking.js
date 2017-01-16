/**
 * Created by Tobi on 04.11.2016.
 */

var turf = require('turf');
var geo = require('./geo-algorithms');
var equations = require('./solar-equations');
var helpers = require('./helpers');

// Calculate solar angles
exports.solarAngles = function (geovideo) {
    var time = parseInt(geovideo.info["starttime"]) + parseInt(geovideo.info["duration"])/2;
    var date = new Date(time);
    var tz = date.getTimezoneOffset();
    var latitude = geovideo.info.geometry.coordinates[1];
    var longitude = geovideo.info.geometry.coordinates[0];
    var z = 1830.14;
    var data = {
        "delta_t": 70,
        "P": 0.809277,
        "T": 11.00,
        "longitude": longitude,
        "latitude": latitude,
        "altitude": z || 0,
        "slope": 30.0,
        "surface_azimuth_rotation": -10.0,
        "timezone": tz/60 || 0
    };
    var parameters = equations.calcParameters(date, data["delta_t"], data["latitude"], data["longitude"], data["P"], data["T"]);
    var phi = parameters["azimuth"];
    var e = parameters["elevation"];
    var rankings = {
        "az": phi,
        "el": e
    };
    return rankings;
};
