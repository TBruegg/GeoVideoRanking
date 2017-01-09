/**
 * Created by Tobi on 10.11.2016.
 */

var q = require('q');
var geo = require('./geo-algorithms');
var turf = require('turf');
var helpers = require('./helpers');

exports.depictionRank0 = function (fov, fov2, query, objects, brdrPts) {
    var occ = exports.degreeOfOcclusion(fov, query, objects, brdrPts);
    return occ;
};

exports.objectDepiction = function (fov, query, objects, brdrPts) {
    var P = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [fov.properties.longitude, fov.properties.latitude]
        },
        "properties": {}
    };
    var nq = turf.explode(query)["features"];
    var d = fov.properties["heading"];
    var theta = fov.properties["viewable_angle"];
    // TODO: min und max In Thesis Dokument anpassen!!
    var objAngleL = normalizedAngle(turf.bearing(P, brdrPts["ptLeft"]), d);
    var objAngleR = normalizedAngle(turf.bearing(P, brdrPts["ptRight"]), d);
    var angleL = Math.max(normalizedAngle(turf.bearing(P, brdrPts["ptLeft"]), d), -theta/2) ;
    var angleR = Math.min(normalizedAngle(turf.bearing(P, brdrPts["ptRight"]), d), theta/2);
    var queryRanges = [[angleL, angleR]];
    // TODO: Hull ggf entfernen (Performancekosten wahrscheinlich höher als Schleife direkt für alle Objekte laufen zu lassen)
    var hull = turf.convex(turf.union(query, P));
    for(var i in objects){
        var obj = objects[i];// TODO: IF-Bedingung in Thesis anpassen
        if((turf.intersect(obj, hull) != undefined) && (JSON.stringify(obj)!=JSON.stringify(query))){
            var occlusionRange = normalizedAngularRange(obj, P, d);
            var ranges = [];
            for(var j in queryRanges){
                var visRanges = determineVisibleRanges(queryRanges[j], occlusionRange, theta);
                if(visRanges[0].length == 0){
                    return 0; // Query object is completely occluded --> sum of visible ranges i 0
                }
                ranges = ranges.concat(visRanges);
            }
            queryRanges = ranges;
        }
    }
    var summedRanges = 0;
    var maxRangeSum = Math.abs(objAngleL - objAngleR);
    for(var i in queryRanges){
        summedRanges += Math.abs(queryRanges[i][0] - queryRanges[i][1]);
    }
    return summedRanges/maxRangeSum
};

var normalizedAngularRange = function (obj, pos, d) {
    var nq = turf.explode(obj);
    var objectAngles = [];
    for(var i in nq.features){
        var vertex = nq.features[i];
        var angle = normalizedAngle(turf.bearing(pos, vertex), d);
        objectAngles.push(angle);
    }
    objectAngles.sort(
        function(a, b){
            return a-b
        }
    );
    var range = [objectAngles[0], objectAngles[objectAngles.length-1]];
    return range;
};

var determineVisibleRanges = function (queryRange, occlusionRange, theta) {
    var qLeft = Math.min(queryRange[0], queryRange[1]);
    var qRight = Math.max(queryRange[0], queryRange[1]);
    var oLeft = Math.min(occlusionRange[0], occlusionRange[1]);
    var oRight = Math.max(occlusionRange[0], occlusionRange[1]);
    var ranges = [];
    if(qLeft < oLeft){
        if(qRight < oLeft){
            ranges = [[qLeft, qRight]];
        } else {
            if((oLeft <= qRight) && (qRight <= oRight)){
                ranges = [[qLeft, oLeft]];
            } else {
                ranges = [[qLeft, oLeft],[oRight, qRight]]
            }
        }
    } else {
        if(qLeft <= oRight){
            if(qRight <= oRight){
                ranges = [[]];
            } else {
                ranges = [[oRight, qRight]];
            }
        } else {
            ranges = [[qLeft, qRight]];
        }
    }
    return limitRanges(ranges, theta);
};

var normalizedAngle = function (angle, direction) {
    angle = helpers.limitDegrees(angle - direction);
    if(angle>180){
        angle = angle-360;
    }
    return angle;
};

var limitRanges = function(list, theta){
    for(var i=0; i < list.length; i++){
        var item = list[i];
        var angle = theta/2;
        if(item[0] instanceof Array){
            limitRanges(item, angle);
        } else {
            for(var i=0; i < item.length; i++) {
                if (item[i] < -angle) {
                    item[i] = -angle;
                } else if (item[i] > angle) {
                    item[i] = angle;
                }
            }
        }
    }
    return list;
};