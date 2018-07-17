/*eslint-env browser */
/* global clear_blocks */
/* global formatMoney */
/* global in_array */
/* global new_block */
/* global formatDate */
/* global nDig */
/* global randStr */
/* global bag */
/* global $ */

var ws = {};
var user = {username: bag.session.username};
var valid_users = ["CERTIFIER","SUPPLIER1","SUPPLIER2"];
var panels = [
	{
		name: "dashboard",
		formID: "dashboardFilter",
		tableID: "#dashboardBody",
		filterPrefix: "dashboard_"
	}
];
var lastTx = ''

// =================================================================================
// On Load
// =================================================================================
$(document).on('ready', function() {
	connect_to_server();
	if(user.username)
	{
		$("#userField").html(user.username+ ' ');
	}

	// Customize which panels show up for which user
	$(".nav").hide();
	//console.log("user role", bag.session.user_role);

	// Only show tabs if a user is logged in
	if(user.username) {
		// Display tabs based on user's role
		if(bag.session.user_role && bag.session.user_role.toUpperCase() === "certifier".toUpperCase()) {
			$("#dashboardLink").show();
			$("#dashboardPanel").show();
			$("#newBatchLink").hide();
			$("#newBatchPanel").hide();
			$("#batchDetailsTable").hide();

		} else if(user.username) {
			$("#newBatchLink").show();
			$("#newBatchPanel").show();
			$("#dashboardLink").show();
			$("#dashboardPanel").hide();
		}

	}

	// =================================================================================
	// jQuery UI Events
	// =================================================================================
/*
	$("#generate").click(function(){
		if(user.username){
			$("input[name='BatchId']").val(randStr(15).toUpperCase());
			$("input[name='Date']").val(formatDate(new Date(), '%d-%M-%Y %I:%m%p'));
			$("input[name='Quantity']").val(10);
			$("#submit").removeAttr("disabled");
		}

		return false;
	});
*/

	$("#submit").click(function(){
		if(user.username){
			var obj = 	{
							type: "createBatch",
							batch: {
								//id: $("input[name='BatchId']").val(),
								bType: $("select[name='Type']").val(),
								quantity: $("input[name='Quantity']").val(),
								location: $("input[name='Location']").val(),
								//vDate: $("input[name='Date']").val()
							}
						};

			//if(obj.batch && obj.batch.id){
				console.log('creating batch, sending', obj);
				ws.send(JSON.stringify(obj));
				$(".panel").hide();
				$('#batchTag').html('');
				$('#spinner').show();
				$('#tagWrapper').hide();
				$("#batchTagPanel").show();
				//$("input[name='BatchId']").val('');
				$("input[name='Quantity']").val('10');
				//$("input[name='Date']").val('')
				//$("#submit").prop('disabled', true);
			//}
		}
		return false;
	});

	$("#newBatchLink").click(function(){
		$("#batchTagPanel").hide();
		$("#newBatchPanel").show();
	});

	$("#dashboardLink").click(function(){
		if(user.username) {
			$('#spinner2').show();
			$('#openTrades').hide();
			ws.send(JSON.stringify({type: "getAllBatches", v: 2}));
		}
	});

	//login events
	$("#whoAmI").click(function(){													//drop down for login
		if($("#loginWrap").is(":visible")){
			$("#loginWrap").fadeOut();
		}
		else{
			$("#loginWrap").fadeIn();
		}
	});

	// Filter the trades whenever the filter modal changes
	$(".dashboard-filter").keyup(function() {
		"use strict";
		console.log("Change in filter detected.");
		processFilterForm(panels[0]);
	});

	var e = formatDate(new Date(), '%d/%M/%Y &nbsp;%I:%m%P');
	$("#blockdate").html('<span style="color:#D4DCDC">TIME</span>&nbsp;&nbsp;' + e + ' UTC');

	setInterval(function() {
		var e = formatDate(new Date(), '%d/%M/%Y &nbsp;%I:%m%P');
		$("#blockdate").html('<span style="color:#D4DCDC">TIME</span>&nbsp;&nbsp;' + e + ' UTC');

	}, 60000);



	$("#dashboardTable").on('click', 'tr', function() {
	    var bId = $(this).find('td:first').text() ;
			if(bId != "")
	    	ws.send(JSON.stringify({type: "getBatch", batchId: bId}));
	});


	//pic change


});


