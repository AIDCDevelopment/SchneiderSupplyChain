/*eslint-env node */
// ==================================
// Part 2 - incoming messages, look for type
// ==================================

var randStr = require('randstr');

var ibc = {};
var chaincode = {};
var async = require("async");

function formatDate(date, fmt) {
	date = new Date(date);
	function pad(value) {
		return (value.toString().length < 2) ? '0' + value : value;
	}
	return fmt.replace(/%([a-zA-Z])/g, function (_, fmtCode) {
		var tmp;
		switch (fmtCode) {
		case 'Y':								//Year
			return date.getUTCFullYear();
		case 'M':								//Month 0 padded
			return pad(date.getUTCMonth() + 1);
		case 'd':								//Date 0 padded
			return pad(date.getUTCDate());
		case 'H':								//24 Hour 0 padded
			return pad(date.getUTCHours());
		case 'I':								//12 Hour 0 padded
			tmp = date.getUTCHours();
			if(tmp == 0) tmp = 12;				//00:00 should be seen as 12:00am
			else if(tmp > 12) tmp -= 12;
			return pad(tmp);
		case 'p':								//am / pm
			tmp = date.getUTCHours();
			if(tmp >= 12) return 'pm';
			return 'am';
		case 'P':								//AM / PM
			tmp = date.getUTCHours();
			if(tmp >= 12) return 'PM';
			return 'AM';
		case 'm':								//Minutes 0 padded
			return pad(date.getUTCMinutes());
		case 's':								//Seconds 0 padded
			return pad(date.getUTCSeconds());
		case 'r':								//Milliseconds 0 padded
			return pad(date.getUTCMilliseconds(), 3);
		case 'q':								//UTC timestamp
			return date.getTime();
		default:
			throw new Error('Unsupported format code: ' + fmtCode);
		}
	});
}

module.exports.setup = function(sdk, cc){
	ibc = sdk;
	chaincode = cc;
};

module.exports.process_msg = function(ws, data, owner){

	if(data.type == "chainstats"){
		console.log("Chainstats msg");
		ibc.chain_stats(cb_chainstats);
	}
	else if(data.type == "createBatch"){
		console.log("Create Batch ", data, owner);

		if(data.batch){
			//bleamId = "6lf8vusdw";

			//var bleamNumber = "data.batch.bType";
      var bleamproduct = data.batch.bType.substring(0, 1);
			var btype;
      //bleamproduct = "3"

			if (bleamproduct == "1"){
			bleamId = "6if8vusdu";
			btype = "Electric Smart Panel";
		  }
			else if (bleamproduct == "2"){
			bleamId = "6if8vusdv";
			btype = "PowerTag";
		  }
			else if (bleamproduct == "3"){
			bleamId = "6if8vusdw";
			btype = "Triphase kWh meter";
			}
			else if (bleamproduct == "4"){
			bleamId = "6if8vusdx";
			btype = "Wiser Energy Counter";
			}
			else {
      bleamId = "ERREUR"; // A implementer
		  }

			batchId = bleamId + randStr(6);
			batchId = batchId.toUpperCase();
			chaincode.invoke.createBatch([batchId, btype, owner, data.batch.quantity, formatDate(new Date(), '%d-%M-%Y %I:%m%p'), data.batch.location], cb_invoked_createbatch);				//create a new paper

		 }
		/*
		if(data.batch){
			chaincode.invoke.createBatch([data.batch.id,data.batch.bType, owner, data.batch.quantity, data.batch.vDate, data.batch.location], cb_invoked_createbatch);				//create a new paper
		}
		*/
	}
	else if(data.type == "getBatch"){
		console.log("Get Batch", data.batchId);
		chaincode.query.getBatch([data.batchId], cb_got_batch);
	}
	else if(data.type == "getAllBatches"){
		console.log("Get All Batches", owner);
		chaincode.query.getAllBatches([owner], cb_got_allbatches);
	}

	function cb_got_batch(e, batch){
		if(e != null){
			console.log("Get Batch error", e);
		}
		else{
			sendMsg({msg: "batch", batch: JSON.parse(batch)});
		}
	}

	function cb_got_allbatches(e, allBatches){
		if(e != null){
			console.log("Get All Batches error", e);
		}
		else{
			sendMsg({msg: "allBatches", batches: JSON.parse(allBatches).batches});
		}
	}

	function cb_invoked_createbatch(e, a){
		console.log("response: ", e, a);
		if(e != null){
			console.log("Invoked create batch error", e);
		}
		else{
			console.log("batch ID #" + batchId)
			sendMsg({msg: "batchCreated", batchId: batchId});
		}


	}

	//call back for getting the blockchain stats, lets get the block height now
	var chain_stats = {};
	function cb_chainstats(e, stats){
		chain_stats = stats;
		if(stats && stats.height){
			var list = [];
			for(var i = stats.height - 1; i >= 1; i--){										//create a list of heights we need
				list.push(i);
				if(list.length >= 8) break;
			}
			list.reverse();																//flip it so order is correct in UI
			console.log(list);
			async.eachLimit(list, 1, function(key, cb) {								//iter through each one, and send it
				ibc.block_stats(key, function(e, stats){
					if(e == null){
						stats.height = key;
						console.log("sendMsg : " + "{msg: \"chainstats\", e: e, chainstats: chain_stats, blockstats: stats}");
						sendMsg({msg: "chainstats", e: e, chainstats: chain_stats, blockstats: stats});
					}
					cb(null);
				});
			}, function() {
			});
		}
	}

	//call back for getting a block's stats, lets send the chain/block stats
	function cb_blockstats(e, stats){
		if(chain_stats.height) stats.height = chain_stats.height - 1;
		sendMsg({msg: "chainstats", e: e, chainstats: chain_stats, blockstats: stats});
	}


	//send a message, socket might be closed...
	function sendMsg(json){
		if(ws){
			try{
				ws.send(JSON.stringify(json));
			}
			catch(e){
				console.log("error ws", e);
			}
		}
	}
};
