/**
 * Contains custom express middlewares.
 */

'use strict';

var _ = require('lodash')
var bodyParser = require('body-parser')

/**
 * Middleware that lowercases all request parameters.
 *
 * @param {Object} req - Req
 * @param {Object} res - Res
 * @param {Function} next - Next
 */
exports.lowerCaseParams = function(req, res, next) {
	var lowerCase = function(object) {
		var lowerCaseKey = function(item) {
			var key = item[0]
			var val = item[1]
			return [key.toLowerCase(), val]
		}

		return _(object).pairs().map(lowerCaseKey).zipObject().value()
	}

	if (req.method === 'GET') req.query = lowerCase(req.query)
	if (req.method === 'POST' || req.method === 'PUT') req.body = lowerCase(req.body)

	next()
}

/**
 * Body parser
 */
exports.bodyParser = bodyParser