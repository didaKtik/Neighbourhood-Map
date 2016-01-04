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