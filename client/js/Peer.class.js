var rtcConfig = { 
	iceServers: [{ 
		url: "stun:stun.l.google.com:19302" 
	}]
};

var rtcConstraints = {
	optional: [{RtpDataChannels: true}],
	mandatory: {
		OfferToReceiveAudio: false,
		OfferToReceiveVideo: true
	}
};

function Peer(uid, dontSendOffer){

	this.uid = uid;
	this.name = "";

	this.createDOM();
	this.onStreamChanged = this.onStreamChanged.bind(this);

	this.analyser = gAudioContext.createAnalyser();
	this.analyserArray = new Uint8Array(this.analyser.frequencyBinCount);

	if (this.uid == gUser.uid){
		this.send = this.selfSend;
		this.onAddStream({
			stream: gLocalMediaStream.stream
		});
		this.onLocalStreamChanged = this.onStreamChanged;
	}else{
		this.createPeerConnection();
		// if (!dontSendOffer){
			this.sendOffer();
			this.sendArr('pubchathistory', gChat.pubMsgs);
		// }
	}

	requestAnimationFrame(
		this.processAudio = this.processAudio.bind(this)
	);
	
};

Peer.prototype.selfSend = function(type){
	type = ucmd[type];

	this.processMsg(type, Array.prototype.slice.call(arguments, 1));
};

Peer.prototype.processAudio = function(e){
	this.analyser.getByteFrequencyData(this.analyserArray);
	var avg = 0;
	for (var i = this.analyserArray.length; i--;)
		avg += this.analyserArray[i];

	var pct = (100 * avg / this.analyserArray.length / (this.analyser.maxDecibels - this.analyser.minDecibels));

	this.$lMicDB.style.height = this.$micDB.style.width = pct + '%';
	this.$lMicToggle.dataset.db = pct;

	requestAnimationFrame(this.processAudio);
};


Peer.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = "peer";

	this.$micDB = this.$root.appendChild(document.createElement("div"));
	this.$micDB.className = "db";

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

	this.$licon = this.$lroot.appendChild(document.createElement("div"));
	this.$licon.className = "icon";

	this.$lname = this.$lroot.appendChild(document.createElement("div"));
	this.$lname.className = "name";
	this.$lname.textContent = this.name;

	this.$linfo = this.$lroot.appendChild(document.createElement("div"));
	this.$linfo.className = "info";

	this.$lMicDB = this.$linfo.appendChild(document.createElement("div"));
	this.$lMicDB.className = "db";

	this.$lMicToggle = this.$linfo.appendChild(document.createElement("div"));
	this.$lMicToggle.className = "mic";

	this.$lMicToggle.dataset.db = 0;

	this.$lCamToggle = this.$linfo.appendChild(document.createElement("div"));
	this.$lCamToggle.className = "cam";

	this.$lCamToggle.dataset.vids = 0;


	


	gPeers.$lroot.appendChild(this.$lroot);
};

Peer.prototype.onNameChanged = function(){
	this.$name.textContent = this.name;
	this.$lname.textContent = this.name;
}

Peer.prototype.createPeerConnection = function(){
	this.peerConnection = new webkitRTCPeerConnection(rtcConfig, rtcConstraints);
	this.peerConnection.onicecandidate = this.onIceCandidate.bind(this);
	this.peerConnection.onaddstream = this.onAddStream.bind(this);
	this.peerConnection.onremovestream = this.onRemoveStream.bind(this);
	this.peerConnection.oniceconnectionstatechange = this.onIceConnectionStateChange.bind(this);
	this.peerConnection.onnegotiationneeded = this.onNegotiationNeeded.bind(this);

	this.peerConnection.addStream(gLocalMediaStream.stream);

	this.dataChannel = this.peerConnection.createDataChannel("");
	this.dataChannel.onmessage = this.onDataChannelMessage.bind(this);
	this.dataChannel.onopen = this.onDataChannelOpen.bind(this);
	this.dataChannel.onerror = this.onDataChannelError.bind(this);
};

