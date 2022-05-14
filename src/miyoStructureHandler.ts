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
import { MiyoConnect } from "./main";
import Devices = require("./lib/services/devices");
import Circuits = require("./lib/services/circuits");

let adapter: MiyoConnect;
let initialized = false;

export class MiyoStructureHandler {
	constructor(protected readonly a: MiyoConnect) {
		adapter = a;
	}

	private init(): void {
		initialized = true;
	}

	public async createInitialDataStructure(): Promise<boolean> {
		if (!initialized) {
			this.init();
		}
		//For every state in the system there has to be also an object of type state /
		await adapter.setObjectNotExistsAsync("lastRefresh", {
			type: "state",
			common: {
				name: "lastRefresh",
				type: "string",
				role: "indicator",
				read: true,
				write: true,
			},
			native: {},
		});
		await adapter.setObjectNotExistsAsync("devices", {
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
		await adapter.setObjectNotExistsAsync("circuits", {
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

		await adapter.setStateAsync("lastRefresh", new Date().toUTCString());

		return true;
	}

	public async handleDeviceData(deviceJSONData: string): Promise<void> {
		const devices = new Devices();
		devices.data = deviceJSONData;

		for (const deviceId in devices.data.params.devices) {
			const device = devices.data.params.devices[deviceId];
			const id = device.id || "unknown";
			adapter.log.info("Device id = " + id);

			await adapter.setObjectNotExistsAsync("devices." + id, {
				type: "device",
				common: {
					name: device.deviceTypeId + "_" + id,
				},
				native: {},
			});

			await adapter.setObjectNotExistsAsync("devices." + id + ".status", {
				type: "channel",
				common: {
					name: "Status info",
				},
				native: {},
			});

			const keys = Object.keys(device);
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];
				const attributeType: any = this.getAtrributeTypeByName(key);

				if (key != "stateTypes") {
					await adapter.setObjectAsync("devices." + id + "." + key, {
						type: "state",
						common: {
							name: key,
							type: attributeType,
							role: "meta",
							write: false,
							read: true,
						},
						native: {},
					});
					await adapter.setStateAsync("devices." + id + "." + key, {
						val: device[key],
						ack: true,
					});
				}
			}

			for (const stateTypesId in device.stateTypes) {
				const stateType = device.stateTypes[stateTypesId];
				const attributeType: any = this.getAtrributeTypeByName(stateType);
				await adapter.setObjectAsync("devices." + id + ".status." + stateType.type, {
					type: "state",
					common: {
						name: stateType.type,
						type: attributeType,
						role: "meta",
						write: false,
						read: true,
					},
					native: {},
				});
				await adapter.setStateAsync("devices." + id + ".status." + stateType.type, {
					val: stateType.value,
					ack: true,
				});
			}
		}
	}

	public async handleCircuiteData(deviceJSONData: string): Promise<void> {
		const circuits = new Circuits();
		circuits.data = deviceJSONData;

		for (const circuitId in circuits.data.params.circuits) {
			const circuit = circuits.data.params.circuits[circuitId];
			const id = circuit.id || "unknown";
			adapter.log.info("Circuit id = " + id);

			await adapter.setObjectNotExistsAsync("circuits." + id, {
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
					const attributeType: any = "string";
					await adapter.setObjectAsync("circuits." + id + "." + key, {
						type: "state",
						common: {
							name: key,
							type: attributeType,
							role: "meta",
							write: false,
							read: true,
						},
						native: {},
					});
					await adapter.setStateAsync("circuits." + id + "." + key, {
						val: circuit[key],
						ack: true,
					});
				}

				if (key == "params" || key == "sensorValve") {
					const cKeys = Object.keys(circuit[key]);
					for (let i = 0; i < cKeys.length; i++) {
						const cKey = cKeys[i];
						console.log("Key : " + cKey + ", Value : " + circuit[key][cKey]);

						const attributeType: any = this.getAtrributeTypeByName(cKey);
						await adapter.setObjectAsync("circuits." + id + "." + key + "." + cKey, {
							type: "state",
							common: {
								name: cKey,
								type: attributeType,
								role: "meta",
								write: false,
								read: true,
							},
							native: {},
						});
						await adapter.setStateAsync("circuits." + id + "." + key + "." + cKey, {
							val: circuit[key][cKey],
							ack: true,
						});
					}
				}
			}
		}
	}

	/**
	 * Roles should also be set by type: https://github.com/ioBroker/ioBroker/blob/master/doc/STATE_ROLES.md
	 * @param name
	 * @returns
	 */

	private getAtrributeTypeByName(name: string): string {
		let attributeType;
		switch (name) {
			case "lastUpdate":
			case "channel":
			case "borderBottom":
			case "borderTop":
			case "irrigationType":
			case "locationType":
			case "plantType":
			case "soilType":
			case "temperatureOffset":
			case "solarVoltage":
			case "moisture":
			case "brightness":
			case "temperature":
			case "temperatureOffset":
			case "rssi":
			case "lastResetType":
			case "lastResetTime":
			case "chargingDurationDay":
			case "lastIrrigationDuration":
			case "lastIrrigationEnd":
			case "lastIrrigationStart":
				attributeType = "number";
				break;
			case "reachable":
			case "irrigationPossible":
			case "irrigationNecessary":
			case "charging":
			case "chargingLess":
			case "winterMode":
			case "otauPossible":
			case "lowPower":
			case "sunWithinWeek":
			case "openValve":
			case "valveStatus":
			case "valveInitialClose":
			case "automaticMode":
			case "considerCharge":
			case "considerMower":
			case "considerWeather":
			case "irrigationDelayForecast":
			case "valveStaggering":
				attributeType = "boolean";
				break;
			default:
				attributeType = "string";
				break;
		}
		return attributeType;
	}
}
