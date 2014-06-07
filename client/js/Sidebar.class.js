function Sidebar(){
	this.createDOM();
}

Sidebar.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = 'sidebar';

	gApp.$mainTable.appendChild(this.$root);
}