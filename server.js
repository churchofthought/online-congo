var websocket = require('websocket');

var WebSocketServer = websocket.server;
var WebSocketConnection = websocket.connection;

WebSocketConnection.prototype.uid = function(){
	return this.socket.remoteAddress + ':' + this.socket.remotePort;
}


var connections = {};

var httpServer = require('http').createServer(function(req, res){

});


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


	var data = JSON.stringify({
		uid: this.uid(),
		msg: msg
	});

	if (uid == "*")
		for (var k in connections){
			var conn = connections[k];
			if (conn == this) continue;
			conn.sendUTF(data);
		}
	else
		connections[uid].sendUTF(data);
}

httpServer.listen(8888);