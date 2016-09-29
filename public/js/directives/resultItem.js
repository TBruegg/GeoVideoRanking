/**
 * Created by Tobi on 29.09.2016.
 */

angular.module('main').directive('resultitem', function () {
    return{
        restrict: 'E',
        scope: {
            value: '='
        },
        template: '../../templates/resultItem.html'
    }
});