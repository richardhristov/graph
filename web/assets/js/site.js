import $ from 'jquery';
import { saveAs, } from 'file-saver';
import cytoscape from 'cytoscape';

// Globals
let cy;

// New button event listener
$(document).on('click', '.js-btn-new', function(e) {
  if (!confirm('All changes will be lost, are you sure?')) {
    e.preventDefault();
    return;
  }
  init(null);
});

// Save button event listener
$(document).on('click', '.js-btn-save', function(e) {
  if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
    alert('Error, your browser does not support loading and saving!');
    e.preventDefault();
    return;
  }

  let $download = $('#js-download');
  if (!$download.length) {
    $download = $('<a id="js-download" style="display:none;"></a>');
    $download.appendTo(document.body);
  }

  const data = new Blob([JSON.stringify(cy.elements().jsons()),], {type: 'text/plain;charset=utf-8',});
  const filename = 'graph.json';
  saveAs(data, filename);
});

// Load button event listeners
$(document).on('click', '.js-btn-load', function(e) {
  if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
    alert('Error, your browser does not support loading and saving!');
    e.preventDefault();
    return;
  }

  $('#js-input-load').val('').click();
});
$(document).on('input', '#js-input-load', function(e) {
  if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
    alert('Error, your browser does not support loading and saving!');
    e.preventDefault();
    return;
  }

  const files = e.target.files;
  console.log(files);

  if (!files.length) {
    alert('Error, no file selected!');
    e.preventDefault();
    return;
  }

  var reader = new FileReader();
  reader.onload = e => {
    try {
      console.log(e.target);
      init(JSON.parse(e.target.result));
    } catch(err) {
      alert('Error, the file is invalid!');
    }
  };

  reader.readAsText(files[0]);
});

// About button event listener
$(document).on('click', '.js-btn-about', function(e) {
  window.alert('This is a project intended to demonstrate the author\'s skills in creating an ai app.');
});

$(document).on('click', '#js-btn-node-add', function(e) {
  const name = $('#js-input-node-name').val();
  if (!name) {
    window.alert('Please input the name for the node');
    return;
  }

  $('#js-input-node-name').val('');
  cy.add({
    group: 'nodes',
    data: {
      id: name,
    },
  });
  elementAdded();
});

$(document).on('click', '#js-btn-edge-add', function(e) {
  const u = $('#js-input-edge-u').val();
  const v = $('#js-input-edge-v').val();
  const weight = $('#js-input-edge-weight').val();
  if (!u || !v || !weight) {
    window.alert('Please input the u, v and weight for the edge');
    return;
  }

  $('#js-input-edge-u').val('');
  $('#js-input-edge-v').val('');
  $('#js-input-edge-weight').val('');
  cy.add({
    group: 'edges',
    data: {
      source: u,
      target: v,
      weight,
    },
  });
  elementAdded();
});

function getAdjacentNodes(u) {
  return cy.edges()
    .filter(e => e.source().id() === u.id() || e.target().id() === u.id())
    .map(e => {
      if (e.source().id() === u.id()) {
        return [e.target(), parseInt(e.data('weight')),];
      }
      return [e.source(), parseInt(e.data('weight')),];
    });
}

function getNodeById(id) {
  return cy.nodes().filter(n => n.id() === id)[0];
}

function clearColoring() {
  for (const u of cy.nodes()) {
    u.removeData('coloring');
  }
}

$(document).on('click', '#js-btn-dfs', function(e) {
  clearColoring();
  const start = $('#js-input-search-start').val();
  const end = $('#js-input-search-end').val();
  if (!start || !end) {
    window.alert('Please input the start and end for the dfs');
    return;
  }

  $('#js-input-search-start').val('');
  $('#js-input-search-end').val('');

  const startNode = getNodeById(start);
  const endNode = getNodeById(end);
  if (!startNode || !endNode) {
    window.alert('The start or end node doesnt exist');
    return;
  }

  const visited = [];
  const dfs = u => {
    u.data('coloring', 'visited');
    visited.push(u.id());

    if (u === endNode) {
      console.log('DFS found end');
      u.data('coloring', 'path');
      return true;
    }

    const adj = getAdjacentNodes(u)
      .filter(vv => visited.indexOf(vv[0].id()) === -1)
      .sort((a, b) => a[1] - b[1]);
    for (const [v, weight,] of adj) {
      const result = dfs(v);
      if (result) {
        u.data('coloring', 'path');
        return result;
      }
    }

    return false;
  };

  const result = dfs(startNode);
  if (result) {
    window.alert('Path was found');
    return;
  }
  window.alert('No path was found');
});

$(document).on('click', '#js-btn-bfs', function(e) {
  clearColoring();
  const start = $('#js-input-search-start').val();
  const end = $('#js-input-search-end').val();
  if (!start || !end) {
    window.alert('Please input the start and end for the bfs');
    return;
  }

  $('#js-input-search-start').val('');
  $('#js-input-search-end').val('');

  const startNode = getNodeById(start);
  const endNode = getNodeById(end);
  if (!startNode || !endNode) {
    window.alert('The start or end node doesnt exist');
    return;
  }

  const visited = [];
  const path = {};
  let found = false;
  const queue = [startNode];
  while (!found) {
    if (queue.length === 0) {
      break;
    }

    const u = queue.pop();
    u.data('coloring', 'visited');
    visited.push(u.id());

    const adj = getAdjacentNodes(u)
      .filter(vv => visited.indexOf(vv[0].id()) === -1)
      .sort((a, b) => a[1] - b[1]);

    for (const [v, weight,] of adj) {
      path[v.id()] = u.id();
      if (v === endNode) {
        v.data('coloring', 'path');
        console.log('BFS found end');
        found = true;
        break;
      }

      queue.push(v);
    }
  }
  window.autism = path;
  window.startNode = startNode;
  window.endNode = endNode;

  if (found) {
    let u = endNode.id();
    while (u !== startNode.id()) {
      const uu = getNodeById(u);
      uu.data('coloring', 'path');
      u = path[u];
    }
    startNode.data('coloring', 'path');
    window.alert('Path was found');
    return;
  }
  window.alert('No path was found');
});

function elementAdded() {
  var layout = cy.elements().layout({ name: 'random', });
  layout.run();
}

function init(data) {
  if (cy) {
    cy.destroy();
    cy = null;
  }
  cy = cytoscape({
    container: document.getElementById('js-cy'),

    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(id)',
          'text-valign': 'center',
          'color': '#FFF',
          'background-color': el => {
            switch (el.data('coloring')) {
              case 'visited':
                return '#00F';
                break;

              case 'path':
                return '#F00';
                break;

              default: 
                return '#222';
            }
          },
        }
      },
      {
        selector: 'edge',
        style: {
          'label': 'data(weight)',
          'width': 2,
          'line-color': '#222',
          'text-margin-y': -10,
        }
      },
    ],

    elements: data,
  });
  clearColoring();
  window.cy = cy;
}

// Initialization event listener
$(document).ready(function() {
  init(null);

  try {
    if(window.localStorage) {
      // Restore from localstorage
      const data = JSON.parse(window.localStorage.getItem('graph')) || null;
      init(data);

      // Save to localstorage at 2hz
      setInterval(function() {
        window.localStorage.setItem('graph', JSON.stringify(cy.elements().jsons()));
      }, 1000 / 2);
    }
  } catch(err) {
    console.error(err);
  }
});