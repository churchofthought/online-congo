var gApp;
var gSock;
var gPeers;
var gLocalMediaStream;
var gSelection;
var gContextMenu;
var gSettingsBar;
var gSidebar;

function AppController(){
	gApp = this;

	gSock = this.sock = new Sock();
	gUser = this.user = new User();

	this.sock.addEventListener('message', this.onSockMsg.bind(this)); 
	this.sock.addEventListener('open', this.onSockOpen.bind(this));


	gSettingsBar = this.settingsBar = new SettingsBar();
	this.createMainTable();

	gSidebar = this.sideBar = new Sidebar();

	gLocalMediaStream = this.localMediaStream = new LocalMediaStream();

	gPeers = this.peers = new Peers();

	gSelection = this.selection = new Selection();

	

	gContextMenu = this.contextMenu = new ContextMenu();
}

AppController.prototype.createMainTable = function(){
	this.$mainTable = document.createElement("div");
	this.$mainTable.className = 'maintbl';
	document.body.appendChild(this.$mainTable);
}

AppController.prototype.onSockOpen = function(){
	this.sock.sendAll({
		type: 'uinfo',
		name: gUser.name
	});
};

AppController.prototype.onSockMsg = function(e){
	var wrapper = JSON.parse(e.data);
	var uid = wrapper.uid;
	var msg = wrapper.msg;

	if (msg instanceof Array){
		msg.forEach((function(m){
			this.peers.processMsg(uid, m);
		}).bind(this));
	}
	else
		this.peers.processMsg(uid, msg);
};

AppController.prototype.kick = function(sel){
	this.sock.sendAdmin({
		type: 'kick',
		uids: sel.map(function(p){
			return p.uid;
		})
	});
};