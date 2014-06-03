function Peers(){
	this.peers = {};

	this.createDOM();
}

Peers.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = 'peers';
	
	gApp.$mainTable.appendChild(this.$root);
};

Peers.prototype.processMsg = function(uid, msg){

	var sender = this.peers[uid];


	switch(msg.type){
		case 'disconnected':
		if (!sender) return;
		break;

		case 'chat':

		return;

		case 'kick':
		msg.uids.forEach((function(uid){
			var peer = this.peers[uid];
			if (!peer) return;

			peer.destroy();
		}).bind(this));
		return;
	}

	if (!sender)
		sender = this.peers[uid] = new Peer(uid);

	sender.processMsg(msg);
};

Peers.prototype.onLocalStreamChanged = function(){
	for (var p in this.peers)
		this.peers[p].onLocalStreamChanged();
}