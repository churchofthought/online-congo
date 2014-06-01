function Peers(){
	this.peers = {};

	this.createDOM();
}

Peers.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = 'peers';
	
	document.body.appendChild(this.$root);
};

Peers.prototype.processMsg = function(uid, msg){
	switch(msg.type){
		case 'kick':
		msg.uids.forEach((function(uid){
			var peer = this.peers[uid];
			if (!peer) return;

			peer.destroy();
		}).bind(this));
		return;

		case 'reqoffer':
		if (this.peers[uid]) return;
		break;
	}

	(this.peers[uid] || (this.peers[uid] = new Peer(uid))).processMsg(msg);
};

Peers.prototype.onLocalStreamChanged = function(){
	for (var p in this.peers)
		this.peers[p].onLocalStreamChanged();
}