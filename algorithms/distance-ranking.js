/**
 * Created by Tobi on 04.11.2016.
 */

var q = require('q');
var geo = require('./geo-algorithms');
var turf = require('turf');
var helpers = require('./helpers');

exports.distanceDeviation = function (fov, Q, brdrPts) {
    var d = fov.properties["heading"];
    var theta = fov.properties["viewable_angle"];
    var P = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [fov.properties.longitude, fov.properties.latitude]
        },
        "properties": {}
    };

    // Calculate the distances at which tje left-most and right-most edges of the building
    // intersect with the edges of the viewable scene
    var L0 = brdrPts["ptLeft"];
    var R0 = brdrPts["ptRight"];
    // var N0 = nearestPoint(Q, P);

    // Calculate angles between P and the specified points and rotate them so that the respective FOV points towards east
    var angleL = helpers.limitDegrees180((turf.bearing(P, L0) + (90 - d)));
    var angleR = helpers.limitDegrees180((turf.bearing(P, R0) + (90 - d)));

    // Calculate new positions for rotated FOV
    var L = turf.destination(P, turf.distance(P, L0), 90-(angleR-angleL)/2);
    var R = turf.destination(P, turf.distance(P, R0), 90+(angleR-angleL)/2);

    // Calculate Y values for border points and X value for the polygon's closest vertex towards P (in meters)
    var Lh = turf.distance({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [P.geometry.coordinates[0], L.geometry.coordinates[1]]
        },
        "properties": {}
    }, P)*1000;
    var Lw = turf.distance({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [L.geometry.coordinates[0], P.geometry.coordinates[1]]
        },
        "properties": {}
    }, P)*1000;
    var Rh = turf.distance({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [P.geometry.coordinates[0], R.geometry.coordinates[1]]
        },
        "properties": {}
    }, P)*1000;
    var Rw = turf.distance({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [R.geometry.coordinates[0], P.geometry.coordinates[1]]
        },
        "properties": {}
    }, P)*1000;

    // Transform FOV border angles from geographic to cartesian angles and calculate the distance
    var angL = transformAngle(parseFloat((d - (theta/2)) + (90-d)) % 180);
    var angR = transformAngle(parseFloat((d + (theta/2)) + (90-d)) % 180);
    var DL = Math.abs(Lh/Math.tan(helpers.deg2rad(angL)));
    var DR = Math.abs(Rh/Math.tan(helpers.deg2rad(angR)));
    var D0 = Math.max(DL,DR);
    // Calculate distance between nearest border point and nearest vertex
    var dist = (DL > DR) ? Lw : Rw;
    // Substract distance from calculated optimal distance
    // TODO: Ausprobieren und ggf. Zeile 75 und 77 streichen!!! Anpassung in Thesis!
    if(Math.abs(DL-Lw) > Math.abs(DR-Rw)){
        D0 = DL;
        dist = Lw;
    } else {
        D0 = DR;
        dist = Rw;
    }
    var distanceRank = D0 - Math.abs(dist-D0);
    // Distance rank score is the difference of optimal distance and actual camera-feature distance
    // var distanceDeviation = D - Math.abs(D - Nw);
    return distanceRank;
};

// Calculate the nearest vertex of the given polygon for the specified point
var nearestPoint = function(polygon, point){
    var vertices = turf.explode(polygon).features;
    var dist = 0;
    var nearest = {};
    for(var v=0; v < vertices.length; v++){
        var nDist = turf.distance(point, vertices[v]);
        if(v == 0 || nDist < dist){
            dist = nDist;
            nearest = vertices[v];
        }
    }
    return nearest;
};

// Convert geographic direction to angle in cartesian coordinate system
var transformAngle = function(angle){
    if(angle%180 > 90){
        return -(angle%90);
    }
    return (90 - angle)%90;
};
