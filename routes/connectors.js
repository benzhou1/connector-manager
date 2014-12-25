/**
 * Routes for /connector path.
 */

'use strict';

var _ = require('lodash')
var uuid = require('uuid')
var U = require('../lib/utils')
var T = require('../lib/transform')
var iodU = require('../lib/iod-utils')
var recU = require('../lib/rec-utils')
var moment = require('../lib/moment-ext')
var ConSched = require('../lib/con-sched')

var Err = require('../lib/err').Err
var ErrCode = require('../lib/err').CODE

var async = require('../lib/async-ext')
var apply = async.apply

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
		async.split(function(IOD) {
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
		}, finished)
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
		 * @param {Object} data - Data from calendar event
		 * @returns {Object} Connector schedule object
		 */
		var prepareSched = function(data) {
			if (!data.rec_type) return

			var sched = recU.toSched(data.rec_type)
			var startDate = data.start_date ? moment(new Date(data.start_date)) : null
			var endDate = startDate ? moment(startDate).add(parseInt(data.event_length), 's') : null

			if (startDate) {
				sched.start_date = startDate.format(moment.dateFormat)
				sched.frequency.start_time = startDate.format(moment.timeFormat)
			}
			// If end date was changed
			if (endDate && data.event_length != '300') {
				sched.end_date = endDate.format(moment.dateFormat)
				sched.frequency.end_time = endDate.format(moment.timeFormat)
			}

			return sched
		}

		/**
		 * Returns appropriate response to calender.
		 *
		 * @param {*} err - Error
		 */
		var updateResponse = function(err){
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

		/**
		 * Creates a connector.
		 */
		var createConnector = function() {
			if (!data.text) updateResponse(new Err(ErrCode.NO_CON_NAME))
			else if (!data.config) updateResponse(new Err(ErrCode.NO_CON_CFG))
			else if (!data.destination) updateResponse(new Err(ErrCode.NO_CON_DEST))
			else {
				try { var config = JSON.parse(data.config) }
				catch(e) {
					updateResponse(new Err(ErrCode.FAIL_PARSE,
						{ error: 'Failed to parse config: ' + e }))
				}
				try { var destination = JSON.parse(data.destination) }
				catch(e) {
					updateResponse(new Err(ErrCode.FAIL_PARSE,
						{ error: 'Failed to parse destination: ' + e }))
				}

				iodU.createConnector(IOD, {
					connector: data.text,
					flavor: data.flavor,
					config: config,
					destination: destination,
					schedule: prepareSched(data),
					description: data.description
				}, updateResponse)
			}
		}

		/**
		 * Deletes a connector.
		 */
		var deleteConnector = function() {
			var name = data.text

			if (_.contains(name, ' - forever')) name = name.split(' - forever')[0]
			else if (_.contains(name, ' - occurrence')) name = name.split(' - occurrence')[0]
			else if (_.contains(name, ' - every')) name = name.split(' - every')[0]

			iodU.deleteConnector(IOD, name, updateResponse)
		}

//		if (mode == "updated") db.sched.updateById( sid, data, update_response)
		if (mode == "inserted") createConnector()
		else if (mode == "deleted") deleteConnector()
//		callback(null, { response: 'Not supported operation' })
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
	var occurrences = sched.occurrences || -1
	var start = moment.asDateTime(sched.start_date, freq.start_time)
	var end = moment.asDateTime(sched.end_date, freq.end_time)
	var intervalInMs = toMsInterval(freq.interval, freq.frequency_type)
	var durationInMs = duration ? duration*moment.SECOND.asMilliseconds() : null
	var prev = {}
	var connectorSchedList = []

	/**
	 * Set the `end_date` property for specified `conSched`.
	 * End date should be start_date + duration if duration exists or
	 * End date should just be start_date if duration does not exists.
	 *
	 * @param {Object} conSched - Connector schedule object
	 */
	var setEndDate = function(conSched) {
		if (duration) {
			conSched.end_date = new Date(conSched.start_date.getTime() + duration)
		}
		else conSched.end_date = conSched.start_date
	}

	/**
	 * Transform connector name according to:
	 *
	 * Add statement indicating that it runs forever.
	 * Add humanized interval string.
	 * Add humanized duration string.
	 *
	 * @returns {String} - Forever humanized string
	 */
	var transformConnectorName = function() {
		var intDuration = moment.duration(intervalInMs, 'ms')
		var durDuration = duration ? moment.duration(durationInMs, 'ms') : null
		var statement = connector.name

		if (end) statement += ' - every ' + moment.humanizeToTheMax(intDuration)
		else statement += ' - forever every ' + moment.humanizeToTheMax(intDuration)
		if (durDuration) statement += ' for ' + moment.humanizeToTheMax(durDuration)

		return statement
	}

	// On site connector
	if (!connector.config) return [new ConSched(connector).value(connector.name)]

	// No schedule set start_date and end_date to now
	if (!sched) return [new ConSched(connector).value(connector.name)]

	if (occurrences > 0) {
		for (var i=0; i < occurrences; i++) {
			var conSched = new ConSched(connector)
			conSched.name = connector.name + ' - occurrence: ' + (i+1)

			var prevStart = prev.start_date ? moment(prev.start_date) : null
			var prevEnd = prev.end_date ? moment(prev.end_date) : null

			// If first occurrences, start at startDate or start now
			if (!prevStart) {
				conSched.start_date = start ? start.toDate() : new Date()
				setEndDate(conSched)
			}
			else {
				var futureInterval = prevStart.add('ms', intervalInMs)

				// Next interval run time is before duration run time
				if (futureInterval.isBefore(prevEnd)) {
					// Add next interval to start_date
					prev.start_date = futureInterval.toDate()
					continue
				}
				// Next interval past the schedule end date
				else if (end && futureInterval.isAfter(end)) break
				else conSched.start_date = futureInterval.toDate()

				setEndDate(conSched)
			}

			connectorSchedList.push(conSched.value())
			prev = conSched.clone()
		}
	}
	else {
		var conSched = new ConSched(connector)
		conSched.name = transformConnectorName()
		conSched.start_date = start ? start.toDate() : new Date()
		conSched.end_date = end ? end.toDate() : new Date(9999, 1, 1)

		// No occurrences means either run forever or run until endDate
		connectorSchedList.push(conSched.value())
	}

	return connectorSchedList
})