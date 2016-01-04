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
/* global google.maps, $, _, ko */
var app = app || {};

/* This class is used to build location objects if a successful google text
  search query occured. Each instance is stored in app.viewModelLocations */
app.ViewModelLocation = function (locationDetails) {
	'use strict';

	this.name = locationDetails.name;

	this.position = locationDetails.geometry.location;
	// The bounds of the map are updated ech time a location is added
	app.map.updateBoundsWithPosition(this.position);

	this.isHardcoded = app.isHardcoded(this.name);

	// Used when searching the locations to highlight the first match
	this.highlighted = ko.observable(false);

	// An image is served for each hardcoded location
	if (this.isHardcoded) {
		this.url = 'img/' + this.name.toLowerCase().replace(/ /g,"-") + '.jpg';
	} else {
		this.url = "";
	}

	this.buildMarker();

	// The content of the infoWindow is completed after querying Wikipedia
	this.infoWindow = new google.maps.InfoWindow({
		maxWidth: 280
	});
	this.queryWikipedia();
};

app.ViewModelLocation.prototype.toggle = function () {
	if (this.marker.getAnimation() !== null) {
		this.close();
	} else {
		app.viewModel.closeAll();
		this.open();
	}
};

app.ViewModelLocation.prototype.close = function () {
	if (this.marker.getAnimation() !== null) {
		this.marker.setAnimation(null);
		this.infoWindow.close();
	}
};

app.ViewModelLocation.prototype.open = function () {
	this.marker.setAnimation(google.maps.Animation.BOUNCE);
	this.infoWindow.open(app.map, this.marker);
	// Explicitly set the wikipedia link that for some reason doesn't work otherwise
	$(".wiki-link").click(function () {
		if (this.href) {
			window.open(this.href);
		}
	});
};

app.ViewModelLocation.prototype.buildMarker = function () {
	// Create the marker without assigning it to the map
	this.marker = new google.maps.Marker({
		position: this.position,
		icon: this.isHardcoded ? 'img/gorilla-pin.png' : 'img/sugar-cane-pin.png',
		animation: google.maps.Animation.DROP
	});

	this.marker.addListener('click', function () {
		app.viewModel.hide();
		this.toggle()
	}.bind(this))
};

app.ViewModelLocation.prototype.queryWikipedia = function () {
	var baseUrl = 'https://en.wikipedia.org/w/api.php?action=opensearch&search=',
		requestUrl = baseUrl + this.name + '&format=json';

	$.ajax({
		url: requestUrl,
		dataType: "jsonp",
		jsonp: "callback",
		success: onSuccess.bind(this),
		error: onError.bind(this)
	});

	function onSuccess (response) {
		var description = response[2][0],
			url = response[3][0];

		var wikipediaData = {
			description: description,
			url: url
		}

		this.setInfoWindow(wikipediaData);
		if (!app.viewModel.ready())
			app.oneLocationTreated(this.isHardcoded);
	}

	function onError () {
		this.setInfoWindow();
		if (!app.viewModel.ready())
			app.oneLocationTreated(this.isHardcoded);
	}
};

app.ViewModelLocation.prototype.setInfoWindow = function (wikipediaData) {
	this.infoWindow.addListener('closeclick', this.close.bind(this));

	var $infoWindowHtml = $(this.infoWindowTemplate(this));

	if (!this.isHardcoded) {
		$infoWindowHtml.children('img').remove();
	}

	if (wikipediaData) {
		var description = wikipediaData.description,
			url = wikipediaData.url;
	}

	// In case the wikipedia page obtained is a disambiguation page (containing 'may refer'),
	// the description is not included in the infowindow and only a link is provided
	if (description && description.length > 0 && !description.match(/may refer/)) {
		$infoWindowHtml.children('.wiki-description').text(description);
	} else {
		$infoWindowHtml.children('.wiki-description').remove();
	}

	if (url) {
		$infoWindowHtml.children('.wiki-link').attr('href', url);
	} else {
		$infoWindowHtml.children('.wiki-link').remove();
	}

	this.infoWindow.setContent($infoWindowHtml.outerHtml());
};

// Underscore.js is used to create a templating function for the info window
app.ViewModelLocation.prototype.infoWindowTemplate = _.template($('#infowindow-template').html());
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
			console.log(status);
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
}
/* global google.maps */
var app = app || {};

/* This object provides a simple interface to interact with the
   google map */
app.mapModule = function () {
	'use strict';

	var rwanda = new google.maps.LatLng(-1.930820, 29.874024);
	var options = {
		center: rwanda,
		zoom: 9,
		disableDefaultUI: true,
		styles: [
			{
				"featureType": "road.highway",
				"stylers": [
					{ "visibility": "off" }
				]
			},{
				"featureType": "administrative.country",
				"elementType": "geometry.stroke",
				"stylers": [
					{ "color": app.colors.yellow }
				]
			}
		]
	};

	var map = new google.maps.Map(document.getElementById('map'), options);
	var bounds = new google.maps.LatLngBounds();

	map.updateBoundsWithPosition = function (position) {
		bounds.extend(position);
		map.fitBounds(bounds);
	};

	map.panToPosition = function (position) {
		map.panTo(position);
	};

	// These clicks are not triggered when clicking on a gorilla
	map.addListener('click', function () {
		app.viewModel.closeAll();
	});

	return map;
};
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
/* global ko, $ */

