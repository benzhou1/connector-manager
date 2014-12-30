/**
 * Utility functions.
 */

'use strict';

var _ = require('lodash')
var iodU = require('./iod-utils')
var async = require('./async-ext')
var config = require('../config.json')

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
		else iodU.getIOD(req.query.apikey, config.iod.host, config.iod.port,
			async.split(function(IOD) {
				routeHandler.apply(null, [IOD, req, finished])
			}, finished)
		)
	}
}