Peer.prototype.onDataChannelOpen = function(){
	
};

Peer.prototype.onDataChannelError = function(e){
	console.log(e);
};

Peer.prototype.onDataChannelMessage = function(msg){

	msg = JSON.parse(msg);

	this.onProcessMsg(msg[0], msg.slice(1));
};



Peer.prototype.send = function(type){
	this.sendArr(
		type, Array.prototype.slice.call(arguments, 1)
	);
};

Peer.prototype.sendArr = function(type, arr){
	type = ucmd[type];

	if (this.dataChannel.readyState == "open")
		try {
			this.dataChannel.send(JSON.stringify(
				[type].concat(arr)
			));
		}catch(e){
			gSock.send(JSON.stringify(
				[this.uid, type].concat(arr)
			));
		}
	else
		gSock.send(JSON.stringify(
			[this.uid, type].concat(arr)
		));
};

Peer.prototype.onIceCandidate = function(e){

	var candidate = e.candidate;

	if (candidate)
		this.send('icecandidate', candidate);
};

Peer.prototype.onAddStream = function(e){
	this.stream = e.stream;
	this.stream.onaddtrack = this.stream.onremovetrack = this.onStreamChanged;
	this.onStreamChanged();
};

Peer.prototype.onRemoveStream = function(e){
	if (this.stream != e.stream) return;

	this.stream = null;
	this.analyser.disconnect();

	this.onStreamChanged();
};

Peer.prototype.onNegotiationNeeded = function(){
	this.sendOffer();
};

Peer.prototype.onStreamChanged = function(){
	var $elt;
	while ($elt = this.$streams.firstChild)
		this.$streams.removeChild($elt);

	if (!this.stream){
		this.$lCamToggle.dataset.vids = this.$root.dataset.vids = 0;
		return;
	}

	var vidTracks = this.stream.getVideoTracks();
	this.$lCamToggle.dataset.vids = this.$root.dataset.vids = vidTracks.length;

	vidTracks.forEach((function(track){
		var $stream = document.createElement('video');
		$stream.autoplay = true;
		$stream.src = URL.createObjectURL(new webkitMediaStream(
			[track]
		));
		this.$streams.appendChild($stream);
	}).bind(this));


	this.analyser.disconnect();
	gAudioContext.createMediaStreamSource(this.stream).connect(this.analyser);

	// we don't need no echo!
	if (this.uid == gUser.uid) return;

	var audioTrack = this.stream.getAudioTracks()[0];
	if (audioTrack){
		var $stream = new Audio();
		$stream.autoplay = true;
		$stream.src = URL.createObjectURL(this.stream);
		this.$streams.appendChild($stream);
	}
};

Peer.prototype.setName = function(name){
	this.name = name;
	this.onNameChanged();
};

Peer.prototype.processMsg = function(type, msg){

	switch(type){

		case ucmd.pubchathistory:
			gChat.gotPubHistory(msg);
		break;

		case ucmd.pubchat:
			gChat.onPubMsg(this.name, msg[0], msg[1]);
		break;

		case ucmd.answer:
			this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg[0]), function(){});
		break;

		case ucmd.icecandidate:
			try{
				this.peerConnection.addIceCandidate(new RTCIceCandidate(msg[0]));
			}catch(e){}
		break;

		case ucmd.offer:
			this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg[0]), (function() {
				this.peerConnection.createAnswer((function(answer) {
					this.peerConnection.setLocalDescription(answer, (function() {
						this.send('answer', answer);
					}).bind(this));
				}).bind(this), null, rtcConstraints);
			}).bind(this));
		break;
	}
};

Peer.prototype.sendOffer = function(){
	this.peerConnection.createOffer((function(offer) {
		this.peerConnection.setLocalDescription(offer, (function(){
			this.send('offer', offer);
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
	gPeers.$lroot.removeChild(this.$lroot);

	this.peerConnection.close();
	delete gPeers.peers[this.uid];
};