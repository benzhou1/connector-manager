/**
 * Connector schedule class.
 */

'use strict';

var _ = require('lodash')
var uuid = require('uuid')

/**
 * Constructs a new ConSched object.
 *
 * @param {Object} connector - Retrieve config details
 * @constructor
 */
var ConSched = function(connector) {
	var conSched = this
	conSched.connector = connector

	conSched.name = connector.name
	conSched.flavor = connector.flavor
	conSched.id = uuid.v4()
	conSched.start_date = new Date()
	conSched.end_date = new Date()
	conSched.config = connector.config
	conSched.destination = connector.destination
	conSched.schedule = connector.schedule
	conSched.description = connector.description

	_.bindAll.apply(_, [conSched].concat(_.functions(ConSched.prototype)))
}

/**
 * Returns connector schedule values in an object.
 * Converts config, destination, and schedule objects into json strings.
 *
 * @param {String} name - Optional, to override connector name before returning
 * @returns {Object} - Connector schedule values in an object
 */
ConSched.prototype.value = function(name) {
	var conSched = this

	return {
		id: conSched.id,
		text: name || conSched.name,
		flavor: conSched.flavor,
		start_date: conSched.start_date,
		end_date: conSched.end_date,
		config: JSON.stringify(conSched.config, null, 2),
		destination: JSON.stringify(conSched.destination, null, 2),
		schedule: conSched.schedule ? JSON.stringify(conSched.schedule, null, 2) : undefined,
		description: conSched.description
	}
}

/**
 * Creates a clone itself.
 *
 * @returns {ConSched}
 */
ConSched.prototype.clone = function() {
	var conSched = this

	var clone = new ConSched(conSched.connector)
	clone.id = conSched.id
	clone.start_date = conSched.start_date
	clone.end_date = conSched.end_date

	return clone
}

/**
 * Set the `end_date` property.
 * End date should be start_date + `durationInMs` if `durationInMs` exists or
 * End date should just be start_date if `durationInMs` does not exists.
 *
 * @param {Number} durationInMs - Duration in milliseconds
 */
ConSched.prototype.setEndDate = function(durationInMs) {
	if (durationInMs) this.end_date = new Date(this.start_date.getTime() + durationInMs)
	else this.end_date = this.start_date
}

ConSched.prototype.transformName = function() {
	var intDuration = moment.duration(intervalInMs, 'ms')
	var durDuration = duration ? moment.duration(durationInMs, 'ms') : null
	var statement = connector.name

	if (end) statement += ' - every ' + moment.humanizeToTheMax(intDuration)
	else statement += ' - forever every ' + moment.humanizeToTheMax(intDuration)
	if (durDuration) statement += ' for ' + moment.humanizeToTheMax(durDuration)

	return statement
}

module.exports = ConSched