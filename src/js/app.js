// global ko, google.maps, $, _
'use strict';

(function() {
	jQuery.fn.outerHtml = function () {
		return jQuery('<div />').append(this.eq(0).clone()).html();
	};

	/* Binding handlers taken from the TODOMVC project: http://todomvc.com/ */
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
}());

var app = {};

app.initialize = function () {
	app.infoWindowTemplate = _.template($('#infowindow-template').html());

	app.colors = {
		blue: '#00A1DE',
		green: '#20603D',
		yellow: '#FAD201'
	};

	app.locationNames = [
		'Kivu lake', 'Gisenyi', 'Kigali',
		'Ruhengeri', 'Kigarama', 'Butare', 'Kibungo',
		'Kinazi', 'Nyungwe Forest'
	];

	app.map = app.MapModule();

	app.viewModel = new app.ViewModel();

	app.locationsTreated = ko.observable(0);

	app.viewModel.ready = ko.computed(function () {
		return app.locationsTreated() == app.locationNames.length;
	});

	ko.applyBindings(app.viewModel);

	// Location details are queried via Google TextSearch
	var service = new google.maps.places.PlacesService(app.map);

	app.locationNames.forEach(function (locationName) {
		queryLocationDetails(locationName);
	});

	function queryLocationDetails (locationName) {
		var request = { query: locationName };

		service.textSearch(request, function (locationDetailsArray, status) {
			if (status == google.maps.places.PlacesServiceStatus.OK) {
				var locationDetails = locationDetailsArray[0];
				app.viewModel.locations.push(new app.Location(locationDetails));
			} else {
				app.locationsTreated(app.locationsTreated() + 1);
			}
		});
	}
};


app.MapModule = function () {
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
					{ "color": app.colors.blue }
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
		app.viewModel.closeAllOverlays();
	});

	return map;
};


app.Location = function (locationDetails) {
	this.name = locationDetails.name;
	this.url = 'img/' + this.name.toLowerCase().replace(/ /g,"-") + '.jpg';
	this.webpUrl = 'img/webp/' + this.name.toLowerCase().replace(/ /g,"-") + '.webp';
	this.position = locationDetails.geometry.location;
	this.overlays = new app.Overlays(this);
	this.highlighted = ko.observable(false);

	app.map.updateBoundsWithPosition(this.position);

};


app.Overlays = function (location) {
	this.marker = new google.maps.Marker({
		map: app.map,
		position: location.position,
		icon: 'img/gorilla-pin.png',
		animation: google.maps.Animation.DROP
	});

	this.marker.addListener('click', app.viewModel.openLocation.bind(this, location));

	this.createInfoWindow(location);
}

app.Overlays.prototype.toggle = function () {
	if (this.marker.getAnimation() !== null) {
		this.close();
	} else {
		app.viewModel.closeAllOverlays();
		this.open();
	}
};

app.Overlays.prototype.close = function () {
	if (this.marker.getAnimation() !== null) {
		this.marker.setAnimation(null);
		this.infowindow.close();
	}
};

app.Overlays.prototype.open = function () {
	this.marker.setAnimation(google.maps.Animation.BOUNCE);
	this.infowindow.open(app.map, this.marker);
	$(".infowindow-name").click(function () {
		if (this.href) {
			window.open(this.href);
		}
	});
};

