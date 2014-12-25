/**
 * Utility functions.
 */

'use strict';

var iodU = require('./iod-utils')
var async = require('./async-ext')

var Err = require('../lib/err').Err
var ErrCode = require('../lib/err').CODE

/**
 * Verifies that url query parameter contains apikey, iodhost, and iodport.
 *
 * @param {Object} req - Req
 * @returns {Err | null}
 */
var verifyQueryParam = exports.verifyQueryParam = function(req) {
	if (!req.query || !req.query.apikey) return new Err(ErrCode.NO_API_KEY)
	else if (!req.query || !req.query.iodhost) return new Err(ErrCode.NO_IOD_HOST)
	else if (!req.query || !req.query.iodport) return new Err(ErrCode.NO_IOD_PORT)
	else return null
}

/**
 * Wraps a route handler with a function that passes in and IOD object as the first
 * parameter to specified route handler `routeHandler`.
 *
 * @param {Function} routeHandler - Route handler
 * @returns {Function} - Function(req, finished)
 */
exports.wrapWithIOD = function(routeHandler) {
	return function(req, finished) {
		var error = verifyQueryParam(req)

		if (error) finished(error)
		else iodU.getIOD(req.query.apikey, req.query.iodhost, req.query.iodport,
			async.split(function(IOD) {
				routeHandler.apply(null, [IOD, req, finished])
			}, finished)
		)
	}
}