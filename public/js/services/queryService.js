/**
 * Created by Tobi on 15.09.2016.
 */

angular.module('main').factory('queryService', function ($http) {
    var queryButton = {};
    var queryJson = {};
    var queryCallback;
    return {
        setQueryCallback: function (callback) {
            queryCallback = callback;
        },
        setQuery: function (json) {
            queryJson = json;
        },
        setQueryButton: function(button) {
            queryButton = button;
        },
        toggleQueryButton: function(isVisible){
            queryButton.prop('disabled', !isVisible);
        },
        polygonQuery: function () {
            var coordinates = queryJson.geometry.coordinates[0];
            var queryRegion = JSON.stringify(queryJson);
            // var lat_sw = coordinates[0][1];
            // var lng_sw = coordinates[0][0];
            // var lat_ne = coordinates[2][1];
            // var lng_ne = coordinates[2][0];
            var route = `http://localhost/api/polygonQuery?region=${queryRegion}`;
            console.log(route);
            $http.get(route).then(function(result){
                objects = result.data.result;
                for(var i=0; i < objects.length; i++){
                    queryCallback(objects[i]);
                }
                return result;
            });
        }
    };
});