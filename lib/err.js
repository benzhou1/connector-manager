/**
 * Custom error class.
 */

'use strict';

var _ = require('lodash')

/**
 * Custom error class.
 *
 * @param {Number} code - Error code
 * @param {Object} [details] - Details for error
 * @constructor
 */
var Err = function(code, details) {
	var err = this

	err.reason = reason[code]
	if (!err.reason) throw new Error('Invalid error code found ' + code)
	if (details) err.details = details
	err.code = code

	_.bindAll.apply(_, [err].concat(_.functions(Err.prototype)))
}

/**
 * Return Err as an object.
 *
 * @param {String} [reason] - Override reason
 * @param {Object} [details] - Override details
 * @returns {{code: *, reason: *, details: *}}
 */
Err.prototype.print = function(reason, details) {
	var err = this
	var error = {
		code: err.code,
		reason: reason || err.reason
	}

	if (err.details) error.details = details || err.details
	return error
}

exports.Err = Err

/**
 * List of valid error codes.
 * Must contain corresponding reason.
 */
exports.CODE = {
	NO_API_KEY: 1000,
	NO_IOD_HOST: 1001,
	NO_IOD_PORT: 1002,
	NO_CON_NAME: 1003,
	NO_CON_CFG: 1004,
	NO_CON_DEST: 1005,
	FAIL_PARSE: 1006

}

/**
 * List of reasons for each valid error code.
 * Must contain corresponding code.
 */
var reason = {
	'1000': 'Missing api key!',
	'1001': 'Missing iod host!',
	'1002': 'Missing iod port!',
	'1003': 'Connector Name is required!',
	'1004': 'Connector config is required!',
	'1005': 'Connector destination is required!',
	'1006': 'Failed to parse JSON!'
}