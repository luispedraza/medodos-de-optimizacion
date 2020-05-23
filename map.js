// sobre memoria a largo plazo:
// https://sci2s.ugr.es/sites/default/files/files/Teaching/GraduatesCourses/Algoritmica/Tema04-BusquedaTabu-12-13.pdf


placesTest = [{name: "Madrid", lat: 40.4167754, lng: -3.7037902},
{name: "Toledo", lat: 39.86283160000001, lng: -4.0273231},
{name: "Segovia", lat: 40.9429032, lng: -4.1088069},
{name: "Valencia", lat: 39.4699075, lng: -0.3762881},
{name: "Bilbao", lat: 43.2630126, lng: -2.9349852},
{name: "Cuenca", lat: 40.0703925, lng: -2.1374162},
{name: "Barcelona", lat: 41.38506389999999, lng: 2.1734035},
{name: "Badajoz", lat: 38.87944950000001, lng: -6.9706535},
{name: "Málaga", lat: 36.721261, lng: -4.4212655},
{name: "Murcia", lat: 37.99223990000001, lng: -1.1306544},
{name: "Santander", lat: 43.46230569999999, lng: -3.8099803},
{name: "Sevilla", lat: 37.3890924, lng: -5.9844589},
{name: "Málaga", lat: 36.721261, lng: -4.4212655},
{name: "Huelva", lat: 37.261421, lng: -6.9447224},
{name: "Valladolid", lat: 41.652251, lng: -4.724532099999998},
{name: "León", lat: 42.5987263, lng: -5.5670959},
{name: "Oviedo", lat: 43.3619145, lng: -5.8493887},
{name: "Salamanca", lat: 40.9701039, lng: -5.6635397},
{name: "Santiago de Compostela", lat: 42.8782132, lng: -8.544844500000002}];


Array.prototype.swap = function (x, y) {
	var array = this.slice();
	var temp = array[x];
	array[x] = array[y];
	array[y] = temp;
	return array;
}

function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
	// Haversine formula
	// https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
	function deg2rad(deg) {
		return deg * (Math.PI/180)
	};
	var R = 6371; // Radius of the earth in km
	var dLat = deg2rad(lat2-lat1);  // deg2rad below
	var dLon = deg2rad(lon2-lon1); 
	var a = 
	Math.sin(dLat/2) * Math.sin(dLat/2) +
	Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
	Math.sin(dLon/2) * Math.sin(dLon/2); 
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
	var d = R * c; // Distance in km
	return d;
}

var map;
var places = [];		// Lista de lugares a visitar
var bestPlaces = [];	// Mejor recorrido encontrado
var places = placesTest;
var route = null;		// la ruta dibujada (polígono)
var bestRoute = null;	// La mejor ruta encontrada
var timer = null;
var graph_data = [];
var chart = null;
var nIter = 0;
var distancesArray = null;

function computeDistancesArray(places) {
	var array = {};
	places.forEach(function(p1) {
		array[p1.name] = {};
		places.forEach(function(p2) {
			array[p1.name][p2.name] = (p1.name == p2.name) ? 0 : getDistanceFromLatLonInKm(
				p1.lat, p1.lng, p2.lat, p2.lng);
		})
	});
	console.log("Matriz de distancias calculada: ");
	console.log(JSON.stringify(array, null, 4));
	return array;
}

function randomInt(i) {
	return Math.floor(Math.random() * i);
}

function reset() {
	graph_data = [];
	nIter = 0;
	distancesArray = computeDistancesArray(places);
}

function initMap() {
	map = new google.maps.Map(document.getElementById("map"), {
  	// centramos en madrid
  	center: { lat: 40.416775, lng: -3.703790 },
  	zoom: 6
  });
}

function drawRoute(p, color) {
	if (route) {
		route.setMap(null);
	}
	route = new google.maps.Polygon({
		paths: p,
		strokeColor: color,
		strokeOpacity: 1,
		strokeWeight: 2
	});
	route.setMap(map);
}


