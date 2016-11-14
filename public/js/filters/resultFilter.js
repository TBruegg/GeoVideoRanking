/**
 * Created by Tobi on 12.11.2016.
 */

angular.module('main').filter('resultFilter', function ($filter) {
    return function (items, key) {
        if (items != undefined && key != undefined) {
            var sorted = items.sort(
                function (a, b) {
                    return -(a.rankings[key] - b.rankings[key]) || 1;
                });
            return sorted;
        }
    }
});
