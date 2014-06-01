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