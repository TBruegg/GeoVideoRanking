/**
 * Created by Tobi on 04.11.2016.
 */

var nutations = require('./nutations');
var helpers = require('./helpers');
var exports = module.exports;

/*********************************************************
 * 3.1 Time Scales
 *********************************************************/

var fixYear = function (date) {
    if(date.getUTCMonth()+1 <= 2){
        var year = date.getUTCFullYear() - 1.0;
        var month = date.getUTCMonth() + 1 + 12.0;
    } else {
        var year = date.getUTCFullYear();
        var month =date.getUTCMonth();
    }
    return [year, month];
};

var calcTg = function (date) {
    var yearMonth = fixYear(date);
    var year = yearMonth[0];
    var month = yearMonth[1] + 1; // October's index is 9 within date object...
    var tg = parseInt(365.25 * (year - 2000.0)) + parseInt(30.6001 * (month + 1.0)) + date.getUTCDate() + (helpers.fractionalDay(date) / 24.0) - 1158.5;
    return tg;
};

var calcT = function (tg, delta_t) {
    var t = tg + (delta_t / 86400.0);
    return t;
};

var JulianEphemerisDay = function (t) {
    var JDE = t + 2452640;
    return JDE;
};

var JulianDay = function (tg) {
    var JD = tg + 2452640
    return JD;
};

var JulianEphemerisCentury = function (JDE) {
    var JCE = (JDE - 2451545.0) / 36525.0;
    return JCE;
};

var JulianCentury = function (JD) {
    var JC = (JD - 2451545.0) / 36525.0;
    return JC;
};

var JulianEphemerisMillennium = function (JCE) {
    var JME = JCE / 10.0;
    return JME;
};


/*********************************************************
 * 3.2 Heliocentric longitude of the earth (in radians)
 *********************************************************/

// 3.2.1 Linear increasing with annual oscillation

var sigmaL = function (t) {
    var sigmaL = 1.72019e-2 * t - 0.0563;
    return sigmaL;
};
var heliocentricEarthLongitude = function (t) {
    var sigma_L = sigmaL(t);
    var L_y = 1.74094 + 1.7202768683e-2 * t + 3.34118e-2 * Math.sin(sigma_L) + 3.488e-4 * Math.sin(2 * sigma_L);
    // 3.2.2 Moon pertubation
    var L_m = 3.13e-5 * Math.sin((0.2127730 * t - 0.585));
    // 3.2.3 Harmonic correction
    var L_h = 1.26e-5 * Math.sin((4.243e-3 * t + 1.46)) + 2.35e-5 * Math.sin(1.0727e-2 * t + 0.72) + 2.76e-5 * Math.sin(
            1.5799e-2 * t + 2.35) + 2.75e-5 * Math.sin(2.1551e-2 * t - 1.98) + 1.26e-5 * Math.sin(3.1490e-2 * t - 0.80);
    // 3.2.4 Polynomial correction
    var t2 = 0.001 * t;
    var L_p = (((-2.30796e-7 * t2 + 3.7976e-6) * t2 - 2.0458e-5) * t2 + 3.976e-5) * (t2 * t2);
    var L = L_y + L_m + L_h + L_p;
    return L;
};

/*********************************************************
 * 3.3 Correction to geocentric longitude due to nutation
 *********************************************************/
var geocentricLongitudeCorrection = function (t) {
    var delta_gamma = 8.33e-5 * Math.sin(9.252e-4 * t - 1.173);
    return delta_gamma;
};

/*********************************************************
 * 3.4 Earth axis inclination (in radians)
 *********************************************************/
var earthAxisInclination = function (t) {
    var epsilon = -6.21e-9 * t + 0.409086 + 4.46e-5 * Math.sin(9.252e-4 * t + 0.397);
    return epsilon;
};

/*********************************************************
 * 3.5 Geocentric global solar coordinates
 *********************************************************/

// 3.5.1 Geocentric solar latitude
var geocentricSolarLatitude = function (L, delta_gamma) {
    var gamma = L + Math.PI + delta_gamma - 9.932e-5;
    return gamma;
};

// 3.5.2 Geocentric right ascension
var geocentricRightAscension = function (gamma, epsilon) {
    var alpha = Math.atan2(Math.sin(gamma) * Math.cos(epsilon), Math.cos(gamma));
    return alpha;
};

var alpha_hr = function (alpha) {
    var alpha_hr = (12 * (alpha % (2 * Math.pi))) / Math.pi;
    return alpha_hr;
};

// 3.5.3 Declination
var solarDeclination = function (gamma, epsilon) {
    var delta = Math.asin((Math.sin(epsilon) * Math.sin(gamma)));
    return delta;
};

