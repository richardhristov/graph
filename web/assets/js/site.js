import $ from "jquery";
import { saveAs } from "file-saver";
import cytoscape from "cytoscape";

// Globals
let cy;

// New button event listener
$(document).on("click", ".js-btn-new", (e) => {
	if (!confirm("All changes will be lost, are you sure?")) {
		e.preventDefault();
		return;
	}
	init(null);
});

// Save button event listener
$(document).on("click", ".js-btn-save", (e) => {
	if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
		alert("Error, your browser does not support loading and saving!");
		e.preventDefault();
		return;
	}

	let $download = $("#js-download");
	if (!$download.length) {
		$download = $('<a id="js-download" style="display:none;"></a>');
		$download.appendTo(document.body);
	}

	const data = new Blob([JSON.stringify(cy.elements().jsons())], {
		type: "text/plain;charset=utf-8",
	});
	const filename = "graph.json";
	saveAs(data, filename);
});

// Load button event listeners
$(document).on("click", ".js-btn-load", (e) => {
	if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
		alert("Error, your browser does not support loading and saving!");
		e.preventDefault();
		return;
	}

	$("#js-input-load").val("").click();
});
$(document).on("input", "#js-input-load", (e) => {
	if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
		alert("Error, your browser does not support loading and saving!");
		e.preventDefault();
		return;
	}

	const files = e.target.files;
	console.log(files);

	if (!files.length) {
		alert("Error, no file selected!");
		e.preventDefault();
		return;
	}

	var reader = new FileReader();
	reader.onload = (e) => {
		try {
			console.log(e.target);
			init(JSON.parse(e.target.result));
		} catch (err) {
			alert("Error, the file is invalid!");
		}
	};

	reader.readAsText(files[0]);
});

// About button event listener
$(document).on("click", ".js-btn-about", (e) => {
	window.alert(
		"This is a project intended to demonstrate the author's skills in creating an ai app."
	);
});

// Add node button even listener
$(document).on("click", "#js-btn-node-add", (e) => {
	const name = $("#js-input-node-name").val();
	const x = parseInt($("#js-input-node-x").val());
	const y = parseInt($("#js-input-node-y").val());
	if (!name) {
		window.alert("Please input the name for the node");
		return;
	}

	if (isNaN(x) || isNaN(y)) {
		window.alert("Please input valid values for x and y");
		return;
	}

	$("#js-input-node-name").val("");
	$("#js-input-node-x").val("");
	$("#js-input-node-y").val("");
	cy.add({
		group: "nodes",
		data: {
			id: name,
		},
		position: {
			x,
			y,
		},
	});
	elementAdded();
});

// Add edge button event listener
$(document).on("click", "#js-btn-edge-add", (e) => {
	const u = $("#js-input-edge-u").val();
	const v = $("#js-input-edge-v").val();
	const weight = $("#js-input-edge-weight").val();
	if (!u || !v || !weight) {
		window.alert("Please input the u, v and weight for the edge");
		return;
	}

	$("#js-input-edge-u").val("");
	$("#js-input-edge-v").val("");
	$("#js-input-edge-weight").val("");
	cy.add({
		group: "edges",
		data: {
			source: u,
			target: v,
			weight,
		},
	});
	elementAdded();
});

const getAdjacentNodes = (u) => {
	return cy
		.edges()
		.filter((e) => e.source().id() === u.id() || e.target().id() === u.id())
		.map((e) => {
			if (e.source().id() === u.id()) {
				return [e.target(), parseInt(e.data("weight"))];
			}
			return [e.source(), parseInt(e.data("weight"))];
		});
};

const getFormulaWeight = (e, dist) => {
	return dist * 0.8 + parseInt(e.data("weight")) * 0.6;
};

