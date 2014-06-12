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

	this.hideMenuBtn = this.hideMenuBtn.bind(this);

	this.$menuBtn = this.$root.appendChild(document.createElement("div"));
	this.$menuBtn.className = "menubtn btn";
	this.$menuBtn.dataset.btntype = "menu";

	this.$menuBtn.addEventListener('click', this.onMenuBtnClicked.bind(this));

	this.$menu = this.$menuBtn.appendChild(document.createElement("div"));
	this.$menu.className = 'menu';


	this.addMenuCommand("Change Nickname", "changenick");

	document.body.appendChild(
		this.$root
	);
}

SettingsBar.prototype.onBarClick = function(e){
	var $target = e.target;
	switch ($target.dataset.btntype){
		case "toggle":
		this.onToggleClicked($target);
		break;

		case "menuitem":
		this.onMenuItemClicked($target);
	}
};

SettingsBar.prototype.onMenuBtnClicked = function(e){
	var $target = e.target;

	if ($target.dataset.cmd){
		this.onMenuItemClicked($target);
		return;
	}

	if ($target != this.$menuBtn) return;

	if ((this.$menuBtn.dataset.showmenu = !(this.$menuBtn.dataset.showmenu == "true"))){
		setTimeout((function(){
			window.addEventListener('click', this.hideMenuBtn);
		}).bind(this));
	}
};

SettingsBar.prototype.hideMenuBtn = function(){
	window.removeEventListener('click', this.hideMenuBtn);
	this.$menuBtn.dataset.showmenu = false;
}

SettingsBar.prototype.onMenuItemClicked = function($item){
	switch ($item.dataset.cmd){
		case "changenick":
		gUser.promptToChangeName();
		break;
	}
}

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

SettingsBar.prototype.addMenuCommand = function(label, cmd){
	var $opt = document.createElement("div");
	$opt.textContent = label;
	$opt.dataset.cmd = cmd;
	this.$menu.appendChild($opt);
};