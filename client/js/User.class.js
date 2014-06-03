function User(){
	this.restore();
}

User.prototype.getInfo = function(){
	return {
		type: 'uinfo',
		name: this.name
	};
};

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
	this.name = localStorage.name = name;
	if (gSock.ready())
		gSock.sendAll({
			type: 'uinfo',
			name: this.name
		});
};

User.prototype.setUID = function(uid){
	this.uid = uid;
}