const getDistance = (u, v) => {
	const x1 = u.position("x");
	const y1 = u.position("y");
	const x2 = v.position("x");
	const y2 = v.position("y");
	return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

const getAdjacentNodesAlt = (u, startNode, endNode) => {
	return cy
		.edges()
		.filter((e) => e.source().id() === u.id() || e.target().id() === u.id())
		.map((e) => {
			const uu = e.source().id() === u.id() ? e.target() : e.source();
			const dist = getDistance(uu, endNode);
			console.log("dist", dist);
			return [uu, getFormulaWeight(e, dist)];
		});
};

const getConnectingEdges = (u, v) => {
	return cy
		.edges()
		.filter(
			(e) =>
				(e.source().id() === u.id() && e.target().id() === v.id()) ||
				(e.target().id() === u.id() && e.source().id() === v.id())
		);
};

const getNodeById = (id) => {
	return cy.nodes().filter((n) => n.id() === id)[0];
};

const clearColoring = () => {
	for (const u of cy.nodes()) {
		u.data("coloring", "none");
		u.removeData("coloring");
	}
};

const bfs = (startNode, endNode, adjacencyFn = getAdjacentNodes) => {
	const visited = [];
	const path = {};
	let found = false;
	const queue = [startNode];
	while (!found) {
		if (queue.length === 0) {
			break;
		}

		const u = queue.shift();
		visited.push(u.id());
		console.log("BFS popping", u.id());
		u.data("coloring", "visited");

		if (u === endNode) {
			console.log("BFS found end");
			found = true;
			break;
		}

		const adj = adjacencyFn(u, startNode, endNode)
			.filter((vv) => visited.indexOf(vv[0].id()) === -1)
			.sort((a, b) => a[1] - b[1]);

		console.log("BFS adj: ", adj);

		for (const [v, weight] of adj) {
			path[v.id()] = u.id();
			queue.push(v);
		}
	}

	if (!found) {
		return null;
	}

	return path;
};

const colorPath = (startNode, endNode, path) => {
	let u = endNode.id();
	while (u !== startNode.id()) {
		const uu = getNodeById(u);
		uu.data("coloring", "path");
		u = path[u];
	}
	startNode.data("coloring", "path");
};

const getPathWeight = (startNode, endNode, path) => {
	let w = 0;
	let u = endNode.id();
	let prev = getNodeById(u);
	while (u !== startNode.id()) {
		const uu = getNodeById(u);
		const [e] = getConnectingEdges(uu, prev);
		if (e) {
			w = parseInt(e.data("weight")) + w;
		}
		u = path[u];
		prev = uu;
	}
	const [e] = getConnectingEdges(startNode, prev);
	if (e) {
		w = parseInt(e.data("weight")) + w;
	}
	return w;
};

// -- Plain DFS
$(document).on("click", "#js-btn-dfs", (e) => {
	clearColoring();
	const start = $("#js-input-search-start").val();
	const end = $("#js-input-search-end").val();
	if (!start || !end) {
		window.alert("Please input the start and end for the dfs");
		return;
	}

	$("#js-input-search-start").val("");
	$("#js-input-search-end").val("");

	const startNode = getNodeById(start);
	const endNode = getNodeById(end);
	if (!startNode || !endNode) {
		window.alert("The start or end node doesnt exist");
		return;
	}
	window.startNode = startNode;
	window.endNode = endNode;

	const visited = [];
	let l = 0;
	const dfs = (u) => {
		u.data("coloring", "visited");
		visited.push(u.id());

		if (u === endNode) {
			console.log("DFS found end");
			u.data("coloring", "path");
			return 0;
		}

		const adj = getAdjacentNodes(u)
			.filter((vv) => visited.indexOf(vv[0].id()) === -1)
			.sort((a, b) => a[1] - b[1]);
		for (const [v, weight] of adj) {
			const result = dfs(v);
			if (result >= 0) {
				l += 1;
				u.data("coloring", "path");
				return result + weight;
			}
		}

		return -1;
	};

	const result = dfs(startNode);
	if (result) {
		window.alert(`Path was found with total weight: ${result}, length: ${l}`);
		return;
	}
	window.alert("No path was found");
});

// -- Plain BFS
$(document).on("click", "#js-btn-bfs", (e) => {
	clearColoring();
	const start = $("#js-input-search-start").val();
	const end = $("#js-input-search-end").val();
	if (!start || !end) {
		window.alert("Please input the start and end for the bfs");
		return;
	}

	$("#js-input-search-start").val("");
	$("#js-input-search-end").val("");

	const startNode = getNodeById(start);
	const endNode = getNodeById(end);
	if (!startNode || !endNode) {
		window.alert("The start or end node doesnt exist");
		return;
	}

	const path = bfs(startNode, endNode);

	if (path) {
		colorPath(startNode, endNode, path);
		const weight = getPathWeight(startNode, endNode, path);
		window.alert(`Path was found with total weight: ${weight}`);
		return;
	}
	window.alert("No path was found");
});

// -- BFS with formula
$(document).on("click", "#js-btn-bfs-alt", (e) => {
	clearColoring();
	const start = $("#js-input-search-start").val();
	const end = $("#js-input-search-end").val();
	if (!start || !end) {
		window.alert("Please input the start and end for the bfs");
		return;
	}

	$("#js-input-search-start").val("");
	$("#js-input-search-end").val("");

	const startNode = getNodeById(start);
	const endNode = getNodeById(end);
	if (!startNode || !endNode) {
		window.alert("The start or end node doesnt exist");
		return;
	}

	const path = bfs(startNode, endNode, getAdjacentNodesAlt);

	if (path) {
		colorPath(startNode, endNode, path);
		const weight = getPathWeight(startNode, endNode, path);
		window.alert(`Path was found with total weight: ${weight}`);
		return;
	}
	window.alert("No path was found");
});

const elementAdded = () => {
	//var layout = cy.elements().layout({ name: "random" });
	//layout.run();
};

const init = (data) => {
	if (cy) {
		cy.destroy();
		cy = null;
	}
	cy = cytoscape({
		container: document.getElementById("js-cy"),

		style: [
			{
				selector: "node",
				style: {
					label: "data(id)",
					"text-valign": "center",
					color: "#FFF",
					"background-color": (el) => {
						switch (el.data("coloring")) {
							case "visited":
								return "#00F";

							case "path":
								return "#F00";

							default:
								return "#222";
						}
					},
				},
			},
			{
				selector: "edge",
				style: {
					label: "data(weight)",
					width: 2,
					"line-color": "#222",
					"text-margin-y": -10,
				},
			},
		],

		layout: {
			name: "preset",
		},

		elements: data,
	});
	clearColoring();
	window.cy = cy;
};

// Initialization event listener
$(document).ready(() => {
	init(null);

	try {
		if (window.localStorage) {
			// Restore from localstorage
			const data = JSON.parse(window.localStorage.getItem("graph")) || null;
			init(data);

			// Save to localstorage at 2hz
			setInterval(() => {
				window.localStorage.setItem(
					"graph",
					JSON.stringify(cy.elements().jsons())
				);
			}, 1000 / 2);
		}
	} catch (err) {
		console.error(err);
	}
});
