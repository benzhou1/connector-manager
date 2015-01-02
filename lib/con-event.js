/**
 * Connector event class.
 */

'use strict';

var _ = require('lodash')
var uuid = require('uuid')
var moment = require('./moment-ext')

/**
 * Constructs a new ConEvent object.
 *
 * @param {Object} connector - Retrieve config details
 * @constructor
 */
var ConEvent = function(connector) {
	var conEvent = this
	conEvent.connector = connector

	conEvent.name = connector.name
	conEvent.flavor = connector.flavor
	conEvent.id = connector.name
	conEvent.start_date = new Date()
	conEvent.end_date = new Date()
	conEvent.config = connector.config
	conEvent.destination = connector.destination
	conEvent.schedule = connector.schedule
	conEvent.description = connector.description

	_.bindAll.apply(_, [conEvent].concat(_.functions(ConEvent.prototype)))
}

/**
 * Returns connector event properties in an object.
 * Converts config, destination, and schedule objects into json strings.
 *
 * @param {String} [name] - Optional, to override connector name before returning
 * @returns {Object} - Connector schedule values in an object
 */
ConEvent.prototype.value = function(name) {
	var conEvent = this

	return {
		id: conEvent.id,
		text: name || conEvent.name,
		flavor: conEvent.flavor,
		start_date: conEvent.start_date,
		end_date: conEvent.end_date,
		config: JSON.stringify(conEvent.config, null, 2),
		destination: JSON.stringify(conEvent.destination, null, 2),
		schedule: conEvent.schedule ? JSON.stringify(conEvent.schedule, null, 2) : undefined,
		description: conEvent.description
	}
}

/**
 * Creates a clone itself.
 *
 * @returns {ConEvent}
 */
ConEvent.prototype.clone = function() {
	var conEvent = this

	var clone = new ConEvent(conEvent.connector)
	clone.id = conEvent.id
	clone.start_date = conEvent.start_date
	clone.end_date = conEvent.end_date

	return clone
}

/**
 * Set the `end_date` property.
 * End date should be start_date + `durationInMs` if `durationInMs` exists or
 * End date should just be start_date if `durationInMs` does not exists.
 *
 * @param {Number} durationInMs - Duration in milliseconds
 */
ConEvent.prototype.setEndDate = function(durationInMs) {
	if (durationInMs) this.end_date = new Date(this.start_date.getTime() + durationInMs)
	else this.end_date = this.start_date
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
ConEvent.prototype.transformName = function(intervalInMs, durationInMs, end) {
	var intDuration = moment.duration(intervalInMs, 'ms')
	var durDuration = durationInMs ? moment.duration(durationInMs, 'ms') : null

	if (end) this.name += ' - every ' + moment.humanizeToTheMax(intDuration)
	else this.name += ' - forever every ' + moment.humanizeToTheMax(intDuration)
	if (durDuration) this.name += ' for ' + moment.humanizeToTheMax(durDuration)

	this.id = this.name
}

module.exports = ConEvent