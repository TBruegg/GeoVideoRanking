/**
 * Created by Tobi on 15.09.2016.
 */

angular.module('main').controller('navCtrl', function($scope, resultPanelService, queryService){
    $scope.resultPanelService = resultPanelService;
    $scope.queryService = queryService;
    var queryBtn = $("#queryButton");
    queryBtn.prop('disabled',true);
    $scope.queryService.setQueryButton(queryBtn);
});
