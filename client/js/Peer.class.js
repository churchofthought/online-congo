var rtcConfig = { 
	iceServers: [{ 
		url: "stun:stun.l.google.com:19302" 
	}]
};

var rtcConstraints = {
	optional: [],
	mandatory: {
		OfferToReceiveAudio: false,
		OfferToReceiveVideo: true
	}
};

function Peer(uid){

	this.uid = uid;
	this.name = "";

	this.createPeerConnection();

	this.createDOM();

	this.onStreamsChanged = this.onStreamsChanged.bind(this);

	this.send(gUser.getInfo());
	this.sendOffer();
};

Peer.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = "peer";

	this.$root.dataset.vids = 0;

	this.$name = this.$root.appendChild(document.createElement("div"));
	this.$name.className = "name";
	this.$name.textContent = this.name;

	this.$ava = this.$root.appendChild(document.createElement("div"));
	this.$ava.className = 'ava';

	this.$streams = this.$root.appendChild(document.createElement("div"));
	this.$streams.className = "streams";

	this.$audio = this.$root.appendChild(document.createElement("audio"));
	gPeers.$root.appendChild(this.$root);


	this.$lroot = document.createElement("div");
	this.$lroot.className = "peer";
	gSidebar.$peerlist.appendChild(this.$lroot);
};

Peer.prototype.onNameChanged = function(){
	this.$name.textContent = this.name;
}

Peer.prototype.createPeerConnection = function(){
	this.peerConnection = new webkitRTCPeerConnection(rtcConfig, rtcConstraints);
	this.peerConnection.onicecandidate = this.onIceCandidate.bind(this);
	this.peerConnection.onaddstream = this.onAddStream.bind(this);
	this.peerConnection.onremovestream = this.onRemoveStream.bind(this);
	this.peerConnection.oniceconnectionstatechange = this.onIceConnectionStateChange.bind(this);
	this.peerConnection.onnegotiationneeded = this.onNegotiationNeeded.bind(this);

	this.peerConnection.addStream(gLocalMediaStream.stream);
};

Peer.prototype.send = function(msg){
	gSock.send(this.uid, msg);
};

Peer.prototype.requestOffers = function(){
	gSock.sendAll({
		type: "reqoffer"
	});
};

Peer.prototype.onIceCandidate = function(e){
	if (!e.candidate) return;

	var candidate = e.candidate;
	if (!candidate.type)
		candidate.type = 'icecandidate';

	this.send(candidate);
};

Peer.prototype.onAddStream = function(e){
	var stream = e.stream;
	stream.onaddtrack = stream.onremovetrack = this.onStreamsChanged;
	this.onStreamsChanged();
};

Peer.prototype.onRemoveStream = function(e){
	this.onStreamsChanged();
};

Peer.prototype.onNegotiationNeeded = function(){
	// this.sendOffer();
};

Peer.prototype.onStreamsChanged = function(){
	var $elt;
	while ($elt = this.$streams.firstChild)
		this.$streams.removeChild($elt);

	var stream = this.peerConnection.getRemoteStreams()[0];
	if (!stream){
		this.$root.setAttribute('hasVid', false);
		return;
	}

	var vidTracks = stream.getVideoTracks();
	this.$root.dataset.vids = vidTracks.length;

	vidTracks.forEach((function(track){
		var $stream = document.createElement('video');
		$stream.autoplay = true;
		$stream.src = URL.createObjectURL(new webkitMediaStream(
			[track]
		));
		this.$streams.appendChild($stream);
	}).bind(this));

	var audioTrack = stream.getAudioTracks()[0];
	if (audioTrack){
		var $stream = new Audio();
		$stream.autoplay = true;
		$stream.src = URL.createObjectURL(stream);
		this.$streams.appendChild($stream);
	}
};

Peer.prototype.processMsg = function(msg){
	switch(msg.type){

		case "uinfo":
			this.name = msg.name;
			this.onNameChanged();
		break;

		case "answer":
			this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg), function(){});
		break;

		case "icecandidate":
			try{
				this.peerConnection.addIceCandidate(new RTCIceCandidate(msg));
			}catch(e){}
		break;

		case "reqoffer":
			this.sendUserInfo();
			this.sendOffer();
		break;

		case "offer":
			this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg), (function() {
				this.peerConnection.createAnswer((function(answer) {
					this.peerConnection.setLocalDescription(answer, (function() {
						this.send(answer);
					}).bind(this));
				}).bind(this), null, rtcConstraints);
			}).bind(this));
		break;
	}
};

Peer.prototype.sendUserInfo = function(){
	var info = gUser.getInfo();
	info.type = 'uinfo';
	this.send(info);
}

Peer.prototype.sendOffer = function(){
	this.peerConnection.createOffer((function(offer) {
		this.peerConnection.setLocalDescription(offer, (function(){
			this.send(offer);
		}).bind(this));
	}).bind(this), null, rtcConstraints);
};

Peer.prototype.onLocalStreamChanged = function(){
	this.sendOffer();
};

Peer.prototype.setSelected = function(selected){
	this.$root.dataset.selected = selected;
};

Peer.prototype.onIceConnectionStateChange = function(){
	if (this.peerConnection.iceConnectionState == "disconnected")
		this.destroy();
};

Peer.prototype.destroy = function(){
	gPeers.$root.removeChild(this.$root);

	this.peerConnection.close();
	delete gPeers.peers[this.uid];
};