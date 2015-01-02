/**
 * Routes for /connector path.
 */

'use strict';

var _ = require('lodash')
var U = require('../lib/utils')
var T = require('../lib/transform')
var iodU = require('../lib/iod-utils')
var recU = require('../lib/rec-utils')
var moment = require('../lib/moment-ext')
var ConEvent = require('../lib/con-event')

var Err = require('../lib/err').Err
var ErrCode = require('../lib/err').CODE

var async = require('../lib/async-ext')
var apply = async.apply

// Cache to store connector name with connector attributes
var CEC = {}

exports.attachRoutes = function(app, deps, callback) {
	app.routeWithData('get', '/connectors', U.wrapWithIOD(listConnectors))
	app.routeWithData('post', '/connectors', U.wrapWithIOD(modifyConnector))

	/**
	 * Get a list of all connectors for given api key.
	 * Get a list of user attributes for each connector listed.
	 * Transform list of connectors and send to front end calendar.
	 *
	 * @param {IOD} IOD - IOD object
	 * @param {Object} req - Req
	 * @param {Function} finished - Finished(err, list of connectors)
	 */
	function listConnectors(IOD, req, finished) {
		async.auto({
			connectors: apply(iodU.getConnectors, IOD),

			conAttr: ['connectors', function fetchAttrs(done, data) {
				iodU.fetchConnectorAttr(IOD, data.connectors, done)
			}]
		}, async.doneFn(finished, T.seq([
			T.get('conAttr'),
			connectorsT,
			_.flatten,
			_.compact,
			T.maplet('response')
		])))
	}

	/**
	 * Creates a connector.
	 * Or deletes a connector.
	 * Or updates a connector.
	 *
	 * @param {IOD} IOD - IOD object
	 * @param {Object} req - Req
	 * @param {Function} finished - Finished(err, response to calendar)
	 */
	function modifyConnector(IOD, req, finished) {
		var data = req.body
		console.log('BODY: ', data)

		//get operation type
		var mode = data["!nativeeditor_status"]
		//get id of record
		var sid = data.id
		var tid = sid

		//remove properties which we do not want to save in DB
		delete data.id
		delete data.gr_id
		delete data["!nativeeditor_status"]

		/**
		 * Prepares a schedule object for connector creation.
		 *
		 * @returns {Object} Connector schedule object
		 */
		var prepareSched = function(oldSched) {
			var startMom = data.start_date ? moment(data.start_date, 'DD/MM/YYYY HH:mm:ss', true) : null
			var endMom = data.rec_type ?
				startMom ?
					moment(startMom).add(parseInt(data.event_length), 's') : null
				: null
			var sched = {}

			if (oldSched) {
				sched = oldSched
				if (!data.rec_type) {
					var endDurMom = moment(data.end_date, 'DD/MM/YYYY HH:mm:ss', true)
					sched.duration = moment.duration(endDurMom.diff(startMom), 'ms').asSeconds()
				}
			}
			else sched = recU.toSched(data.rec_type)

			if (startMom) {
				sched.start_date = startMom.format(moment.dateFormat)
				sched.frequency.start_time = startMom.format(moment.timeFormat)
			}

			// If end date was changed
			if (endMom && data.event_length && data.event_length != '300') {
				sched.end_date = endMom.format(moment.dateFormat)
				sched.frequency.end_time = endMom.format(moment.timeFormat)
			}
			else if (!data.event_length) {
				delete sched.end_date
				delete sched.frequency.end_time
			}

			return sched
		}

		/**
		 * Returns appropriate response to calender.
		 *
		 * @param {*} err - Error
		 */
		var connectorCb = function(err){
			var error = null

			if (err) {
				if (err instanceof Err) err = err.print()

				mode = "error"
				error = _.isObject(err) ? JSON.stringify(err, null, 2) : err
			}
			else if (mode == "inserted") tid = data._id

			finished(null, {
				contentType: 'text/xml',
				response: '<data>' +
					'<action type="'+mode+'" sid="'+sid+'" tid="'+tid+'">' +
						(error ? error : '') +
					'</action>' +
				'</data>'
			})
		}

		var validateParams = function(callback) {
			if (!data.text) callback(new Err(ErrCode.NO_CON_NAME))
			else if (!data.config) callback(new Err(ErrCode.NO_CON_CFG))
			else if (!data.destination) callback(new Err(ErrCode.NO_CON_DEST))
			else {
				try { var config = JSON.parse(data.config) }
				catch(e) {
					callback(new Err(ErrCode.FAIL_PARSE,
						{ error: 'Failed to parse config: ' + e }))
				}
				try { var destination = JSON.parse(data.destination) }
				catch(e) {
					callback(new Err(ErrCode.FAIL_PARSE,
						{ error: 'Failed to parse destination: ' + e }))
				}
				callback(null, { config: config, destination: destination })
			}
		}

		/**
		 * Creates a connector.
		 */
		var createConnector = function() {
			validateParams(async.split(function(params) {
				iodU.createConnector(IOD, {
					connector: data.text,
					flavor: data.flavor,
					config: params.config,
					destination: params.destination,
					schedule: prepareSched(),
					description: data.description
				}, connectorCb)
			}, connectorCb))
		}

		/**
		 * Deletes a connector.
		 */
		var deleteConnector = function() {
			var name = U.getActualName(data.text)
			iodU.deleteConnector(IOD, name, connectorCb)
		}

		/**
		 * Updates a connector.
		 */
		var updateConnector = function() {
			validateParams(async.split(function(params) {
				var name = U.getActualName(data.text)
				var attrs = CEC[name]
				if (!attrs) {
					console.error('Connector attributes for id: ' + data.id + ' was not found')
					return connectorCb('Unexpected error occurred!')
				}

				var options = { connector: name }
				var sched = prepareSched(JSON.parse(attrs.schedule))
				if (!_.isEqual(JSON.stringify(params.config, null, 2), attrs.config)) {
					options.config = params.config
				}
				if (!_.isEqual(JSON.stringify(params.destination, null, 2), attrs.destination)) {
					options.destination = params.destination
				}
				if (data.description !== attrs.description) options.description = data.description
				if (!_.isEqual(JSON.stringify(sched, null, 2), attrs.schedule)) {
					options.schedule = sched

					if (options.schedule.duration) {
						options.config = options.config || {}
						options.config.duration = options.schedule.duration
						delete options.schedule.duration
					}
				}

				console.log('OPTIONS: ', options)

				// No changes to connector found
				if (_.size(_.pick(options, ['config', 'destination', 'schedule', 'description'])) === 0) {
					return connectorCb()
				}

				iodU.updateConnector(IOD, options, connectorCb)
			}, connectorCb))
		}

		if (mode == 'inserted') createConnector()
		else if (mode == 'deleted') deleteConnector()
		else if (mode == 'updated') updateConnector()
		else connectorCb('Not supported operation found: ' + mode)
	}

	callback()
}

