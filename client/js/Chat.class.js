function Chat(){
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



	this.$input.addEventListener('keydown', this.onInpKeyDown.bind(this));
	this.$input.addEventListener('propertychange', this.onInpKeyDown.bind(this));

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
	requestAnimationFrame(this.formSubmit);

	if ((e.keyCode != 13 && e.keyCode != 14) || e.shiftKey || e.altKey) return;

	e.preventDefault();

	var val = this.$input.value;
	gPeers.sendPubChatMsg(val);
	this.$input.value = '';	
};

Chat.prototype.onPubMsg = function(peer, date, msg){
	date = new Date(+date);

	var $msg = document.createElement("div");

	var $icon = $msg.appendChild(document.createElement("div"));

	var $peer = $msg.appendChild(document.createElement("div"));
	$peer.textContent = peer.name;


	var $date = $msg.appendChild(document.createElement("div"));
	$date.textContent = date.toLocaleTimeString().replace(/:\d\d /, ' ');

	var $txt = $msg.appendChild(document.createElement("div"));
	$txt.textContent = msg;

	this.$msgs.appendChild(
		$msg
	);
};