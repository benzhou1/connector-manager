/**
 * Extended utilities to moment module.
 */

var moment = module.exports = require('moment')

moment.SECOND = moment.duration(1, 'seconds')
moment.MINUTE = moment.duration(1, 'minutes')
moment.HOUR = moment.duration(1, 'hours')
moment.DAY = moment.duration(1, 'days')
moment.WEEK = moment.duration(1, 'weeks')
moment.MONTH = moment.duration(1, 'months')

// TODO: wait for change in schedule format
moment.dateFormat = 'MM-DD-YYYY Z'
moment.timeFormat = 'HH:mm:ss Z'

moment.dateFormats = [
	'MM-DD-YYYY', 'YYYY-MM-DD',
	'MM-DD-YYYY Z', 'YYYY-MM-DD Z',
	'MM-DD-YYYY ZZ', 'YYYY-MM-DD ZZ'
]
moment.dateTimeFormats = [
	'MM-DD-YYYY HH:mm:ss Z', 'YYYY-MM-DD HH:mm:ss Z',
	'MM-DD-YYYY HH:mm:ss ZZ', 'YYYY-MM-DD HH:mm:ss ZZ',
	'MM-DD-YYYY HH:mm:ss', 'YYYY-MM-DD HH:mm:ss'
]
moment.timeFormats = ['HH:mm:ss Z', 'HH:mm:ss ZZ', 'HH:mm:ss']

/**
 * Returns moment validation failure message.
 *
 * @param str {string} Date string
 * @param format {array} List of allowed formats
 * @returns {string} Fail message
 */
function momentError(str, format) {
	return 'Expected `' + str + '` to have the following date format: ' + format
}

/**
 * Transform date only string to Moment object.
 *
 * @param str {string} Date only string
 * @throws {Error} If date only string has invalid format
 * @returns {object} Moment object
 */
moment.asDate = function(str) {
	var dateFormats = moment.dateFormats
	var date = moment(str, dateFormats, true)

	if (!date.isValid()) throw new Error(momentError(str, dateFormats))
	else return date
}

/**
 * Transform time and timezone string to Moment object.
 *
 * @param str {string} Time and timezone only string
 * @throws {Error} If time and timezone only string has invalid format
 * @returns {object} Moment object
 */
moment.asTime = function(str) {
	var timeFormats = moment.timeFormats
	var date = moment(str, timeFormats, true)

	if (!date.isValid()) throw new Error(momentError(str, timeFormats))
	else return date
}

/**
 * Combine date string and time string together.
 * Remove timezone from dateStr if timeStr also contains timezone.
 *
 * @param dateStr {string} Date only string
 * @param timeStr {string} Time only string
 * @returns {string} Combined date and time string
 */
moment.toDateTimeString = function(dateStr, timeStr) {
	/**
	 * Check if string contains local time zone.
	 *
	 * @param str {string} Date or time string
	 * @returns {boolean} True if string contains time zone
	 */
	var hasTimeZone = function(str) {
		return (str.split(' ')[1] && str.split(' ')[1][0] === '-')
	}

	if (dateStr && timeStr && hasTimeZone(dateStr) && hasTimeZone(timeStr)) {
		var withOutZ = dateStr.split(' ')[0]
		return withOutZ + ' ' + timeStr
	}
	else if (dateStr && timeStr && hasTimeZone(dateStr) && !hasTimeZone(timeStr)) {
		var date = dateStr.split(' ')
		return date[0] + ' ' + timeStr + ' ' + date[1]
	}
	else return (dateStr || '') + ' ' + (timeStr || '')
}

/**
 * Transform date only string and time and timezone only string
 * into Moment object.
 * If only one string is specified, transform that one string only.
 *
 * @param dateStr {string} Date only string
 * @param timeStr {string} Time and timezone only string
 * @returns {object} Moment Object
 */
moment.asDateTime = function(dateStr, timeStr) {
	var dateTimeFormats = moment.dateTimeFormats
	var dateMom = dateStr ? moment.asDate(dateStr) : null
	var timeMom = timeStr ? moment.asTime(timeStr) : null

	if (dateMom && timeMom) {
		var dateTimeStr = moment.toDateTimeString(dateStr, timeStr)
		var date = moment(dateTimeStr, dateTimeFormats, true)

		if (!date.isValid()) throw new Error(momentError(dateTimeStr, dateTimeFormats))
		else return date
	}
	else if (dateMom) return dateMom
	else if (timeMom) return timeMom
	else return null
}

/**
 * Adds two moments together.
 *
 * @param {moment} momA - Moment A
 * @param {moment} momB - Moment B
 * @returns {moment}
 */
moment.plus = function(momA, momB) {
	return moment(new Date(momA.toDate().getTime() + momB.toDate().getTime()))
}

/**
 * Subtracts moment B from moment A.
 *
 * @param {moment} momA - Moment A
 * @param {moment} momB - Moment B
 * @returns {moment}
 */
moment.minus = function(momA, momB) {
	return moment(new Date(momA.toDate().getTime() - momB.toDate().getTime()))
}

/**
 * Creates a humanized duration string. Starts from the largest time duration(years) and
 * recursively decreases until the smallest time duration(seconds).
 *
 * @param duration {object} Moment duration object.
 * @returns {string} Humanized duraition string
 */
moment.humanizeToTheMax = function(duration) {
	var recur = function(duration) {
		var years = Math.floor(duration.asYears())
		var months = Math.floor(duration.asMonths())
		var weeks = Math.floor(duration.asWeeks())
		var days = Math.floor(duration.asDays())
		var hours = Math.floor(duration.asHours())
		var minutes = Math.floor(duration.asMinutes())
		var seconds = Math.floor(duration.asSeconds())

		if (years > 0) {
			return years + (years > 1 ? ' years, ' : ' year, ') +
				recur(duration.subtract(years, 'years'))
		}
		else if (months > 0) {
			return months + (months > 1 ? ' months, ' : ' month, ') +
				recur(duration.subtract(months, 'months'))
		}
		else if (weeks > 0) {
			return weeks + (weeks > 1 ? ' weeks, ' : ' week, ') +
				recur(duration.subtract(weeks, 'weeks'))
		}
		else if (days > 0) {
			return days + (days > 1 ? ' days, ' : ' day, ') +
				recur(duration.subtract(days, 'days'))
		}
		else if (hours > 0) {
			return hours + (hours > 1 ? ' hours, ' : ' hour, ') +
				recur(duration.subtract(hours, 'hours'))
		}
		else if (minutes > 0) {
			return minutes + (minutes > 1 ? ' minutes, ' : ' minute, ') +
				recur(duration.subtract(minutes, 'minutes'))
		}
		else if (seconds > 0) {
			return seconds + (seconds > 1 ? ' seconds, ' : ' second, ') +
				recur(duration.subtract(seconds, 'seconds'))
		}
		else return ''
	}

	var humanStr = recur(duration).split(',')

	// appends `and` string to last duration and removes `,`
	if (humanStr.length >= 2) {
		var last = humanStr[humanStr.length-1]

		if ((humanStr.length === 2 && last !== ' ') ||
			humanStr.length > 2) {
			humanStr[humanStr.length-2] = ' and' + humanStr[humanStr.length-2]
		}
		humanStr.pop()
		return humanStr.join(',')
	}
	// removes `,`
	else return humanStr.join(',').slice(0, -2)
}