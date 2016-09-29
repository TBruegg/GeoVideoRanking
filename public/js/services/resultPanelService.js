/**
 * Created by Tobi on 15.09.2016.
 */

angular.module('main').factory('resultPanelService', function(){
    var visible = false;
    return {
        toggleResults: function(){
            visible = !visible;
        },
        isVisible: function(){
            return visible
        }
    }
});