// Helper functions
(function () {
	'use strict';

	jQuery.fn.outerHtml = function () {
		return jQuery('<div />').append(this.eq(0).clone()).html();
	};

	/* Binding handler factory taken from the TODOMVC project: http://todomvc.com/ */
	var ENTER_KEY = 13;
	var ESCAPE_KEY = 27;
	var UP_ARROW = 38;
	var DOWN_ARROW = 40;

	// A factory function we can use to create binding handlers for specific
	// keycodes.
	function keyhandlerBindingFactory(keyCode) {
		return {
			init: function (element, valueAccessor, allBindingsAccessor, data, bindingContext) {
				var wrappedHandler, newValueAccessor;

				// wrap the handler with a check for the enter key
				wrappedHandler = function (data, event) {
					if (event.keyCode === keyCode) {
						valueAccessor().call(this, data, event);
					}
				};

				// create a valueAccessor with the options that we would want to pass to the event binding
				newValueAccessor = function () {
					return {
						keyup: wrappedHandler
					};
				};

				// call the real event binding's init function
				ko.bindingHandlers.event.init(element, newValueAccessor, allBindingsAccessor, data, bindingContext);
			}
		};
	}

	ko.bindingHandlers.enterKey = keyhandlerBindingFactory(ENTER_KEY);
	ko.bindingHandlers.escapeKey = keyhandlerBindingFactory(ESCAPE_KEY);
	ko.bindingHandlers.upArrow = keyhandlerBindingFactory(UP_ARROW);
	ko.bindingHandlers.downArrow = keyhandlerBindingFactory(DOWN_ARROW);

	// Keep the input bar focused when changing the showMode
	ko.bindingHandlers.keepFocus = {
	    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
	        var focused = ko.unwrap(valueAccessor());
	        var showMode = bindingContext.$root.searchVM.showMode();
	        if (focused) $(element).focus();
	    }
	};
})();
/* global ko */
var app = app || {};

/* The add view model is responsible for the input bar when the user is
   adding a location */
app.AddViewModel = function (viewModel) {
	'use strict';

	this.inputText = viewModel.inputText;

	this.bar = ko.observable(false);
	var addMessage = 'Add a new place !';

	this.active = ko.computed(function() {
		var bar = this.bar(),
			inputText = this.inputText();
		return bar && !(inputText == addMessage);
	}.bind(this));

	// Toggle add bar or add a new location
	this.onButtonClick = function () {
		if (!this.active()) {
			if (this.bar()) {
				app.viewModel.hide();
			} else {
				app.viewModel.openAddBar();
				app.viewModel.inputText(addMessage);
			}
		} else {
			this.add();
		}
	}.bind(this);

	this.add = function () {
		var inputText = this.inputText();
		if (inputText.length <= 1) {
			app.viewModel.message('Type a location to add!');
		} else {
			app.adder.addNewLocation(inputText);
		}
	};
};
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
/* global ko */
var app = app || {};

/* The main view model contains two sub-view models, correponding to the two main
   functionalities of the app: searching a location and adding a location.
   The main view model handles the input bar in the middle and how it is shared by
   the two functionalities */
app.ViewModel = function () {
	'use strict';

	this.locations = app.viewModelLocations;

	this.inputText = ko.observable('');

	this.messaging = ko.observable(false);

	this.searchVM = new app.SearchViewModel(this);

	this.addVM = new app.AddViewModel(this);

	this.ready = ko.observable(false);

	this.message = function (message, duration, callback) {
		var duration = duration || 1500;
		var callback = callback || function() {}
		this.messaging(true);
		this.inputText(message);
		window.setTimeout(function() {
			this.inputText('');
			this.messaging(false);
			callback();
		}.bind(this), duration)
	};

	this.click = function () {
		this.inputText('');
		app.viewModel.closeAll();
	}.bind(this);

	this.hide = function () {
		this.searchVM.bar(false);
		this.addVM.bar(false);
	};

	this.onEnterKey = function () {
		if (this.searchVM.bar()) {
			this.searchVM.panToAndOpen();
		} else if (this.addVM.bar()) {
			this.addVM.add();
		}
	};

	this.onDownArrow = function () {
		if (this.searchVM.bar()) {
			this.searchVM.highlightNext();
		}
	};

	this.onUpArrow = function () {
		if (this.searchVM.bar()) {
			this.searchVM.highlightPrevious();
		}
	};

	this.closeAll = function () {
		this.locations().forEach(function (location) {
			location.close();
		});
	};

	this.openSearchBar = function () {
		this.addVM.bar(false);
		this.searchVM.bar(true);
	};

	this.openAddBar = function () {
		this.searchVM.bar(false);
		this.addVM.bar(true);
	};
};
//# sourceMappingURL=uglified.js.map
