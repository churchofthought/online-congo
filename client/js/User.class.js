function User(){
	this.restore();
}

User.prototype.restore = function(){
	this.setName(localStorage.name);
	
	if (!this.name)
		this.promptToChangeName();
};

User.prototype.promptToChangeName = function(){
	var name;

	do {
		name = prompt("Please enter your name:").trim();
	} while(!name);

	this.setName(name);
}

User.prototype.setName = function(name){
	// todo
	this.name = localStorage.name = name;
	if (gSock.ready())
		gSock.sendServer('setname', this.name);
};

User.prototype.setUID = function(uid){
	this.uid = uid;
};