/**
 * Initializes all routes within current director.
 */

'use strict';

var fs = require('fs')
var _ = require('lodash')
var path = require('path')
var async = require('async')

var routes = fs.readdirSync(__dirname)
routes = _.reject(routes, function(route) {
	return route === 'index.js'
})

/**
 * Requires every route within current directory. Attaches routes for each.
 *
 * @param {Object} app - App
 * @param {Object} deps - Deps
 * @param {Function} callback - Callback()
 */
exports.setupRoutes = function(app, deps, callback) {
	async.each(routes, function(route, routeCB) {
		route = require('./' + path.basename(route))
		route.attachRoutes(app, deps, routeCB)
	}, callback)
}