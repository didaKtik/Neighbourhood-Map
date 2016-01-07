/* global google.maps */
var app = app || {};

/* This object hides the complexity of turning location names into location
   objects */
app.adderModule = function () {
	'use strict';

	// Location details are queried via Google TextSearch
	var service = new google.maps.places.PlacesService(app.map);

	function queryLocationsAllAtOnce (locations) {
		locations.forEach(function (location) {
			queryLocation(location, addStoredLocation, onStoredLocationError);
		});
	}

	// After the first 10 queries, a delay is needed between each query
	// to avoid a Google Maps OverQueryLimit
	function queryLocationsOneByOne (locations, index) {
		var index = index || 0;
		if (index < locations.length) {
			queryLocation(locations[index], addStoredLocation, onStoredLocationError);
			window.setTimeout(function () {
				queryLocationsOneByOne(locations, index + 1);
			}, 500)
		}
	}

	function queryNewLocation (location) {
		queryLocation(location, addNewLocation, onNewLocationError);
	}

	// The callback functions are different depending on if the location was
	// already stored or not
	function queryLocation(location, onSuccess, onError) {
		var request = { query: location + ' Rwanda'};

		service.textSearch(request, function (results, status) {
			if (status == google.maps.places.PlacesServiceStatus.OK) {
				onSuccess(results);
			} else {
				onError(location);
			}
		});
	}

	function addStoredLocation (results) {
		var locationDetails = results[0];
		app.viewModelLocations.push(new app.ViewModelLocation(locationDetails));
	}

	function addNewLocation (results) {
		var locationDetails = results[0],
			locationName = locationDetails.name;

		if (app.hasLocation(locationName)) {
			app.viewModel.message('Already occupied!');

		} else {
			storeNewLocation(locationName);

			var newLocation = new app.ViewModelLocation(locationDetails);
			dropNewLocation(newLocation);
			app.viewModelLocations.push(newLocation);
		}
	}

	function dropNewLocation (newLocation) {
		newLocation.marker.setMap(app.map);
		app.viewModel.message('A new sugar cane!');
	}

	function storeNewLocation (locationName) {
		app.userLocations.push(locationName);
		localStorage.setItem('userLocations', JSON.stringify(app.userLocations));
	}

	function onStoredLocationError (locationName) {
		var isHardcoded = app.isHardcoded(locationName);
		app.oneLocationTreated();
	}

	function onNewLocationError () {
		app.viewModel.message('Not found in Rwanda!');
	}

	return {
		addHardcodedLocations: queryLocationsAllAtOnce,
		addUserLocations: queryLocationsOneByOne,
		addNewLocation: queryNewLocation
	};
};