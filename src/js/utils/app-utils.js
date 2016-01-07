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
		var locationsTreated;
		if (isHardcoded) {
			locationsTreated = app.hardcodedLocations.treated();
			app.hardcodedLocations.treated(locationsTreated + 1);
		} else if (app.userLocations.length) {
			locationsTreated = app.userLocations.treated();
			app.userLocations.treated(locationsTreated + 1);
		}
	};

	app.isMobile = window.matchMedia("only screen and (max-width: 760px)").matches;

})();