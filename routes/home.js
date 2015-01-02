/**
 * Routes for /home and / paths.
 */

'use strict';

var _ = require('lodash')
var iodU = require('../lib/iod-utils')
var async = require('../lib/async-ext')
var querystring = require('querystring')

exports.attachRoutes = function(app, deps, callback) {
	app.routeWithView('get', '/', renderHome)
	app.routeWithView('get', '/connectorSchedule', renderCalender)

	var unknownErr = ''

	/**
	 * Renders home view.
	 *
	 * @param {Object} req - Req
	 * @param {Function} callback - Callback()
	 */
	function renderHome(req, callback) {
		var errorCode = req.query.error
		var res = {
			view: 'home',
			meta: {
				errorCode: errorCode,
				errMsg: unknownErr
			}
		}

		unknownErr = ''

		callback(null, res)
	}

	/**
	 * Renders index view. Query parameters apikey are required. If not specified redirect to /.
	 * Verifies that apikey are valid by sending a request to IOD.
	 *
	 * @param {Object} req - Req
	 * @param {Function} callback - Callback()
	 */
	function renderCalender(req, callback) {
		var apiKey = req.query.apikey
		var errorCode = 0

		if (!apiKey) errorCode = 1
		if (errorCode) callback(null, { redirect: '/?error=' + errorCode })
		else {
			try {
				iodU.getIOD(apiKey, async.split(function() {
					callback(null, {
						view: 'schedule',
						meta: { apiKey: apiKey }
					})
				}, function(err) {
					if (_.contains(err, 'api key')) callback(null, { redirect: '/?error=3' })
					else {
						unknownErr = err
						callback(null, { redirect: '/?error=4' })
					}
				}))
			}
			catch(err) {
				callback(null, { redirect: '/?error=2' })
			}
		}
	}

	callback()
}

