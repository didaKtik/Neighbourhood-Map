/* global ko, $ */

// Helper functions
(function () {
	'use strict';

	jQuery.fn.outerHtml = function () {
		return jQuery('<div />').append(this.eq(0).clone()).html();
	};

	/*! matchMedia() polyfill - Test a CSS media type/query in JS. Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas, David Knight. Dual MIT/BSD license */
	window.matchMedia || (window.matchMedia = function() {
		"use strict";

		// For browsers that support matchMedium api such as IE 9 and webkit
		var styleMedia = (window.styleMedia || window.media);

		// For those that don't support matchMedium
		if (!styleMedia) {
			var style       = document.createElement('style'),
				script      = document.getElementsByTagName('script')[0],
				info        = null;

			style.type  = 'text/css';
			style.id    = 'matchmediajs-test';

			script.parentNode.insertBefore(style, script);

			// 'style.currentStyle' is used by IE <= 8 and 'window.getComputedStyle' for all other browsers
			info = ('getComputedStyle' in window) && window.getComputedStyle(style, null) || style.currentStyle;

			styleMedia = {
				matchMedium: function(media) {
					var text = '@media ' + media + '{ #matchmediajs-test { width: 1px; } }';

					// 'style.styleSheet' is used by IE <= 8 and 'style.textContent' for all other browsers
					if (style.styleSheet) {
						style.styleSheet.cssText = text;
					} else {
						style.textContent = text;
					}

					// Test if media query is true or false
					return info.width === '1px';
				}
			};
		}

		return function(media) {
			return {
				matches: styleMedia.matchMedium(media || 'all'),
				media: media || 'all'
			};
		};
	}());

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