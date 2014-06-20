function Peers(){
	this.peers = {};

	this.fileReaderOnload = this.fileReaderOnload.bind(this);

	this.createDOM();
}

Peers.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = 'peers';

	this.$root.addEventListener('dragover', this.onDragOver.bind(this));
	this.$root.addEventListener('drop', this.onDrop.bind(this));

	this.$lroot = this.$root.appendChild(
		document.createElement("div")
	);

	this.$lroot.className = 'peerlist';
	this.$lroot.style.height = (localStorage.lrh || 50) + 'vh';
	this.$lroot.addEventListener("mouseup", this.updateLRH.bind(this));

	
	gSidebar.$root.appendChild(this.$lroot);
	gApp.$mainTable.appendChild(this.$root);
};

Peers.prototype.onDragOver = function(e){
	e.preventDefault();
	e.stopPropagation();
	e.dataTransfer.dropEffect = 'copy';
};

Peers.prototype.onDrop = function(e){
	e.preventDefault();
	e.stopPropagation();
	
	var file = e.dataTransfer.files[0];
	if (!file) return;
	if (!/^image\//.test(file.type)) return;

	var fr = new FileReader();
	fr.onload = this.fileReaderOnload;
	fr.readAsDataURL(file);
};

Peers.prototype.fileReaderOnload = function(e){
	var result = e.target.result;

	this.forEachPeer(function(p){
		p.send('dispimg', result);
	});
};

Peers.prototype.updateLRH = function(){
	var lrh = 100 * parseInt(window.getComputedStyle(this.$lroot).getPropertyValue("height")) / window.innerHeight;
	localStorage.lrh = lrh;
	this.$lroot.style.height = lrh + 'vh';
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
	this.forEachPeer(function(p){
		p.send("pubchat", Date.now(), msg);
	});
};

Peers.prototype.getPeer = function(uid){
	var peer = this.peers[uid];
	if (peer) return peer;

	return (this.peers[uid] = new Peer(uid));
};

Peers.prototype.onLocalStreamChanged = function(){
	this.forEachPeer(function(p){
		p.onLocalStreamChanged();
	});
};

Peers.prototype.forEachPeer = function(f){
	for (var uid in this.peers)
		f(this.peers[uid]);
}