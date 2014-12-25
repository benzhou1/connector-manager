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
	 * Renders index view. Query parameters apikey, iodhost, iodport are
	 * required. If not specified redirect to /.
	 * Verifies that apikey, iodhost, iodport are valid by sending a request to IOD.
	 *
	 * @param {Object} req - Req
	 * @param {Function} callback - Callback()
	 */
	function renderCalender(req, callback) {
		var apiKey = req.query.apikey
		var host = req.query.iodhost
		var port = req.query.iodport
		var errorCode = 0

		if (!apiKey) errorCode = 1
		else if (!host) errorCode = 2
		else if (!port) errorCode = 3

		if (errorCode) callback(null, { redirect: '/?error=' + errorCode })
		else {
			try {
				iodU.getIOD(apiKey, host, port, async.split(function(IOD) {
					callback(null, {
						view: 'schedule',
						meta: {
							apiKey: apiKey,
							host: host,
							port: port
						}
					})
				}, function(err) {
					unknownErr = err
					callback(null, { redirect: '/?error=5' })
				}))
			}
			catch(err) {
				callback(null, { redirect: '/?error=4' })
			}
		}
	}

	callback()
}

