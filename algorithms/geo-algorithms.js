/**
 * Created by Tobi on 21.09.2016.
 */
var turf = require('turf');
// var exports = module.exports;

polygonEdges = function (polygon) {

};

polygonVertices = function (polygon) {
    return turf.explode(polygon);
};

fovCornerPoints = function (point, direction, angle, distance) {
    var bearingLeft = direction - angle/2;
    var bearingRight = direction + angle/2;
    var pointLeft = turf.destination(point, distance, bearingLeft);
    var pointRight = turf.destination(point, distance, bearingRight);
    return [point,pointLeft,pointRight];
};

pointFOVIntersect = function (point, FOVScene) {
    value = turf.intersect(point,FOVScene);
    return !(turf.intersect(point,FOVScene) == undefined);
};

pointPolygonIntersect = function(point, queryRegion){
    return !(turf.intersect(point,queryRegion) == undefined);
};

lineIntersect = function (line1, line2) {
    return turf.intersect(line1,line2) || null;
};

lineCircleIntersect = function (line, centerPoint, radius) {
    var circle = createCircle(centerPoint, radius);
    return lineIntersect(line, circle) || null;
};

isWithinAngle = function (point, centerPoint, direction, angle) {
    var bearing = turf.bearing(centerPoint,point);
    if(bearing < 0){
        bearing = 360 + bearing;
    }
    var angleLeft = direction - angle/2;
    var angleRight = direction + angle/2;
    return (bearing >= angleLeft) && (bearing <= angleRight);
};

estimateArc = function (point1, point2, centerPoint) {
    var arc = {"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[]}};
    var bearing1 = turf.bearing(centerPoint, point1);
    var bearing2 = turf.bearing(centerPoint, point2);
    if(bearing1 < 0){
        bearing1 = 360 + bearing1;
    }
    if(bearing2 < 0){
        bearing2 = 360 + bearing2;
    }
    var angleLeft = Math.min(bearing1,bearing2);
    var angleRight = Math.max(bearing1,bearing2);
    var differenceAngle = (angleRight-angleLeft)/6;
    var distance = turf.distance(point1,centerPoint);
    for(var i = 0; i <= 6; i++){
        var newPoint = turf.destination(centerPoint, distance, angleLeft + (i*differenceAngle));
        arc.geometry.coordinates.push(newPoint.geometry.coordinates);
    }
    return arc
};

dotProduct = function(a,b) {
    var n = 0, lim = Math.min(a.length,b.length);
    for (var i = 0; i < lim; i++) n += a[i] * b[i];
    return n;
};

createCircle = function(centerPoint, radius){
    var circle = {"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[]}};
    for(var i = 0; i <= 360; i+=10){
        var newPoint = turf.destination(centerPoint, radius, i);
        circle.geometry.coordinates.push(newPoint.geometry.coordinates);
    }
    return circle
};

module.exports = {
    "polygonEdges": polygonEdges,
    "polygonVertices": polygonVertices,
    "fovCornerPoints": fovCornerPoints,
    "pointFOVIntersect": pointFOVIntersect,
    "pointPolygonIntersect": pointPolygonIntersect,
    "lineIntersect": lineIntersect,
    "lineCircleIntersect": lineCircleIntersect,
    "isWithinAngle": isWithinAngle,
    "estimateArc": estimateArc,
    "dotProduct": dotProduct,
    "createCircle": createCircle
};