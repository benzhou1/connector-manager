/**
 * Utility functions.
 */

'use strict';

var _ = require('lodash')
var iodU = require('./iod-utils')
var async = require('./async-ext')

var Err = require('../lib/err').Err
var ErrCode = require('../lib/err').CODE

/**
 * Wraps a route handler with a function that passes in and IOD object as the first
 * parameter to specified route handler `routeHandler`.
 *
 * @param {Function} routeHandler - Route handler
 * @returns {Function} - Function(req, finished)
 */
exports.wrapWithIOD = function(routeHandler) {
	return function(req, finished) {
		var apiKey = req.query && req.query.apikey

		if (!apiKey) finished(new Err(ErrCode.NO_API_KEY))
		else iodU.getIOD(req.query.apikey, async.split(function(IOD) {
			routeHandler.apply(null, [IOD, req, finished])
		}, finished))
	}
}

/**
 * Extract connector name from `name`.
 *
 * @param {String} name - Connector name
 * @returns {String} - Actual connector name
 */
exports.getActualName = function(name) {
	if (_.contains(name, ' - forever')) return name.split(' - forever')[0]
	else if (_.contains(name, ' - occurrence')) return name.split(' - occurrence')[0]
	else if (_.contains(name, ' - every')) return name.split(' - every')[0]
	else return name
}