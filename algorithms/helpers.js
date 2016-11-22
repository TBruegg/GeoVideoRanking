/**
 * Created by Tobi on 04.11.2016.
 */

// Convert degrees to radians

var exports = module.exports;

exports.deg2rad = function (degrees) {
    return (Math.PI / 180.0)*degrees;
};

// Convert radians to degrees
exports.rad2deg = function (radians) {
    return (180.0/Math.PI)*radians;
};

// Calculating fraction of day from timestamp
exports.fractionalDay = function (date) {
    var hfrac = date.getUTCHours();
    var mfrac = date.getUTCMinutes() / 60;
    var sfrac = date.getUTCSeconds() / 3600;
    var frac = hfrac + mfrac + sfrac;
    return frac;
};

// Limit degrees to number between 0 and 360
exports.limitDegrees = function (degrees) {
    var degrees = degrees / 360.0;
    var limited = 360.0 * (degrees - Math.floor(degrees));
    if(limited < 0){
        limited += 360.0;
    }
    return limited;
};

// Limit degrees to number between 0 and 180
exports.limitDegrees180 = function (degrees) {
    var degrees = degrees / 180.0;
    var limited = 180.0 * (degrees - Math.floor(degrees));
    if(limited < 0){
        limited += 180.0;
    }
    return limited;
};

// Limit value to number between 0 and 1
exports.limitZero2One = function (value) {
    var limited = value - Math.floor(value)
    if(limited < 0){
        limited += 1.0;
    }
    return limited;
};

// Convert fraction of day to local hour value
exports.dayfracToLocalHr = function (dayfrac, timezone) {
    return 24.0 * exports.limitZero2One(dayfrac + timezone / 24.0);
};

// Convert timestamp to local hour value
exports.timeToLocalHr = function(hour, minute, second){
    return hour + (minute/60) + (second/3600);
};

// Return timestring for given fraction of day
exports.timestring = function (dayfrac) {
    return Math.floor(dayfrac) + ":" + Math.floor(dayfrac%1*60) + ":" + Math.floor((dayfrac%1*60)%1*60);
};

exports.normalizedAngle = function (angle, direction) {
    angle = helpers.limitDegrees(angle-direction);
    if(angle > 180){
        return angle - 360;
    }
    return angle;
};