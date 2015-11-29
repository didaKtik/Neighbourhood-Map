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

	app.map = app.MapModule();

	var service = new google.maps.places.PlacesService(app.map);

	var locationNames = [
		'Kivu lake', 'Gisenyi', 'Kigali',
		'Ruhengeri', 'Kigarama', 'Butare', 'Kibungo',
		'Kinazi', 'Nyungwe Forest'
	];

	locationNames.forEach(function (locationName) {
		queryLocationDetails(locationName);
	});

	app.viewModel = new app.ViewModel();
	ko.applyBindings(app.viewModel);

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

	// Contrary to the ones defined on #map,
	// these clicks are not triggered when clicking on a gorilla
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
	this.isVisible = ko.observable(true);

	app.map.updateBoundsWithPosition(this.position);
};


app.Overlays = function (location) {
	this.marker = new google.maps.Marker({
		map: app.map,
		position: location.position,
		icon: 'img/gorilla-pin.png',
		animation: google.maps.Animation.DROP
	});

	this.marker.addListener('click', this.toggle.bind(this));

	this.createInfoWindow(location);
}

app.Overlays.prototype.toggle = function () {
	if (this.marker.getAnimation() !== null) {
		this.close();
	} else {
		this.open();
	}
}

app.Overlays.prototype.close = function () {
	if (this.marker.getAnimation() !== null) {
		this.marker.setAnimation(null);
		this.infowindow.close();
	}
};

app.Overlays.prototype.open = function () {
	this.closeAllOthers();
	this.marker.setAnimation(google.maps.Animation.BOUNCE);
	this.infowindow.open(app.map, this.marker);
};

app.Overlays.prototype.closeAllOthers = function () {
	app.viewModel.locations.forEach(function (location) {
		if (location.overlays != this) {
			location.overlays.close();
		}
	}.bind(this));
};

app.Overlays.prototype.createInfoWindow = function (location) {
	var self = this;

	var $infoWindowHtml = $(app.infoWindowTemplate(location));

	var baseUrl = 'https://en.wikipedia.org/w/api.php?actio=opensearch&search=',
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

	// Is the search bar visible ?
	this.searchBar = ko.observable(true);

	var initialMessage = 'Search places I like in Rwanda';
	this.searchString = ko.observable(initialMessage);

	// Control list view visibility
	this.isSearching = ko.pureComputed(function () {
		return self.searchString() == initialMessage ? false : true;
	});

	// Click: hamburger button
	this.toggleSearch = function () {
		if (!this.searchBar()) {
			this.searchBar(true);
		} else {
			this.hide();
		}
	};

	this.hide = function () {
		// this will trigger isSearching = false and thus hide list view
		this.searchString(initialMessage);
		// Hide search bar
		this.searchBar(false);
		this.showAllMarkers();
	};

	this.showAllMarkers = function () {
		this.locations.forEach(function (location) {
			location.overlays.marker.setVisible(true);
		});
	};

	this.onSearchBarClick = function () {
		this.searchString('');
	};

	// The anonymous function passed is triggered each time the searchString is
	//   modified
	this.searchString.subscribe(function (searchString) {
		if (searchString == self.initialMessage || searchString == '') {
			self.showAllMarkers();

			self.matchingLocations(self.locations);

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
	});

	// One item of the list view was clicked
	this.onLocationClick = function () {
		// this in this context refers to the clicked location
		self.hide();
		app.map.panToPosition(this.overlays.marker.getPosition());
		this.overlays.open();
	};

	// Used when the map is clicked
	this.closeAllOverlays = function () {
		this.locations.forEach(function (location) {
			location.overlays.close();
		});
	}
};


$(app.initialize);
