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

	this.$input = this.$root.appendChild(
		document.createElement("textarea")
	);

	this.$input.addEventListener('keydown', this.onInpKeyDown.bind(this));

	gSidebar.$root.appendChild(this.$root);
};

Chat.prototype.onInpKeyDown = function(e){

	if ((e.keyCode != 13 && e.keyCode != 14) || e.shiftKey || e.altKey) return;

	e.preventDefault();

	var val = this.$input.value;
	gPeers.sendPubChatMsg(val);
	this.$input.value = '';
};

Chat.prototype.onPubMsg = function(peer, msg){
	var $msg = document.createElement("div");

	var $peer = $msg.appendChild(document.createElement("div"));
	$peer.textContent = peer.name;

	var $txt = $msg.appendChild(document.createElement("div"));
	$txt.textContent = msg;

	this.$msgs.appendChild(
		$msg
	);
};