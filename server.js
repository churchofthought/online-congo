var websocket = require('websocket');
var WebSocketServer = websocket.server;
var WebSocketConnection = websocket.connection;

var fs = require('fs');
var crypto = require('crypto');

var staticServer = new (require('node-static').Server)('./public');

var connections = {};
var names = {};


var cmds = require("./client/js/commands.js");
var cmdt = cmds.cmdt;
var fscmd = cmds.fscmd;
var tscmd = cmds.tscmd;
var acmd = cmds.acmd;



WebSocketConnection.prototype.serverSend = function(type){

	this.sendUTF(JSON.stringify([
		cmdt.server,
		fscmd[type]
	].concat(Array.prototype.slice.call(arguments, 1))));
};

// WebSocketConnection.prototype.arrServerSend = function(type, arr){
// 	this.sendUTF(JSON.stringify([
// 		cmdt.server,
// 		fscmd[type]
// 	].concat(arr)));
// };

function getFirstAvailableName(name){
	if (!isNameTaken(name)) return name;

	name += " (";
	for (var i = 2; ; ++i){
		var newName = name + i + ")";
		if (!isNameTaken(newName))
			return newName;
	}
}

function isNameTaken(name){
	return !!names[name];
}

var httpServer = require('https').createServer({
	key: fs.readFileSync('key.pem'),
	cert: fs.readFileSync('cert.pem')
}, function(req, res){
	if (isWebSocket(req)){
		req.resume();
	}else{
		staticServer.serve(req, res);
	}
});

function isWebSocket(request) {
	if (request.method !== 'GET') return false;

	var connection = request.headers.connection || '';
	var upgrade    = request.headers.upgrade || '';

	return request.method === 'GET' &&
		connection.toLowerCase().split(/\s*,\s*/).indexOf('upgrade') >= 0 &&
		upgrade.toLowerCase() === 'websocket';
}

new WebSocketServer({
	autoAcceptConnections: true,
	httpServer: httpServer
}).on('connect', function(c){

	// todo uid should be md5ed with a salt and some bullshit
	c.uid = crypto.createHash('sha1').update(crypto.randomBytes(128)).digest('hex');
	c.on('message', gotMsg);
	connections[c.uid] = c;

	c.serverSend('init', c.uid, names);
}).on('close', function(c){
	delete names[c.name];
	delete connections[c.uid];

	serverSendAll('disconnected', c.uid);
});

function serverSendAll(type){

	var o = JSON.stringify([
		cmdt.server,
		fscmd[type]
	].concat(Array.prototype.slice.call(arguments, 1)));

	for (var k in connections)
		connections[k].sendUTF(o);
}

function gotMsg(wrapper){
	var msg = JSON.parse(wrapper.utf8Data);

	switch (msg[0]){
		case cmdt.server:
		switch (msg[1]){
			case tscmd.setname:
			delete names[this.name];
			names[this.name = getFirstAvailableName(msg[2])] = this.uid;
			serverSendAll('setname', this.uid, this.name);
			break;
		}
		// todo
		// check if admin
		switch (msg[1]){
			case tscmd.kick:
			msg.slice(2).forEach(function(uid){
				var connection = connections[uid];
				if (connection)
					connection.close();
			});
			break;
		}
		break;

		case cmdt.all:
		msg[0] = this.uid;
		msg = JSON.stringify(msg);
		for (var k in connections){
			var conn = connections[k];
			if (conn != this)
				conn.sendUTF(msg);
		}
		break;

		default:
		var connection = connections[msg[0]];
		if (connection){
			msg[0] = this.uid;
			connection.sendUTF(JSON.stringify(msg));
		}
	}
}

httpServer.listen(443);