function tabuRun() {
	tabu(true);
}
function tabuStep() {
	tabu(false);
}
var tabuMemory = {};
/** Se comienza la optimización con búsqueda tabú **/
function tabu(run) {
	reset();
	
	var timeTabu = 3;

	function updateTabuMemory() {
		// actualización de la memoria tabu en cada iteración
		for (m in tabuMemory) {
			tabuMemory[m] = Math.max(tabuMemory[m]-1, 0);
		}
	};

	function cost(x) {
		// Calcula la distancia total para un recorrido dado
		if (x.length < 2) return 0;
		var c = 0;
		function dist(a, b) {
			// cálculo de la distancia entre dos puntos
			// var dlat = a.lat - b.lat;
			// var dlng = a.lng - b.lng;
			// return Math.sqrt(dlat*dlat + dlng*dlng);
			return distancesArray[a.name][b.name];
		}
		for (var i=0; i<x.length-1; i++) {
			c += dist(x[i], x[i+1]);
		}
		c += dist(x[0], x[x.length - 1]);
		return c;
	}

	function generateCandidates(x) {
		// esta función genera la lista de candidatos aleatorios
		var candidates = [];
		for (var i = 1; i < x.length; i++) {
			var swap = [i, i-1].join(",");
			var candidate = x.swap(i, i-1);
			candidates.push({
				"candidate": candidate,
				"swap": swap
			});
		}
		return candidates;
	}

	function tabuIteration() {
		nIter += 1;
		var dActual = cost(places);
		console.log("Iteración: " + nIter);
		console.log("Ruta actual: ");
		console.log(places.map(function(x){return x.name}));
		console.log("Distancia actual: " + dActual);
		var candidates = generateCandidates(places);
		candidates.forEach(function(c) {
			// calculamos la distancia total para cada candidato:
			c["cost"] = cost(c["candidate"]);
		});
		candidates.sort(function(a, b) {
			// los ordenamos de menor a mayor
			return (a["cost"] < b["cost"]) ? -1 : 1;
		})
		console.log(candidates);
		var chosen = null;
		for (var i=0; i<candidates.length; i++) {
			var c = candidates[i];
			var swap = c["swap"];
			if (tabuMemory[swap]) continue;
			chosen = c;
			break;
		};
		if (chosen) {
			updateTabuMemory();
			tabuMemory[c["swap"]] = timeTabu;
			places = c["candidate"];

		} else {
			console.log("Se ha terminado la optimización");
			stop();
		};
		console.log(tabuMemory);
		// drawRoute(candidates[randomInt(5)]);
		drawRoute(places, "#00FF00");
		drawRoute(bestPlaces, "#FF0000");
		
	}
	if (run) {
		timer = setInterval(tabuIteration, 100);
	} else {
		tabuIteration();
	}
	
}

/** Se detiene el proceso de optimización **/
function stop() {
	clearTimeout(timer);
}

$(function() {
	function getPlace() {
		var googlePlace = autocomplete.getPlace();
		var place = {
			"name": googlePlace.name,
			"lat": googlePlace.geometry.location.lat(),
			"lng": googlePlace.geometry.location.lng()
		};
		return place;
	};
	var input = document.getElementById('search');
	var autocomplete = new google.maps.places.Autocomplete(input);

	google.maps.event.addListener(autocomplete, 'place_changed', function () {
		var place = getPlace();
		document.getElementById('place').innerText = place.name;
		document.getElementById('lat').innerText = place.lat;
		document.getElementById('lon').innerText = place.lon;
	});

	$("#add").click(function() {
		$("#places_list").append("<li>" + $("#place").text() + "</li>");
		places.push(getPlace());
		console.log(places);
		$("#search").val("");
		drawRoute(places);
		distancesArray = computeDistancesArray(places);
	});
	$("#tabu").click(tabuRun);
	$("#tabu_step").click(tabuStep);
	$("#stop").click(stop);
	// var ctx = document.getElementById("chart").getContext("2d");
	// chart = new Chart(ctx, {
	// 	type: "line",
	// 	data: {
	// 		datasets: [{
	// 			label: "Búsqueda tabú",
	// 			fill: false,
	// 			backgroundColor: "#f00",
	// 			borderColor: "#f00",
	// 			data: [1560, 1200, 900, 970, 950, 800]
	// 		}]
	// 	},
	// 	options: {
	// 		responsive: true,
	// 		title: {
	// 			display: true,
	// 			text: 'Evolución del proceso de optimización'
	// 		},
	// 		scales: {
	// 			xAxes: [{
	// 				display: true,
	// 				scaleLabel: {
	// 					display: true,
	// 					labelString: "Iteración"
	// 				}
	// 			}],
	// 			yAxes: [{
	// 				display: true,
	// 				svaleLabel: {
	// 					display: true,
	// 					labelString: "Distancia total"
	// 				}
	// 			}]
	// 		}
	// 	}
	// });
});