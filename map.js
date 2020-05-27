// sobre memoria a largo plazo:
// https://sci2s.ugr.es/sites/default/files/files/Teaching/GraduatesCourses/Algoritmica/Tema04-BusquedaTabu-12-13.pdf

const TEST = false;

placesTest = [
{name: "Madrid", lat: 40.4167754, lng: -3.7037902, id: 0},
{name: "Toledo", lat: 39.86283160000001, lng: -4.0273231, id: 1},
{name: "Segovia", lat: 40.9429032, lng: -4.1088069, id: 2},
{name: "Valencia", lat: 39.4699075, lng: -0.3762881, id: 3},
{name: "Bilbao", lat: 43.2630126, lng: -2.9349852, id: 4},
{name: "Cuenca", lat: 40.0703925, lng: -2.1374162, id: 5},
{name: "Barcelona", lat: 41.38506389999999, lng: 2.1734035, id: 6},
{name: "Badajoz", lat: 38.87944950000001, lng: -6.9706535, id: 7},
{name: "Málaga", lat: 36.721261, lng: -4.4212655, id: 8},
{name: "Murcia", lat: 37.99223990000001, lng: -1.1306544, id: 9},
{name: "Santander", lat: 43.46230569999999, lng: -3.8099803, id: 10},
{name: "Sevilla", lat: 37.3890924, lng: -5.9844589, id: 11},
{name: "Málaga", lat: 36.721261, lng: -4.4212655, id: 12},
{name: "Huelva", lat: 37.261421, lng: -6.9447224, id: 13},
{name: "Valladolid", lat: 41.652251, lng: -4.724532099999998, id: 14},
{name: "León", lat: 42.5987263, lng: -5.5670959, id: 15},
{name: "Oviedo", lat: 43.3619145, lng: -5.8493887, id: 16},
{name: "Salamanca", lat: 40.9701039, lng: -5.6635397, id: 17},
{name: "Santiago de Compostela", lat: 42.8782132, lng: -8.544844500000002, id: 18}
];

Array.prototype.swap = function (x, y) {
	var array = this.slice();
	var temp = array[x];
	array[x] = array[y];
	array[y] = temp;
	return array;
}

Array.prototype.last = function() { return this[this.length-1]; }

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

class Solution {
	constructor(places=[]) {
		this.places = places;		// Listado de lugares
		this.distance = null;		// coste asociado a la ruta (distancia total)
		this.length = places.length;
	}
	swap (x, y) {
		var places = this.places.swap(x, y);
		return new Solution(places);
	}
	getPlace(i) {
		return this.places[i];
	}
	getPlacesNames() {
		return this.places.map(function(x){return x.name}).join(" => ");
	}
	updateDistancesArray () {
		if (Solution.distancesArray) {
			delete (Solution.distancesArray);
		}
		var array = {};
		var places = this.places;
		places.forEach(function(p1) {
			array[p1.name] = {};
			places.forEach(function(p2) {
				array[p1.name][p2.name] = (p1.name == p2.name) ? 0 : getDistanceFromLatLonInKm(
					p1.lat, p1.lng, p2.lat, p2.lng);
			})
		});
		console.log("Matriz de distancias calculada: ");
		console.log(JSON.stringify(array, null, 4));
		Solution.distancesArray = array;
		return array;
	}
	getDistance(a, b) {
		return Solution.distancesArray[a.name][b.name];
	} 

	getTotalDistance () {
		if (this.distance == null) {
			// Calcula la distancia total para un recorrido dado
			var places = this.places;
			if (places.length < 2) {
				this.distance = 0;	
			} else {
				if (typeof (Solution.distancesArray) == "undefined") {
					this.updateDistancesArray();
				}
				var c = 0;
				for (var i=0; i<places.length-1; i++) {
					c += this.getDistance(places[i], places[i+1]);
				}
				c += this.getDistance(places[0], places[places.length - 1]);
				this.distance = c;
			}
		}
		return this.distance;
	}
	addPlace(place) {
		this.places.push(place);
		place.id = this.places.length-1;
		this.distance = null;
		this.length = this.places.length;
		delete(Solution.distancesArray);
	}
}

class Candidate extends Solution {
	// Esta clase almacena información de candidatos de prueba 
	// generados con búsqueda tabú
	constructor(solution, x, y) {
		// solution es la solución a a partir de la que se genera el candidato
		// x, y son las posiciones que se intercambian
		super(solution.places.swap(x, y));
		this.swapInfo = [this.places[x].name, this.places[y].name].sort().join("-");
	}
}

