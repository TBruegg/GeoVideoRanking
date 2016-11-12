/**
 * Created by Tobi on 29.09.2016.
 */
angular.module('main').controller('resultCtrl', function($scope, $sce, resultPanelService){
    var socket = io();

    $scope.resultPanelService = resultPanelService;
    $scope.hint = "Loading...";
    $scope.results = undefined;
    $scope.sce = $sce;
    $scope.orderKey = "REl" ||$("#orderSelect").val();
    $scope.selectOptions = [
        { name: 'Area', value: 'RTA' },
        { name: 'Duration', value: 'RD' },
        { name: 'Summed Area', value: 'RSA' },
        { name: 'Elevation', value: 'REl' },
        { name: 'Azimuth', value: 'RAz' },
        { name: 'Distance', value: 'RDist' }
    ];
    $scope.item = "RTA";


    // Socket events
    socket.on('loadUpdate', function (msg) {
        $scope.$apply(function() {
            console.log(msg);
            $scope.hint = msg;
        });
    });

    socket.on('rankingFinished', function (results) {
        console.log("Ranking done");
        var videoList = [];
        for(var i=0; i<Object.keys(results).length; i++){
            var key = Object.keys(results)[i];
            var video = results[key];
            var route = "video/" + video.info.id;
            video.info.src = $sce.trustAsResourceUrl(route);
            videoList.push(video);
        }
        $scope.$apply(function() {
            $scope.results = videoList.sort($scope.sort);
        });
        // console.log($scope.results);
        $("#loadingPage").css('display', 'none');
        $("#resultPage").css('display', 'block');
        // console.log("resultsPage:display -> " + $("#resultPage").css('display'));
    });

    socket.on('void', function (res) {
        $scope.$apply(function() {
            $scope.results = {};
        });
        $("#loadingPage").css('display', 'none');
        $("#resultPage").css('display', 'block');
    });

    $scope.haveResults = function () {
        return !$scope.results || Object.keys($scope.results).length;
    };
    /*
    $("#orderSelect").change(function (val) {
        $scope.orderBy = $("#orderSelect").val();
        $scope.$apply(function() {
            $scope.results = $scope.results.sort($scope.sort);
        });
    });
    */
});