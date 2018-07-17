/*eslint-env node */
/* global process */
/*******************************************************************************
	Configure your environment
 *******************************************************************************/
/*
* Bluemix environment
*/
//var cfenv = require('cfenv');
//var appEnv = cfenv.getAppEnv();
//var host =  appEnv.bind;
//var port = appEnv.port;

/*
* Local environment
*/
var host =  "localhost";
var port = "8080"

/*
* External url
*/
var vcap_app = {application_uris: [ host + ":" + port ]};
var ext_uri = vcap_app.application_uris[0];

exports.SERVER = 	{
							HOST:host,
							PORT: port,
							DESCRIPTION: 'Bluemix environment',
							EXTURI: ext_uri,
						 };

exports.SERVER.vcap_app = vcap_app;
exports.DEBUG = vcap_app;
exports.USER1 = 'bob';
exports.USER2 = 'leroy';
