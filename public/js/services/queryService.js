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
            var route = `http://localhost/api/polygonQuery?region=${JSON.stringify(queryJson)}`;
            console.log(route);
            $("#loadingPage").css('display', 'block');
            $("#resultPage").css('display', 'none');
            $http.get(route).then(function(result){
                objects = result.data.result;
                queryCallback(objects);
                return result;
            });
        }
    };
});