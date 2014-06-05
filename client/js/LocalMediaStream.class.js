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
	this.analyser = gAudioContext.createAnalyser();
	this.analyserArray = new Uint8Array(this.analyser.frequencyBinCount);

	this.stream = new webkitMediaStream([
		this.blankAudioTrack = 
			gAudioContext.createMediaStreamDestination()
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
			gAudioContext.createMediaStreamSource(this.stream).connect(this.analyser);
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