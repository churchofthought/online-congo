function Peers(){
	this.peers = {};

	this.createDOM();
}

Peers.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = 'peers';

	this.$lroot = this.$root.appendChild(
		document.createElement("div")
	);
	this.$lroot.className = 'peerlist';
	this.$lroot.style.height = '50vh';
	this.$lroot.onresize = function(){
		console.log(1);
	};
	
	gSidebar.$root.appendChild(this.$lroot);
	gApp.$mainTable.appendChild(this.$root);
};

Peers.prototype.processUserMsg = function(uid, type, msg){
	var sender = this.peers[uid];

	if (!sender)
		sender = this.peers[uid] = new Peer(uid, type);

	sender.processMsg(type, msg);
};

Peers.prototype.processServerMsg = function(type, msg){
	switch(type){
		case fscmd.init:
		gUser.uid = msg[0];
		var names = msg[1];
		for (var name in names)
			this.getPeer(names[name]).setName(name);
		break;

		case fscmd.disconnected:
		var peer = this.peers[msg[0]];
		if (peer)
			peer.destroy();
		break;

		case fscmd.setname:
		this.getPeer(msg[0]).setName(msg[1]);
		break;
	}
};

Peers.prototype.sendPubChatMsg = function(msg){
	for (var uid in this.peers)
		this.peers[uid].send("pubchat", Date.now(), msg);
};

Peers.prototype.getPeer = function(uid){
	var peer = this.peers[uid];
	if (peer) return peer;

	return (this.peers[uid] = new Peer(uid));
};

Peers.prototype.onLocalStreamChanged = function(){
	for (var p in this.peers)
		this.peers[p].onLocalStreamChanged();
};