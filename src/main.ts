/* eslint-disable prettier/prettier */
/*
 * Created with @iobroker/create-adapter v1.34.1
 */
/*
 TODO: Aktualisierungen einbauen
 TODO: Datentypen korrigieren, borderTop ist anders (z.B.)
*/

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
import { MiyoConnection } from "./miyoConnection";
import { MiyoStructureHandler } from "./miyoStructureHandler";
//import Devices = require("./lib/services/devices");
//import Circuits = require("./lib/services/circuits");

// eslint-disable-next-line @typescript-eslint/no-var-requires
//const axios = require("axios").default;

// Load your modules here, e.g.:
// import * as fs from "fs";

//let lastEvent: 0;
//let eventInterval: NodeJS.Timer | null;
//let connInterval: NodeJS.Timer | null;
//let connTimeout: NodeJS.Timeout | null;
let reconnectInterval: 30;
let miyoConnection: MiyoConnection | null;
let miyoStructureHandler: MiyoStructureHandler | null;

export class MiyoConnect extends utils.Adapter {
	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: "miyo-connect",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		// Initialize your adapter here
		//this.cleanData();

		// Reset the connection indicator during startup
		this.setState("info.connection", false, true);

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		//this.log.info("config host: " + this.config.host);
		//this.log.info("config apiKey: " + this.config.apiKey);

		this.log.info(`MiyoStructureHandler is creating the base data structure`);
		miyoStructureHandler = new MiyoStructureHandler(this);
		miyoStructureHandler.createInitialDataStructure();

		this.log.info(`Miyo Connect is trying to connect to ${this.config.host} with apiKey ${this.config.apiKey}`);

		//this.deleteData();
		//const devices = new Devices(this.config.host);
		const skipHttpRequests = false; //for testing

		miyoConnection = new MiyoConnection(this);
		await miyoConnection.connect(skipHttpRequests, reconnectInterval);

		//this.connect(true);

		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/
		/*await this.setObjectNotExistsAsync("testVariable", {
			type: "state",
			common: {
				name: "testVariable",
				type: "boolean",
				role: "indicator",
				read: true,
				write: true,
			},
			native: {},
		});*/

		// In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
		///this.subscribeStates("testVariable");
		// You can also add a subscription for multiple states. The following line watches all states starting with "lights."
		// this.subscribeStates("lights.*");
		// Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
		// this.subscribeStates("*");

		/*
			setState examples
			you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the variable testVariable is set to true as command (ack=false)
		//await this.setStateAsync("testVariable", true);

		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
		//await this.setStateAsync("testVariable", { val: true, ack: true });

		// same thing, but the state is deleted after 30s (getState will return null afterwards)
		//await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
		//let result = await this.checkPasswordAsync("admin", "iobroker");
		//this.log.info("check user admin pw iobroker: " + result);

		//result = await this.checkGroupAsync("admin", "admin");
		//this.log.info("check group user admin group admin: " + result);

		//await this.getDeviceList();
		//await this.getCircuitList();
	}

	/*cleanData(): void {
		this.getForeignObject("system.config", (errFO, obj) => {
			this.config.objUpdate = this.config.objUpdate || {};
			const id = `${this.name}.${this.instance}.miyo`;
			this.log.info("Types: " + this.checkTypes(id));
			this.delObject(id);
			this.log.info(`deleted: ${id}`);
			*/
	/*
			this.getStates(`${this.name}.${this.instance}.*`, (errGS, states) => {
				this.log.info("states: " + JSON.stringify(states));
				Object.keys(states.key).forEach(id => {
				}
				const ebene = id.toString().split('.');
				ebene.shift();
				ebene.shift();
				if (ebene[0] !== 'info' && ebene.length > 1) {
				  const ownID = ebene.join('.');
				  const ownIDsearch = ownID.toLowerCase();
				  if (this.config.objUpdate[ownIDsearch] && this.config.objUpdate[ownIDsearch].action === 'delete') {
					this.delObject(ownID);
					this.log.info(`deleted: ${ownID}`);
				  } else if (
					(!this.config.weather && ebene.length > 1 && ebene[1].toLowerCase() === 'weather') ||
					(!this.config.totalData && ebene.length > 3 && ebene[3].toLowerCase() === 'totaldata') ||
					(!this.config.statusData && ebene.length > 3 && ebene[3].toLowerCase() === 'statusdata') ||
					(!this.config.plantData && ebene.length > 1 && ebene[1].toLowerCase() === 'plantdata') ||
					(!this.config.deviceData && ebene.length > 3 && ebene[3].toLowerCase() === 'devicedata') ||
					(!this.config.historyLast && ebene.length > 3 && ebene[3].toLowerCase() === 'historylast') ||
					(!this.config.chartLast && ebene.length > 3 && ebene[3].toLowerCase() === 'chart')
				  ) {
					this.delObject(ownID);
					this.log.info(`deleted: ${ownID}`);
				  } else if (this.objNames[ownIDsearch]) {
					this.log.warn(`${this.objNames[ownIDsearch]} exists twice: ${ownID}`);
				  } else if (
					ebene.length > 5 &&
					ebene[3].toLowerCase() === 'historylast' &&
					(ebene[4] === 'calendar' || ebene[4] === 'time') &&
					(ebene[5] === 'year' ||
					  ebene[5] === 'month' ||
					  ebene[5] === 'dayOfMonth' ||
					  ebene[5] === 'hourOfDay' ||
					  ebene[5] === 'minute' ||
					  ebene[5] === 'second')
				  ) {
					this.delObject(ownID);
					this.log.info(`deleted: ${ownID}`);
				  } else {
					this.objNames[ownIDsearch] = ownID;
				  }
				});
			}*/
	/*		});
	}*/

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private onUnload(callback: () => void): void {
		if (miyoConnection) {
			miyoConnection.onUnload(callback);
		} else {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  */
	// private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 */
	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  */
	// private onMessage(obj: ioBroker.Message): void {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
	// 		}
	// 	}
	// }
}

if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new MiyoConnect(options);
} else {
	// otherwise start the instance directly
	(() => new MiyoConnect())();
}
