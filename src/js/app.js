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

	app.map = app.mapModule();

	app.adder = app.adderModule();

	app.viewModelLocations = ko.observableArray();

	app.hardcodedLocations = [
		'Lake Kivu', 'Gisenyi', 'Kigali',
		'Ruhengeri', 'Kigarama', 'Butare', 'Kibungo',
		'Kinazi', 'Nyungwe Forest National Park'
	];

	app.userLocations = $.parseJSON(localStorage.getItem('userLocations')) || [];

	// Equivalent in jQuery ?
	app.hardcodedLocations.treated = ko.observable(0);
	if (app.userLocations.length > 0)
		app.userLocations.treated = ko.observable(0);

	app.hardcodedLocations.treated.subscribe(function (treatedLocations) {
		if (treatedLocations == app.hardcodedLocations.length) {
			onHardcodedLocationsReady();
		}
	});

	app.adder.addLocations(app.hardcodedLocations);
	if (app.userLocations.length > 0)
		window.setTimeout(function() {
			app.adder.addLocations(app.userLocations);
		}, 3000);

	app.viewModel = new app.ViewModel();
	ko.applyBindings(app.viewModel);

	function onHardcodedLocationsReady () {
		app.viewModel.ready(true);
		dropHardcodedLocations();
		window.setTimeout(function() {
			app.viewModel.hardcodedLocations().forEach(function (location) {
				location.buildInfoWindow();
			});
		}, 1000);
	}

	function dropHardcodedLocations () {
		app.viewModel.hardcodedLocations().forEach(function (location) {
			location.marker.setMap(app.map);
		});
		app.viewModel.openSearchBar();
		app.viewModel.message('My gorillas!', 2500, function () {
			if (app.userLocations.length > 0) {
				checkUserLocations();
			} else {
				app.viewModel.hide();
			}
		});
	}

	function checkUserLocations () {
		if (app.userLocations.treated() == app.userLocations.length) {
			onUserLocationsReady();
		} else {
			app.userLocations.treated.subscribe(function (treatedLocations) {
				if (treatedLocations == app.userLocations.length) {
					onUserLocationsReady();
					app.userLocations.treated(Infinity);
				}
			});
		}
	}

	function onUserLocationsReady () {
		dropUserLocations();
		window.setTimeout(function() {
			app.viewModel.userLocations().forEach(function (location) {
				location.buildInfoWindow();
			});
		}, 1000);
	}

	function dropUserLocations () {
		app.viewModel.userLocations().forEach(function (location) {
			location.marker.setMap(app.map);
		});
		app.viewModel.openAddBar();
		app.viewModel.message('And your sugar canes!', 2000, function () {
			app.viewModel.hide();
		});
	}
};

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
	} else if (app.userLocations) {
		var locationsTreated = app.userLocations.treated();
		app.userLocations.treated(locationsTreated + 1);
	}
};


app.mapModule = function () {
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
		app.viewModel.closeAll();
	});

	return map;
};


app.adderModule = function () {
	// Location details are queried via Google TextSearch
	var service = new google.maps.places.PlacesService(app.map);

	function queryLocationsBy10 (locations, queryRound) {
		var qr = queryRound,
			lessThan10Remaining = locations.slice(10 * qr).length <= 10;

		if (lessThan10Remaining) {
			var remainingLocations = locations.slice(10 * qr);
			queryLocations(remainingLocations);

		} else {
			var locationsBy10 = locations.slice(10 * qr, 10 * (qr + 1));
			queryLocations(locationsBy10);
			window.setTimeout(function () {
				queryLocationsBy10(locations, qr + 1)
			}, 2000);
		}
	}

	function queryLocations (locations) {
		locations.forEach(function (location) {
			queryLocation(location, addStoredLocation, onStoredLocationError);
		});
	}

	function queryNewLocation (location) {
		queryLocation(location, addNewLocation, onNewLocationError);
	}

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
			newLocation.marker.setMap(app.map);
			newLocation.buildInfoWindow();

			app.viewModel.message('A new sugar cane!');
			app.viewModelLocations.push(newLocation);
		}
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
		addLocations: queryLocationsBy10,
		addNewLocation: queryNewLocation
	};
}


app.ViewModelLocation = function (locationDetails) {
	this.name = locationDetails.name;

	this.position = locationDetails.geometry.location;
	app.map.updateBoundsWithPosition(this.position);

	this.isHardcoded = app.isHardcoded(this.name);

	if (this.isHardcoded) {
		this.url = 'img/' + this.name.toLowerCase().replace(/ /g,"-") + '.jpg';
	} else {
		this.url = "";
	}

	this.buildMarker();

	this.wikipediaData = this.queryWikipedia();

	this.highlighted = ko.observable(false);
};

