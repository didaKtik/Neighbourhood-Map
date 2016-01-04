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