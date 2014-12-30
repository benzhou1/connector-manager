/**
 * Transform utilities.
 */

'use strict';

var _ = require('lodash')

/**
 * Given a property name `propName` return Function(v) that accepts a value `v`, then
 * return a new object with one property `propName` with value `v`.
 *
 * @param {String} propName - Property name
 * @returns {Function} - Function(v)
 */
exports.maplet = function(propName) {
	return function(v) {
		var obj = {}
		obj[propName] = v
		return obj
	}
}

/**
 * Given specified object key `prop`, returns a function(v) that accepts an object `v`.
 * Attempts to extract value from object `v` for property `prop`.
 * If not found throw an error.
 *
 * @param {String} prop - Object property name
 * @returns {Function} - Function(v)
 * @throws {Error} - If property not found in object
 */
exports.get = function(prop) {
	return function(v) {
		var val =  v[prop]

		if (val == null) throw new Error('Key not found: ' + prop)
		else return val
	}
}

/**
 * Given value `v`, attempt to convert it into an array.
 *
 * @param {*} v - Any value
 * @returns {Array}
 */
exports.maybeToArray = function(v) {
	if (!v) return []
	else if (_.isArray(v)) return v
	else return [v]
}

/**
 * Given value `v`, if `v` is a singleton array, return it's first element.
 * Otherwise return `v`.
 *
 * @param {*} v - Any value
 * @returns {*} - First element in array or original value
 */
exports.maybeFromArray = function(v) {
	if (_.isArray(v) && _.size(v) === 1) return v[0]
	else return v
}

/**
 * Compacts an object `obj` at the first level only.
 *
 * Modifies object in place.
 *
 * @param {Object} obj - Object to compact
 * @returns {Object} - Compacted object
 */
exports.compactObj = function(obj) {
	if (!_.isObject) return obj
	else {
		_.each(obj, function(val, key) {
			if (val == null) delete obj[key]
		})

		return obj
	}
}

/**
 * Converts specified `v` into a string.
 * For objects use JSON.stringify.
 * For arrays convert every element into a string.
 *
 * @param {*} v - Some value
 * @returns {string | array}
 */
exports.toString = function(v) {
	var toStr = function(val) {
		if (_.isObject(val)) return JSON.stringify(val)
		else return val.toString()
	}

	if (_.isArray(v)) return exports.maybeFromArray(_.map(v, toStr))
	else return toStr(v)
}

/**
 * Given a function `f` and a default value `def`, returns a function(...) that accepts
 * a variable number of arguments.
 * Attempts to return value returned from applying arguments to `fn`.
 * If `fn` throws an error, return default value `def` instead.
 *
 * @param {Function} fn - Function to apply arguments to
 * @param {*} [def] - Default value if `fn` throws.
 * @returns {Function} - Function(...)
 */
exports.attempt = function (fn, def) {
	return function() {
		try { return fn.apply(this, arguments) }
		catch (e) { return def }
	}
}

/**
 * Given a function `fn`, returns a function(v) that accepts a value `v`.
 * Attempts to return value returned from applying `v` to funciton `fn`.
 * If `fn` throws and error then `v` is returned instead.
 *
 * @param {Function} fn - Function to apply `v` to
 * @returns {Function} - Function(v)
 */
exports.try = function (fn) {
	return function(v) {
		return exports.attempt(fn, v)(v)
	}
}

/**
 * Given specified array of functions `arrFn`, returns a function(v) that accepts a
 * value `v.
 * Apply `v` to the first function in `arrFn` and then apply the results of that to the
 * next function in `arrFn` and so on.
 * Returns the results from the last function call in `arrFn`
 *
 * @param {Array} arrFn - Array of functions to call in sequence
 * @returns {Function} - Function(v)
 */
exports.seq = function(arrFn) {
	return function(v) {
		var clone = _.cloneDeep(arrFn)
		return _.compose.apply(_, clone.reverse())(v)
	}
}

/**
 * Given specified value `v`, attempt to convert it into a number.
 * Throws an error if unable to do so.
 *
 * @param {*} v - Any value
 * @returns {Number}
 * @throws {Error} - If unable to convert `v` to number
 */
exports.asNumber = function(v) {
	if (_.isFinite(v)) return Number(v)
	else throw new Error(v + ' can not be transformed to a number.')
}

/**
 * Given specified value `v`, attempt to convert it to a boolean.
 * Throws an error if unable to do so.
 *
 * @param {*} v - Any value
 * @returns {Boolean}
 * @throws {Error} - If unable to convert `v` to boolean
 */
exports.asBoolean = function(v) {
	if (v === true || v === false) return v
	else if (v.toString().toLowerCase().trim() === 'true') return true
	else if (v.toString().toLowerCase().trim() === 'false') return false
	else throw new Error(v + '  can not be transformed to a boolean.')
}

/**
 * Given an array of object property names `objPath`, returns a function(v) that accepts
 * an object `v`.
 * Walks the object `v` following the properties in `objPath`.
 *
 * @param {Array} objPath - Array of object property names
 * @returns {Function} - Function(v)
 */
exports.walk = function(objPath) {
	return function(v) {
		return exports.seq(_.map(objPath, function(path) {
			return exports.get(path)
		}))(v)
	}
}

/**
 * Given specified function `fn` that accepts the elements of the array as the first
 * argument, map `fn` over the array `arr`.
 *
 * @param {Function} fn - Fn(arr[i])
 * @returns {Function} - Function(arr)
 */
exports.map = function(fn) {
	return function(arr) {
		return _.map(arr, fn)
	}
}