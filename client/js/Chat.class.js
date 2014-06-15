function Chat(){
	this.pubMsgs = [];

	this.createDOM();
}

Chat.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = 'chat';

	this.$msgs = this.$root.appendChild(
		document.createElement("div")
	);
	this.$msgs.className = 'msgs';


	this.$form = this.$root.appendChild(
		document.createElement('form')
	);
	this.$form.action = 'about:blank';
	this.$form.target = 't';

	this.$input = this.$form.appendChild(
		document.createElement("textarea")
	);
	this.$input.name = 't';

	this.$input.wrap = 'hard';



	this.$iframe = document.createElement('iframe');
	this.$iframe.name = 't';
	this.$iframe.addEventListener('load', this.onIframeLoad.bind(this));
	document.body.appendChild(this.$iframe);



	this.curVal = "";
	this.onInpKeyDown = this.onInpKeyDown.bind(this);
	this.$input.addEventListener('keydown', this.onInpKeyDown);
	this.$input.addEventListener('propertychange', this.onInpKeyDown);
	this.$input.addEventListener('change', this.onInpKeyDown);
	this.$input.addEventListener('input', this.onInpKeyDown);

	gSidebar.$root.appendChild(this.$root);

	this.formSubmit = this.formSubmit.bind(this);
};

Chat.prototype.onIframeLoad = function(){
	var lines = 1;
	var regex = /(?:%0[DA])+/gi;

	var inpval = this.$iframe.contentWindow.location.search;

	while (regex.exec(inpval))
		++lines;

	this.$input.style.height = 1.25 * Math.min(lines, 3) + 'em';
};


Chat.prototype.formSubmit = function(){
	this.$form.submit();
};

Chat.prototype.onInpKeyDown = function(e){
	var val = this.$input.value;

	if ((e.keyCode == 13 || e.keyCode == 14) && !e.shiftKey && !e.altKey && val){
		e.preventDefault();
		gPeers.sendPubChatMsg(val);
		this.$input.value = val = '';	
	}

	if (this.curVal != val){
		this.curVal = val;
		requestAnimationFrame(this.formSubmit);
	}
};


function binaryIndexOfDates(arr, searchElement) {
  var minIndex = 0;
  var maxIndex = arr.length - 1;
  var currentIndex;
  var currentElement;

  while (minIndex <= maxIndex) {
      currentIndex = (minIndex + maxIndex) / 2 | 0;
      currentElement = +(arr[currentIndex].dataset.d);

      if (currentElement < searchElement) {
          minIndex = currentIndex + 1;
      }
      else if (currentElement > searchElement) {
          maxIndex = currentIndex - 1;
      }
      else {
          return currentIndex;
      }
  }

  return currentIndex;
};

Chat.prototype.gotPubHistory = function(msgs){

	var $dates = Array.prototype.slice.call(
		this.$msgs.querySelectorAll('.msgs > div > div:nth-child(2n + 3)')
	);
	
	for (var i = 0; i < msgs.length; i += 3){
		var name = msgs[i];
		var date = msgs[i + 1];
		var msg = msgs[i + 2];

		var insertionIdx = binaryIndexOfDates($dates, date);
		var $insertionNode = $dates[insertionIdx];
		if ($insertionNode){
			var $ns = $insertionNode.nextSibling;
			if ($insertionNode.parentNode.childNodes[1].textContent == name){
				// dupe message
				if ($insertionNode.dataset.d == date && $ns.textContent == msg)
					continue;

				$dates.splice(insertionIdx + 1, 0, 
					this.insertPubMsg(null, date, msg, $ns)
				);
			}else{
				if ($ns == $ns.parentNode.lastChild)
					$dates.splice(insertionIdx + 1, 0, 
						this.insertPubMsg(name, date, msg, $insertionNode.parentNode)
					);
				else{
					// todo
					// we need to split the message up, and insert between it
				}
			}
		}else{
			$dates.push(
				this.insertPubMsg(name, date, msg, null)
			);
		}

		this.pubMsgs.push(name);
		this.pubMsgs.push(date);
		this.pubMsgs.push(msg);
	}
};

Chat.prototype.onPubMsg = function(name, date, msg){
	this.pubMsgs.push(name);
	this.pubMsgs.push(date);
	this.pubMsgs.push(msg);

	var $msg = this.$msgs.lastChild;

	if ($msg && $msg.childNodes[1].textContent == name){
		this.insertPubMsg(null, date, msg, $msg.lastChild);
	}else{
		this.insertPubMsg(name, date, msg, $msg);
	}
};

Chat.prototype.insertPubMsg = function(name, date, msg, $node){
	var $date;

	if (name){
		var $msg = document.createElement("div");

		var $icon = $msg.appendChild(document.createElement("div"));

		var $peer = $msg.appendChild(document.createElement("div"));
		$peer.textContent = name;

		$date = $msg.appendChild(document.createElement("div"));

		this.$msgs.insertBefore($msg, $node && $node.nextSibling);
	}else{
		$date = $node.parentNode.insertBefore(document.createElement("div"), $node.nextSibling);
	}

	$date.dataset.d = date;
	$date.textContent = (new Date(+date)).toLocaleTimeString().replace(/:\d\d /, ' ');

	var $txt = $date.parentNode.insertBefore(document.createElement("div"), $date.nextSibling);
	$txt.textContent = msg;

	var $par = $date.parentNode;
	if ($par.childNodes.length == 4)
		$par.scrollIntoView(true);
	else
		$date.scrollIntoView(true);

	return $date;
}