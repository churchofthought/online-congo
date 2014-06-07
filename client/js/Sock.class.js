function Sock(){
	this.sock = new WebSocket(
		"wss://" + document.domain
	);
};

Sock.prototype.ready = function(){
	return this.sock.readyState == WebSocket.prototype.OPEN;
};

Sock.prototype.send = function(txt){
	this.sock.send(txt);
};

Sock.prototype.sendAll = function(type){
	this.sock.send(JSON.stringify(
		[cmdt.all, ucmd[type]].concat(Array.prototype.slice.call(arguments, 1))
	));
};

Sock.prototype.sendServer = function(type){
	this.sock.send(JSON.stringify(
		[cmdt.server, tscmd[type]].concat(Array.prototype.slice.call(arguments, 1))
	));
};

Sock.prototype.arrSendServer = function(type, arr){
	this.sock.send(JSON.stringify(
		[cmdt.server, tscmd[type]].concat(arr)
	));
}

Sock.prototype.addEventListener = function(type, cb){
	this.sock.addEventListener(type, cb);
};

Sock.prototype.removeEventListener = function(type, cb){
	this.sock.removeEventListener(type, cb);
};