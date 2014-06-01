function Sidebar(){


}

Sidebar.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = 'sidebar';

	document.body.appendChild(this.$root);
}