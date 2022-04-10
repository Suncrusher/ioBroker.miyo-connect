/*
 * Created with @iobroker/create-adapter v1.34.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
import Devices = require("./lib/services/devices");
import Circuits = require("./lib/services/circuits");
const axios = require("axios").default;

const host = "http://192.168.178.122";
const apiKey = "apiKey=953c3e07-4a36-44f9-8da5-fd5a61fc569f&=";

// Load your modules here, e.g.:
// import * as fs from "fs";

class MiyoConnect extends utils.Adapter {
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

		// Reset the connection indicator during startup
		this.setState("info.connection", false, true);

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		this.log.info("config option1: " + this.config.option1);
		this.log.info("config option2: " + this.config.option2);

		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/
		await this.setObjectNotExistsAsync("testVariable", {
			type: "state",
			common: {
				name: "testVariable",
				type: "boolean",
				role: "indicator",
				read: true,
				write: true,
			},
			native: {},
		});
		await this.setObjectNotExistsAsync("miyo", {
			type: "state",
			common: {
				name: "miyo",
				type: "number",
				role: "indicator",
				read: true,
				write: true,
			},
			native: {},
		});
		await this.setObjectNotExistsAsync("devices", {
			type: "folder",
			common: {
				name: "devices",
				type: "device",
				role: "meta",
				read: true,
				write: true,
			},
			native: {},
		});
		await this.setObjectNotExistsAsync("circuits", {
			type: "folder",
			common: {
				name: "circuits",
				type: "device",
				role: "meta",
				read: true,
				write: true,
			},
			native: {},
		});

		// In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
		this.subscribeStates("testVariable");
		// You can also add a subscription for multiple states. The following line watches all states starting with "lights."
		// this.subscribeStates("lights.*");
		// Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
		// this.subscribeStates("*");

		/*
			setState examples
			you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the variable testVariable is set to true as command (ack=false)
		await this.setStateAsync("testVariable", true);

		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
		await this.setStateAsync("testVariable", { val: true, ack: true });

		// same thing, but the state is deleted after 30s (getState will return null afterwards)
		//await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
		let result = await this.checkPasswordAsync("admin", "iobroker");
		this.log.info("check user admin pw iobroker: " + result);

		result = await this.checkGroupAsync("admin", "admin");
		this.log.info("check group user admin group admin: " + result);

		await this.getDeviceList();
		await this.getCircuitList();
	}

	async getDeviceList() {
		const url = host + "/api/device/all?" + apiKey;
		this.log.info("Miyo devices URL: " + url);

		axios
			.get(url)
			.then(async (response: any) => {
				// handle success

				//console.log(response.data);
				//console.log(response.status);
				//console.log(response.statusText);
				//console.log(response.headers);
				//console.log(response.config);

				this.log.info("All devices data: " + JSON.stringify(response.data, null, "  "));
				this.setStateAsync("miyo", response.status);
				const devices = new Devices(host);
				devices.data = response.data;

				for (const deviceId in response.data.params.devices) {
					const device = response.data.params.devices[deviceId];
					const id = device.id || "unknown";
					this.log.info("Device id = " + id);

					try {
						await this.setObjectNotExistsAsync("devices." + id, {
							type: "device",
							common: {
								name: device.deviceTypeId + "_" + id,
							},
							native: {},
						});

						await this.setObjectNotExistsAsync("devices." + id + ".status", {
							type: "channel",
							common: {
								name: "Status info",
							},
							native: {},
						});

						const keys = Object.keys(device);
						for (let i = 0; i < keys.length; i++) {
							const key = keys[i];
							console.log("Key : " + key + ", Value : " + device[key]);
							if (key != "stateTypes") {
								this.setObjectNotExists("devices." + id + "." + key, {
									type: "state",
									common: {
										name: key,
										type: "string",
										role: "meta",
										write: true,
										read: true,
									},
									native: {},
								});
								try {
									await this.setStateAsync("devices." + id + "." + key, {
										val: device[key],
										ack: true,
									});
								} catch (error: any) {
									console.log("error" + error);
									this.setStateAsync("miyo", false);
								}
							}
						}

						for (const stateTypesId in device.stateTypes) {
							const stateType = device.stateTypes[stateTypesId];
							this.setObjectNotExists("devices." + id + ".status." + stateType.type, {
								type: "state",
								common: {
									name: stateType.type,
									type: "string",
									role: "meta",
									write: true,
									read: true,
								},
								native: {},
							});
							try {
								await this.setStateAsync("devices." + id + ".status." + stateType.type, {
									val: stateType.value,
									ack: true,
								});
							} catch (error: any) {
								console.log("error" + error);
								this.setStateAsync("miyo", false);
							}
						}
					} catch (error: any) {
						console.log("error" + error);
						this.setStateAsync("miyo", false);
					}
				}
			})
			.catch((error: any) => {
				// handle error
				console.log("error" + error);
				this.setStateAsync("miyo", false);
			})
			.then(function () {
				// always executed
			});
	}

	async getCircuitList() {
		const url = host + "/api/circuit/all?" + apiKey;
		this.log.info("Miyo circuits URL: " + url);

		axios
			.get(url)
			.then(async (response: any) => {
				// handle success

				//console.log(response.data);
				//console.log(response.status);
				//console.log(response.statusText);
				//console.log(response.headers);
				//console.log(response.config);

				this.log.info("All circuits data: " + JSON.stringify(response.data, null, "  "));
				this.setStateAsync("miyo", response.status);
				const circuits = new Circuits(host);
				circuits.data = response.data;

				for (const circuitId in response.data.params.circuits) {
					const circuit = response.data.params.circuits[circuitId];
					const id = circuit.id || "unknown";
					this.log.info("Circuit id = " + id);

					try {
						await this.setObjectNotExistsAsync("circuits." + id, {
							type: "device",
							common: {
								name: circuit.name + "_" + id,
							},
							native: {},
						});

						const keys = Object.keys(circuit);
						for (let i = 0; i < keys.length; i++) {
							const key = keys[i];
							console.log("Key : " + key + ", Value : " + circuit[key]);
							if (key == "name" || key == "id" || key == "sensor") {
								this.setObjectNotExists("circuits." + id + "." + key, {
									type: "state",
									common: {
										name: key,
										type: "string",
										role: "meta",
										write: true,
										read: true,
									},
									native: {},
								});
								try {
									await this.setStateAsync("circuits." + id + "." + key, {
										val: circuit[key],
										ack: true,
									});
								} catch (error: any) {
									console.log("error" + error);
									this.setStateAsync("miyo", false);
								}
							}

							if (key == "params" || key == "sensorValve") {
								const cKeys = Object.keys(circuit[key]);
								for (let i = 0; i < cKeys.length; i++) {
									const cKey = cKeys[i];
									console.log("Key : " + cKey + ", Value : " + circuit[key][cKey]);
									this.setObjectNotExists("circuits." + id + "." + key + "." + cKey, {
										type: "state",
										common: {
											name: cKey,
											type: "string",
											role: "meta",
											write: true,
											read: true,
										},
										native: {},
									});
									try {
										await this.setStateAsync("circuits." + id + "." + key + "." + cKey, {
											val: circuit[key][cKey],
											ack: true,
										});
									} catch (error: any) {
										console.log("error" + error);
										this.setStateAsync("miyo", false);
									}
								}
							}
						}
						/*
						for (const paramsId in circuit.params) {
							const param = circuit.params[paramsId];
							this.setObjectNotExists("circuits." + id + ".params." + paramsId, {
								type: "state",
								common: {
									name: paramsId,
									type: "string",
									role: "meta",
									write: true,
									read: true,
								},
								native: {},
							});
							try {
								await this.setStateAsync("circuits." + id + ".params." + paramsId, {
									val: param.value,
									ack: true,
								});
							} catch (error: any) {
								console.log("error" + error);
								this.setStateAsync("miyo", false);
							}
						}*/
					} catch (error: any) {
						console.log("error" + error);
						this.setStateAsync("miyo", false);
					}
				}
			})
			.catch((error: any) => {
				// handle error
				console.log("error" + error);
				this.setStateAsync("miyo", false);
			})
			.then(function () {
				// always executed
			});
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private onUnload(callback: () => void): void {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();
		} catch (e) {
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