app.ViewModelLocation.prototype.buildMarker = function () {
	this.marker = new google.maps.Marker({
		position: this.position,
		icon: this.isHardcoded ? 'img/gorilla-pin.png' : 'img/sugar-cane-pin.png',
		animation: google.maps.Animation.DROP
	});

	this.marker.addListener('click', function () {
		app.viewModel.hide();
		this.toggle()
	}.bind(this));
}

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
		var description = response[2][0];
		var url = response[3][0];

		app.oneLocationTreated(this.isHardcoded);

		this.wikipediaData = {
			description: description,
			url: url
		}
	}

	function onError () {
		app.oneLocationTreated(this.isHardcoded);
	}
}

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
	$(".infowindow-name").click(function () {
		if (this.href) {
			window.open(this.href);
		}
	});
};

app.ViewModelLocation.prototype.setMarkerVisible = function (boolean) {
	// if (this.marker)
	this.marker.setVisible(boolean);
};

app.ViewModelLocation.prototype.buildInfoWindow = function () {
	var $infoWindowHtml = $(app.infoWindowTemplate(this));

	if (this.wikipediaData) {
		var description = this.wikipediaData.description;
		description += ' (Wikipedia)';
		$infoWindowHtml.children('.infowindow-description').text(description);

		var url = this.wikipediaData.url;
		$infoWindowHtml.children('a').attr('href', url);

	} else {
		disableLink()
	}

	// if (description) {
	// 	description += ' (Wikipedia)';
	// 	$infoWindowHtml.children('.infowindow-description').text(description);
	// }

	// if (url) {
	// 	$infoWindowHtml.children('a').attr('href', url);
	// } else {
	// 	disableLink();
	// }

	// if (!location.isHardcoded) {
	// 	$infoWindowHtml.children('img').remove();
	// }

	var infoWindow = new google.maps.InfoWindow({
		content: $infoWindowHtml.outerHtml()
	});

	infoWindow.addListener('closeclick', this.close.bind(this));

	function disableLink () {
		var el = $infoWindowHtml.children('a');
		el.attr('class', el.attr('class') + ' no-url');
	}

	this.infoWindow = infoWindow;

};


app.ViewModel = function () {
	this.locations = app.viewModelLocations;

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

app.SearchViewModel = function (viewModel) {
	this.locations = viewModel.locations;

	this.inputText = viewModel.inputText;

	this.messaging = viewModel.messaging;

	var searchMessage = 'Search places I like in Rwanda';

	this.bar = ko.observable(false);

	this.active = ko.computed(function() {
		var bar = this.bar(),
			inputText = this.inputText(),
			messaging = this.messaging();
		return bar && !(inputText == searchMessage) && !messaging;
	}.bind(this));

	this.onButtonClick = function () {
		if (this.bar()) {
			app.viewModel.hide();
		} else {
			app.viewModel.openSearchBar();
			this.inputText(searchMessage);
		}
	}.bind(this);

	this.matchingLocations = ko.computed(function () {
		var inputText = this.inputText(),
			active = this.active();
		if (inputText == '' || !active) {
			this.locations().forEach(function (location) {
				location.setMarkerVisible(true);
			});

			if (this.locations.length > 0) {
				this.highlight(this.locations[0]);
			}

			return this.locations;
		} else {
			inputText = inputText.toLowerCase().trim();

			// More advanced functionalities here
			var matchingLocations = this.locations().filter(function (location) {
				var regex = new RegExp('.*' + inputText + '.*'),
					matching = regex.test(location.name.toLowerCase());

				location.setMarkerVisible(matching);

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

	this.highlight = function (location) {
		this.locations().forEach(function (location) {
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
		if (location) {
			app.viewModel.hide();
			location.toggle();
			app.map.panToPosition(location.position);
		} else {
			app.viewModel.message('Not in stock sorry!');
		}
	}.bind(this);
}

app.AddViewModel = function (viewModel) {
	this.inputText = viewModel.inputText;

	this.messaging = viewModel.messaging;

	var addMessage = 'Add a new place !';

	this.bar = ko.observable(false);

	this.active = ko.computed(function() {
		var bar = this.bar(),
			inputText = this.inputText(),
			messaging = this.messaging();
		return bar && !(inputText == addMessage) && !messaging;
	}.bind(this));

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


$(app.initialize);
