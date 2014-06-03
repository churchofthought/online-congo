var actions = [];

var websocket = require('websocket');
var WebSocketServer = websocket.server;
var WebSocketConnection = websocket.connection;

var fs = require('fs');

var staticServer = new (require('node-static').Server)('./public');

WebSocketConnection.prototype.uid = function(){
	return this.socket.remoteAddress + ':' + this.socket.remotePort;
}


var connections = {};




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
	c.on('message', gotMsg);
	connections[c.uid()] = c;
}).on('close', function(c){
	delete connections[c.uid()];
});

function gotMsg(wrapper){
	wrapper = JSON.parse(wrapper.utf8Data);
	var uid = wrapper.uid;
	var msg = wrapper.msg;

	var o = {
		time: Date.now(),
		uid: this.uid(),
		msg: msg
	};

	switch (msg.type){
		case 'chat':
		actions.push(o);
		break;
	}

	var data = JSON.stringify(o);

	switch (uid){
		case "*":
		for (var k in connections){
			var conn = connections[k];
			if (conn == this) continue;
			conn.sendUTF(data);
		}
		break;

		case "#":
		switch (msg.type){
			case "kick":
			msg.uids.forEach(function(uid){
				connections[uid].close();
				delete connections[uid]; // might not be needed
			});
			break;
		}
		for (var k in connections)
			connections[k].sendUTF(data);
		break;

		default:
		connections[uid].sendUTF(data);
	}	
}

httpServer.listen(443);
