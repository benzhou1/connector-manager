/**
 * Routes for /init path.
 * Initializes connectors for demo.
 */

'use strict';

var _ = require('lodash')
var iod = require('iod')
var moment = require('moment')
var U = require('../lib/utils')
var T = require('../lib/transform')
var iodU = require('../lib/iod-utils')

var async = require('../lib/async-ext')
var apply = async.apply

exports.attachRoutes = function(app, deps, callback) {
	app.routeWithData('get', '/init?', U.wrapWithIOD(init))

	/**
	 * Initializes some connectors for demo.
	 * Creates test index if necessary.
	 *
	 * @param {IOD} IOD - IOD object
	 * @param {Object} req - Req
	 * @param {Function} finished - Finished(err | null)
	 */
	function init(IOD, req, finished) {
		async.auto({
			found: function checkForTestIndex(done, data) {
				iodU.getIndexes(data.IOD, async.doneFn(done, function(indexes) {
					return _.find(indexes, function(index) {
						return index === 'test1'
					})
				}))
			},

			connectors: apply(iodU.getConnectors, IOD),

			create: function createTestIndex(done, data) {
				if (data.found) done()
				else iodU.createIndex(IOD, { index: 'test1', flavor: 'standard' }, done)
			},

			added: ['IOD', 'connectors', function creatingConnectors(done, data) {
				createConnectors(IOD, data.connectors, done)
			}]
		}, async.doneFn(finished, function(results) {
			return {
				contentType: 'application/json',
				response: {
					createdTextIndex: !results.found,
					createdConnectors: results.added
				}
			}
		}))
	}

	callback()
}

var defaultConf = {
	url: 'http://www.idolondemand.com',
	max_pages: 1
}
var defaultDest = {
	action: 'addtotextindex',
	index: 'test1'
}
var defaultSched = {
	frequency: {
		frequency_type: 'seconds',
		interval: moment.HOUR.asSeconds()
	}
}

/**
 * Connector data to initialize.
 */
var connectors = [
	{
		connector: 'Forever',
		type: 'web',
		config: defaultConf,
		destination: defaultDest,
		schedule: _.defaults({
			start_date: moment().add(1, 'days').format(moment.dateFormat)
		}, defaultSched)
	},
	{
		connector: 'No schedule',
		type: 'web',
		config: defaultConf,
		destination: defaultDest,
		description: 'Connector with no schedule'
	},
	{
		connector: 'Connector1',
		type: 'web',
		config: _.defaults({
			duration: 30*moment.MINUTE.asSeconds()
		}, defaultConf),
		destination: defaultDest,
		schedule: _.merge({
			start_date: moment().add(2, 'days').format(moment.dateFormat),
			occurrences: 4,
			frequency: {
				interval: moment.HOUR.asSeconds()
			}
		}, defaultSched),
		description: 'Connector with 4 occurences every hour for 30 minutes each'
	},
	{
		connector: 'Connector2',
		type: 'web',
		config: defaultConf,
		destination: defaultDest,
		schedule: _.merge({
			start_date: moment().add(3, 'days').format(moment.dateFormat),
			occurrences: 4,
			frequency: {
				interval: moment.HOUR.asSeconds()
			}
		}, defaultSched),
		description: 'Connector with 4 occurrences every hour with no duration'
	},
	{
		connector: 'Connector3',
		type: 'web',
		config: _.defaults({
			duration: moment.HOUR.asSeconds() + 30*moment.MINUTE.asSeconds()
		}, defaultConf),
		destination: defaultDest,
		schedule: _.merge({
			start_date: moment().add(4, 'days').format(moment.dateFormat),
			occurrences: 4,
			frequency: {
				interval: moment.HOUR.asSeconds()
			}
		}, defaultSched),
		description: 'Connector with duration longer than interval, runs twice for an hour and 30 minutes each'
	},
	{
		connector: 'Connector4',
		type: 'web',
		config: _.defaults({
			duration: moment.HOUR.asSeconds() + 30*moment.MINUTE.asSeconds()
		}, defaultConf),
		destination: defaultDest,
		schedule: _.merge({
			start_date: moment().add(5, 'days').format(moment.dateFormat),
			end_date: moment().add(5, 'days').format(moment.dateFormat),
			occurrences: 4,
			frequency: {
				interval: moment.HOUR.asSeconds(),
				end_time: '01:35:00 -0500'
			}
		}, defaultSched),
		description: 'Connector with end date, runs once for an hour and 30 minutes'
	},
	{
		connector: 'Connector5',
		type: 'web',
		config: _.defaults({
			duration: 30*moment.MINUTE.asSeconds()
		}, defaultConf),
		destination: defaultDest,
		schedule: _.merge({
			start_date: moment().add(6, 'days').format(moment.dateFormat),
			end_date: moment().add(7, 'days').format(moment.dateFormat),
			frequency: {
				interval: moment.HOUR.asSeconds()
			}
		}, defaultSched),
		description: 'Connector with end date, runs for one day every hour for 30 minutes'
	}
]

/**
 * Go through list of test connectors, if it doesn't already exist create it.
 *
 * @param {IOD} IOD - IOD Object
 * @param {Array} existingCon - List of already existing connectors
 * @param {Function} callback - Callback(err, created connector msgs)
 */
function createConnectors(IOD, existingCon, callback) {
	var cons = _.filter(connectors, function(con) {
		return !_.contains(existingCon, con.connector.toLowerCase())
	})

	async.mapSeries(cons, _.partial(iodU.createConnector, IOD), callback)
}

