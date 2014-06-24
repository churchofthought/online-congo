(function(){

	var prefixes = ["moz", "webkit", "ms", "o"];

	function fixPrefixedMethods(obj, fnames){
		fnames.forEach(function(fname){
			if (obj[fname]) return;

			prefixes.some(function(prefix){
				var prefixedName = prefix + fname;
				if (obj[prefixedName]){
					obj[fname] = obj[prefixedName];
					return true;
				}
			});
		});
	}

	fixPrefixedMethods(window, ["AudioContext", "MediaStream", "RTCPeerConnection"]);
	fixPrefixedMethods(navigator, ["GetUserMedia"]);

})();