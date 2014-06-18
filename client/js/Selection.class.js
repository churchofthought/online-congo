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
	this.$root.style.left = 0;
	this.$root.style.top = 0;
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
