/* global */
var app = app || {};

/* The gorilla and sugar cane pins are loaded first so that the dropping is
not slowed down by the queries */
(function () {
	'use strict';

	var markerUrls = ['img/gorilla-pin.png', 'img/sugar-cane-pin.png'];
	markerUrls.forEach(function (url) {
		var image = new Image();
		image.src = url;
	});
})();

/* Main function */
$(function () {
	'use strict';

	// Kick things off
	app.initialize();
});