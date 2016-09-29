/**
 * Created by Tobi on 29.09.2016.
 */
angular.module('main').controller('resultCtrl', function($scope, resultPanelService){
    var socket = io();

    $scope.resultPanelService = resultPanelService;
    $scope.hint = "Loading...";
    $scope.results = undefined;

    // Socket events
    socket.on('loadUpdate', function (msg) {
        $scope.$apply(function() {
            console.log(msg);
            $scope.hint = msg;
        });
    });

    socket.on('rankingFinished', function (results) {
        console.log("Ranking done");
        $scope.$apply(function() {
            $scope.results = results;
        });
        console.log($scope.results);
        $("#loadingPage").css('display', 'none');
        $("#resultPage").css('display', 'block');
        console.log("resultsPage:display -> " + $("#resultPage").css('display'));
    });
});