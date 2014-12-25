/**
 * Utilities for recurring schedules.
 */

'use strict';

// TODO: support more frequency_types
/**
 * Maps recurrence type to function that transform into schedule object.
 */
var recTypeMap = {
	seconds: function(rec) {
		var sched = {
			frequency: {
				frequency_type: 'seconds',
				interval: rec.interval
			}
		}

		if (rec.occurrences && rec.occurrences >= 0) sched.occurrences = rec.occurrences
		return sched
	}
}

/**
 * Parses rec_type into a more useful object.
 *
 * @param {String} recType - Recurrence type string
 * @returns {Object} Parsed rec_type object
 */
exports.parseRecType = function(recType) {
	var recTypeParts =  recType.split('_')
	return {
		type: recTypeParts[0],
		count: recTypeParts[1],
		occurrences: recTypeParts[1],
		interval: recTypeParts[2],
		day: recTypeParts[2],
		count2: recTypeParts[3],
		days: recTypeParts[4] ? recTypeParts[4].split(',') : null,
		extra: recTypeParts[5]
	}
}

/**
 * Uses recTypeMap to create a schedule object according to recType.
 *
 * @param {String} recType - Recurrence type
 * @returns {Object} Connector schedule object
 */
exports.toSched = function(recType) {
	var rec = exports.parseRecType(recType)
	var parseRec = recTypeMap[rec.type]

	return parseRec && parseRec(rec)
}