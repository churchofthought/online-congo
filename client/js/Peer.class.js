var rtcConfig = { 
	iceServers: [{ 
		url: "stun:stun.l.google.com:19302" 
	}]
};

var rtcConstraints = {
	optional: [{
		RtpDataChannels: true
	},{
		DtlsSrtpKeyAgreement: true
	}],
	mandatory: {
		OfferToReceiveAudio: true,
		OfferToReceiveVideo: true,
		VoiceActivityDetection: true,
    	IceRestart: true
	}
};

function Peer(uid){

	this.uid = uid;
	this.name = "";

	this.createDOM();
	this.onStreamChanged = this.onStreamChanged.bind(this);


	// todo
	// we might be able to do this with getStats
	this.analyser = gAudioContext.createAnalyser();
	this.analyserArray = new Uint8Array(this.analyser.frequencyBinCount);


	this.onIceCandidate = this.onIceCandidate.bind(this);
	this.onAddStream = this.onAddStream.bind(this);
	this.onRemoveStream = this.onRemoveStream.bind(this);
	this.onIceConnectionStateChange = this.onIceConnectionStateChange.bind(this);
	this.onSignalingStateChange = this.onSignalingStateChange.bind(this);
	this.onDataChannelMessage = this.onDataChannelMessage.bind(this);
	this.onDataChannelOpen = this.onDataChannelOpen.bind(this);
	this.onDataChannelError = this.onDataChannelError.bind(this);

	if (this.uid == gUser.uid){
		this.send = this.selfSend;
		this.onAddStream({
			stream: gLocalMediaStream.stream
		});
		this.onLocalStreamChanged = this.onStreamChanged;
	}else{
		this.createAnsweredPeerConnection();
		this.createOfferedPeerConnection();

		this.sendOffer();
		if (gChat.pubMsgs.length)
			this.sendArr('pubchathistory', gChat.pubMsgs);
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

Peer.destroyRTCConnection = function(pc){
	pc.onicecandidate =
	pc.oniceconnectionstatechange =
	pc.onsignalingstatechange =
		null;
	pc.close();
}

Peer.prototype.createOfferedPeerConnection = function(){
	this.offeredConnection = this.createPeerConnection();
	this.offeredConnection.addStream(gLocalMediaStream.stream);

	this.offeredDC = this.createDataChannel(this.offeredConnection);
};

Peer.prototype.createAnsweredPeerConnection = function(){
	this.answeredConnection = this.createPeerConnection();
	this.answeredConnection.onaddstream = this.onAddStream;
	this.answeredConnection.onremovestream = this.onRemoveStream;

	this.answeredDC = this.createDataChannel(this.answeredConnection);
}

Peer.prototype.createPeerConnection = function(){
	var pc = new webkitRTCPeerConnection(rtcConfig, rtcConstraints);
	pc.onicecandidate = this.onIceCandidate;
	pc.oniceconnectionstatechange = this.onIceConnectionStateChange;
	pc.onsignalingstatechange = this.onSignalingStateChange;

	return pc;
};

Peer.prototype.createDataChannel = function(pc){
	var dc = pc.createDataChannel("");
	dc.onmessage = this.onDataChannelMessage;
	dc.onopen = this.onDataChannelOpen;
	dc.onerror = this.onDataChannelError;

	return dc;
}

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

	var dc = this.getOpenDataChannel();

	if (dc)
		try {
			dc.send(JSON.stringify(
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

Peer.prototype.getOpenDataChannel = function(){
	if (this.offeredDC.readyState == "open")
		return this.offeredDC;
	if (this.answeredDC.readyState == "open")
		return this.answeredDC;
}

Peer.prototype.onIceCandidate = function(e){

	var candidate = e.candidate;

	if (candidate)
		this.send('icecandidate', +(e.target == this.offeredConnection), candidate);
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
			this.offeredConnection.setRemoteDescription(new RTCSessionDescription(msg[0]), function(){}, (function(e){
				console.log(e);
			}).bind(this));
		break;

		case ucmd.icecandidate:
			var candidate = new RTCIceCandidate(msg[1]);
			try {
				(msg[0] ? this.answeredConnection : this.offeredConnection).addIceCandidate(candidate);
			} catch(e) {
				console.log(e);
			}
		break;

		case ucmd.offer:
			// if (["have-local-offer", "closed"].indexOf(this.peerConnection.signalingState) >= 0)
			// 	this.createPeerConnection();
			this.answeredConnection.setRemoteDescription(new RTCSessionDescription(msg[0]), (function() {
				this.answeredConnection.createAnswer((function(answer) {
					this.answeredConnection.setLocalDescription(answer, (function() {
						this.send('answer', answer);
					}).bind(this), (function(e){
						console.log(e);
					}).bind(this));
				}).bind(this), null, rtcConstraints);
			}).bind(this), function(e){
				console.log(e);
			});
		break;
	}
};

Peer.prototype.withConnections = function(f){
	f(this.offeredConnection);
	f(this.answeredConnection);
}

Peer.prototype.queryConnections = function(f){
	return f(this.offeredConnection) && f(this.answeredConnection);
}

Peer.prototype.sendOffer = function(){
	this.offeredConnection.createOffer((function(offer) {
		this.offeredConnection.setLocalDescription(offer, (function(){
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

Peer.prototype.onIceConnectionStateChange = function(e){
	console.log("ice",e.target.iceConnectionState);
	if (this.queryConnections(function(pc){
		return pc.iceConnectionState == "closed" || pc.iceConnectionState == "disconnected";
	}))
		this.destroy();
};

Peer.prototype.onSignalingStateChange = function(e){
	console.log("sig", e.target.signalingState);
	if (this.queryConnections(function(pc){
		return pc.signalingState == "closed";
	}))
		this.destroy();
}

Peer.prototype.destroy = function(){
	gPeers.$root.removeChild(this.$root);
	gPeers.$lroot.removeChild(this.$lroot);

	this.withConnections(Peer.destroyRTCConnection);

	delete gPeers.peers[this.uid];
};