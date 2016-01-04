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