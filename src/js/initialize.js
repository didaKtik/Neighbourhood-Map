/* global ko, $ */
var app = app || {};

/* This function kicks things off and animate the arrival of locations when
   the app launches*/
app.initialize = function () {
	'use strict';

	app.colors = {
		blue: '#00A1DE',
		green: '#20603D',
		yellow: '#FAD201'
	};

	app.map = app.mapModule();

	// Used to add locations to the app
	app.adder = app.adderModule();

	// Locations primarily exist through their names only
	app.hardcodedLocations = [
		'Lake Kivu', 'Gisenyi', 'Kigali',
		'Ruhengeri', 'Kigarama', 'Butare', 'Kibungo',
		'Kinazi', 'Nyungwe Forest National Park'
	];
	app.userLocations = $.parseJSON(localStorage.getItem('userLocations')) || [];

	// Store more elaborate location objects
	app.viewModelLocations = ko.observableArray();

	// The observable "treated" is used to store the number of locations that have been
	// treated (failed query or successful build)
	app.hardcodedLocations.treated = ko.observable(0);
	app.hardcodedLocations.treated.subscribe(function (treatedLocations) {
		if (treatedLocations == app.hardcodedLocations.length) {
			onHardcodedLocationsReady();
		}
	});
	app.adder.addHardcodedLocations(app.hardcodedLocations);

	if (app.userLocations.length) {
		app.userLocations.treated = ko.observable(0);
		// A delay is necessary to avoid an OverQueryLimit in Google Maps
		window.setTimeout(function() {
			app.adder.addUserLocations(app.userLocations);
		}, 400);
	}

	app.viewModel = new app.ViewModel();
	ko.applyBindings(app.viewModel);

	function onHardcodedLocationsReady () {
		app.viewModel.ready(true);
		dropHardcodedLocations();
	}

	function dropHardcodedLocations () {
		app.viewModel.searchVM.hardcodedLocations().forEach(function (location) {
			location.marker.setMap(app.map);
		});
		app.viewModel.openSearchBar();
		app.viewModel.message('My gorillas!', 2000, function () {
			app.viewModel.hide();
			if (app.userLocations.length > 0) {
				checkUserLocations();
			}
		});
	}

	// If all user locations are already treated they are dropped, otherwise a subscription
	// is made to the number of treated locations
	function checkUserLocations () {
		if (app.userLocations.treated() == app.userLocations.length) {
			dropUserLocations();
		} else {
			app.userLocations.treated.subscribe(function (treatedLocations) {
				if (treatedLocations == app.userLocations.length) {
					dropUserLocations();
				}
			});
		}
	}

	function dropUserLocations () {
		app.viewModel.searchVM.userLocations().forEach(function (location) {
			location.marker.setMap(app.map);
		});
		app.viewModel.openAddBar();
		app.viewModel.message('And your sugar canes!', 2000, function () {
			app.viewModel.hide();
		});
	}
};