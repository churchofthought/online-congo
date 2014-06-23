var websocket = require('websocket');
var WebSocketServer = websocket.server;
var WebSocketConnection = websocket.connection;

var fs = require('fs');
var crypto = require('crypto');

var staticServer = new (require('node-static').Server)('./public');

var banned = {};
var connections = {};
var names = {};


var cmds = require("./client/js/commands.js");
var cmdt = cmds.cmdt;
var fscmd = cmds.fscmd;
var tscmd = cmds.tscmd;
var acmd = cmds.acmd;



WebSocketConnection.prototype.serverSend = function(type){
	this.serverSendArr(
		type, Array.prototype.slice.call(arguments, 1)
	);
};

WebSocketConnection.prototype.serverSendArr = function(type, arr){
	this.sendUTF(JSON.stringify([
		cmdt.server,
		fscmd[type]
	].concat(arr)));
};

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
	if (banned[req.connection.remoteAddress]){
		res.end("You're banned!");
		return;
	}

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
	httpServer: httpServer,
	maxReceivedFrameSize: 64*1024*1024 // 64 mb
}).on('connect', function(c){

	c.uid = crypto.createHash('md5').update(crypto.randomBytes(64)).digest('hex');
	c.on('message', gotMsg);
	connections[c.uid] = c;

	c.serverSend('init', c.uid, names);
}).on('close', function(c){
	// output why dc happened
	// console.log(c);
	delete names[c.name];
	delete connections[c.uid];

	serverSendAll('disconnected', c.uid);
});

function serverSendAll(type){
	serverSendAllArr(
		type, Array.prototype.slice.call(arguments, 1)
	);
}

function serverSendAllArr(type, arr){

	var o = JSON.stringify([
		cmdt.server,
		fscmd[type]
	].concat(arr));

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

			case tscmd.ban:
			msg.slice(2).forEach(function(uid){
				var connection = connections[uid];
				if (!connection) return;
				
				banned[connection.remoteAddress] = true;
				for (var k in connections){
					var c = connections[k];
					if (c.remoteAddress == connection.remoteAddress){
						c.close();
					}
				}
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
