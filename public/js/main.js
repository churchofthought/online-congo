var gApp;
var gSock;
var gPeers;
var gLocalMediaStream;
var gSelection;
var gContextMenu;
var gUID;
var gSettingsBar;
var gSidebar;

function AppController(){
	gApp = this;

	gSock = this.sock = new Sock();
	this.sock.addEventListener('message', this.onSockMsg.bind(this)); 
	this.sock.addEventListener('open', this.onSockOpen.bind(this));


	gSettingsBar = this.settingsBar = new SettingsBar();
	this.createMainTable();

	gSidebar = this.sideBar = new Sidebar();

	gLocalMediaStream = this.localMediaStream = new LocalMediaStream();

	gPeers = this.peers = new Peers();

	gSelection = this.selection = new Selection();

	

	gContextMenu = this.contextMenu = new ContextMenu();
}

AppController.prototype.createMainTable = function(){
	this.$mainTable = document.createElement("div");
	this.$mainTable.className = 'maintbl';
	document.body.appendChild(this.$mainTable);
}

AppController.prototype.onSockOpen = function(){
	this.sock.sendAll({
		type: 'reqoffer'
	});
};

AppController.prototype.onSockMsg = function(e){
	var wrapper = JSON.parse(e.data);
	var uid = wrapper.uid;
	var msg = wrapper.msg;

	this.peers.processMsg(uid, msg);
};

AppController.prototype.kick = function(sel){
	this.sock.sendAdmin({
		type: 'kick',
		uids: sel.map(function(p){
			return p.uid;
		})
	});
};
function ContextMenu(){
	this.createDOM();
	this.addCommand("Kick", "kick");
	this.addCommand("Ban", "ban");
}

ContextMenu.prototype.createDOM = function(){
	this.$root = document.createElement("ul");
	this.$root.className = 'ctx';
	this.$root.dataset.visible = false;

	this.$root.addEventListener('click', this.onContextClick.bind(this));

	document.body.appendChild(this.$root);


	this.onWindowClick = this.onWindowClick.bind(this);

	window.addEventListener('contextmenu', this.onContextMenu.bind(this));
};

ContextMenu.prototype.onContextMenu = function(e){
	e.preventDefault();

	this.visible = true;

	this.$root.style.left = e.pageX + "px";
	this.$root.style.top = e.pageY + "px";
	this.$root.dataset.visible = true;

	window.addEventListener('click', this.onWindowClick);
};

ContextMenu.prototype.onContextClick = function(e){
	var cmd = e.target.dataset.cmd;
	if (!cmd) return;

	// add prompt

	gApp[cmd](gSelection.selection);
};

ContextMenu.prototype.onWindowClick = function(e){
	this.visible = false;
	this.$root.dataset.visible = false;

	window.removeEventListener('click', this.onWindowClick);
};

ContextMenu.prototype.addCommand = function(label, cmd){
	var $li = document.createElement("li");
	$li.dataset.cmd = cmd;
	$li.textContent = label;

	this.$root.appendChild($li);
};
var mediaConstraints = {
	mic: {
		audio: true,
		video: false
	},
	cam: {
		audio: false,
		video: true
	},
	screen: {
		audio: false,
		video: {
		    mandatory: {
		        chromeMediaSource: 'screen'
		    }
		}
	}
};


function LocalMediaStream(){
	this.ctx = new webkitAudioContext();

	this.analyser = this.ctx.createAnalyser();
	this.analyserArray = new Uint8Array(this.analyser.frequencyBinCount);

	this.stream = new webkitMediaStream([
		this.blankAudioTrack = 
			this.ctx.createMediaStreamDestination()
				.stream.getAudioTracks()[0]
	]);

	requestAnimationFrame(
		this.processAudio = this.processAudio.bind(this)
	);

	this.createDOM();

	this.tracks = {
		mic: this.blankAudioTrack,
		cam: null,
		screen: null
	};
};

LocalMediaStream.prototype.processAudio = function(e){
	this.analyser.getByteFrequencyData(this.analyserArray);
	var avg = 0;
	for (var i = this.analyserArray.length; i--;)
		avg += this.analyserArray[i];

	this.$micDB.style.width =
		(100 * avg / this.analyserArray.length / (this.analyser.maxDecibels - this.analyser.minDecibels)) + '%';

	requestAnimationFrame(this.processAudio);
};

