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
    // TODO: qVertices ist eine FeatureCollection und kein Array!!!
    for(var i=0; i < qVertices.length-1; i++){
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
        if (intersectionsArc.length >= 2) {
            var a = helpers.estimateArc(intersectionsArc[0], intersectionsArc[1], cameraLocation);
            for(var i=1; i<intersectionsArc.length-1; i++){
                var a2 = helpers.estimateArc(intersectionsArc[i], intersectionsArc[i+1], cameraLocation);
                a.geometry.coordinates.concat(a2.geometry.coordinates);
            };
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

    if(overlapPoly.length >= 3) {
        overlapPoly = {"type": "FeatureCollection", "features": overlapPoly};
        overlapPoly = turf.convex(overlapPoly);
        return overlapPoly;
    }
    return null;
};

calculateRankScores = function(video,query){
    var basic_start = process.hrtime();
    var timings = {
        bBaseTime: 0,
        fovs_basic: 0,
        filter: 0,
        fovs_processed_basic: 0,
        overlapPoly: 0,
        rd: 0,
        rsa: 0,
        rta: 0,

    };
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
    var t_basic = process.hrtime(basic_start);
    //console.log("t_basic: " + t_basic);
    try {
        timings["bBaseTime"] += toSeconds(t_basic);
    } catch(e) {
        console.log(e);
    }
    timings["fovs_basic"] += n;
    var filter1 = process.hrtime();
    if(helpers.rectIntersect(M, queryPolygon)) {
        // TODO: Letzter Frame wird derzeit nicht betrachtet, da t(i+1) - t(i) beim letzten Frame nicht möglich ist
        timings["filter"] += toSeconds(process.hrtime(filter1));
        for (var i = 0; i < n-1; i++) {
            var filter2 = process.hrtime();
            var FOV = videoFOVs[i];
            var M1 = turf.bboxPolygon(turf.bbox(FOV));
            // Filter step 2
            if (helpers.rectIntersect(M1, queryPolygon)) {
                if (helpers.sceneIntersect(queryPolygon, FOV)) {
                    timings["filter"] += toSeconds(process.hrtime(filter2));
                    timings["fovs_processed_basic"] += 1;
                    var boundary = process.hrtime();
                    var oPoly = overlapBoundary(FOV, queryPolygon);
                    timings["overlapPoly"] += toSeconds(process.hrtime(boundary));
                    if(oPoly == null){
                        continue;
                    };
                    // TODO: Ensure that time property is not null or undefined
                    //console.log("t_basic2: " + t_basic2);
                    var rd_start = process.hrtime();
                    var t1 = FOV.properties['time'];
                    var t2 = videoFOVs[i + 1].properties['time'];
                    timings["rd"] += toSeconds(process.hrtime(rd_start));
                    var rxa_start = process.hrtime();
                    var t_rxa = 0;
                    var t_rta = 0;
                    var start_rta;
                    if (rtaPoly == undefined) {
                        rtaPoly = oPoly;
                        t_rta = toSeconds(process.hrtime(rxa_start));
                    } else {
                        try{
                            // TODO: Ggf. simplification wieder entfernen
                            oPoly = helpers.simplifyFeature(oPoly, 10);
                            t_rxa = toSeconds(process.hrtime(rxa_start));
                            start_rta = process.hrtime();
                            rtaPoly = turf.union(rtaPoly, oPoly);
                            t_rta = toSeconds(process.hrtime(start_rta));
                        } catch(e){
                            console.log("Error: " + e);
                            try{
                                oPoly = helpers.simplifyFeature(oPoly, 8);
                                t_rxa = toSeconds(process.hrtime(rxa_start));
                                start_rta = process.hrtime();
                                rtaPoly = turf.union(rtaPoly, oPoly);
                                t_rta = toSeconds(process.hrtime(start_rta));
                                console.log("Resolved error by simplifying feature")
                            }catch (e){
                                //var pointsRta = turf.explode(rtaPoly);
                                //var pointsPoly = turf.explode(rtaPoly);
                                //pointsRta.features.concat(pointsPoly.features);
                                //rtaPoly = turf.concave(pointsRta, 0.02, 'kilometers');
                                //oPoly = helpers.simplifyFeature(oPoly, 8);
                                //rtaPoly = turf.union(rtaPoly, oPoly);
                                console.log("Simplification didn't resolve issue: " + e);
                            }
                        }
                    }
                    rsa += turf.area(oPoly) * (t2 - t1) / 1000;
                    timings["rsa"] += t_rxa;
                    timings["rta"] += t_rxa;
                    timings["rta"] += t_rta;
                    var rd_start2 = process.hrtime();
                    rd += (t2 - t1) / 1000;
                    timings["rd"] += toSeconds(process.hrtime(rd_start2));
                }
            }
        }
        var rta_start = process.hrtime();
        rta = (rtaPoly!=undefined)? turf.area(turf.convex(rtaPoly)) : 0;
        timings["rta"] += toSeconds(process.hrtime(rta_start));
    }
    if(rd > 0) timings["filteredVideoCount"] += 1;
    console.log("Return scores for " + video.info.id + " in " + toSeconds(process.hrtime(basic_start)) + " seconds");
    console.log(JSON.stringify({"RTA": rta, "RSA": rsa, "RD": rd}));
    return {"RTA": rta, "RSA": rsa, "RD": rd};
};

var toSeconds = function(arr){
    return arr[0] + arr[1]/1000000000;
};

module.exports = {
    "overlapBoundary": overlapBoundary,
    "calculateRankScores": calculateRankScores
};