/*********************************************************
 * 3.6 Local hour angle of the sun (in radiants)
 *********************************************************/
var observerLocalHourAngle = function (tg, delta_gamma, theta, alpha) {
    var h = 6.30038809903 * tg + 4.8824623 + 0.9174 * delta_gamma + theta - alpha;
    return h;
};

/*********************************************************
 * 3.7 Parallax correction to right ascension
 *********************************************************/
var rightAscensionCorrection = function (phi, h) {
    var delta_alpha = (-1) * (4.26e-5) * Math.cos(phi) * Math.sin(h);
    return delta_alpha;
};

/*********************************************************
 * 3.8 Topocentric sun coordinates
 *********************************************************/

// 3.8.1 Topocentric right ascension
var topocentricRightAscension = function (alpha, delta_alpha) {
    var alpha_t = alpha + delta_alpha;
    return alpha_t;
};

// 3.8.2 Topocentric declination
var topocentricDeclination = function (delta, phi) {
    var delta_t = delta - 4.26e-5 * (Math.sin(phi) - delta * Math.cos(phi));
    return delta_t;
};

// 3.8.3 Topocentric hour angle
var topocentricHourAngle = function (h, delta_alpha) {
    var h_t = h - delta_alpha;
    return h_t;
};

var ch_t = function (h, delta_alpha) {
    var ch_t = Math.cos(h) + delta_alpha * Math.sin(h);
    return ch_t;
};

var sh_t = function (h, delta_alpha) {
    var sh_t = Math.sin(h) - delta_alpha * Math.cos(h);
    return sh_t;
};

/*********************************************************
 * 3.9 Solar elevation angle, without refraction correction
 *********************************************************/
var solarElevationAngle = function (phi, delta_t, ch_t) {
    var e0 = Math.asin(Math.sin(phi) * Math.sin(delta_t) + Math.cos(phi) * Math.cos(delta_t) * ch_t);
    return e0;
};

/*********************************************************
 * 3.10 Atmospheric refraction correction to the solar elevation
 *********************************************************/
var solarElevationCorrection = function (P, T, e0) {
    var delta_e = 0.084217 * P / (273 + T) / Math.tan(e0 + 0.0031376 / (e0 + 0.089186));
    return delta_e;
};

/*********************************************************
 * 3.11 Local topocentric sun coordinates
 *********************************************************/

// 3.11.1 Zenith
var zenith = function (e0, delta_e) {
    var z = Math.PI / 2 - e0 - delta_e;
    return z;
};

// 3.11.2 Azimuth
var azimuth = function (sh_t, ch_t, phi, delta_t) {
    var gammaL = Math.atan2(sh_t, ch_t * Math.sin(phi) - Math.sin(delta_t) / Math.cos(delta_t) * Math.cos(phi));
    return gammaL;
};

/*********************************************************
 * SUNET AND SUNRISE CALCULATIONS
 *********************************************************/

// Calculate the nutation in longitude, delta psi (in degrees)

var X = function(int, JCE){
    return {
        0: 297.85036 + 445267.111480 * JCE - 0.0019142 * Math.pow(JCE, 2) + (Math.pow(JCE, 3)) / 189474,
        1: 357.52772 + 35999.050340 * JCE - 0.0001603 * Math.pow(JCE, 2) - (Math.pow(JCE, 3)) / 300000,
        2: 134.96298 + 477198.867398 * JCE + 0.0086972 * Math.pow(JCE, 2) + (Math.pow(JCE, 3)) / 56250,
        3: 93.27191 + 483202.017538 * JCE - 0.0036825 * Math.pow(JCE, 2) + (Math.pow(JCE, 3)) / 327270,
        4: 125.04452 - 1934.136261 * JCE + 0.0020708 * Math.pow(JCE, 2) + (Math.pow(JCE, 3)) / 450000
    }[int]
};

var deltaPsiAt = function (i, JCE) {
    var a = nutations[i][5];
    var b = nutations[i][6];
    var xy = 0;
    for(var j=0; j<4+1; j++){
        xy = xy + (X(j, JCE) * nutations[i][j]);
    }
    var deltaPsi = (a + b * JCE) * Math.sin(xy);
    return deltaPsi;
};

var nutationInLongitude = function (JCE) {
    var numerator = 0;
    for(var i=0; i<nutations.length; i++){
        numerator = numerator + deltaPsiAt(i, JCE);
    }
    return numerator / 36000000;
};

var deltaEpsilonAt = function(i, JCE) {
    var c = nutations[i][7];
    var d = nutations[i][8];
    var xy = 0;
    for(var j=0; j<4 + 1; j++) {
        xy = xy + (X(j, JCE) * nutations[i][j]);
    }
    deltaEpsilon = (c + d * JCE) * Math.cos(xy);
    return deltaEpsilon;
};

