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
    data["params"] = equations.calcParameters(date, data["delta_t"], data["latitude"], data["longitude"], data["P"], data["T"]);
    data["RTS"] = {};

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

    data["RTS"]["transit"] = transit;
    data["RTS"]["sunrise"] = sunrise;
    data["RTS"]["sunset"] = sunset;

    Object.keys(data["params"]).forEach(function(key) {
        if(["alpha", "epsilon", "z", "h", "L", "alpha_t", "h_t"].indexOf(key) >= 0) {
            console.log(key + ": " + helpers.limitDegrees(helpers.rad2deg(data["params"][key])));
        } else if(["delta", "gammaL"].indexOf(key) >= 0){
            console.log(key + ": " +  helpers.rad2deg(data["params"][key]));
        } else if(!(["gamma", "phi", "delta_alpha", "t", "tg", "sh_t", "ch_t", "delta_gamma", "e0", "delta_e", "delta_t"].indexOf(key)>= 0)){
            console.log(key +  ": " + data["params"][key]);
        }
    });

    var result = {
        "azimuth": data["params"]["azimuth"],
        "elevation": data["params"]["elevation"],
        "transit": data["RTS"]["transit"],
        "sunrise": data["RTS"]["sunrise"],
        "sunset": data["RTS"]["sunset"]
    };

    return result;
};

exports.illuminationRank = function (geovideo) {
    var fovCollection = {"type": "FeatureCollection", "features": geovideo.fovs};
    var time = geovideo.info["starttime"] + geovideo.info["duration"]/2;
    var date = new Date(time);
    var utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
    var latitude = geovideo.info.geometry.longitude;
    // exports.calculate();
};

// Date has to be given in UTC since in general javascript assumes dates to be given in the browser's local timezone
var DATE = new Date(Date.UTC(2003, 10-1, 17, 19, 30, 30));
var LATITUDE = 39.742476;
var LONGITUDE = -105.1786;
var Z = 1830.14;
var TZ = -7;

console.time("calc");
exports.calculate(DATE, LATITUDE, LONGITUDE, Z, TZ);
console.timeEnd("calc");