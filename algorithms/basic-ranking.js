/**
 * Created by Tobi on 23.09.2016.
 */

var turf = require('turf');
var helpers = require('./geo-algorithms');

overlapBoundary = function(fov, query){
    // OverlapPoly
    var overlapPoly = [];

    // FOVScene
    var fovScene = fov;

    // Query polygon, vertices and edges (1)
    var qPolygon = query;
    var qVertices = helpers.polygonVertices(qPolygon)['features'];
    var qEdges = helpers.polygonEdges(qPolygon);

    // FOV model parameters (6)
    var cameraLocation = helpers.asPoint(fovScene.properties['latitude'], fovScene.properties['longitude']);
    var direction = fovScene.properties['heading'];
    var visibleDistance = fovScene.properties['visible_distance'];
    var visibleAngle = fovScene.properties['viewable_angle'];

    // FOVScene for which rankscore is calculated (3)
    var fovCorners = helpers.fovCornerPoints(cameraLocation, direction, visibleAngle, visibleDistance);
    var fovEdges = [helpers.asLine(fovCorners[0],fovCorners[1]), helpers.asLine(fovCorners[0],fovCorners[2])];

    // Check if any of the points in qVertices are within the FOVScene, if so add them to overlapPoly (6)
    // TODO: qVertices ist eine FeeatureCollection und kein Array!!!
    for(i=0; i < qVertices.length-1; i++){
        if (helpers.pointFOVIntersect(qVertices[i],fovScene)){
            overlapPoly.push(qVertices[i]);
        }
    }

    // Check if any of the points in fovCorners are within qPolygon, if so add them to overlapPoly (11)
    for(i=0; i < fovCorners.length; i++){
        if(helpers.pointPolygonIntersect(fovCorners[i],qPolygon)){
            overlapPoly.push(fovCorners[i]);
        }
    }

    // Check if any of the edges in qEdges intersect with the edges in fovEdges. If so, add the intersection
    // point to overlapPoly (16)
    for(var i=0; i < qEdges.length; i++){
        for(var j=0; j < fovEdges.length; j++){
            x = helpers.lineIntersect(qEdges[i],fovEdges[j]);
            if (x != null){
                for(var it=0; it < x.length; it++) {
                    overlapPoly.push(x[it]);
                }
            }
        }
    }
    var intersectionsArc = [];
    // Check if any of the edges in qEdges intersect with the arc of FOVScene.
    // If so, estimate the intersecting section of arc as a poly-line and add the points in poly-line to overlapPoly. (22)
    for(var i=0; i < qEdges.length; i++) {
        var intersections = helpers.lineCircleIntersect(qEdges[i], cameraLocation, visibleDistance);
        if(intersections != null) {
            for (var j = 0; j < intersections.length; j++) {
                if (helpers.isWithinAngle(intersections[j], cameraLocation, direction, visibleAngle)) {
                    intersectionsArc.push(intersections[j]);
                }
            }
        }
    }
    if(intersectionsArc.length > 0) {
        if (intersectionsArc.length == 2) {
            var a = helpers.estimateArc(intersectionsArc[0], intersectionsArc[1], cameraLocation);
        } else if (intersectionsArc.length == 1) {
            var nf = helpers.pointPolygonIntersect(fovCorners[1], qPolygon) ? fovCorners[1] : fovCorners[2];
            var a = helpers.estimateArc(intersectionsArc[0], nf, cameraLocation);
        }
        for(var k=0; k < a.geometry.coordinates.length; k++){
            var arcPt = {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":a.geometry.coordinates[k]}};
            overlapPoly.push(arcPt);
        }
    }

    // Old approach goes here
    // --> <--

    if(overlapPoly.length >= 4) {
        overlapPoly = {"type": "FeatureCollection", "features": overlapPoly};
        overlapPoly = turf.convex(overlapPoly);
        return overlapPoly;
    }
    return null;
};

calculateRankScores = function(video,query){
    // Parameter initializations
    var queryPolygon = query;
    var videoObject = video;
    var videoFOVs = video['fovs'];
    var fovCollection = {"type":"FeatureCollection","features":videoFOVs};
    var n = videoFOVs.length;
    var M = turf.bboxPolygon(turf.bbox(fovCollection));
    var rtaPoly = undefined;
    var rta = 0;
    var rsa = 0;
    var rd = 0;
    // Calculation of Rank Scores
    // Filter step 1
    if(helpers.rectIntersect(M, queryPolygon)) {
        // TODO: Letzter Frame wird derzeit nicht betrachtet, da t(i+1) - t(i) beim letzten Frame nicht möglich ist
        for (var i = 0; i < n-1; i++) {
            var FOV = videoFOVs[i];
            var M1 = turf.bboxPolygon(turf.bbox(FOV));
            // Filter step 2
            if (helpers.rectIntersect(M1, queryPolygon)) {
                if (helpers.sceneIntersect(queryPolygon, FOV)) {
                    var oPoly = overlapBoundary(FOV, queryPolygon);
                    if(oPoly == null){
                        continue;
                    };
                    // TODO: Ensure that time property is not null or undefined
                    var t1 = FOV.properties['time'];
                    var t2 = videoFOVs[i + 1].properties['time'];
                    if (rtaPoly == undefined) {
                        rtaPoly = oPoly;
                    } else {
                        try{
                            rtaPoly = turf.union(rtaPoly, oPoly);
                        } catch(e){
                            console.log(e);
                            try{
                                oPoly = helpers.simplifyFeature(oPoly, 10);
                                rtaPoly = turf.union(rtaPoly, oPoly);
                            }catch (e){
                                console.log("Simplification didn't resolve issue: " + e);
                            }
                        }
                    }
                    rsa += turf.area(oPoly) * (t2 - t1) / 1000;
                    rd += (t2 - t1) / 1000;
                }
            }
        }
        rta = turf.area(turf.convex(rtaPoly));
    }
    console.log("Return scores for " + video.info.id);
    console.log(JSON.stringify({"RTA": rta, "RSA": rsa, "RD": rd}));
    return {"RTA": rta, "RSA": rsa, "RD": rd};
};

module.exports = {
    "overlapBoundary": overlapBoundary,
    "calculateRankScores": calculateRankScores
};