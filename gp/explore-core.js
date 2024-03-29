/*
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2006 CardContact Software & System Consulting
 * |'##> <##'|  Andreas Schwier, 32429 Minden, Germany (www.cardcontact.de)
 *  ---------
 *
 *  This file is part of OpenSCDP.
 *
 *  OpenSCDP is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License version 2 as
 *  published by the Free Software Foundation.
 *
 *  OpenSCDP is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with OpenSCDP; if not, write to the Free Software
 *  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 *  Global Platform Card Explorer
 */

load("tools/CardOutlineFactory2.0.js");



//
// CTOR - Outline node for data object retrievable with GET_DATA
//
function JCOPOutlineDataObject(factory, df, idtype, id, name, format) {
	if (arguments.length == 0)
		return;

	this.factory = factory;
	this.df = df;
	this.idtype = idtype;
	this.id = id;
	this.format = format;

	// Create OutlineNode object and register in OutlineEF object
	// print(name + "(" + id.toString(16) + ")");
	var view = new OutlineNode(name + "(" + id.toString(16) + ")", true);
	view.setIcon("document");
	view.setUserObject(this);
	this.view = view;
}



//
// Event handler for expand notification
//
JCOPOutlineDataObject.prototype.expandListener = function() {
	if (this.expanded)
		return;

	var view = this.view;

	if (this.idtype == 0) {
		var bs = this.df.sendApdu(0x00, 0xCA, this.id >> 8, this.id & 0xFF, 0);
	} else if (this.idtype == 4) {
		var bs = this.df.sendApdu(0x80, 0xCA, 0x00, 0xFE, ByteString.valueOf(this.id, 2), 0);
	} else {
		if (this.id == 0x46) {
			var id = ByteString.valueOf(this.id, 2);
		} else {
			var id = ByteString.valueOf(this.id);
		}
		var bs = this.df.sendApdu(0x80, 0xCA, 0xFF, 0x01, id, 0);
	}

	if (this.df.card.SW != 0x9000) {
		print("Error getting object: " + this.df.card.SWMSG);
	} else {
		var bindata = this.factory.newDataOutline(bs, this.format);
		view.insert(bindata.view);
	}

	this.expanded = true;
}




function OutlineCardManager(factory, application) {
	this.factory = factory;
	this.application = application;
	this.card = application.card; 	// Required by OutlineDataObject

	this.issuerSecurityDomain = null;
	this.applications = null;
	this.loadfiles = null;

	// Create OutlineNode object and register in OutlineCardManager object
	var view = new OutlineNode("Card Manager (" + application.aid + ")", true);
	view.setUserObject(this);
	view.setContextMenu(["Authenticate"]);
	this.view = view;

	this.authenticated = false;
}



//
// Event handler for expand notifications
//
OutlineCardManager.prototype.expandListener = function() {

	if (this.expanded)
		return;

	var view = this.view;

	try	{
		var fcp = this.application.select();
		this.fcp = fcp;

		if (fcp && (fcp.length > 1)) {
			var fcpmodel = this.factory.newOutlineFCP(fcp);
			view.insert(fcpmodel.view);
		}

		var d = new JCOPOutlineDataObject(this.factory, this.application, 0, 0x42, "Issuer Identification Number", "");
		view.insert(d.view);

		var d = new JCOPOutlineDataObject(this.factory, this.application, 0, 0x45, "Card Image Number", "");
		view.insert(d.view);

		var d = new JCOPOutlineDataObject(this.factory, this.application, 0, 0x66, "Card Data", "asn1");
		view.insert(d.view);

		var d = new JCOPOutlineDataObject(this.factory, this.application, 0, 0xE0, "Key Information Template", "tlvlist");
		view.insert(d.view);

		var d = new JCOPOutlineDataObject(this.factory, this.application, 0, 0xC1, "Sequence Counter of the default Key Version Number", "");
		view.insert(d.view);

		var d = new JCOPOutlineDataObject(this.factory, this.application, 0, 0xC2, "Confirmation Counter", "");
		view.insert(d.view);

		print(this.card.profile.CardManufacturerProduct.Name);
		if (this.card.profile.CardManufacturerProduct.Name.startsWith("JCOP")) {
			var d = new JCOPOutlineDataObject(this.factory, this.application, 0, 0x46, "Pre-issuance Data (JCOP)", "");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 0, 0x67, "Card Module Capabilities (JCOP)", "");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 0, 0x9F7F, "Card Production Life Cycle (JCOP)", "");
			view.insert(d.view);
		}

		if (this.card.profile.CardManufacturerProduct.Name.startsWith("JCOP 4")) {
			var d = new JCOPOutlineDataObject(this.factory, this.application, 4, 0xDF25, "Platform ID (JCOP 4)", "asn1");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 4, 0xDF25, "Available memory (JCOP 4)", "asn1");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 0, 0xFF21, "Extended card resources (JCOP 4)", "asn1");
			view.insert(d.view);
		}

		if (this.card.profile.CardManufacturerProduct.Name == "JCOP 3 SECID P60 CS (OSB)") {
			var d = new JCOPOutlineDataObject(this.factory, this.application, 1, 0x88, "FIPS compliance (JCOP)", "");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 1, 0x8C, "Max RSA key size (JCOP)", "");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 1, 0x97, "Secure Channel Protocol (JCOP)", "");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 1, 0xA3, "Biometrics options (JCOP)", "");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 1, 0xA5, "GET DATA accepted on CL interface (JCOP)", "");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 1, 0xAA, "Max ECC key size (JCOP)", "");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 1, 0xAD, "JC API secure RNG source (JCOP)", "");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 1, 0xB1, "Fast personalization (JCOP)", "");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 1, 0xB9, "Available memory (JCOP)", "");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 1, 0x8A, "IO EMV compliance (JCOP)", "");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 1, 0x9C, "IO protocol support (JCOP)", "");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 1, 0xAC, "IO WWT values (JCOP)", "");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 1, 0xB0, "IO contactless interface parameters (JCOP)", "");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 1, 0xBB, "IO ATS (JCOP)", "");
			view.insert(d.view);

			var d = new JCOPOutlineDataObject(this.factory, this.application, 1, 0xC6, "IO ATQA (JCOP)", "");
			view.insert(d.view);
		}
	}

	catch(e) {
		print(e);
	}

	this.expanded = true;
}