/**
 * Converts frequency interval into milliseconds depending on frequency_type.
 *
 * @param {Number} interval - Frequency interval
 * @param {String} type - Frequency type
 * @returns {Number} - Interval in milliseconds
 */
function toMsInterval(interval, type) {
	if (type === 'seconds') return interval*moment.SECOND.asMilliseconds()
	else if (type === 'daily') return interval*moment.DAY.asMilliseconds()
	else if (type === 'weekly') return interval*moment.WEEK.asMilliseconds()
	else if (type === 'monthly') return interval*moment.MONTH.asMilliseconds()
}

/**
 * Transform list of connector user attributes retrieved, into a list that the frontend
 * calendar is expecting.
 */
var connectorsT = T.map(function(connector) {
	var sched = connector.schedule
	var freq = sched && sched.frequency
	var duration = connector.config && connector.config.duration
	var conEventList = []

	/**
	 * Add connector schedule event to list.
	 * Save connector event in connector event cache.
	 *
	 * @param {Object} conEvent - Connector event
	 * @param {Boolean} [shouldReturn] - Optional, set to true to return conEventList
	 * @returns {Array} - conEventList
	 */
	var addToConEventList = function(conEvent, shouldReturn) {
		var name = U.getActualName(conEvent.text)
		if (!CEC[name]) CEC[name] = conEvent
		conEventList.push(conEvent)
		if (shouldReturn) return conEventList
	}

	// On site connector
	if (!connector.config) return addToConEventList(new ConEvent(connector).value(), true)

	// No schedule set start_date and end_date to now
	if (!sched) return addToConEventList(new ConEvent(connector).value(), true)

	var occurrences = sched.occurrences || -1
	var start = moment.asDateTime(sched.start_date, freq.start_time)
	var end = moment.asDateTime(sched.end_date, freq.end_time)
	var intervalInMs = toMsInterval(freq.interval, freq.frequency_type)
	var durationInMs = duration ? duration*moment.SECOND.asMilliseconds() : null
	var prev = {}

	if (occurrences > 0) {
		for (var i=0; i < occurrences; i++) {
			var conEvent = new ConEvent(connector)
			conEvent.name = connector.name + ' - occurrence: ' + (i+1)

			var prevStart = prev.start_date ? moment(prev.start_date) : null
			var prevEnd = prev.end_date ? moment(prev.end_date) : null

			// If first occurrences, start at startDate or start now
			if (!prevStart) {
				conEvent.start_date = start ? start.toDate() : new Date()
				conEvent.setEndDate(durationInMs)
			}
			else {
				var futureInterval = prevStart.add(intervalInMs, 'ms')

				// Next interval run time is before duration run time
				if (futureInterval.isBefore(prevEnd)) {
					// Add next interval to start_date
					prev.start_date = futureInterval.toDate()
					continue
				}
				// Next interval past the schedule end date
				else if (end && futureInterval.isAfter(end)) break
				else conEvent.start_date = futureInterval.toDate()

				conEvent.setEndDate(durationInMs)
			}

			prev = conEvent.clone()
			addToConEventList(conEvent.value())
		}
	}
	else {
		var conEvent = new ConEvent(connector)
		conEvent.transformName(intervalInMs, durationInMs, end)
		conEvent.start_date = start ? start.toDate() : new Date()
		conEvent.end_date = end ? end.toDate() : new Date(9999, 1, 1)

		// No occurrences means either run forever or run until endDate
		addToConEventList(conEvent.value())
	}

	return conEventList
})