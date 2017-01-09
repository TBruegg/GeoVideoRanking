/**
 * Created by Tobi on 04.11.2016.
 */

var turf = require('turf');
var geo = require('./geo-algorithms');
var nutations = require('./nutations');
var equations = require('./solar-equations');
var helpers = require('./helpers');

exports.calculate = function(date, lat, lng, z, tz) {
    var data = {
        "delta_t": 67,
        "P": 0.809277,
        "T": 11.00,
        "longitude": lng,
        "latitude": lat,
        "altitude": z || 0,
        "slope": 30.0,
        "surface_azimuth_rotation": -10.0,
        "timezone": tz || 0
    };
    var parameters = equations.calcParameters(date, data["delta_t"], data["latitude"], data["longitude"], data["P"], data["T"]);
    RTS = {};

    var transitDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
    var transitData = equations.calcParameters(transitDate, data["delta_t"], data["latitude"], data["longitude"], data["P"], data["T"]);
    var siderealTime = equations.sidTimeAtGreenwich(transitDate, lat, lng, transitData, tz);
    var hourAngle = equations.localHourAngle(lat, transitData["delta"]);

    var transit = equations.calcSolarTransit(lng, transitData["alpha"], siderealTime);
    var sunrise = equations.calcSunrise(transit, hourAngle);
    var sunset = equations.calcSunset(transit, hourAngle);

    var transit_hours = helpers.dayfracToLocalHr(transit, tz);
    var sunrise_hours = helpers.dayfracToLocalHr(sunrise, tz);
    var sunset_hours = helpers.dayfracToLocalHr(sunset, tz);

    console.log("Transit: " + helpers.timestring(transit_hours));
    console.log("Sunrise: " + helpers.timestring(sunrise_hours));
    console.log("Sunset: " + helpers.timestring(sunset_hours));

    RTS["transit"] = transit;
    RTS["sunrise"] = sunrise;
    RTS["sunset"] = sunset;

    Object.keys(parameters).forEach(function(key) {
        if(["alpha", "epsilon", "z", "h", "L", "alpha_t", "h_t"].indexOf(key) >= 0) {
            console.log(key + ": " + helpers.limitDegrees(helpers.rad2deg(parameters[key])));
        } else if(["delta", "gammaL"].indexOf(key) >= 0){
            console.log(key + ": " +  helpers.rad2deg(parameters[key]));
        } else if(!(["gamma", "phi", "delta_alpha", "t", "tg", "sh_t", "ch_t", "delta_gamma", "e0", "delta_e", "delta_t"].indexOf(key)>= 0)){
            console.log(key +  ": " + parameters[key]);
        }
    });

    var result = {
        "azimuth": parameters["azimuth"],
        "elevation": parameters["elevation"],
        "transit": RTS["transit"],
        "sunrise": RTS["sunrise"],
        "sunset": RTS["sunset"]
    };

    return result;
};

exports.solarAngles = function (geovideo) {
    var fovCollection = {"type": "FeatureCollection", "features": geovideo.fovs};
    var time = parseInt(geovideo.info["starttime"]) + parseInt(geovideo.info["duration"])/2;
    var date = new Date(time);
    var tz = date.getTimezoneOffset();
    var utcTime = time - (-(tz*60*1000));
    var utcDate = new Date(utcTime);
    var latitude = geovideo.info.geometry.coordinates[1];
    var longitude = geovideo.info.geometry.coordinates[0];
    var z = 1830.14;
    // exports.calculate();
    var data = {
        "delta_t": 70, //vorher 67!
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
    // var RTS = {};
    /*
    var zeroHour = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
    var transitData = equations.calcParameters(zeroHour, data["delta_t"], data["latitude"], data["longitude"], data["P"], data["T"]);
    var alpha = transitData["alpha_t"];
    var delta = transitData["delta_t"];
    var siderealTime = equations.sidTimeAtGreenwich(zeroHour, latitude, longitude, transitData, tz/60);
    var hourAngle = equations.localHourAngle(latitude, transitData["delta"]);

    var transit = equations.calcSolarTransit(longitude, transitData["alpha"], siderealTime);
    var sunrise = equations.calcSunrise(transit, hourAngle);
    var sunset = equations.calcSunset(transit, hourAngle);
    */
    // var transit_hours = helpers.dayfracToLocalHr(transit, tz/60);
    // var sunrise_hours = helpers.dayfracToLocalHr(sunrise, tz/60);
    // var sunset_hours = helpers.dayfracToLocalHr(sunset, tz/60);

    //console.log("Transit: " + helpers.timestring(transit_hours));
    //console.log("Sunrise: " + helpers.timestring(sunrise_hours));
    //console.log("Sunset: " + helpers.timestring(sunset_hours));

    // RTS["transit"] = transit;
    // RTS["sunrise"] = sunrise;
    // RTS["sunset"] = sunset;
    /*
    Object.keys(parameters).forEach(function(key) {
        if(["alpha", "epsilon", "z", "h", "L", "alpha_t", "h_t"].indexOf(key) >= 0) {
            console.log(key + ": " + helpers.limitDegrees(helpers.rad2deg(parameters[key])));
        } else if(["delta", "gammaL"].indexOf(key) >= 0){
            console.log(key + ": " +  helpers.rad2deg(parameters[key]));
        } else if(!(["gamma", "phi", "delta_alpha", "t", "tg", "sh_t", "ch_t", "delta_gamma", "e0", "delta_e", "delta_t"].indexOf(key)>= 0)){
            console.log(key +  ": " + parameters[key]);
        }
    });
    */
    var rankings = {
        "az": phi,
        "el": e
    };

    /*for(var i=0; i<fovCollection["features"].length;i++){
        var fov = fovCollection["features"][i];
        var d = fov.properties["heading"];
        rankings["az"] += min(abs(d - phi), 360 - abs(d - phi));
    }*/

    return rankings;
};

// Date has to be given in UTC since in general javascript assumes dates to be given in the browser's local timezone
var DATE = new Date(Date.UTC(2003, 10-1, 17, 19, 30, 30));
var LATITUDE = 39.742476;
var LONGITUDE = -105.1786;
var Z = 1830.14;
var TZ = -7;

//console.time("calc");
//exports.calculate(DATE, LATITUDE, LONGITUDE, Z, TZ);
//console.timeEnd("calc");
/*var video = {
    "fovs":[],
    "info": {
        "id": "05ea0f610bd54b68602734a70f3914147038aae7",
        "file": "F:/Videos GeoVid/videos/05ea0f610bd54b68602734a70f3914147038aae7.mp4",
        "os": "iPhone OS",
        "duration": "65000",
        "min_height": 240,
        "min_width": 360,
        "geometry": {
            "type": "Point",
            "coordinates": [
                -105.1786,
                39.742476
            ]
        },
        "orientation": 270,
        "starttime": "1066419030000",
        "gps_accuracy": 5,
        "geomagnetic_declination": 0.066666666666667
    }
};*/
// exports.solarAngles(video);