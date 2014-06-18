function ContextMenu(){
	this.createDOM();
	this.addCommand("Kick", "kick");
	this.addCommand("Ban", "ban");
}

ContextMenu.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = 'ctx';
	this.$root.dataset.visible = false;
	this.$root.style.left = 0;
	this.$root.style.top = 0;

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
	var $li = document.createElement("div");
	$li.dataset.cmd = cmd;
	$li.textContent = label;

	this.$root.appendChild($li);
};