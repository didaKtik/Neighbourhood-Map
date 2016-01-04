/* global */
var app = app || {};

(function () {
	'use strict';

	app.isHardcoded = function (locationName) {
		for (var l=0, len=app.hardcodedLocations.length; l<len; l++) {
			if (app.hardcodedLocations[l] == locationName)
				return true;
		}
		return false;
	};

	app.hasLocation = function (locationName) {
		if (app.isHardcoded(locationName)) return true;
		for (var l=0, len=app.userLocations.length; l<len; l++) {
			if (app.userLocations[l] == locationName)
				return true;
		}
		return false;
	};

	app.oneLocationTreated = function (isHardcoded) {
		if (isHardcoded) {
			var locationsTreated = app.hardcodedLocations.treated();
			app.hardcodedLocations.treated(locationsTreated + 1);
		} else {
			var locationsTreated = app.userLocations.treated();
			app.userLocations.treated(locationsTreated + 1);
		}
	};
})();