var map;
var currentSolution = new Solution(TEST ? placesTest : [], "#00FF00");
var bestSolution = new Solution(TEST ? placesTest : [], "#FF0000");

var timer = null;		// El timer global para hacer iteraciones
var graph_data = [];
var chart = null;
var nIter = 0;			// El número de iteración actual

function randomInt(i) {
	return Math.floor(Math.random() * i);
}

function reset() {
	graph_data = [];
	nIter = 0;
}


var currentRoute;
var bestRoute;
var markers = [];

function initMap() {
	// INicializa el map con la API de Google Maps
	map = new google.maps.Map(document.getElementById("map"), {
  		// centramos en madrid
  		center: { lat: 40.416775, lng: -3.703790 },
  		zoom: 6
  	});
	currentRoute = new google.maps.Polygon({
		paths: [],
		strokeColor: "#00FF00",
		strokeOpacity: 1,
		strokeWeight: 2
	});
	currentRoute.setMap(map);
	bestRoute = new google.maps.Polygon({
		paths: [],
		strokeColor: "#FF0000",
		strokeOpacity: 1,
		strokeWeight: 2
	});
	bestRoute.setMap(map);
}

function drawRoute(solution, type) {
	if (type == "current") {
		currentRoute.setPaths(solution.places);
	} else if (type == "best") {
		bestRoute.setPaths(solution.places);
	}
}
function drawMarkers(solution) {
	markers.forEach(function(m) {
		m.setMap(null);
		delete(m);
	});
	markers = [];
	solution.places.forEach(function(p) {
		markers.push(new google.maps.Marker({
			position: p,
			map: map,
			title: p.name
		}))
	});
}

/** Clase general de memoria para búsqueda tabú **/
class Memory {
	constructor() {
		this.memory = {};
	}
}
/** Clase para memoria a corto plazo **/
class TabuMemory extends Memory {
	update(key, time) {
		var mem = this.memory;
		for (var m in mem) {
			mem[m] = Math.max(mem[m]-1, 0);
		}
		mem[key] = time;
	}
	isTabu(key) {
		return this.memory[key];
	}
}
/** Clase para memoria a largo plazo **/
class LongTermMemory extends Memory {
	update(key) {
		if (this.memory[key]) {
			this.memory[key] += 1;
		} else {
			this.memory[key] = 1;
		}
 	}
 	max() {
 		var m = 0;
 		for (var k in this.memory) {
 			m = (this.memory[k]>m) ? this.memory[k] : m;
 		}
 		return m;
 	}
}

/** Se comienza la optimización con búsqueda tabú **/
class TabuSearch {
	constructor(timeTabu=3, aspiration=true, randomize=true) {
		this.config(timeTabu, aspiration, randomize);
		this.tabuMemory = new TabuMemory();
		this.ltMemory = new LongTermMemory();
		reset();
	}

	config(timeTabu=3, aspiration=true, randomize=true) {
		this.timeTabu = timeTabu;
		this.aspiration = aspiration;
		this.randomize = randomize;
	}

	generateCandidates(solution) {
		// esta función genera la lista de candidatos en cada iteración
		var candidates = [];
		for (var i = 1; i < solution.places.length; i++) {
			candidates.push(new Candidate(solution, i-1, i));
		}
		if (this.randomize) {
			//Generamos un individuo intercambiando dos ciudades de manera aleatoria.
			var i = randomInt(currentSolution.places.length-1);
			var j = randomInt(currentSolution.places.length-1);
			console.log("===> Generando un candidato aletario. Intercambio: ", 
				currentSolution.getPlace(i).name,
				currentSolution.getPlace(j).name);
			var randomCandidate = new Candidate(currentSolution, i, j);
			randomCandidate.isRandom = true;
			candidates.push(randomCandidate);
		}		
		return candidates.sort(function(a, b) {
			// los ordenamos de menor a mayor distancia total
			return (a.getTotalDistance() < b.getTotalDistance()) ? -1 : 1;
		});
	}