OutlineCardManager.prototype.authenticate = function() {

	if (!this.expanded) {
		print("Please expand card manager before authentication");
		return;
	}

	this.application.run("IDENTIFY");
	this.authenticated = true;

	var filter = new ByteString("4F00", HEX);
	var view = this.view;

	if (this.issuerSecurityDomain) {
		view.remove(this.issuerSecurityDomain.view);
	}

	var r = this.application.sendApdu(0x80, 0xF2, 0x80, 0x00, filter, 0x00, [0x9000]);
	this.issuerSecurityDomain = new OutlineModuleList(this.application, "Issuer Security Domain", r, 0, false);
	view.insert(this.issuerSecurityDomain.view);

	if (this.applications) {
		view.remove(this.applications.view);
	}

	var r = this.application.sendApdu(0x80, 0xF2, 0x40, 0x00, filter, 0x00, [0x9000, 0x6A88]);
	this.applications = new OutlineModuleList(this.application, "Application Instances", r, 1, true);
	view.insert(this.applications.view);

	if (this.loadfiles) {
		view.remove(this.loadfiles.view);
	}

	// 2.1.x cards support option P1 = 0x10 to list load files and modules
	// 2.0.1 cards only support P1 = 0x20 to list load files
	var r = this.application.sendApdu(0x80, 0xF2, 0x10, 0x00, filter, 0x00, [0x9000, 0x6A88, 0x6A86, 0x6310]);
	if (this.application.card.SW == 0x6A86) {
		var r = this.application.sendApdu(0x80, 0xF2, 0x20, 0x00, filter, 0x00, [0x9000, 0x6A88, 0x6310]);
		this.loadfiles = new OutlineModuleList(this.application, "Load Files", r, 2, true);
		view.insert(this.loadfiles.view);
	} else {
		this.loadfiles = new OutlineModuleList(this.application, "Load Files and Modules", r, 3, true);
		view.insert(this.loadfiles.view);
	}
}


//
// Action handler
//
OutlineCardManager.prototype.actionListener = function(node, action) {
	switch(action) {
		case "Authenticate":
			node.userObject.authenticate();
			break;
	}
}



//
// Return a string for a Global Platform Life Cycle Status
//
function lcs2string(type, lcs) {
	s = "UNKNOWN";
	if (type == 0) {		// Issuer Security Domain
		switch(lcs) {
		case 0x01: s = "OP_READY"; break;
		case 0x07: s = "INITIALIZED"; break;
		case 0x0F: s = "SECURED"; break;
		case 0x7F: s = "CARD_LOCKED"; break;
		case 0xFF: s = "TERMINATED"; break;
		}
	} else {
		switch(lcs & 0x8F) {
		case 0x01: s = "LOADED"; break;
		case 0x03: s = "INSTALLED"; break;
		case 0x07: s = "SELECTABLE"; break;
		case 0x0F: s = "PERSONALIZED"; break;
		case 0x8F: s = "LOCKED"; break;
		}
	}
	return s;
}



