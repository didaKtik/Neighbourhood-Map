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
		this.toggle();
	}.bind(this));
};

app.ViewModelLocation.prototype.queryWikipedia = function () {
	var baseUrl = 'https://en.wikipedia.org/w/api.php?action=opensearch&search=',
		requestUrl = baseUrl + this.name + '&format=json';

	$.ajax({
		url: requestUrl,
		dataType: "jsonp",
		jsonp: "callback"
	}).done(onSuccess.bind(this))
	.fail(onError.bind(this));

	function onSuccess (response) {
		var description = response[2][0],
			url = response[3][0];

		var wikipediaData = {
			description: description,
			url: url
		};

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

	var description,
		url;

	if (wikipediaData) {
		description = wikipediaData.description;
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