function Sidebar(){
	this.createDOM();
}

Sidebar.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = 'sidebar';

	this.$peerlist = this.$root.appendChild(
		document.createElement("div")
	);
	this.$peerlist.className = 'peerlist';

	gApp.$mainTable.appendChild(this.$root);
}