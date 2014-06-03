function Sock(){
	this.sock = new WebSocket(
		"wss://" + document.domain
	);
};

Sock.prototype.ready = function(){
	return this.sock.readyState == WebSocket.prototype.OPEN;
};

Sock.prototype.send = function(uid, msg){
	this.sock.send(JSON.stringify({
		uid: uid, 
		msg: msg
	}));
};

Sock.prototype.sendAll = function(msg){
	this.send("*", msg);
};

Sock.prototype.sendAdmin = function(msg){
	this.send("#", msg);
}

Sock.prototype.addEventListener = function(type, cb){
	this.sock.addEventListener(type, cb);
};

Sock.prototype.removeEventListener = function(type, cb){
	this.sock.removeEventListener(type, cb);
};