//
// Return a string for a Global Platform application privilege
//
function priv2string(priv) {
	if (priv == 0)
		return("");

	s = "(";
	if (priv & 0x80)
		s += "SecDom ";
	if (priv & 0x40)
		s += "DAP ";
	if (priv & 0x20)
		s += "DelMan ";
	if (priv & 0x10)
		s += "CrdLck ";
	if (priv & 0x08)
		s += "CrdTrm ";
	if (priv & 0x04)
		s += "DefSel ";
	if (priv & 0x02)
		s += "CVM ";
	if (priv & 0x01)
		s += "MDAP ";
	s += ")";
	return s;
}



function nameForAID(aid) {
	var name = nameForAID.table[aid.toString(HEX)];
	if (typeof(name) == "undefined") {
		return "";
	}
	return " (" + name + ")";
}

nameForAID.table = {
	"A000000151000000": "Card Manager",
	"A0000001515350": "SSD Creation Package",
	"A000000151535041": "SSD Creation Package Applet",
	"A0000000620202": "javacardx.biometry",
	"A0000000620204": "javacardx.biometry1toN",

	"D276000085304A434F9000": "Mifare Plus EV1 Package",
	"D276000085304A434F900001": "Mifare Plus EV1 Applet",
	"D276000085304A434F9001": "Mifare DESFire EV1 Package",
	"D276000085304A434F900101": "Mifare DESFire EV1 Applet",

	"A00000016443446F634C697465": "Athena CDoclite Package",

	"E82B0601040181C31F0201": "SmartCard-HSM",
	"E82B0601040181C31F027F01": "de.cardcontact.smartcardhsm.applet",
	"E82B0601040181C31F027F0101": "de.cardcontact.smartcardhsm.applet.HSM",

	"E82B0601040181C31F027F04": "de.cardcontact.smartcardhsm.biomock",
	"E82B0601040181C31F027F0401": "de.cardcontact.smartcardhsm.biomock.BioMock1",
	"E82B0601040181C31F027F0402": "de.cardcontact.smartcardhsm.biomock.BioMock2",

	"E82B0601040181C31F027F09": "org.openscdp.javacard",
	"E82B0601040181C31F027F0901": "org.openscdp.javacard.APDUTest",
	"E82B0601040181C31F0202": "APDUTest"

}


//
// Create an outline for AID identified objects managed by the card manager
//
// cm		Card manager application object
// name		Name of module list
// desc		Descriptor returned by GET_STATUS
// type		0 - Issuer Security Domain, 1 - Application, 2 - Load File
// deletable	true, if module can be deleted
//
function OutlineModuleList(cm, name, desc, type, deletable) {
	this.cm = cm;
	this.name = name;

	var view = new OutlineNode(name, true);
	view.setUserObject(this);
	this.view = view;

	var offset = 0;
	while(offset < desc.length) {
		var lenaid = desc.byteAt(offset++);
		var aid = desc.bytes(offset, lenaid);
		offset += lenaid;
		var lcs = desc.byteAt(offset++);
		var priv = desc.byteAt(offset++);

		var name = aid.toString(16) + nameForAID(aid) + " " + lcs2string(type, lcs) + " " + priv2string(priv);
		var n = new OutlineModuleListEntry(cm, name, aid, deletable);

		view.insert(n.view);

		if (type == 3) {
			var count = desc.byteAt(offset++);
			while (count--) {
				lenaid = desc.byteAt(offset++);
				aid = desc.bytes(offset, lenaid);
				offset += lenaid;

				var m = new OutlineNode(aid.toString(16) + nameForAID(aid));
				n.view.insert(m);
			}
		}
	}
}



function OutlineModuleListEntry(cm, name, aid, deletable) {
	this.cm = cm;
	this.aid = aid;

	var view = new OutlineNode(name, false);
	view.setUserObject(this);
	if (deletable) {
		view.setContextMenu(["Delete"]);
	}
	this.view = view;
}



OutlineModuleListEntry.prototype.actionListener = function(node, action) {
	var aid = node.userObject.aid;

/*
	var b = new ByteString("4F", HEX);
	b = b.concat(aid.getLV(TLV.EMV));

	this.cm.sendApdu(0x80, 0xE4, 0x00, 0x00, b);
*/
	this.cm.deleteAID(aid);
	print("Delete " + aid + " : " + this.cm.card.SWMSG);

	node.remove();
}




//
// Overwrite default outline factory to tailor some nodes
//
function GPCardOutlineFactory() {

}

// Inherit from prototype
GPCardOutlineFactory.prototype = new CardOutlineFactory();

// Restore constructor
GPCardOutlineFactory.constructor = GPCardOutlineFactory;

// Overwrite newOutlineApplet() function
GPCardOutlineFactory.prototype.newOutlineApplet = function(instance) {
	assert(instance instanceof GPSecurityDomain);
	return new OutlineCardManager(this, instance);
}
