var gApp;
var gSock;
var gPeers;
var gLocalMediaStream;
var gSelection;
var gContextMenu;
var gSettingsBar;
var gSidebar;
var gUser;
var gAudioContext = new webkitAudioContext();
var gChat;

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

	gChat = this.chat = new Chat();

	gSelection = this.selection = new Selection();

	

	gContextMenu = this.contextMenu = new ContextMenu();
}

AppController.prototype.createMainTable = function(){
	this.$mainTable = document.createElement("div");
	this.$mainTable.className = 'maintbl';
	document.body.appendChild(this.$mainTable);
}

AppController.prototype.onSockOpen = function(){
	this.sock.sendServer("setname", gUser.name);
};

AppController.prototype.onSockMsg = function(e){
	var msg = JSON.parse(e.data);

	// todo 
	// combined message packing
	// 
	// if (msg instanceof Array){
	// 	msg.forEach((function(m){
	// 		this.peers.processMsg(uid, m);
	// 	}).bind(this));
	// }
	// else
	// 
	
	switch (msg[0]){
		case cmdt.server:
		this.peers.processServerMsg(msg[1], msg.slice(2));
		break;

		default:
		this.peers.processUserMsg(msg[0], msg[1], msg.slice(2));
	}	
};

AppController.prototype.kick = function(sel){
	this.sock.arrSendServer('kick', sel.map(function(p){
		return p.uid;
	}));
};