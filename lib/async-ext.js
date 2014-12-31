/**
 * Extended utilities to async module.
 */

'use strict';

var _ = require('lodash')
var async = module.exports = require('async')

/**
 * Given a callback `cb` and a function `fn` return a function(err, res) that accepts
 * an error `err` and a result `res`.
 * If `err` is found then callback `cb` immediately with `err`.
 * If no `err` then then callback `cb` with results returned from applying `res` to `fn`.
 *
 * @param {Function} cb - Main callback function
 * @param {Function} fn - Function to call upon no `err`
 * @returns {Function} - Function(err, res)
 */
async.doneFn = function(cb, fn) {
	return function(err, res) {
		if (err) cb(err)
		else cb(null, fn(res))
	}
}

/**
 * Given a callback `cb` and a function `fn` return a function(err, res) that accepts
 * an error `err` and a result `res`.
 * If `err` is found then callback `cb` immediately with results returned from applying
 * `err` to `fn`.
 * If no `err` then then callback `cb` with results `res`.
 *
 * @param {Function} cb - Main callback function
 * @param {Function} fn - Function to call upon no `err`
 * @returns {Function} - Function(err, res)
 */
async.errFn = function(cb, fn) {
	return function(err, res) {
		if (err) cb(fn(err))
		else cb(null, res)
	}
}

/**
 * Given a callback `cb` and a function `fn` returns a function(err, res) that accepts
 * an error `err` and a result `res`.
 * If `err` is found then apply `err` to `errFn`.
 * If no `err` then apply `res` to `successFn`.
 *
 * @param {Function} successFn - Function to be called on success
 * @param {Function} errFn - Function to be called on error
 * @returns {Function} - Function(err, res)
 */
async.split = function(successFn, errFn) {
	return function(err, res) {
		if (err) errFn(err)
		else successFn(res)
	}
}

/**
 * All functions below are recommended use with async.waterfall.
 * Not recommended for other async control-flow functions because callback is
 * usually the first argument instead of the last.
 */

/**
 * Returns a function that accepts variable number of arguments where callback is
 * expected to be the last argument.
 * Calls callback with no error or results.
 *
 * @params ...
 */
async.noop = async.apply(function() {
	var args = [].slice.call(arguments)
	var cb = args.pop()
	cb()
})

/**
 * Returns a function that accepts variable number of arguments where callback is
 * expected to be the last argument.
 * Calls callback with no error and the first argument received as the result.
 *
 * @param {...*} arg
 */
async.constant = function(arg) {
	var args = [].slice.call(arguments)
	var cb = args.pop()
	cb(null, args[0])
}

/**
 * With given check `when`, return `left` function if check is true and return
 * `right` function if check is false.
 *
 * If `right` function is not specified, default to noop.
 *
 * Recommended use with async.waterfall because of default noop. When specifying `right`
 * can use with any async control-flow function.
 */
async.when = function(when, left, right) {
	if (when) return left
	else return right || async.noop
}

/**
 * Given a function `fn`, returns a function that accepts variable number of arguments
 * where callback is expected to be the last argument.
 * Calls callback with no error and results returned from applying arguments to `fn`
 *
 * @param {Function} fn - Function to be called with arguments
 * @returns {Function} - Function(...)
 */
async.fromFn = function(fn) {
	return function() {
		var args = [].slice.call(arguments)
		var cb = args.pop()

		cb(null, fn.apply(null, args))
	}
}