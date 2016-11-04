/**
 * Created by Tobi on 04.11.2016.
 */

var nutations = require('./nutations');
var exports = module.exports;

/*********************************************************
 * 3.1 Time Scales
 *********************************************************/

var fixYear = function (date) {
    if(date.getUTCMonths()+1 <= 2){
        var year = date.getUTCYears() - 1.0;
        var month = date.getUTCMonths+1 + 12.0;
    } else {
        var year = date.getUTCYears();
        var month =date.getUTCMonths();
    }
    return [year, month];
};

var calcTg = function (date) {
    var yearMonth = fixYear(date)
    var year = yearMonth[0];
    var month = yearMonth[1];
    var tg = parseInt(365.25 * (year - 2000.0)) + parseInt(30.6001 * (month + 1.0)) + date.day + (fractionalDay(date) / 24.0) - 1158.5;
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
    return delta_gama;
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
var solarDeclinationn = function (gamm, epsilon) {
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
var topocentricRightAScension = function (alpha, delta_alpha) {
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
    var delta_e = 0.084217 * P / (273 + T) / math.tan(e0 + 0.0031376 / (e0 + 0.089186));
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

var nutationInObliquity = function (JCE) {
    var numerator = 0;
    for(var i=0; i<nutations.length; i++){
        numerator = numerator + deltaEpsilonAt(i, JCE);
    }
    return numerator / 36000000;
};

// lighting_conditions.py Zeile 352