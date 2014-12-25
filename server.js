/**
 * Starts up connector-manager server.
 */

'use strict';

var nconf = require('nconf')

nconf.argv().env().file({ file: __dirname + "/config.json" })

var path = require('path')
var express = require('express')
var engine = require('ejs-locals')
var startServer = require('./start-server')
var middleware = require('./lib/middleware')

//create express app
var app = express()

// view engine setup
app.engine('ejs', engine)
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// use public folder for static files
app.use(express.static(path.join(__dirname, 'public')))

// is necessary for parsing POST request
app.use(middleware.bodyParser.urlencoded({ extended: false }))
app.use(middleware.bodyParser.json())

// Lower case and decode request parameters
app.use(middleware.lowerCaseParams)

startServer(app, function(err) {
	if (err) {
		if (err instanceof Error) throw err
		else throw new Error(JSON.stringify(err, null, 2))
	}
	else {
		app.listen(nconf.get('server:port'), function() {
			console.log('Connector Schedules listening on port: ',
				nconf.get('server:port'))
		})
	}
})