app.Overlays.prototype.createInfoWindow = function (location) {
	var self = this;

	var $infoWindowHtml = $(app.infoWindowTemplate(location));

	var baseUrl = 'https://en.wikipedia.org/w/api.php?action=opensearch&search=',
		requestUrl = baseUrl + location.name + '&format=json';

	$.ajax({
		url: requestUrl,
		dataType: "jsonp",
		jsonp: "callback",
		success: onAjaxSuccess,
		error: onAjaxError
	});

	function onAjaxSuccess (response) {
		var description = response[2][0];
		var url = response[3][0];

		if (description) {
			description += ' (Wikipedia)';
			$infoWindowHtml.children('.infowindow-description').text(description);
		}

		if (url) {
			$infoWindowHtml.children('a').attr('href', url);
		} else {
			disableLink();
		}

		createInfoWindow();
	}

	function onAjaxError () {
		disableLink();
		createInfoWindow();
	}

	function disableLink () {
		var el = $infoWindowHtml.children('a');
		el.attr('class', el.attr('class') + ' no-url');
	}

	function createInfoWindow () {
		self.infowindow = new google.maps.InfoWindow({
			content: $infoWindowHtml.outerHtml()
		});

		self.infowindow.addListener('closeclick', function() {
			self.marker.setAnimation(null);
		});

		app.locationsTreated(app.locationsTreated() + 1);
	}
};


app.ViewModel = function () {
	'use strict';
	var self = this;

	this.locations = [];

	this.searchBarVisible = ko.observable(true);

	this.searching = ko.observable(false);

	var initialMessage = 'Search places I like in Rwanda';
	this.searchString = ko.observable(initialMessage);

	this.matchingLocations = ko.computed(function () {
		var searchString = this.searchString(),
			searching = this.searching();
		if (searchString == '' || !searching) {
			this.locations.forEach(function (location) {
				location.overlays.marker.setVisible(true);
			});

			if (this.locations.length > 0) {
				this.highlight(this.locations[0]);
			}

			return this.locations;
		} else {
			searchString = searchString.toLowerCase().trim();

			// More advanced functionalities here
			var matchingLocations = this.locations.filter(function (location) {
				var regex = new RegExp('.*' + searchString + '.*'),
					matching = regex.test(location.name.toLowerCase());

				location.overlays.marker.setVisible(matching);

				return matching;
			});

			if (matchingLocations.length > 0) {
				this.highlight(matchingLocations[0])
			}

			return matchingLocations;
		}
	}.bind(this));

	this.highlightedLocation = ko.computed(function() {
		var matchingLocations = this.matchingLocations();
		for (var i=0, len=matchingLocations.length; i<len; i++) {
			if (matchingLocations[i].highlighted()) {
				return matchingLocations[i];
			}
		}
	}.bind(this));

	/*  CLICK HANDLERS */
	this.toggleSearchBar = function () {
		var searchBarVisible = this.searchBarVisible();
		if (searchBarVisible) {
			this.hide();
		} else {
			this.searchString(initialMessage);
			this.searchBarVisible(true);
		}
	};

	this.hide = function () {
		this.searching(false);
		this.searchBarVisible(false);
		this.searchString('');
	};

	this.search = function () {
		this.searching(true);
		this.searchString('');
		this.closeAllOverlays();
	};

	this.closeAllOverlays = function () {
		this.locations.forEach(function (location) {
			location.overlays.close();
		});
	};

	this.highlight = function (location) {
		this.locations.forEach(function (location) {
			location.highlighted(false);
		});
		location.highlighted(true);
	}.bind(this);

	this.highlightNext = function () {
		var matchingLocations = this.matchingLocations();
		for (var i=0, len=matchingLocations.length - 1; i<len; i++) {
			if (matchingLocations[i].highlighted()) {
				this.highlight(matchingLocations[i+1]);
				break;
			}
		}
	};

	this.highlightPrevious = function () {
		var matchingLocations = this.matchingLocations();
		for (var i=1, len=matchingLocations.length; i<len; i++) {
			if (matchingLocations[i].highlighted()) {
				this.highlight(matchingLocations[i-1]);
				break;
			}
		}
	};

	this.panToAndOpen = function () {
		var location = this.highlightedLocation();
		this.openLocation(location);
		app.map.panToPosition(location.position);
		this.hide();
	}.bind(this);

	this.openLocation = function (location) {
		location.overlays.toggle();
	};
};


$(app.initialize);
