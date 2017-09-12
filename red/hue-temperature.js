module.exports = function(RED)
{
	function HueTemperature(config)
	{
		RED.nodes.createNode(this, config);
		var bridge = RED.nodes.getNode(config.bridge);
		let huejay = require('huejay');
		var context = this.context();
		var scope = this;


		//
		// CHECK CONFIG
		if(!config.sensorid || bridge == null)
		{
			this.status({fill: "red", shape: "ring", text: "not configured"});
			return false;
		}

		//
		// INITIALIZE CLIENT
		var temperatureSensorID = parseInt(config.sensorid);
		let client = new huejay.Client({
			host: (bridge.config.bridge).toString(),
			port: 80,
			username: bridge.config.key
		});

		//
		// UPDATE STATE
		scope.status({fill: "grey", shape: "dot", text: "initializing…"});
		this.recheck = setInterval(function()
		{
			client.sensors.getById(temperatureSensorID)
			.then(sensor => {
				var temperature = context.get('temperature') || false;

				if(sensor.config.reachable == false)
				{
					scope.status({fill: "red", shape: "ring", text: "not reachable"});
				}
				else if(temperature != sensor.state.temperature)
				{
					context.set('temperature', sensor.state.temperature);

					var celsius = Math.round(sensor.state.temperature * 100) / 100;
					var fahrenheit = Math.round(((celsius * 1.8)+32) * 100) / 100;

					var message = {};
					message.payload = {id: temperatureSensorID, celsius: celsius, fahrenheit: fahrenheit, updated: sensor.state.lastUpdated, battery: sensor.config.battery};
					scope.send(message);

					scope.status({fill: "yellow", shape: "dot", text: celsius+" °C / "+fahrenheit+" °F"});
				}
			})
			.catch(error => {
				scope.status({fill: "red", shape: "ring", text: "connection error"});
				clearInterval(scope.recheck);
			});
		}, parseInt(bridge.config.interval));

		//
		// CLOSE NDOE / REMOVE RECHECK INTERVAL
		this.on('close', function()
		{
			clearInterval(scope.recheck);
		});
	}

	RED.nodes.registerType("hue-temperature", HueTemperature);
}