// =================================================================================
// Helper Fun
// =================================================================================
function escapeHtml(str) {
	var div = document.createElement('div');
	div.appendChild(document.createTextNode(str));
	return div.innerHTML;
};

// =================================================================================
// Socket Stuff
// =================================================================================
function connect_to_server(){

	var connected = false;
	connect();

	function connect(){
		console.log("ws://" + bag.setup.SERVER.EXTURI);

		var wsUri = "ws://" + window.location.host ; //bag.setup.SERVER.EXTURI;
		ws = new WebSocket(wsUri);
		ws.onopen = function(evt) { onOpen(evt); };
		ws.onclose = function(evt) { onClose(evt); };
		ws.onmessage = function(evt) { onMessage(evt); };
		ws.onerror = function(evt) { onError(evt); };
	}

	function onOpen(evt){
		console.log("WS CONNECTED");
		connected = true;
		clear_blocks();
		$("#errorNotificationPanel").fadeOut();
		ws.send(JSON.stringify({type: "chainstats", v:2}));
		if(user.username && bag.session.user_role && bag.session.user_role.toUpperCase() === "certifier".toUpperCase()) {
			$('#spinner2').show();
			$('#openTrades').hide();
			ws.send(JSON.stringify({type: "getAllBatches", v: 2}));
		}

	}

	function onClose(evt){
		console.log("WS DISCONNECTED", evt);
		connected = false;
		setTimeout(function(){ connect(); }, 5000);					//try again one more time, server restarts are quick
	}

	function onMessage(msg){
		try{
			var data = JSON.parse(msg.data);
			console.log(data);
			if(data.msg === 'allBatches'){
				console.log("---- ", data);
				build_Batches(data.batches, null);
				$('#spinner2').hide();
				$('#openTrades').show();
			}
			else if(data.msg === 'batch'){
				console.log(data);
				var txs = data.batch.transactions;
				var html = ''
				$("#batchDetailsTable").show();
				for(var i=0; i<txs.length; i++){
					console.log(txs[i]);
					$("#bDetHeader").html("BATCH #" + data.batch.id + ' - <span style="font-size:16px;font-weight:500">' + data.batch.bType + '</span>');


					if(txs[i].ttype == "CREATE"){
			          //litem = {avatar:"ion-ios-box-outline", date: tx.vDate, location: tx.location, desc:"ADDED BY ", owner:tx.owner};
				        html += '<tr>';
						html +=	'<td>';
						html +=	'<div style="font-size: 34px;color:#5596E6;float:right;"><i class="icon ion-ios-box-outline"></i></div>';
						html += '</td>';
						html += '<td style="text-align:left;padding-left:20px">';
						html +=	'<div style="display: inline-block; vertical-align: middle;">';
						html += '<p style="font-weight:500;">ADDED BY <span style="color:#5596E6">' + txs[i].owner +'</span></p>';
						html += '<p style="">' + txs[i].vDate +'</p>';
						html += '<p style="">' + txs[i].location +'</p>';
						html += '<p style="">Qty: ' + txs[i].quantity +'</p>';
						html +=	'</div>';
						html += '</td>';
						html += '</tr>';
			        }
			        else if(txs[i].ttype == "CLAIM"){
			          //litem = {avatar:"ion-ios-barcode-outline", date: data.batch.vDate, location: data.batch.location, desc:"PICKED UP BY ", owner:data.batch.owner};
			        	html += '<tr>';
						html +=	'<td>';
						html +=	'<div style="font-size: 34px;color:#5596E6;float:right;"><i class="ion-ios-barcode-outline"></i></div>';
						html += '</td>';
						html += '<td style="text-align:left;padding-left:20px">';
						html +=	'<div style="display: inline-block; vertical-align: middle;">';
						html += '<p style="font-weight:500;">PICKED UP BY <span style="color:#5596E6">' + txs[i].owner +'</span></p>';
						html += '<p style="">' + txs[i].vDate +'</p>';
						html += '<p style="">' + txs[i].location +'</p>';
						html += '<p style="">Qty: ' + txs[i].quantity +'</p>';
						html +=	'</div>';
						html += '</td>';
						html += '</tr>';
			        }
			        else if(txs[i].ttype == "TRANSFER"){
			          //litem = {avatar:"ion-ios-shuffle", date: data.batch.vDate, location: data.batch.location, desc:"DELIVERED TO ", owner:data.batch.owner};
			        	html += '<tr>';
						html +=	'<td>';
						html +=	'<div style="font-size: 34px;color:#5596E6;float:right;"><i class="ion-ios-shuffle"></i></div>';
						html += '</td>';
						html += '<td style="text-align:left;padding-left:20px">';
						html +=	'<div style="display: inline-block; vertical-align: middle;">';
						html += '<p style="font-weight:500;">DELIVERED TO <span style="color:#5596E6">' + txs[i].owner +'</span></p>';
						html += '<p style="">' + txs[i].vDate +'</p>';
						html += '<p style="">' + txs[i].location +'</p>';
						html += '<p style="">Qty: ' + txs[i].quantity +'</p>';
						html += '<p style="">Recipient\'s Signature:</p>';
						html += '<img alt="sign" style="border:1px #D4DCDC solid;" src="' + txs[i].signature + '" />'
						html +=	'</div>';
						html += '</td>';
						html += '</tr>';
			        }
			        else if(txs[i].ttype == "SELL"){
			          //litem = {avatar:"ion-ios-cart-outline", date: data.batch.vDate, location: data.batch.location, desc:"SOLD TO ", owner:data.batch.owner};
			        	html += '<tr>';
						html +=	'<td>';
						html +=	'<div style="font-size: 34px;color:#5596E6;float:right;"><i class="ion-wrench"></i></div>';
						html += '</td>';
						html += '<td style="text-align:left;padding-left:20px">';
						html +=	'<div style="display: inline-block; vertical-align: middle;">';
						if(txs[i].quantity<=1){
							html += '<p style="font-weight:500;">PLUG <span style="color:#5596E6">' + txs[i].quantity +'</span> ITEM TO <span style="color:#5596E6">' + txs[i].owner +'</span></p>';
						}else {
							html += '<p style="font-weight:500;">PLUG <span style="color:#5596E6">' + txs[i].quantity +'</span> ITEMS TO <span style="color:#5596E6">' + txs[i].owner +'</span></p>';
						}
						html += '<p style="">' + txs[i].vDate +'</p>';
						html += '<p style="">' + txs[i].location +'</p>';
						html +=	'</div>';
						html += '</td>';
						html += '</tr>';
			        }
			        else if(txs[i].ttype == "UPDATE QUALITY"){
			          //litem = {ttype:data.batch.ttype, avatar:"ion-ios-bolt-outline", date: data.batch.vDate, location: data.batch.location, desc:"QUALITY IMPACTED DUE TO HIGH T°", owner:""};
			        	html += '<tr>';
						html +=	'<td>';
						html +=	'<div style="font-size: 34px;color:#ef473a;float:right;"><i class="ion-ios-bolt-outline"></i></div>';
						html += '</td>';
						html += '<td style="text-align:left;padding-left:20px">';
						html +=	'<div style="display: inline-block; vertical-align: middle;">';
						html += '<p style="font-weight:500;color:#ef473a">QUALITY IMPACTED</p>';
						html += '<p style="">' + txs[i].vDate +'</p>';
						html += '<p style="">' + txs[i].location +'</p>';
						html += '<p style="">Qty: ' + txs[i].quantity +'</p>';
						html += '<p style="">Quality: ' + txs[i].quality +'</p>';
						html +=	'</div>';
						html += '</td>';
						html += '</tr>';
			        }

				}

				$("#batchDetailsBody").html(html);
			}
			else if(data.msg === 'chainstats'){
				if(data.blockstats.transactions)
				{
					var e = formatDate(data.blockstats.transactions[0].timestamp.seconds * 1000, '%M/%d/%Y &nbsp;%I:%m%P');
					//$("#blockdate").html('<span style="color:#fff">LAST BLOCK</span>&nbsp;&nbsp;' + e + ' UTC');
					var temp = {
									id: data.blockstats.height,
									blockstats: data.blockstats
								};
					new_block(temp);
				}									//send to blockchain.js
			}
			else if(data.msg === 'batchCreated'){
				$("#notificationPanel").animate({width:'toggle'});
				$('#spinner').hide();

				bleamId = data.batchId.substring(0, 9);
				bleamPath = "imgs/bleams/" + bleamId.toLowerCase() + ".png";
				console.log(bleamPath);
				$("#batchTag").attr("src",bleamPath);
				$('#tagWrapper').show();

				//$('#batchTag').qrcode(data.batchId);
			}
			else if(data.msg === 'reset'){
				if(user.username && bag.session.user_role && bag.session.user_role.toUpperCase() === "certifier".toUpperCase()) {
					$('#spinner2').show();
					$('#openTrades').hide();
					ws.send(JSON.stringify({type: "getAllBatches", v: 2}));
				}
			}
		}
		catch(e){
			console.log('ERROR', e);
			//ws.close();
		}
	}

	function onError(evt){
		console.log('ERROR ', evt);
		if(!connected && bag.e == null){											//don't overwrite an error message
			$("#errorName").html("Warning");
			$("#errorNoticeText").html("Waiting on the node server to open up so we can talk to the blockchain. ");
			$("#errorNoticeText").append("This app is likely still starting up. ");
			$("#errorNoticeText").append("Check the server logs if this message does not go away in 1 minute. ");
			$("#errorNotificationPanel").fadeIn();
		}
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

	function sendMessage(message){
		console.log("SENT: " + message);
		ws.send(message);
	}
}


// =================================================================================
//	UI Building
// =================================================================================
function build_Batches(batches, panelDesc){
	var html = '';
	bag.batches = batches;
	// If no panel is given, assume this is the trade panel
	if(!panelDesc) {
		panelDesc = panels[0];
	}

	for(var i in batches){
		//console.log('!', batches[i]);

		if(excluded(batches[i], filter)) {

			// Create a row for each batch
			html += '<tr>';
			html +=		'<td>' + batches[i] + '</td>';
			html += '</tr>';

		}
	}

	// Placeholder for an empty table
	if(html == '' && panelDesc.name === "dashboard") html = '<tr><td>Nothing here...</td></tr>';

	$(panelDesc.tableID).html(html);
}

// =================================================================================
//	Helpers for the filtering of trades
// =================================================================================
var filter = {};

/**
 * Describes all the fields that describe a trade.  Used to create
 * a filter that can be used to control which trades get shown in the
 * table.
 * @type {string[]}
 */
var names = [
	"batchId"
];

/**
 * Parses the filter forms in the UI into an object for filtering
 * which trades are displayed in the table.
 * @param panelDesc An object describing which panel
 */
function processFilterForm(panelDesc) {
	"use strict";

	var form = document.forms[panelDesc.formID];

	console.log("Processing filter form");

	// Reset the filter parameters
	filter = {};

	// Build the filter based on the form inputs
	for (var i in names) {

		var name = names[i];
		var id = panelDesc.filterPrefix + name;
		if(form[id] && form[id].value !== "") {
			filter[name] = form[id].value;
		}
	}

	console.log("New filter parameters: " + JSON.stringify(filter));
	console.log("Rebuilding list");
	build_Batches(bag.batches, panelDesc);
}

/**
 * Validates a trade object against a given set of filters.
 * @param paper The object to be validated.
 * @param owner The specific owner in the trade object that you want to validate.
 * @param filter The filter object to validate the trade against.
 * @returns {boolean} True if the trade is valid according to the filter, false otherwise.
 */
function excluded(batch, filter) {
	"use strict";

	if(filter.batchId && filter.batchId!== "" && batch.toUpperCase().indexOf(filter.batchId.toUpperCase()) == -1 ) return false;

	// Must be a valid trade if we reach this point
	return true;
}