	tabuIteration() {
		nIter += 1;
		var places = currentSolution.places;
		console.log("===========================================");
		console.log("Iteración: " + nIter);
		console.log("Ruta actual: ");
		console.log(currentSolution.getPlacesNames());
		console.log("Distancia actual: " + currentSolution.getTotalDistance());
		console.log("Mejor distancia: " + bestSolution.getTotalDistance());
		var candidates = this.generateCandidates(currentSolution);
		
		console.log(candidates);
		var chosen = null;
		for (var i=0; i<candidates.length; i++) {
			var c = candidates[i];
			if (this.tabuMemory.isTabu(c.swapInfo)) {
				// El movimiento está en la lista tabú
				if (this.aspiration) {
					// Comprobamos si se cumple el criterio de aspiración
					if (c.getTotalDistance() >= bestSolution.getTotalDistance()) {
						continue;
					} else {
						console.log("*****************************************")
						console.log("Se ha cumplido un criterio de aspiración.")
					}
				}
			} 
			chosen = c;
			break;
		};
		if (chosen) {
			this.tabuMemory.update(chosen.swapInfo, this.timeTabu);
			this.ltMemory.update(chosen.swapInfo);
			currentSolution = chosen;

		} else {
			console.log("Se ha terminado la optimización");
			stop();
		};
		console.log(this.tabuMemory);
		console.log(this.ltMemory);
		console.log(this.ltMemory.max());
		// drawRoute(candidates[randomInt(5)]);

		if (currentSolution.getTotalDistance() < bestSolution.getTotalDistance()) {
			bestSolution = currentSolution;
		}
	};
};

/** Heurística sencilla del veino más próximo 
selecciona como primer vértice uno aleatorio **/
function nearestNeighbour(solution) {
	console.log("****** Heurística del vecino más próximo ******");
	console.log("Distancia actual: " + solution.getTotalDistance());
	var initPosition = randomInt(solution.length-1);
	var places = solution.places.slice();	// copiamos la lista de lugares
	var newPlaces = places.splice(initPosition,1);
	console.log("Comenzando por el lugar: " + newPlaces[0].name);
	while (places.length) {
		var last = newPlaces.last();
		places = places.map(function(p) {
			p["dtemp"] = solution.getDistance(last, p);
			return p;
		});
		newPlaces.push(places.sort(function(a, b) {
			return (a.dtemp < b.dtemp) ? -1 : 1;
		})[0]);
		places.splice(0,1);
	}
	var newSolution = new Solution(newPlaces);
	console.log("Nueva distancia: " + newSolution.getTotalDistance());
	console.log(newSolution.getPlacesNames());
	return newSolution;
}

var tabuSearch = new TabuSearch();

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

	function updateUI() {
		// esta función sirve para actualizar la interfaz de usuario en cada iteración
		drawRoute(currentSolution, "current");
		drawRoute(bestSolution, "best");
		drawMarkers(currentSolution);
	};
	function saveAs(content, fileName, contentType) {
		// https://stackoverflow.com/questions/34156282/how-do-i-save-json-to-local-text-file
		var a = document.createElement("a");
		var file = new Blob([content], {type: contentType});
		a.href = URL.createObjectURL(file);
		a.download = fileName;
		a.click();
	}
	
	var input = document.getElementById('search');
	var autocomplete = new google.maps.places.Autocomplete(input);

	google.maps.event.addListener(autocomplete, 'place_changed', function () {
		var place = getPlace();
		document.getElementById('place').innerText = place.name;
		document.getElementById('lat').innerText = place.lat;
		document.getElementById('lon').innerText = place.lng;
	});

	$("#add").click(function() {
		$("#places_list").append("<li>" + $("#place").text() + "</li>");
		currentSolution.addPlace(getPlace());
		bestSolution = currentSolution;
		console.log(currentSolution);
		$("#search").val("");	// limpieza del cuadro de búsqueda
		drawRoute(currentSolution, "current");
	});
	$("#save").click(function() {
		// saveAs(jsonData, 'json.txt', 'text/plain');
		saveAs(JSON.stringify(currentSolution.places),
			'data.json',
			'application/json');
	});
	$("#load").change(function(e) {
		var reader = new FileReader();
		reader.onload = function(e) {
			var jsonObj = JSON.parse(event.target.result);
			console.log("Se ha cargado la siguiente lista de ubicaciones:");
			console.log(jsonObj);
			delete (currentSolution);
			delete (bestSolution);
			bestSolution = currentSolution = new Solution(jsonObj);
			updateUI();
		};
		reader.readAsText(e.target.files[0]);
	})
	$("#tabu").click(function() {
		var time = parseInt($("#tabu_time").val()) || 3;
		tabuSearch.config(time);
		timer = setInterval(function() {
			tabuSearch.tabuIteration();
			updateUI();
		}, 100);
	});
	$("#tabu_step").click(function() {
		var time = parseInt($("#tabu_time").val()) || 3;
		tabuSearch.config(time);
		tabuSearch.tabuIteration();
		updateUI();
	});$("#nearest").click(function() {
		bestSolution = currentSolution = nearestNeighbour(currentSolution);
		updateUI();
	});
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