exports.nutationInObliquity = function (JCE) {
    var numerator = 0;
    for(var i=0; i<nutations.length; i++){
        numerator = numerator + deltaEpsilonAt(i, JCE);
    }
    return numerator / 36000000;
};

// lighting_conditions.py Zeile 352

exports.localHourAngle = function (latitude, delta) {
    var h0base = -0.8333;
    var h0 = Math.acos((Math.sin(helpers.deg2rad(h0base)) - Math.sin(helpers.deg2rad(latitude)) * Math.sin(delta)) / (
        Math.cos(helpers.deg2rad(latitude)) * Math.cos(delta)));
    return h0;
};

var meanSiderealTimeAtGreenwich = function(jd, jc) {
    var v0 = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * Math.pow(jc, 2) - (Math.pow(jc, 3)) / 38710000;
    return v0;
};

exports.sidTimeAtGreenwich = function (date, lat, lng, data, timezone) {
    var params = data

    var tg = params["tg"];
    var t = params["t"];
    var jde = JulianEphemerisDay(t);
    var jd = JulianDay(tg);
    var jc = JulianCentury(jd);
    var jce = JulianEphemerisCentury(jde);
    var epsilon = params["epsilon"];
    var delta_psi = nutationInLongitude(jce);

    var v0 = meanSiderealTimeAtGreenwich(jd, jc);
    v0 = helpers.limitDegrees(v0);

    // Calculate apparent sidereal time at Greenwich, v (in degrees)
    var v = v0 + delta_psi * Math.cos(epsilon);
    return v;
};

exports.calcSolarTransit = function (longitude, alpha, siderealTime) {
    var v = siderealTime;

    // Calculate the approximate sun transit time, m0, in fraction of day
    var alpha0 = helpers.limitDegrees(helpers.rad2deg(alpha));
    var m0 = (alpha0 - longitude - v) / 360;

    // Calculate sunrise and sunset
    var transit = helpers.limitZero2One(m0);

    return transit;
};

exports.calcSunrise = function(transit, localHourAngle) {
    localHourAngle = helpers.limitDegrees(helpers.rad2deg(localHourAngle));
    var sunrise = helpers.limitZero2One(transit - localHourAngle / 360.0);
    return sunrise;
};

exports.calcSunset = function (transit, localHourAngle) {
    localHourAngle = helpers.limitDegrees(helpers.rad2deg(localHourAngle));
    var sunset = helpers.limitZero2One(transit + localHourAngle / 360.0);
    return sunset;
};

exports.calcParameters = function (date, deltaT, lat, lng, P, T) {
    var result = {};
    result["tg"] = calcTg(date);
    result["t"] = calcT(result["tg"], deltaT);
    result["L"] = heliocentricEarthLongitude(result["t"]);
    result["delta_gamma"] = geocentricLongitudeCorrection(result["t"]);
    result["epsilon"] = earthAxisInclination(result["t"]);
    result["gamma"] = geocentricSolarLatitude(result["L"], result["delta_gamma"]);
    result["alpha"] = geocentricRightAscension(result["gamma"], result["epsilon"]);
    result["delta"] = solarDeclination(result["gamma"], result["epsilon"]);
    result["theta"] = helpers.deg2rad(lng);
    result["phi"] = helpers.deg2rad(lat);
    result["h"] = observerLocalHourAngle(result["tg"], result["delta_gamma"], result["theta"], result["alpha"]);
    result["delta_alpha"] = rightAscensionCorrection(result["phi"], result["h"]);
    result["alpha_t"] = topocentricRightAscension(result["alpha"], result["delta_alpha"]);
    result["delta_t"] = topocentricDeclination(result["delta"], result["phi"]);
    result["h_t"] = topocentricHourAngle(result["h"], result["delta_alpha"]);
    result["sh_t"] = sh_t(result["h"], result["delta_alpha"]);
    result["ch_t"] = ch_t(result["h"], result["delta_alpha"]);
    result["e0"] = solarElevationAngle(result["phi"], result["delta_t"], result["ch_t"]);
    result["delta_e"] = solarElevationCorrection(P, T, result["e0"]);
    result["z"] = zenith(result["e0"], result["delta_e"]);
    result["gammaL"] = azimuth(result["sh_t"], result["ch_t"], result["phi"], result["delta_t"]);
    result["azimuth"] = helpers.limitDegrees(helpers.rad2deg(result["gammaL"]) + 180);
    result["elevation"] = helpers.rad2deg(result["e0"] + result["delta_e"]);

    return result;
};




