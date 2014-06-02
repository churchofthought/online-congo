var gApp;
var gSock;
var gPeers;
var gLocalMediaStream;
var gSelection;
var gContextMenu;
var gUID;
var gSettingsBar;
var gSidebar;

function AppController(){
	gApp = this;

	gSock = this.sock = new Sock();
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
		type: 'reqoffer'
	});
};

AppController.prototype.onSockMsg = function(e){
	var wrapper = JSON.parse(e.data);
	var uid = wrapper.uid;
	var msg = wrapper.msg;

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