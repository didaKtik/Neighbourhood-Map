// global ko, google.maps, $, _
'use strict';

jQuery.fn.outerHtml = function () {
	return jQuery('<div />').append(this.eq(0).clone()).html();
};

var app = {};

app.initialize = function () {
	app.infoWindowTemplate = _.template($('#infowindow-template').html());

	app.colors = {
		blue: '#00A1DE',
		green: '#20603D',
		yellow: '#FAD201'
	};

	var locationNames = [
		'Kivu lake', 'Gisenyi', 'Kigali',
		'Ruhengeri', 'Kigarama', 'Butare', 'Kibungo',
		'Kinazi', 'Nyungwe Forest'
	];

	app.map = app.MapModule();

	app.viewModel = new app.ViewModel();
	ko.applyBindings(app.viewModel);

	// Location details are queried via Google TextSearch
	var service = new google.maps.places.PlacesService(app.map);

	locationNames.forEach(function (locationName) {
		queryLocationDetails(locationName);
	});

	function queryLocationDetails (locationName) {
		var request = { query: locationName };

		service.textSearch(request, function (locationDetailsArray, status) {
			if (status == google.maps.places.PlacesServiceStatus.OK) {
				var locationDetails = locationDetailsArray[0];
				app.viewModel.locations.push(new app.Location(locationDetails));
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

	return map;
};


app.Location = function (locationDetails) {
	this.name = locationDetails.name;
	this.url = 'img/' + this.name.toLowerCase().replace(/ /g,"-") + '.jpg';
	this.webpUrl = 'img/webp/' + this.name.toLowerCase().replace(/ /g,"-") + '.webp';
	this.position = locationDetails.geometry.location;
	this.overlays = new app.Overlays(this);

	app.map.updateBoundsWithPosition(this.position);
};


app.Overlays = function (location) {
	this.marker = new google.maps.Marker({
		map: app.map,
		position: location.position,
		icon: 'img/gorilla-pin.png',
		animation: google.maps.Animation.DROP
	});

	this.marker.addListener('click', app.viewModel.onMarkerClick.bind(location));

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
	this.marker.setAnimation(null);
	this.infowindow.close();
};

app.Overlays.prototype.open = function () {
	this.marker.setAnimation(google.maps.Animation.BOUNCE);
	this.infowindow.open(app.map, this.marker);
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
	}
};


app.ViewModel = function () {
	'use strict';
	var self = this;

	this.locations = [];

	this.matchingLocations = ko.observableArray();


	/*  CLICK HANDLERS */
	this.onHamburgerClick = function () {
		this.searchBarVisible(!this.searchBarVisible());
	};

	this.onSearchBarClick = function () {
		this.listViewVisible(true);
	};


	this.onListItemClicked = function () {
		self.searchBarVisible(false);
		app.map.panToPosition(this.position);
		self.selectedLocation(this);
	};

	this.onMarkerClick = function () {
		// this refers to the clicked location
		self.selectedLocation(this);
	};

	// These clicks are also triggered when clicking on a gorilla
	this.onMapClick = function () {
		this.searchBarVisible(false);
	};

	// These clicks are not triggered when clicking on a gorilla
	app.map.addListener('click', function () {
		self.selectedLocation(null);
	});


	/* STATE DEPENDENCIES */
	this.searchBarVisible = ko.observable(true);
	this.searchBarVisible.subscribe(function (searchBarVisible) {
		// Additional events when the search bar disappears
		if (!searchBarVisible) {
			self.listViewVisible(false);
			self.searchString(initialMessage);
		}
	});

	this.listViewVisible = ko.observable(false);
	this.listViewVisible.subscribe(function (listViewVisible) {
		// Additional events when the list view appears
		if (listViewVisible) {
			self.searchString('');
			self.selectedLocation(null);
		}
	});

	var initialMessage = 'Search places I like in Rwanda';
	this.searchString = ko.observable(initialMessage);
	this.searchString.subscribe(function (searchString) {
		self.setMatchingLocations(searchString);
	});

	this.selectedLocation = ko.observable();
	this.selectedLocation.subscribe(function (selectedLocation) {
		if (selectedLocation) {
			selectedLocation.overlays.toggle();
		} else {
			self.closeAllOverlays();
		}
	});


	/* UTILITY FUNCTIONS */
	this.setMatchingLocations = function (searchString) {
		if (searchString == '' || searchString == initialMessage) {
			self.allLocationsMatch();

		} else {
			var searchString = searchString.toLowerCase().trim();

			// More advanced functionalities here
			var matchingLocations = self.locations.filter(function (location) {
				var regex = new RegExp('.*' + searchString + '.*'),
					matching = regex.test(location.name.toLowerCase());

				location.overlays.marker.setVisible(matching);

				return matching;
			});

			self.matchingLocations(matchingLocations);
		}
	};

	this.allLocationsMatch = function () {
		this.locations.forEach(function (location) {
			location.overlays.marker.setVisible(true);
		});
		this.matchingLocations(this.locations);
	};

	this.closeAllOverlays = function () {
		this.locations.forEach(function (location) {
			console.log('I was called');
		});
	};
};


$(app.initialize);
