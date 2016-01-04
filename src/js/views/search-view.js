/* global ko */
var app = app || {};

/* The search view model is responsible for displaying the list of locations
   and responding to user inputs related to searching and selecting a location */
app.SearchViewModel = function (viewModel) {
	'use strict';

	this.locations = viewModel.locations;
	this.inputText = viewModel.inputText;
	this.messaging = viewModel.messaging;

	this.hardcodedLocations = ko.computed(function () {
		return this.locations().filter(function (location) {
			return location.isHardcoded;
		});
	}.bind(this));

	this.userLocations = ko.computed(function () {
		return this.locations().filter(function (location) {
			return !location.isHardcoded;
		});
	}.bind(this));

	// The bar observable control the visibility and style of the input bar
	this.bar = ko.observable(false);
	var searchMessage = 'Search places in Rwanda';

	this.showMode = ko.observable('hardcoded');

	// The active observable controls the visibility of the list view
	this.active = ko.computed(function() {
		var bar = this.bar(),
			inputText = this.inputText(),
			messaging = this.messaging();
		return bar && !(inputText == searchMessage) && !messaging;
	}.bind(this));

	// Toggle search bar
	this.onButtonClick = function () {
		if (this.bar()) {
			app.viewModel.hide();
		} else {
			app.viewModel.openSearchBar();
			this.inputText(searchMessage);
		}
	}.bind(this);

	this.filterGorillas = function () {
		if (this.showMode() != 'hardcoded') {
			// The search field is reset when changing the filter
			this.inputText('');
			this.showMode('hardcoded');
		}
	}.bind(this);

	this.filterSugarCanes = function () {
		if (this.showMode() != 'user') {
			this.inputText('');
			this.showMode('user');
		}
	}.bind(this);

	this.filteredLocations = ko.computed(function() {
		var showMode = this.showMode();
		return showMode == 'hardcoded' ? this.hardcodedLocations : this.userLocations;
	}.bind(this));

	this.matchingLocations = ko.computed(function () {
		var inputText = this.inputText(),
			active = this.active(),
			locations = this.locations(),
			filteredLocations = this.filteredLocations()();

		if (!active) {
			// All locations are visible
			locations.forEach(function (location) {
				location.marker.setVisible(true)
			});
			return locations;

		} else if (inputText == '') {
			// Only sugar canes or gorillas are visible
			locations.forEach(function (location) {
				location.marker.setVisible(false)
			});
			filteredLocations.forEach(function (location) {
				location.marker.setVisible(true);
			});
			if (filteredLocations.length) {
				this.highlight(filteredLocations[0]);
			}
			return filteredLocations;

		} else {
			// Only matching sugar canes or gorillas are visible
			inputText = inputText.toLowerCase().trim();
			var matchingLocations = filteredLocations.filter(function (location) {
				// The text typed by the user will match if it is found anywhere
				// in a location name
				var regex = new RegExp('.*' + inputText + '.*'),
					matching = regex.test(location.name.toLowerCase());

				location.marker.setVisible(matching);
				return matching;
			});
			if (matchingLocations.length) {
				this.highlight(matchingLocations[0])
			}
			return matchingLocations;
		}
	}.bind(this));

	this.highlight = function (location) {
		this.locations().forEach(function (location) {
			location.highlighted(false);
		});
		location.highlighted(true);
	}.bind(this);

	// On down arrow
	this.highlightNext = function () {
		var matchingLocations = this.matchingLocations();
		for (var i=0, len=matchingLocations.length - 1; i<len; i++) {
			if (matchingLocations[i].highlighted()) {
				this.highlight(matchingLocations[i+1]);
				break;
			}
		}
	};

	// On up arrow
	this.highlightPrevious = function () {
		var matchingLocations = this.matchingLocations();
		for (var i=1, len=matchingLocations.length; i<len; i++) {
			if (matchingLocations[i].highlighted()) {
				this.highlight(matchingLocations[i-1]);
				break;
			}
		}
	};

	// On enter key or list-item click
	this.panToAndOpen = function () {
		var location = this.highlightedLocation();
		if (location) {
			app.viewModel.hide();
			location.toggle();
			app.map.panToPosition(location.position);
		} else {
			app.viewModel.message('Not in stock sorry!');
		}
	}.bind(this);

	this.highlightedLocation = ko.computed(function() {
		var matchingLocations = this.matchingLocations();
		for (var i=0, len=matchingLocations.length; i<len; i++) {
			if (matchingLocations[i].highlighted()) {
				return matchingLocations[i];
			}
		}
	}.bind(this));
}