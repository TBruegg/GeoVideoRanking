/**
 * Created by Tobi on 21.09.2016.
 */
var turf = require('turf');
// var exports = module.exports;

polygonEdges = function (polygon) {
    var polygonEdges = [];
    var coords = polygon.geometry['coordinates'][0];
    for(var i = 0; i < coords.length-1; i++){
        var edgeTemplate = {"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[]}};
        edgeTemplate.geometry['coordinates'].push(coords[i]);
        edgeTemplate.geometry['coordinates'].push(coords[i+1]);
        polygonEdges.push(edgeTemplate);
    }
    return polygonEdges;
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
    return !(turf.intersect(point,FOVScene) == undefined);
};

pointPolygonIntersect = function(point, queryRegion){
    return !(turf.intersect(point,queryRegion) == undefined);
};
// TODO: lineIntersect wie in Paper beschrieben nur für Segmente verwenden, evtl neue Funktion lineStringIntersect?
lineIntersect = function (line1, line2) {
    var intersections = turf.intersect(line1,line2) || null;
    if(intersections != null && intersections.geometry.type == 'MultiPoint'){
        pt1 = {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":intersections.geometry.coordinates[0]}};
        pt2 = {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":intersections.geometry.coordinates[1]}};
        intersections = [pt1,pt2];
    } else if(intersections != null){
        intersections = [intersections];
    }
    return intersections;
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

asPoint = function(lat, lng){
    return {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[lng,lat]}};
};

asLine = function(point1, point2){
    var line = {"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[]}};
    line.geometry['coordinates'].push(point1.geometry['coordinates']);
    line.geometry['coordinates'].push(point2.geometry['coordinates']);
    return line;
};

sceneIntersect = function(query, fov){
    // Query polygon, vertices and edges (1)
    var qPolygon = query;
    var fovScene = fov;
    // console.log(JSON.stringify(fov.properties.id));
    var qVertices = polygonVertices(qPolygon)['features'];
    var qEdges = polygonEdges(qPolygon);
    // FOV model parameters (6)
    var cameraLocation = asPoint(fovScene.properties['latitude'], fovScene.properties['longitude']);
    var direction = fovScene.properties['heading'];
    var visibleDistance = fovScene.properties['visible_distance'];
    var visibleAngle = fovScene.properties['viewable_angle'];
    // FOVScene for which rankscore is calculated (3)
    var fovCorners = fovCornerPoints(cameraLocation, direction, visibleAngle, visibleDistance);
    var fovEdges = [asLine(fovCorners[0],fovCorners[1]), asLine(fovCorners[0],fovCorners[2])];
    if(turf.intersect(cameraLocation, qPolygon)){
        return true;
    }
    for(var i=0; i < qVertices.length; i++){
        // TODO: Eventuell pointFOVIntersect anstelle von pointFOVIntersect2 verwenden
        if(pointFOVIntersect2(qVertices[i],fov)){
            return true;
        }
    }
    for (var j = 0; j < qEdges.length; j++) {
        if (edgeFOVIntersect(qEdges[j], fov)) {
            return true;
        }
    }
    return false;
};

pointFOVIntersect2 = function(pt, fov){
    var q = pt;
    var fovScene = fov;
    var cameraLocation = asPoint(fovScene.properties['latitude'], fovScene.properties['longitude']);
    var visibleDistance = fovScene.properties['visible_distance'];
    if(turf.distance(q,cameraLocation) <= visibleDistance){
        var alpha = fovScene.properties['heading'];
        var angle = fovScene.properties['viewable_angle'];
        if(isWithinAngle(q, cameraLocation, alpha, angle)){
            return true;
        }
    }
    return false;
};

edgeFOVIntersect = function(ed, fov){
    var e = ed;
    var fovScene = fov;
    var cameraLocation = asPoint(fovScene.properties['latitude'], fovScene.properties['longitude']);
    var visibleDistance = fovScene.properties['visible_distance'];
    var intersections = lineCircleIntersect(e, cameraLocation, visibleDistance);
    var direction = fovScene.properties['heading'];
    var visibleAngle = fovScene.properties['viewable_angle'];
    if(intersections != null) {
        for (var i = 0; i < intersections.length; i++) {
            if (isWithinAngle(intersections[i], cameraLocation, direction, visibleAngle)) {
                return true;
            }
        }
    }
    return false;
};

rectIntersect = function(rect1, query){
    return turf.intersect(rect1, query) != undefined;
};

simplifyFeature = function(geoJSON,digits){
    var coords = geoJSON.geometry.coordinates;
    var feature = geoJSON;
    coords = roundCoordinates(coords, digits);
    feature.geometry.coordinates = coords;
    return feature;
};

roundCoordinates = function (coordinates, digits) {
    var coords = coordinates;
    for(var i=0; i < coords.length; i++){
        if(typeof(coords[i])=='number'){
            coords[i] = Number(coords[i].toFixed(digits));
        } else {
            roundCoordinates(coords[i], digits);
        }
    }
    return coords;
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
    "createCircle": createCircle,
    "asPoint": asPoint,
    "asLine": asLine,
    "pointFOVIntersect2": pointFOVIntersect2,
    "edgeFOVIntersect": edgeFOVIntersect,
    "rectIntersect": rectIntersect,
    "sceneIntersect": sceneIntersect,
    "roundCoordinates": roundCoordinates,
    "simplifyFeature": simplifyFeature
};