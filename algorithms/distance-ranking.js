/**
 * Created by Tobi on 04.11.2016.
 */

var q = require('q');
var geo = require('./geo-algorithms');
var turf = require('turf');


exports.calcOptimalDistance = function (fov, Q, brdrPts) {
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

    // Calculate the ditsances at which tje left-most and right-most edges of the building
    // intersect with the edges of the viewable scene
    var L0 = brdrPts["ptLeft"];
    var R0 = brdrPts["ptRight"];
    var N0 = nearestPoint(Q, P);

    // Calculate angles between P and the specified points and rotate them so that the repsective FOV points towards east
    var angleL = (turf.bearing(P, L0) + (90 - d)) % 180;
    var angleR = (turf.bearing(P, R0) + (90 - d)) % 180;
    var angleN = (turf.bearing(P, N0) + (90 - d)) % 180;

    // Calculate new positions for rotated FOV
    var L = turf.destination(P, turf.distance(P, L0), angleL);
    var R = turf.destination(P, turf.distance(P, R0), angleR);
    var N = turf.destination(P, turf.distance(P, N0), angleN);

    // Calculate Y values for border points and X value for the polygon's closest vertex towards P
    var Lh = turf.distance({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [P.geometry.coordinates[0], L.geometry.coordinates[1]]
        },
        "properties": {}
    }, P);
    var Rh = turf.distance({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [P.geometry.coordinates[0], R.geometry.coordinates[1]]
        },
        "properties": {}
    }, P);
    var Nw = turf.distance({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [N.geometry.coordinates[0], P.geometry.coordinates[1]]
        },
        "properties": {}
    }, P);

    // Transform FOV border angles from geographic to cartesian angles and calculate the distance
    var angL = transformAngle(((d - (theta/2)) + (90-d)) % 180);
    var angR = transformAngle(((d + (theta/2)) + (90-d)) % 180);
    var DL = Lh/Math.tan(angL);
    var DR = Rh/Math.tan(angR);
    var D0 = Math.max(DL,DR);
    var distanceRank = D0 - Math.abs(Nw - D0);
    return distanceRank;
};

// Calculate the nearest vertex of the given polygon for the specified point
var nearestPoint = function(polyon, point){
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