LocalMediaStream.prototype.createDOM = function(){
	this.$camVid = document.createElement('video');
	this.$camVid.autoplay = true;
	gSettingsBar.$camToggle.appendChild(this.$camVid);

	this.$screenVid = document.createElement('video');
	this.$screenVid.autoplay = true;
	gSettingsBar.$screenToggle.appendChild(this.$screenVid);

	this.$micDB = document.createElement('div');
	this.$micDB.className = 'db';
	gSettingsBar.$micToggle.appendChild(this.$micDB);
};

LocalMediaStream.prototype.renderStreams = function(){
	if (this.tracks.cam){
		this.$camVid.src = URL.createObjectURL(new webkitMediaStream(
			[this.tracks.cam]
		));
	}else{
		this.$camVid.removeAttribute('src');
	}

	if (this.tracks.screen){
		this.$screenVid.src = URL.createObjectURL(new webkitMediaStream(
			[this.tracks.screen]
		));
	}else{
		this.$screenVid.removeAttribute('src');
	}
}

LocalMediaStream.prototype.setTrackEnabled = function(type, enabled){
	if (enabled){
		this.getUserMedia(type);
	}else{
		var track = this.tracks[type];
		if (track && track != this.blankAudioTrack){
			if (type == 'mic')
				this.stream.addTrack(this.tracks.mic = this.blankAudioTrack);
			else
				delete this.tracks[type];

			this.stream.removeTrack(track);
			track.stop();
			this.onLocalStreamChanged();
		}
	}
}

LocalMediaStream.prototype.getUserMedia = function(type){

	navigator.webkitGetUserMedia(mediaConstraints[type], (function(stream){
		if (!gSettingsBar.toggles[type]) return;

		var audioTrack = stream.getAudioTracks()[0];
		if (audioTrack){
			var oldTrack = this.tracks.mic;
			this.stream.addTrack(audioTrack);
			if (oldTrack){
				this.stream.removeTrack(oldTrack);
				if (oldTrack != this.blankAudioTrack)
					oldTrack.stop();
			}
			this.tracks.mic = audioTrack;

			this.analyser.disconnect();
			this.ctx.createMediaStreamSource(this.stream).connect(this.analyser);
		}

		var videoTrack = stream.getVideoTracks()[0];
		if (videoTrack){
			var oldTrack = this.tracks[type];
			if (oldTrack){
				this.stream.removeTrack(oldTrack);
				oldTrack.stop();
			}
			this.stream.addTrack(this.tracks[type] = videoTrack);
		}

		this.onLocalStreamChanged();
	}).bind(this), function(err){
		console.log(err);
		alert("Could not get media stream. Please enable camera or microphone access!");
	});
}

LocalMediaStream.prototype.onLocalStreamChanged = function(first_argument) {
	this.renderStreams();
	gPeers.onLocalStreamChanged();
};
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

	this.createPeerConnection();

	this.createDOM();

	this.onStreamsChanged = this.onStreamsChanged.bind(this);
}

Peer.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = "peer";

	this.$root.dataset.vids = 0;

	this.$uid = this.$root.appendChild(document.createElement("span"));
	this.$uid.className = "span";
	this.$uid.textContent = this.uid;

	this.$ava = this.$root.appendChild(document.createElement("div"));
	this.$ava.className = 'ava';

	this.$streams = this.$root.appendChild(document.createElement("div"));
	this.$streams.className = "streams";

	this.$audio = this.$root.appendChild(document.createElement("audio"));
	gPeers.$root.appendChild(this.$root);


	this.$lroot = document.createElement("li");
	this.$lroot.className = "peer";
	gSidebar.$peerlist.appendChild(this.$lroot);
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
};

Peer.prototype.processMsg = function(msg){
	switch(msg.type){

		case "answer":
			this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg), function(){});
		break;

		case "icecandidate":
			try{
				this.peerConnection.addIceCandidate(new RTCIceCandidate(msg));
			}catch(e){}
		break;

		case "reqoffer":
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
}

Peer.prototype.sendOffer = function(){
	this.peerConnection.createOffer((function(offer) {
		this.peerConnection.setLocalDescription(offer, (function(){
			this.send(offer);
		}).bind(this));
	}).bind(this), null, rtcConstraints);
}

Peer.prototype.onLocalStreamChanged = function(){
	this.sendOffer();
}

Peer.prototype.setSelected = function(selected){
	this.$root.dataset.selected = selected;
}

Peer.prototype.onIceConnectionStateChange = function(){
	if (this.peerConnection.iceConnectionState == "disconnected")
		this.destroy();
}

