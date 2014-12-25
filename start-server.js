/**
 * Initialization of dependencies for starting the server.
 */

'use strict';

var routes = require('./routes')
var terminator = require('./terminator')

var async = require('./lib/async-ext')
var apply = async.apply

module.exports = function(app, callback) {
	async.auto({
		// Create api terminator
		terminator: apply(terminator.create, app),

		// Initialize routes
		routes: ['terminator', function(done, deps) {
			routes.setupRoutes(deps.terminator, deps, done)
		}]
	}, callback)
}
