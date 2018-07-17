/* global __dirname */
/*eslint-env node */
"use strict";
/* global process */
/*******************************************************************************
 * Copyright (c) 2015 IBM Corp.
 *
 * All rights reserved.
 *
 * Contributors:
 *   David Huffman - Initial implementation
 *******************************************************************************/
var express = require("express");
var router = express.Router();
var fs = require("fs");
var setup = require("../setup.js");
var path = require("path");
var ibc = {};
var chaincode = {};
var async = require("async");
var clientBatchId;
// Load our modules.
//var aux     = require("./site_aux.js");

var creds	= require("../user_creds.json");


// ============================================================================================================================
// Home
// ============================================================================================================================
router.route("/").get(function(req, res){
	check_login(res, req);
	res.render("part2", {title: "Supply Chain Demo", bag: {setup: setup, e: process.error, session: req.session}} );
});

router.route("/home").get(function(req, res){
	check_login(res, req);
	res.redirect("/dashboard");
});
router.route("/newBatch").get(function(req, res){
	check_login(res, req);
	res.render("part2", {title: "Supply Chain Demo", bag: {setup: setup, e: process.error, session: req.session}} );
});
router.route("/dashboard").get(function(req, res){
	check_login(res, req);
	res.render("part2", {title: "Supply Chain Demo", bag: {setup: setup, e: process.error, session: req.session}} );
});

router.route("/getBatch").post(function(req, res){
	console.log(JSON.stringify(req));
	chaincode.query.getBatch([req.body.batchId], function (e, batch){
		if(e != null){
			console.log("Get Batch error", e);
			res.send(e);
		}
		else{
			res.send(batch);
		}
	})
});

router.route("/claimBatch").post(function(req, res){
	console.log("claim --------------------------------");
	console.log(JSON.stringify(req.body));
	clientBatchId = req.body.batchId; //req.body.batchId
	chaincode.query.getAllBatches(["CERTIFIER"], function(e, allBatches){
		if(e != null){
			console.log("Get All Batches error", e);
		}
		else{
			//console.log(JSON.parse(allBatches).batches);
			//console.log("ELSE AVANT FOR");
			var myJson = JSON.parse(allBatches).batches;
			myJson.reverse();
			//console.log(myJson);
	  for(var id in myJson) {
			 console.log((myJson[id]).substring(0, 9));
		 if(clientBatchId == (myJson[id]).substring(0, 9) ){
		 console.log("FOUND A BATCH");
		 clientBatchId = myJson[id];
	     }
	    }
		}


  //console.log("AVANT CLAIM");
	chaincode.invoke.claimBatch([clientBatchId,req.body.user,req.body.date,req.body.location], function (e, resMsg){
		if(e != null){
			console.log("Claim Batch error", e);
			res.send(e);
		}
		else{
			res.send(resMsg);
		}
	})
})
});



router.route("/getAllBatches").post(function(req, res){
	console.log(JSON.stringify(req));
	chaincode.query.getAllBatches([req.body.user], function (e, resMsg){
		if(e != null){
			console.log("Get All Batch error", e);
			//res.send(e);
		}
		else{
			res.send(resMsg);
		}
	})
});

router.route("/getAllBatchesDetails").post(function(req, res){

	chaincode.query.getAllBatchesDetails([req.body.user], function (e, resMsg){
		if(e != null){
			console.log("Get All Batch Details error", e);
			//res.send(e);
		}
		else{
			res.send(resMsg);
		}
	})
});

router.route("/getNbItems").post(function(req, res){

	chaincode.query.getNbItems([req.body.user], function (e, resMsg){
		if(e != null){
			console.log("Get All Batch error", e);
			//res.send(e);
		}
		else{
			res.send(resMsg);
		}
	})
});


router.route("/transferBatch").post(function(req, res){

	chaincode.invoke.transferBatch([clientBatchId,req.body.user,req.body.date,req.body.location,req.body.newOwner,req.body.signature], function (e, resMsg){
		if(e != null){
			console.log("Transfer Batch error", e);
			//res.send(e);
		}
		else{
			res.send(resMsg);
		}
	})
});

router.route("/sellItem").post(function(req, res){
	//console.log([req.body.batchId,req.body.user,req.body.date,req.body.location,(req.body.quantity).toString(),req.body.newOwner]);
	chaincode.invoke.sellBatchItem([clientBatchId,req.body.user,req.body.date,req.body.location,(req.body.quantity).toString(),req.body.newOwner], function (e, resMsg){
		if(e != null){
			console.log("Sell Item error", e);
			//res.send(e);
		}
		else{
			res.send(resMsg);
		}
	})
});

router.route("/updateBatchQuality").post(function(req, res){
	chaincode.invoke.updateBatchQuality([req.body.user,req.body.date,req.body.location,req.body.msg], function (e, resMsg){
		if(e != null){
			console.log("Update Batch Quality error", e);
			//res.send(e);
		}
		else{
			res.send(resMsg);
		}
	})
});

router.route("/login").get(function(req, res){
	res.render("login", {title: "Login", bag: {setup: setup, e: process.error, session: req.session}} );
});

router.route("/logout").get(function(req, res){
	req.session.destroy();
	res.redirect("/login");
});

router.route("/:page").post(function(req, res){
	req.session.error_msg = "Invalid username or password";

	for(var i in creds){
		if(creds[i].username == req.body.username){
			if(creds[i].password == req.body.password){
				console.log("user has logged in", req.body.username);
				req.session.username = req.body.username;
				req.session.error_msg = null;

				// Roles are used to control access to various UI elements
				if(creds[i].role) {
					console.log("user has specific role:", creds[i].role);
					req.session.user_role = creds[i].role;
				} else {
					console.log("user role not specified, assuming:", "user");
					req.session.user_role = "user";
				}

				res.redirect("/newBatch");

				return;
			}
			break;
		}
	}
	res.redirect("/login");
});

module.exports = router;

//send a message, socket might be closed...

function check_login(res, req){
	if(!req.session.username || req.session.username == ""){
		console.log("! not logged in, redirecting to login");
		res.redirect("/login");
	}
}


module.exports.setup = function(sdk, cc){
	ibc = sdk;
	chaincode = cc;
};