Peer.prototype.destroy = function(){
	gPeers.$root.removeChild(this.$root);

	this.peerConnection.close();
	delete gPeers.peers[this.uid];
}
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
function Selection(){
	this.selection = [];
	this.rect = {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0
	};

	this.createDOM();
}


Selection.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = "selection";
	this.$root.dataset.visible = false;

	document.body.appendChild(this.$root);

	gPeers.$root.addEventListener('mousedown', this.onMouseDown.bind(this));
	window.addEventListener('mouseup', this.onMouseUp.bind(this));
};


Selection.prototype.onMouseDown = function(e){
	this.$root.style.width = 
	this.$root.style.height = "0px";

	this.$root.dataset.visible = true;

	this.rect.left = this.rect.bottom = this.initialX = e.pageX;
	this.rect.top = this.rect.bottom = this.initialY = e.pageY;

	this.onMouseMove = this.onMouseMove.bind(this);
	window.addEventListener('mousemove', this.onMouseMove);
};

Selection.prototype.onMouseMove = function(e){

	var endX = e.pageX;
	var endY = e.pageY;

	if (endX > this.initialX){
		
		this.rect.left = this.initialX;
		this.rect.right = endX;

		this.$root.style.left = this.initialX + "px"
		this.$root.style.width = (endX - this.initialX) + "px";
	}else{
		
		this.rect.left = endX;
		this.rect.right = this.initialX;

		this.$root.style.left = endX + "px";
		this.$root.style.width = (this.initialX - endX) + "px";
	}

	if (endY > this.initialY){
		this.rect.top = this.initialY;
		this.rect.bottom = endY;

		this.$root.style.top = this.initialY + "px";
		this.$root.style.height = (endY - this.initialY) + "px";
	}else{
		this.rect.top = endY;
		this.rect.bottom = this.initialY;

		this.$root.style.top = endY + "px";
		this.$root.style.height = (this.initialY - endY) + "px";
	}

	this.update();
};

Selection.prototype.update = function(){
	this.selection.length = 0;

	for (var k in gPeers.peers){
		var peer = gPeers.peers[k];
		var rect = peer.$root.getBoundingClientRect();

		if (rect.left <= this.rect.right &&
           rect.right >= this.rect.left &&
           rect.top <= this.rect.bottom &&
           rect.bottom >= this.rect.top
		){
			peer.setSelected(true);
			this.selection.push(peer);
		}else{
			peer.setSelected(false);
		}
	}
};

Selection.prototype.onMouseUp = function(e){
	this.onMouseMove(e);

	window.removeEventListener('mousemove', this.onMouseMove);
	this.$root.dataset.visible = false;	
};

function SettingsBar(){
	this.toggles = {};
	this.createDOM();
}

SettingsBar.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = "settingsbar";

	this.$root.addEventListener('click', this.onBarClick.bind(this));

	this.onToggleClicked = this.onToggleClicked.bind(this);
	this.$micToggle = this.addToggleButton("mic");
	this.$camToggle = this.addToggleButton("cam");
	this.$screenToggle = this.addToggleButton("screen");

	document.body.appendChild(
		this.$root
	);
}

SettingsBar.prototype.onBarClick = function(e){
	var $target = e.target;
	if ($target.dataset.btntype == 'toggle')
		this.onToggleClicked($target);
};

SettingsBar.prototype.onToggleClicked = function($btn){
	var cmd = $btn.dataset.cmd;

	var pressed = this.toggles[cmd] = ($btn.dataset.pressed == 'false');
	$btn.dataset.pressed = pressed;

	gLocalMediaStream.setTrackEnabled(cmd, pressed);
};

SettingsBar.prototype.addToggleButton = function(cmd, cb){
	var $btn = document.createElement("div");
	$btn.className = "btn";
	$btn.dataset.btntype = "toggle";
	$btn.dataset.cmd = cmd;
	$btn.dataset.pressed = false;

	this.$root.appendChild($btn);

	return $btn;
};
function Sidebar(){
	this.createDOM();
}

Sidebar.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = 'sidebar';

	this.$peerlist = this.$root.appendChild(
		document.createElement("ul")
	);
	this.$peerlist.className = 'peerlist';

	gApp.$mainTable.appendChild(this.$root);
}
function Sock(){
	this.sock = new WebSocket(
		"wss://" + document.domain
	);
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
window.onload = function(){
	window.onload = null;
	new AppController();
};