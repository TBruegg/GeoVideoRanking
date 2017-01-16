/**
 * Created by Tobi on 29.09.2016.
 */

angular.module('main').directive('resultItem', function () {
    return {
        restrict: 'E',
        scope: {
            value: '='
        },
        templateUrl: "../../templates/resultItem.html",
        link: function(scope, element, attrs) {
            scope.createViewer = function (id, src) {
                console.log("Show video modal");
                $("#videoModalLabel").text("Video " + id);
                $("#modalVideo").attr('src', src);
                $("#videoModal").modal('show');
            };
            scope.pauseVideo = function(){
                $("#modalVideo").pause();
            }
        }
}
});