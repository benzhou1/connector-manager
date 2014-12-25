/**
 * Utilities for termination a request.
 */

'use strict';

var Err = require('./lib/err').Err

/**
 * Creates a terminator that wraps route request.
 *
 * @param {Object} app - Express app
 * @param {Function} callback - Callback(null, Terminator)
 */
exports.create = function(app, callback) {
	var Terminator =  {
		routeWithView: route(app, terminateWithView),
		routeWithData: route(app, terminateWithData)
	}

	callback(null, Terminator)
}

/**
 * Attaches termination function with routes.
 *
 * @param {Object} app - App
 * @param {Function} terminatingCB - Function(routeFn)
 * @returns {Function} - Function(method, endpoint, routeFn)
 */
function route(app, terminatingCB) {
	return function(method, endpoint, routeFn) {
		app[method](endpoint, terminatingCB(routeFn))
	}
}

/**
 * Terminate a route request by rendering a view.
 *
 * On error log.
 * On success renders view.
 *
 * @param {Function} fn - Route handler
 * @returns {Function} - Function(req, res)
 */
function terminateWithView(fn) {
	return function(req, res) {
		fn(req, function(err, results) {
			if (err) {
				console.error(err)
				res.render('Unknown error occurred!')
			}
			else {
				if (results.redirect) res.redirect(results.redirect)
				else res.render(results.view, results.meta || {})
			}
		})
	}
}

/**
 * Terminate a route request by rendering json data.
 *
 * On error returns status 400. Log error.
 * Otherwise send response.
 *
 * @param {Function} fn - Route handler
 * @returns {Function} - Function(req, res)
 */
function terminateWithData(fn) {
	return function(req, res) {
		fn(req, function(err, results) {
			if (err) {
				if (!(err instanceof Err)) console.error(err.toString())
				else console.error(err)
			}
			else if (results && results.contentType) {
				res.set('Content-Type', results.contentType)

				if (results.contentType === 'application/json') {
					results.response = JSON.stringify(results.response, null, 2)
				}
			}

			res.status(err ? 400 : 200)
				.send(err ?
					((err instanceof Err) ? err.print() : 'Unknown error occurred!') :
					results.response
				)
		})
	}
}