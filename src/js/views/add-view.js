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
		return bar && inputText != addMessage;
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