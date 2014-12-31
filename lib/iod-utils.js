/**
 * Utilities to talk to IOD.
 */

'use strict';

var _ = require('lodash')
var iod = require('iod')
var T = require('./transform')
var async = require('./async-ext')

var cache = {
	iod: null,
	apiKey: null,
	iodHost: null,
	iodPort: null
}

/**
 * Callback for iod utilities.
 * Transform error into an object with specified description `msg`.
 *
 * @param {String} msg - Description
 * @param {Function} callback - Callback(err, res)
 * @returns {Function} - Function(err, res)
 */
function iodCb(msg, callback) {
	return async.errFn(callback, function(err) {
		return {
			description: msg,
			error: err
		}
	})
}

/**
 * Gets IOD object either from cache or create a new one.
 * If apiKey, host or port has changed create a new IOD object.
 *
 * @param {String} apiKey - IOD ppi key
 * @param {String} iodHost - IOD host
 * @param {Integer} iodPort - IOD port
 * @param {Function} callback - Callback(err, IOD)
 */
exports.getIOD = function(apiKey, iodHost, iodPort, callback) {
	var cb = iodCb('Failed to create IOD object', callback)

	if (apiKey.toLowerCase() === cache.apiKey &&
		iodHost.toLowerCase() === cache.iodHost &&
		T.try(T.asNumber)(iodPort) === cache.iodPort &&
		cache.iod) callback(null, cache.iod)
	else iod.create(apiKey, iodHost, iodPort, async.doneFn(cb, function(IOD) {
		cache.iod = IOD
		cache.apiKey = apiKey
		cache.iodHost = iodHost
		cache.iodPort = iodPort
		return IOD
	}))
}

/**
 * Transforms index/connector list to only list of their names.
 */
var resourceT = T.seq([
	T.get('private_resources'),
	T.map(T.get('resource'))
])

/**
 * Sends 'listresources' action to get all connectors for specified IOD.
 *
 * @param {IOD} IOD - IOD object
 * @param {Function} callback - Callback(err, list of connectors)
 */
exports.getConnectors = function(IOD, callback) {
	var cb = iodCb('Failed to get list of connectors', callback)

	IOD.sync({
		majorVersion: IOD.VERSIONS.MAJOR.V1,
		apiVersion: IOD.VERSIONS.API.V1,
		action: IOD.ACTIONS.API.LISTRESOURCES,
		params: { type: ['connector'] }
	}, async.doneFn(cb, resourceT))
}

/**
 * Sends 'listresources' action to get all indexes for specified IOD.
 *
 * @param {IOD} IOD - IOD object
 * @param {Function} callback - Callback(err, list of index)
 */
exports.getIndexes = function(IOD, callback) {
	var cb = iodCb('Failed to get list of indexes', callback)

	IOD.sync({
		majorVersion: IOD.VERSIONS.MAJOR.V1,
		apiVersion: IOD.VERSIONS.API.V1,
		action: IOD.ACTIONS.API.LISTRESOURCES,
		params: { type: ['content'] }
	}, async.doneFn(cb, resourceT))
}

/**
 * Sends 'retrieveconfig' action to the user attributes for specified list of connectors.
 *
 * @param {IOD} IOD - IOD object
 * @param {Array} connectors - List of connectors
 * @param {Function} callback - Callback(err, list of connector attributes)
 */
// TODO: use job for multiple connectors
exports.fetchConnectorAttr = function(IOD, connectors, callback) {
	var cb = iodCb('Failed to get retrieve connector config', callback)

	async.map(T.maybeToArray(connectors), function(connector, connectorDone) {
		IOD.sync({
			majorVersion: IOD.VERSIONS.MAJOR.V1,
			apiVersion: IOD.VERSIONS.API.V1,
			action: IOD.ACTIONS.API.RETRIEVECONFIG,
			params: { connector: connector }
		}, async.doneFn(connectorDone, function(cfg) {
			var config = cfg.config
			delete(cfg.config)
			return _.defaults({}, cfg, config)
		}))
	}, cb)
}

/**
 * Sends a 'createtextindex' action. Creates index with specified `options`.
 *
 * @param {IOD} IOD - IOD object
 * @param {Object} options - {
 * 	index: Index name(String),
 * 	flavor: Index flavor(String),
 * 	description: Index description(String)
 * }
 * @param {Function} callback - Callback(err, created index msg)
 */
exports.createIndex = function(IOD, options, callback) {
	var cb = iodCb('Failed to create index', callback)

	IOD.sync({
		majorVersion: IOD.VERSIONS.MAJOR.V1,
		apiVersion: IOD.VERSIONS.API.V1,
		action: IOD.ACTIONS.API.CREATETEXTINDEX,
		params: {
			index: options.index,
			flavor: options.flavor,
			description: options.description
		}
	}, cb)
}

/**
 * Sends a 'createconnector' action. Creates connector with specified `options`.
 *
 * @param {IOD} IOD - IOD object
 * @param {Object} options - {
 * 	connector: Connector name(String),
 * 	flavor: Connector flavor(String),
 * 	config: Connector config(Object),
 *	destination: Connector destination(Object),
 *	schedule: Connector schedule(Object),
 * 	description: Connector description(String)
 * }
 * @param {Function} callback - Callback(err, created connector msg)
 */
exports.createConnector = function(IOD, options, callback) {
	var cb = iodCb('Failed to create connector', callback)

	IOD.sync({
		majorVersion: IOD.VERSIONS.MAJOR.V1,
		apiVersion: IOD.VERSIONS.API.V1,
		action: IOD.ACTIONS.API.CREATECONNECTOR,
		params: {
			connector: options.connector,
			flavor: options.flavor,
			config: options.config,
			destination: options.destination,
			schedule: options.schedule,
			description: options.description && options.description.length ?
				options.description : undefined
		}
	}, cb)
}

/**
 * Sends a 'deleteconnector' action.
 *
 * @param {IOD} IOD - IOD object
 * @param {String} connector - Connector name
 * @param {Function} callback - Callback(err, delete connector msg)
 */
exports.deleteConnector = function(IOD, connector, callback) {
	var cb = iodCb('Failed to delete connector', callback)

	IOD.sync({
		majorVersion: IOD.VERSIONS.MAJOR.V1,
		apiVersion: IOD.VERSIONS.API.V1,
		action: IOD.ACTIONS.API.DELETECONNECTOR,
		params: { connector: connector }
	}, cb)
}

/**
 * Sends a 'updateconnector' action. Updates connector with specified `params`.
 *
 * @param {IOD} IOD - IOD object
 * @param {Object} params - {
 * 	connector: Connector name(String),
 * 	config: Connector config(Object),
 *	destination: Connector destination(Object),
 *	schedule: Connector schedule(Object),
 * 	description: Connector description(String)
 * }
 * @param {Function} callback - Callback(err, created connector msg)
 */
exports.updateConnector = function(IOD, params, callback) {
	var cb = iodCb('Failed to update connector', callback)

	IOD.sync({
		majorVersion: IOD.VERSIONS.MAJOR.V1,
		apiVersion: IOD.VERSIONS.API.V1,
		action: IOD.ACTIONS.API.UPDATECONNECTOR,
		params: params
	}, cb)
}