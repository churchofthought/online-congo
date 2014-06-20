var rtcConfig = { 
	iceServers: [{ 
		url: "stun:stun.l.google.com:19302" 
	}]
};

var rtcConstraints = {
	optional: [
	// {
	// 	RtpDataChannels: true
	// },
	{
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
	this.onDataChannel = this.onDataChannel.bind(this);
	this.onDataChannelMessage = this.onDataChannelMessage.bind(this);
	this.onDataChannelOpen = this.onDataChannelOpen.bind(this);
	this.onDataChannelError = this.onDataChannelError.bind(this);
	this.onDataChannelClose = this.onDataChannelClose.bind(this);

	if (this.uid == gUser.uid){
		this.send = this.selfSend;
		this.onAddStream({
			stream: gLocalMediaStream.stream
		});
		this.onLocalStreamChanged = this.onStreamChanged;
	}else{
		this.sendOffer();
		if (gChat.pubMsgs.length)
			this.sendArr('pubchathistory', gChat.pubMsgs);
	}

	requestAnimationFrame(
		this.processAudio = this.processAudio.bind(this)
	);
	
};

Peer.prototype.onStreamsResized = function(){
	var $streams = Array.prototype.slice.call(this.$streams.getElementsByClassName('stream'));

	$streams.forEach(function($stream, i){
		var computedStyle = window.getComputedStyle($stream);
		var width = 100 * parseInt(computedStyle.getPropertyValue("width")) / window.innerWidth;
		var height = 100 * parseInt(computedStyle.getPropertyValue("height")) / window.innerHeight;
		
		var cn = $stream.childNodes[0];

		cn.style.width = $stream.style.width = width + 'vw';
		cn.style.height = $stream.style.height = height + 'vh';
	});
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

	this.$streams.addEventListener('mouseup', this.onStreamsResized.bind(this));

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
	if (!pc) return;

	pc.onicecandidate =
	pc.oniceconnectionstatechange =
	pc.onsignalingstatechange =
	pc.onaddstream = 
	pc.onremovestream =
		null;

	pc.getLocalStreams().forEach(function(s){
		pc.removeStream(s);
	});

	pc.close();
}

Peer.prototype.createOfferedPeerConnection = function(){
	Peer.destroyRTCConnection(this.offeredConnection);

	this.offeredConnection = this.createPeerConnection();
	this.offeredConnection.addStream(gLocalMediaStream.stream);

	Peer.destroyDataChannel(this.offeredDC);

	this.offeredDC = this.createDataChannel(this.offeredConnection);
};

Peer.prototype.createAnsweredPeerConnection = function(){
	Peer.destroyRTCConnection(this.answeredConnection);

	this.answeredConnection = this.createPeerConnection();
	this.answeredConnection.onaddstream = this.onAddStream;
	this.answeredConnection.onremovestream = this.onRemoveStream;

	Peer.destroyDataChannel(this.answeredDC);

	this.answeredDC = this.createDataChannel(this.answeredConnection);
}

Peer.prototype.createPeerConnection = function(){
	var pc = new webkitRTCPeerConnection(rtcConfig, rtcConstraints);
	pc.onicecandidate = this.onIceCandidate;
	pc.oniceconnectionstatechange = this.onIceConnectionStateChange;
	pc.onsignalingstatechange = this.onSignalingStateChange;
	pc.ondatachannel = this.onDataChannel;

	return pc;
};

Peer.prototype.onDataChannel = function(e){
	if (e.target == this.answeredConnection){
		// Peer.destroyDataChannel(this.answeredDC);
		this.answeredDC = e.channel;
	}else{
		// Peer.destroyDataChannel(this.offeredDC);
		this.offeredDC = e.channel;
	}
};

Peer.prototype.createDataChannel = function(pc){
	var dc = pc.createDataChannel('', {
		// ordered: true,
		// reliable: true,
		// negotiated: true
	});

	dc.onmessage = this.onDataChannelMessage;
	dc.onopen = this.onDataChannelOpen;
	dc.onerror = this.onDataChannelError;
	dc.onclose = this.onDataChannelClose;

	return dc;
}

Peer.prototype.onDataChannelOpen = function(e){
	// console.log(e);
};

Peer.prototype.onDataChannelError = function(e){
	console.log(e);
};

Peer.prototype.onDataChannelClose = function(e){
	// console.log(e);
};

Peer.prototype.onDataChannelMessage = function(msg){
	// todo
	// figure out why empty message is being sent
	if (!msg.data) return;

	msg = JSON.parse(msg.data);

	this.processMsg(msg[0], msg.slice(1));
};

Peer.prototype.sendImageForDisplay = function(arrayBuffer){
	var dc = this.getOpenDataChannel();
	if (!dc) return;

	dc.send(arrayBuffer);
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
	if (this.offeredDC && this.offeredDC.readyState == "open")
		return this.offeredDC;
	if (this.answeredDC && this.answeredDC.readyState == "open")
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
		var $wrapper = document.createElement("div");
		$wrapper.className = 'stream';
		var $stream = $wrapper.appendChild(document.createElement('video'));
		$stream.autoplay = true;
		$stream.src = URL.createObjectURL(new webkitMediaStream(
			[track]
		));
		this.$streams.appendChild($wrapper);
	}).bind(this));


	this.analyser.disconnect();
	gAudioContext.createMediaStreamSource(this.stream).connect(this.analyser);

	// we don't need no echo!
	if (this.uid == gUser.uid) return;

	var audioTrack = this.stream.getAudioTracks()[0];
	if (audioTrack){
		var $stream = document.createElement("audio");
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
			this.createAnsweredPeerConnection();
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
};

Peer.prototype.withChannels = function(f){
	f(this.offeredDC);
	f(this.answeredDC);
};

Peer.destroyDataChannel = function(dc){
	if (!dc) return;

	dc.close();
};

Peer.prototype.queryConnections = function(f){
	return f(this.offeredConnection) && f(this.answeredConnection);
}

Peer.prototype.sendOffer = function(){
	this.createOfferedPeerConnection();
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
	// console.log("ice",e.target.iceConnectionState);
	if (this.queryConnections(function(pc){
		return pc.iceConnectionState == "closed" || pc.iceConnectionState == "disconnected";
	}))
		this.destroy();
};

Peer.prototype.onSignalingStateChange = function(e){
	// console.log("sig", e.target.signalingState);
	if (this.queryConnections(function(pc){
		return pc.signalingState == "closed" || pc.signalingState == "closing";
	}))
		this.destroy();
}

Peer.prototype.destroy = function(){
	gPeers.$root.removeChild(this.$root);
	gPeers.$lroot.removeChild(this.$lroot);

	this.withConnections(Peer.destroyRTCConnection);
	this.withChannels(Peer.destroyDataChannel);

	delete gPeers.peers[this.uid];
};