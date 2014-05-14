function onAddStream(e) {
	var vid = document.body.appendChild(
		document.createElement("video")
	);
	vid.autoplay = true;
	vid.src = window.URL.createObjectURL(e.stream);
};

function sockSend(uid, msg){
	sock.send(
		JSON.stringify({
			uid: uid, 
			msg: msg
		})
	);
}

function sockSendAll(msg){
	sockSend("*", msg);
}

webkitRTCPeerConnection.prototype.send = function(msg){
	sockSend(this.uid, msg);
}


var userStream;
var offerSent;
var connections = {};
var sock = new WebSocket(
	"ws://localhost:8888/"
);

function onIceCandidate(event){
	if (!event.candidate) return;

	var candidate = event.candidate;
	if (!candidate.type)
		candidate.type = 'icecandidate';

	event.target.send(candidate);
}

sock.onmessage = function(event) {

	var wrapper = JSON.parse(event.data);
	var uid = wrapper.uid;
	var msg = wrapper.msg;

	var peerConnection = connections[uid];

	if (!peerConnection){
		connections[uid] = peerConnection = new webkitRTCPeerConnection({ 
			iceServers: [{ 
				url: "stun:stun.l.google.com:19302" 
			}]
		}, {
			optional: [],
			mandatory: {
					OfferToReceiveAudio: true,
					OfferToReceiveVideo: true
			}
		});
		peerConnection.uid = uid;
		peerConnection.onicecandidate = onIceCandidate;
		peerConnection.onaddstream = onAddStream;

		peerConnection.addStream(userStream);
	}


	switch(msg.type){
		case "answer":
			peerConnection.setRemoteDescription(new RTCSessionDescription(msg), function(){});
		break;

		case "icecandidate":
			peerConnection.addIceCandidate(new RTCIceCandidate(msg));
		break;

		case "reqoffer":
			peerConnection.createOffer(function(offer) {
				peerConnection.setLocalDescription(offer, function(){
					peerConnection.send(offer);
				});
			}, null, {
				optional: [],
				mandatory: {
					OfferToReceiveAudio: false,
					OfferToReceiveVideo: true
				}
			});
		break;

		case "offer":
			peerConnection.setRemoteDescription(new RTCSessionDescription(msg), function() {
				peerConnection.createAnswer(function(answer) {
					peerConnection.setLocalDescription(answer, function() {
						peerConnection.send(answer);
					});
				}, null, {
					optional: [],
					mandatory: {
						OfferToReceiveAudio: false,
						OfferToReceiveVideo: true
					}
				});
			});
		break;
	}

	connections[uid] = peerConnection;
};

sock.onopen = function (event) {
	
};


navigator.webkitGetUserMedia({
	video: true,
	audio: false
}, function(stream){
	userStream = stream;
	askPeersForOffers();
}, function(err){
	console.trace();
	console.log(err);
});

function askPeersForOffers(){
	sockSendAll({
		type: "reqoffer"
	});
}