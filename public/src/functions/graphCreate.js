document.onload = (function (d3, saveAs, Blob, undefined) {
  "use strict";

  // define graphcreator object
  var GraphCreator = function (svg, nodes, edges) {
    var thisGraph = this;
    thisGraph.idct = 0;
    thisGraph.CurrentEdge = 0;
    thisGraph.parent = []
    thisGraph.sz = []
    thisGraph.nodes = nodes || [];
    thisGraph.edges = edges || [];

    thisGraph.state = {
      selectedNode: null,
      selectedEdge: null,
      mouseDownNode: null,
      mouseDownLink: null,
      justDragged: false,
      justScaleTransGraph: false,
      lastKeyDown: -1,
      shiftNodeDrag: false,
      selectedText: null,
    };

    // define arrow markers for graph links
    var defs = svg.append("svg:defs");
    defs
      .append("svg:marker")
      .attr("id", "end-arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", "32")
      .attr("markerWidth", 3.5)
      .attr("markerHeight", 3.5)
      .attr("orient", "auto")
      .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5");

    // define arrow markers for leading arrow
    defs
      .append("svg:marker")
      .attr("id", "mark-end-arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 7)
      .attr("markerWidth", 3.5)
      .attr("markerHeight", 3.5)
      .attr("orient", "auto")
      .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5");

    thisGraph.svg = svg;
    thisGraph.svgG = svg.append("g").classed(thisGraph.consts.graphClass, true);
    var svgG = thisGraph.svgG;

    // displayed when dragging between nodes
    thisGraph.dragLine = svgG
      .append("svg:path")
      .attr("class", "link dragline hidden")
      .attr("d", "M0,0L0,0")
      .style("marker-end", "url(#mark-end-arrow)");

    // svg nodes and edges
    thisGraph.paths = svgG.append("g").selectAll("g");
    thisGraph.circles = svgG.append("g").selectAll("g");

    thisGraph.drag = d3.behavior
      .drag()
      .origin(function (d) {
        return { x: d.x, y: d.y };
      })
      .on("drag", function (args) {
        thisGraph.state.justDragged = true;
        thisGraph.dragmove.call(thisGraph, args);
      })
      .on("dragend", function () {
        // todo check if edge-mode is selected
      });

    // listen for key events
    d3.select(window)
      .on("keydown", function () {
        thisGraph.svgKeyDown.call(thisGraph);
      })
      .on("keyup", function () {
        thisGraph.svgKeyUp.call(thisGraph);
      });
    svg.on("mousedown", function (d) {
      thisGraph.svgMouseDown.call(thisGraph, d);
    });
    svg.on("mouseup", function (d) {
      thisGraph.svgMouseUp.call(thisGraph, d);
    });

    // listen for dragging
    var dragSvg = d3.behavior
      .zoom()
      .on("zoom", function () {
        if (d3.event.sourceEvent.ctrlKey) {
          // TODO  the internal d3 state is still changing
          return false;
        } else {
          thisGraph.zoomed.call(thisGraph);
        }
        return true;
      })
      .on("zoomstart", function () {
        var ael = d3.select("#" + thisGraph.consts.activeEditId).node();
        if (ael) {
          ael.blur();
        }
        if (!d3.event.sourceEvent.ctrlKey)
          d3.select("body").style("cursor", "move");
      })
      .on("zoomend", function () {
        d3.select("body").style("cursor", "auto");
      });

    svg.call(dragSvg).on("dblclick.zoom", null);

    // listen for resize
    window.onresize = function () {
      thisGraph.updateWindow(svg);
    };

    // handle download data
    d3.select("#download-input").on("click", function () {
      var saveEdges = [];
      thisGraph.edges.forEach(function (val, i) {
        saveEdges.push({ source: val.source.id, target: val.target.id, weight: val.weight });
      });
      var blob = new Blob(
        [window.JSON.stringify({ nodes: thisGraph.nodes, edges: saveEdges })],
        { type: "text/plain;charset=utf-8" }
      );
      saveAs(blob, "kruskal.json");
    });

    // handle uploaded data
    d3.select("#upload-input").on("click", function () {
      document.getElementById("hidden-file-upload").click();
    });
    d3.select("#hidden-file-upload").on("change", function () {
      if (window.File && window.FileReader && window.FileList && window.Blob) {
        var uploadFile = this.files[0];
        var filereader = new window.FileReader();

        filereader.onload = function () {
          var txtRes = filereader.result;
          console.log(txtRes);
          // TODO better error handling
          try {
            var jsonObj = JSON.parse(txtRes);
            console.log(JSON.parse('{"nodes":[{"title":"Nodo","id":0,"x":637,"y":100},{"title":"Nodo","id":1,"x":637,"y":300},{"id":2,"title":null,"x":494.375,"y":244.015625}],"edges":[{"source":1,"target":0,"weight":10},{"source":2,"target":1,"weight":28}]}'))
            console.log(jsonObj);
            thisGraph.deleteGraph(true);
            thisGraph.nodes = jsonObj.nodes;
            thisGraph.setIdCt(jsonObj.nodes.length + 1);
            var newEdges = jsonObj.edges;
            console.log(newEdges);
            newEdges.forEach(function (e, i) {
              newEdges[i] = {
                source: thisGraph.nodes.filter(function (n) {
                  return n.id == e.source;
                })[0],
                target: thisGraph.nodes.filter(function (n) {
                  return n.id == e.target;
                })[0],

              };
            });
            thisGraph.edges = newEdges;
            thisGraph.updateGraph();
          } catch (err) {
            window.alert(
              "Error parsing uploaded file\nerror message: " + err.message
            );
            return;
          }
        };
        filereader.readAsText(uploadFile);
      } else {
        alert(
          "Your browser won't let you save this graph -- try upgrading your browser to IE 10+ or Chrome or Firefox."
        );
      }
    });

    // handle delete graph
    d3.select("#delete-graph").on("click", function () {
      thisGraph.deleteGraph(false);
    });

    // handle controls
    d3.select("#start").on("click", function () {
      thisGraph.FunctionPlay(false);
    });
    d3.select("#next_step").on("click", function () {
      thisGraph.FunctionNext(false);
    });
    d3.select("#back_step").on("click", function () {
      thisGraph.FunctionPrev(false);
    });
    d3.select("#button_in").on("click", function () {
      thisGraph.weightMin(false);
    });
  };

  /*** Kruskal Functions ***/

  // Plain text - Minweight
  GraphCreator.prototype.weightMin = function () {
    var thisGraph = this;
    let input_text = document.getElementById("in-plain-text").value;
    let aux = input_text.split("\n");
    let num_nodes = 0;
    let num_edges = 0;
    let edges = [];

    for (let i = 0; i < aux.length; i++) {
      let aux2 = aux[i].split(" ");
      num_nodes = parseInt(aux2[0]);
      num_edges = parseInt(aux2[1]);
      if (i >= 1) {
        let to = parseInt(aux2[0]);
        let from = parseInt(aux2[1]);
        let weight = parseInt(aux2[2]);
        to--; from--;
        edges.push({ to: to, from: from, weight: weight });
      }
    }
    let parent = new Array(parseInt(num_nodes));
    let sz = new Array(parseInt(num_nodes));
    for (let i = 0; i < num_nodes; i++) {
      parent[i] = i;
      sz[i] = 1;
    }

    function represent(i) {
      if (parent[i] == i) {
        return i;
      } else {
        return parent[i] = represent(parent[i]);
      }
    }
    function UnionBySize(u, v) {
      u = represent(u);
      v = represent(v);
      if (u == v) {
        // Can't join because they're in the same component
        return false;
      } else {
        if (sz[u] < sz[v]) {
          // "U" always are the most high value
          [u, v] = [v, u];
        }
        // New represent
        parent[v] = u;
        // Change size of the component
        sz[u] += sz[v];
      }
      // Can join
      return true;
    }
    let totalWeight = 0;
    edges.sort((A, B) => { return A.weight - B.weight; });
    for (let i = 0; i < edges.length; i++) {
      let u = edges[i].from, v = edges[i].to;
      if (UnionBySize(u, v))
        totalWeight += edges[i].weight;
    }
    document.getElementById("total-weight").innerHTML = totalWeight;
    console.log(edges)
  }

  // Search main parent: return represent
  GraphCreator.prototype.represent = function (i) {
    var thisGraph = this;
    if (thisGraph.parent[i] == i) {
      return i;
    } else {
      return thisGraph.parent[i] = thisGraph.represent(thisGraph.parent[i]);
    }
  }

  // Union nodes
  GraphCreator.prototype.UnionBySize = function (u, v) {
    var thisGraph = this;
    u = thisGraph.represent(u);
    v = thisGraph.represent(v);

    if (u == v) {
      // Can't join because they're in the same component
      return false;
    } else {
      if (thisGraph.sz[u] < thisGraph.sz[v]) {
        // "U" always are the most high value
        [u, v] = [v, u];
      }
      // New represent
      thisGraph.parent[v] = u;
      // Change size of the component
      thisGraph.sz[u] += thisGraph.sz[v];
    }
    // Can join
    return true;
  }


  GraphCreator.prototype.FunctionPlay = function () {
    var thisGraph = this;
    thisGraph.parent = new Array(thisGraph.nodes.length);
    thisGraph.sz = new Array(thisGraph.nodes.length);

    for (let i = 0; i < thisGraph.nodes.length; i++) {
      thisGraph.parent[i] = i;
      thisGraph.sz[i] = 1;
    }

    let EdgesCopy = thisGraph.edges;
    EdgesCopy.sort((A, B) => { return A.weight - B.weight; });

    let i = 0;
    let changes = []
    let edge_final = null;
    let totalWeight = 0;

    /*-- Demostration: Order edges --*/
    if (i == 0) {
      let textAlgo = document.getElementById("demo-algorithm");
      let textComp = document.getElementById("demo-complexity");
      textAlgo.insertAdjacentHTML("beforebegin", "<h4>Algoritmo</h4>");
      textAlgo.insertAdjacentHTML("beforeend", "<li>Ordenando aristas.</li>");
      textComp.insertAdjacentHTML("beforebegin", "<h4>Complejidad</h4>");
      textComp.insertAdjacentHTML("beforeend", "<li>O(mlog(m))</li>");
    }

    function myLoop() {         //  create a loop function
      setTimeout(function () {   //  call a 3s setTimeout when the loop is called
        console.log("I: ", i);
        console.log("Previos", changes);
        // Process edges
        let textAlgo = document.getElementById("demo-algorithm");
        let textComp = document.getElementById("demo-complexity");

        textAlgo.insertAdjacentHTML("beforeend", `<li>Procesando arista ${EdgesCopy[i].source.id} - ${EdgesCopy[i].target.id}.</li>`);
        textComp.insertAdjacentHTML("beforeend", `<li>O(a(n))</li><li>O(m*a(n))</li>`);

        for (let j = 0; j < changes.length; j++) {
          console.log(changes[j], changes[j].tagName);
          if (changes[j].tagName == "circle") {
            changes[j].classList.remove("selected_node");
            changes[j].setAttribute("class", "no-selected-node")
            changes[j].classList.remove("node_fill");
          }
          else {
            changes[j].setAttribute("class", "no-selected-edges")
            changes[j].classList.remove("selected-edge");
          }
        }
        if (edge_final) {
          console.log("FINAL");
          console.log(edge_final);
          edge_final.classList.remove("selected-edge");
          edge_final.setAttribute("class", "final-edge");
        }
        changes = [];
        let u = EdgesCopy[i].source.id;
        let v = EdgesCopy[i].target.id;
        let node1 = document.getElementById(EdgesCopy[i].source.id);
        let node2 = document.getElementById(EdgesCopy[i].target.id);
        let edge = document.getElementById(EdgesCopy[i].source.id + "to" + EdgesCopy[i].target.id);
        changes.push(node1);
        changes.push(node2);
        changes.push(edge);
        // console.log(node1);
        // console.log(node2);
        // console.log(edge);
        node1.setAttribute("class", "selected_node node_fill");
        node2.setAttribute("class", "selected_node node_fill");
        edge.setAttribute("class", "selected-edge");

        if (thisGraph.UnionBySize(u, v)) {
          changes.splice(changes.indexOf(edge), 1);
          edge_final = edge;
          let textAlgo = document.getElementById("demo-algorithm");
          textAlgo.insertAdjacentHTML("beforeend", `<li>Arista <b style="color: #97cadb">aceptada</b>.</li>`);
          totalWeight += EdgesCopy[i].weight;
        } else {
          let textAlgo = document.getElementById("demo-algorithm");
          textAlgo.insertAdjacentHTML("beforeend", `<li>Arista <b style="text-decoration:line-through">descartada</b>.</li>`);
        }
        i++;                    //  increment the counter
        if (i < EdgesCopy.length) {   //  if the counter < 10, call the loop function
          myLoop();             //  ..  again which will trigger another 
        }
        else {
          console.log(changes);
          let textAlgo = document.getElementById("weightF");
          textAlgo.insertAdjacentHTML("beforeend", `Peso mínimo total: <span>${totalWeight}</span>`);

          for (let j = 0; j < changes.length; j++) {
            console.log(changes[j], changes[j].tagName);
            if (changes[j].tagName == "circle") {
              changes[j].classList.remove("selected_node");
              changes[j].setAttribute("class", "no-selected-node")
              changes[j].classList.remove("node_fill");
            }
            else {
              changes[j].setAttribute("class", "no-selected-edges")
              changes[j].classList.remove("selected-edge");
            }
          }
        }
      }, 3000)
    }
    myLoop();

  };

  GraphCreator.prototype.FunctionNext = function () {
    var thisGraph = this;

    if (thisGraph.CurrentEdge == 0) {
      thisGraph.parent = new Array(thisGraph.nodes.length);
      thisGraph.sz = new Array(thisGraph.nodes.length);

      for (let i = 0; i < thisGraph.nodes.length; i++) {
        thisGraph.parent[i] = i;
        thisGraph.sz[i] = 1;
      }
    }

    let EdgesCopy = thisGraph.edges;
    EdgesCopy.sort((A, B) => { return A.weight - B.weight; });
    let i = 0;
    let changes = []
    let edge_final = null;

    /*-- Demostration: Order edges --*/
    if (thisGraph.CurrentEdge == 0) {
      let textAlgo = document.getElementById("demo-algorithm");
      let textComp = document.getElementById("demo-complexity");
      textAlgo.insertAdjacentHTML("beforeend", "<li>Ordenando aristas.</li>");
      textComp.insertAdjacentHTML("beforeend", "<li>Constante</li>");
    }

    if (thisGraph.CurrentEdge < thisGraph.edges.length) {
      function myLoop() {         //  create a loop function
        setTimeout(function () {   //  call a 3s setTimeout when the loop is called
          console.log("Previos", changes);
          for (let j = 0; j < changes.length; j++) {
            console.log(changes[j], changes[j].tagName);
            if (changes[j].tagName == "circle") {
              // changes[j].classList.remove("selected_node");
              changes[j].setAttribute("class", "no-selected-node")
              // changes[j].classList.remove("node_fill");
            }
            else {
              changes[j].setAttribute("class", "no-selected-edges")
              changes[j].classList.remove("selected-edge");
            }
          }
          if (edge_final) {
            console.log(edge_final);
            edge_final.classList.remove("selected-edge");
            edge_final.setAttribute("class", "final-edge");
          }
          changes = [];
          let u = EdgesCopy[thisGraph.CurrentEdge].source.id;
          let v = EdgesCopy[thisGraph.CurrentEdge].target.id;
          let node1 = document.getElementById(EdgesCopy[thisGraph.CurrentEdge].source.id);
          let node2 = document.getElementById(EdgesCopy[thisGraph.CurrentEdge].target.id);
          let edge = document.getElementById(EdgesCopy[thisGraph.CurrentEdge].source.id + "to" + EdgesCopy[thisGraph.CurrentEdge].target.id);
          if (i < 1) {
            changes.push(node1);
            changes.push(node2);
            changes.push(edge);
            // console.log(node1);
            // console.log(node2);
            // console.log(edge);
            node1.setAttribute("class", "selected_node node_fill");
            node2.setAttribute("class", "selected_node node_fill");
            edge.setAttribute("class", "selected-edge");
          }

          if (thisGraph.UnionBySize(u, v)) {
            console.log("UNION");
            changes.splice(changes.indexOf(edge), 1);
            edge_final = edge;
            console.log(edge_final);
          }
          i++;             //  increment the counter
          if (i < 2) {     //  if the counter < 2, call the loop function
            myLoop();      //  ..  again which will trigger another 
          }
          else {
            console.log(changes);
            for (let j = 0; j < changes.length; j++) {
              console.log(changes[j], changes[j].tagName);
              if (changes[j].tagName == "circle") {
                changes[j].classList.remove("selected_node");
                changes[j].setAttribute("class", "no-selected-node")
                changes[j].classList.remove("node_fill");
              }
              else {
                changes[j].setAttribute("class", "no-selected-edges")
                changes[j].classList.remove("selected-edge");
              }
            }
            thisGraph.CurrentEdge++;
          }
        }, 3000)
      }
      myLoop();
    }
  };

  GraphCreator.prototype.FunctionPrev = function () {
    var thisGraph = this;
    if (thisGraph.CurrentEdge > 0) {
      for (let i = 0; i < thisGraph.edges.length; i++) {
        let node1 = document.getElementById(thisGraph.edges[i].source.id);
        let node2 = document.getElementById(thisGraph.edges[i].target.id);
        let edge = document.getElementById(thisGraph.edges[i].source.id + "to" + thisGraph.edges[i].target.id);
        node1.setAttribute("class", "no-selected-node");
        node2.setAttribute("class", "no-selected-edges");
        edge.setAttribute("class", "no-selected-edges");
      }
      thisGraph.parent = new Array(thisGraph.nodes.length);
      thisGraph.sz = new Array(thisGraph.nodes.length);

      for (let i = 0; i < thisGraph.nodes.length; i++) {
        thisGraph.parent[i] = i;
        thisGraph.sz[i] = 1;
      }
      let EdgesCopy = thisGraph.edges;
      EdgesCopy.sort((A, B) => { return A.weight - B.weight; });
      let i = 0;
      let changes = []
      let edge_final = null;

      /*-- Demostration: Order edges --*/
      if (thisGraph.CurrentEdge == 0) {
        let textAlgo = document.getElementById("demo-algorithm");
        let textComp = document.getElementById("demo-complexity");
        textAlgo.insertAdjacentHTML("beforeend", "<li>Ordenando aristas.</li>");
        textComp.insertAdjacentHTML("beforeend", "<li>Constante</li>");
      }

      function myLoop() {         //  create a loop function
        setTimeout(function () {   //  call a 3s setTimeout when the loop is called
          console.log("Previos", changes);
          for (let j = 0; j < changes.length; j++) {
            console.log(changes[j], changes[j].tagName);
            if (changes[j].tagName == "circle") {
              changes[j].classList.remove("selected_node");
              changes[j].setAttribute("class", "no-selected-node")
              changes[j].classList.remove("node_fill");
            }
            else {
              changes[j].setAttribute("class", "no-selected-edges")
              changes[j].classList.remove("selected-edge");
            }
          }
          if (edge_final) {
            edge_final.classList.remove("selected-edge");
            edge_final.setAttribute("class", "final-edge");
          }
          changes = [];
          let u = EdgesCopy[i].source.id;
          let v = EdgesCopy[i].target.id;
          let node1 = document.getElementById(EdgesCopy[i].source.id);
          let node2 = document.getElementById(EdgesCopy[i].target.id);
          let edge = document.getElementById(EdgesCopy[i].source.id + "to" + EdgesCopy[i].target.id);
          changes.push(node1);
          changes.push(node2);
          changes.push(edge);
          // console.log(node1);
          // console.log(node2);
          // console.log(edge);
          node1.setAttribute("class", "selected_node node_fill");
          node2.setAttribute("class", "selected_node node_fill");
          edge.setAttribute("class", "selected-edge");

          if (thisGraph.UnionBySize(u, v)) {
            changes.splice(changes.indexOf(edge), 1);
            edge_final = edge;
          }
          i++;                    //  increment the counter
          if (i < thisGraph.CurrentEdge - 1) {           //  if the counter < 10, call the loop function
            myLoop();             //  ..  again which will trigger another 
          }
          else {
            if (edge_final) {
              edge_final.classList.remove("selected-edge");
              edge_final.setAttribute("class", "final-edge");
            }
            console.log(changes);
            for (let j = 0; j < changes.length; j++) {
              console.log(changes[j], changes[j].tagName);
              if (changes[j].tagName == "circle") {
                changes[j].classList.remove("selected_node");
                changes[j].setAttribute("class", "no-selected-node")
                changes[j].classList.remove("node_fill");
              }
              else {
                changes[j].setAttribute("class", "no-selected-edges")
                changes[j].classList.remove("selected-edge");
              }
            }
            thisGraph.CurrentEdge--;
          }
        }, 1)
      }
      myLoop();
    }
  }

  GraphCreator.prototype.setIdCt = function (idct) {
    this.idct = idct;
  };
  GraphCreator.prototype.consts = {
    selectedClass: "selected",
    connectClass: "connect-node",
    circleGClass: "conceptG",
    graphClass: "graph",
    activeEditId: "active-editing",
    // BACKSPACE_KEY: 8,
    DELETE_KEY: 46,
    ENTER_KEY: 13,
    nodeRadius: 35,
  };

  /* PROTOTYPE FUNCTIONS */

  GraphCreator.prototype.dragmove = function (d) {
    var thisGraph = this;
    if (thisGraph.state.shiftNodeDrag) {
      thisGraph.dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + d3.mouse(thisGraph.svgG.node())[0] + ',' + d3.mouse(this.svgG.node())[1]);
    } else {
      d.x += d3.event.dx;
      d.y += d3.event.dy;
      thisGraph.updateGraph();
    }
  };

  GraphCreator.prototype.deleteGraph = function (skipPrompt) {
    var thisGraph = this,
      doDelete = true;
    if (!skipPrompt) {
      doDelete = window.confirm("¿Desea eliminar el grafo?");
    }
    if (doDelete) {
      d3.selectAll("text").remove();
      thisGraph.nodes = [];
      thisGraph.edges = [];
      thisGraph.updateGraph();
    }
  };

  /* select all text in element: taken from http://stackoverflow.com/questions/6139107/programatically-select-text-in-a-contenteditable-html-element */
  GraphCreator.prototype.selectElementContents = function (el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  /* insert svg line breaks: taken from http://stackoverflow.com/questions/13241475/how-do-i-include-newlines-in-labels-in-d3-charts */
  GraphCreator.prototype.insertTitleLinebreaks = function (gEl, title) {
    var words = title.split(/\s+/g),
      nwords = words.length;
    var el = gEl.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-" + (nwords - 1) * 7.5);

    for (var i = 0; i < words.length; i++) {
      var tspan = el.append('tspan').text(words[i]);
      if (i > 0)
        tspan.attr('x', 0).attr('dy', '15');
    }
  };

  // remove edges associated with a node
  GraphCreator.prototype.spliceLinksForNode = function (node) {
    var thisGraph = this,
      toSplice = thisGraph.edges.filter(function (l) {
        return l.source === node || l.target === node;
      });
    toSplice.map(function (l) {
      thisGraph.edges.splice(thisGraph.edges.indexOf(l), 1);
    });
  };

  GraphCreator.prototype.replaceSelectEdge = function (d3Path, edgeData) {
    var thisGraph = this;
    d3Path.classed(thisGraph.consts.selectedClass, true);
    if (thisGraph.state.selectedEdge) {
      thisGraph.removeSelectFromEdge();
    }
    thisGraph.state.selectedEdge = edgeData;
  };

  GraphCreator.prototype.replaceSelectNode = function (d3Node, nodeData) {
    var thisGraph = this;
    d3Node.classed(this.consts.selectedClass, true);
    if (thisGraph.state.selectedNode) {
      thisGraph.removeSelectFromNode();
    }
    thisGraph.state.selectedNode = nodeData;
  };

  GraphCreator.prototype.removeSelectFromNode = function () {
    var thisGraph = this;
    thisGraph.circles
      .filter(function (cd) {
        return cd.id === thisGraph.state.selectedNode.id;
      })
      .classed(thisGraph.consts.selectedClass, false);
    thisGraph.state.selectedNode = null;
  };

  GraphCreator.prototype.removeSelectFromEdge = function () {
    var thisGraph = this;
    thisGraph.paths
      .filter(function (cd) {
        return cd === thisGraph.state.selectedEdge;
      })
      .classed(thisGraph.consts.selectedClass, false);
    thisGraph.state.selectedEdge = null;
  };

  GraphCreator.prototype.pathMouseDown = function (d3path, d) {
    var thisGraph = this,
      state = thisGraph.state;
    d3.event.stopPropagation();
    state.mouseDownLink = d;

    if (state.selectedNode) {
      thisGraph.removeSelectFromNode();
    }

    var prevEdge = state.selectedEdge;
    if (!prevEdge || prevEdge !== d) {
      thisGraph.replaceSelectEdge(d3path, d);
    } else {
      thisGraph.removeSelectFromEdge();
    }
  };

  // mousedown on node
  GraphCreator.prototype.circleMouseDown = function (d3node, d) {
    var thisGraph = this,
      state = thisGraph.state;
    d3.event.stopPropagation();
    state.mouseDownNode = d;
    if (d3.event.ctrlKey) {
      state.shiftNodeDrag = d3.event.ctrlKey;
      // reposition dragged directed edge
      thisGraph.dragLine
        .classed("hidden", false)
        .attr("d", "M" + d.x + "," + d.y + "L" + d.x + "," + d.y);
      return;
    }
  };

  /* place editable text on node in place of svg text */
  GraphCreator.prototype.changeTextOfNode = function (d3node, d) {
    var thisGraph = this,
      consts = thisGraph.consts,
      htmlEl = d3node.node();
    d3node.selectAll("text").remove();
    var nodeBCR = htmlEl.getBoundingClientRect(),
      curScale = nodeBCR.width / consts.nodeRadius,
      placePad = 5 * curScale,
      useHW = curScale > 1 ? nodeBCR.width * 0.71 : consts.nodeRadius * 1.42;
    console.log(nodeBCR);
    // replace with editableconent text
    var d3txt = thisGraph.svg
      .selectAll("foreignObject")
      .data([d])
      .enter()
      .append("foreignObject")
      .attr("x", nodeBCR.left - 565)
      .attr("y", nodeBCR.top - 106)
      .attr("height", 2 * useHW)
      .attr("width", useHW)
      .append("xhtml:p")
      .attr("id", consts.activeEditId)
      .attr("contentEditable", "true")
      .text(d.title)
      .on("mousedown", function (d) {
        d3.event.stopPropagation();
      })
      .on("keydown", function (d) {
        d3.event.stopPropagation();
        if (d3.event.keyCode == consts.ENTER_KEY && !d3.event.ctrlKey) {
          this.blur();
        }
      })
      .on("blur", function (d) {
        d.title = this.textContent;
        thisGraph.insertTitleLinebreaks(d3node, d.title);
        d3.select(this.parentElement).remove();
      });
    return d3txt;
  };

  // mouseup on nodes
  GraphCreator.prototype.circleMouseUp = function (d3node, d) {
    var thisGraph = this,
      state = thisGraph.state,
      consts = thisGraph.consts;
    // reset the states
    state.shiftNodeDrag = false;
    d3node.classed(consts.connectClass, false);

    var mouseDownNode = state.mouseDownNode;

    if (!mouseDownNode) return;

    thisGraph.dragLine.classed("hidden", true);

    if (mouseDownNode !== d) {
      // we're in a different node: create new edge for mousedown edge and add to graph
      var newEdge = {
        source: mouseDownNode,
        target: d,
        weight: parseInt((Math.random() * 30) + 1),
      };
      var filtRes = thisGraph.paths.filter(function (d) {
        if (d.source === newEdge.target && d.target === newEdge.source) {
          thisGraph.edges.splice(thisGraph.edges.indexOf(d), 1);
        }
        return d.source === newEdge.source && d.target === newEdge.target;
      });
      if (!filtRes[0].length) {
        thisGraph.edges.push(newEdge);
        thisGraph.updateGraph();
      }
    } else {
      // we're in the same node
      if (state.justDragged) {
        // dragged, not clicked
        state.justDragged = false;
      } else {
        // clicked, not dragged
        if (d3.event.ctrlKey) {
          // shift-clicked node: edit text content
          var d3txt = thisGraph.changeTextOfNode(d3node, d);
          var txtNode = d3txt.node();
          thisGraph.selectElementContents(txtNode);
          txtNode.focus();
        } else {
          if (state.selectedEdge) {
            thisGraph.removeSelectFromEdge();
          }
          var prevNode = state.selectedNode;

          if (!prevNode || prevNode.id !== d.id) {
            thisGraph.replaceSelectNode(d3node, d);
          } else {
            thisGraph.removeSelectFromNode();
          }
        }
      }
    }
    state.mouseDownNode = null;
    return;
  }; // end of circles mouseup

  // mousedown on Main svg
  GraphCreator.prototype.svgMouseDown = function () {
    this.state.graphMouseDown = true;
  };

  // mouseup on Main svg
  GraphCreator.prototype.svgMouseUp = function () {
    var thisGraph = this,
      state = thisGraph.state;
    if (state.justScaleTransGraph) {
      // dragged not clicked
      state.justScaleTransGraph = false;
    } else if (state.graphMouseDown && d3.event.ctrlKey) {
      // clicked not dragged from svg
      var xycoords = d3.mouse(thisGraph.svgG.node()),
        d = {
          id: thisGraph.idct++,
          title: ("" + nodes.length),
          x: xycoords[0],
          y: xycoords[1],
        };
      thisGraph.nodes.push(d);
      thisGraph.updateGraph();
      // make title of text immediently editable
      var d3txt = thisGraph.changeTextOfNode(
        thisGraph.circles.filter(function (dval) {
          return dval.id === d.id;
        }),
        d
      ),
        txtNode = d3txt.node();
      thisGraph.selectElementContents(txtNode);
      txtNode.focus();
    } else if (state.shiftNodeDrag) {
      // dragged from node
      state.shiftNodeDrag = false;
      thisGraph.dragLine.classed("hidden", true);
    }
    state.graphMouseDown = false;
  };

  // keydown on Main svg
  GraphCreator.prototype.svgKeyDown = function () {
    var thisGraph = this,
      state = thisGraph.state,
      consts = thisGraph.consts;
    // make sure repeated key presses don't register for each keydown
    if (state.lastKeyDown !== -1) return;

    state.lastKeyDown = d3.event.keyCode;
    var selectedNode = state.selectedNode,
      selectedEdge = state.selectedEdge;
    switch (d3.event.keyCode) {
      case consts.BACKSPACE_KEY:
      case consts.DELETE_KEY:
        d3.event.preventDefault();
        if (selectedNode) {
          thisGraph.nodes.splice(thisGraph.nodes.indexOf(selectedNode), 1);
          thisGraph.spliceLinksForNode(selectedNode);
          state.selectedNode = null;
          thisGraph.updateGraph();
        } else if (selectedEdge) {
          var text = document.getElementById(selectedEdge.source.id + "_" + selectedEdge.target.id);
          text.remove();
          thisGraph.edges.splice(thisGraph.edges.indexOf(selectedEdge), 1);
          state.selectedEdge = null;
          thisGraph.updateGraph();
        }
        break;
    }
  };

  GraphCreator.prototype.svgKeyUp = function () {
    this.state.lastKeyDown = -1;
  };

  // call to propagate changes to graph
  GraphCreator.prototype.updateGraph = function () {
    var thisGraph = this,
      consts = thisGraph.consts,
      state = thisGraph.state;

    thisGraph.paths = thisGraph.paths.data(thisGraph.edges, function (d) {
      return String(d.source.id) + "+" + String(d.target.id);
    });
    var paths = thisGraph.paths;
    // update existing paths
    paths
      .style("marker-end", "url(#end-arrow)")
      .classed(consts.selectedClass, function (d) {
        return d === state.selectedEdge;
      })
      .attr("d", function (d) {
        document
          .getElementById(d.source.id + "_" + d.target.id)
          .setAttribute("dx", (d.source.x + d.target.x) / 2 + 10);
        document
          .getElementById(d.source.id + "_" + d.target.id)
          .setAttribute("dy", (d.source.y + d.target.y) / 2 + 10);
        return (
          "M" +
          d.source.x +
          "," +
          d.source.y +
          "L" +
          d.target.x +
          "," +
          d.target.y
        );
      });

    // add new paths
    paths
      .enter()
      .append("text")
      .attr("id", function (d) {
        return d.source.id + "_" + d.target.id;
      })
      .attr("dx", function (d) {
        return (d.source.x + d.target.x) / 2 + 10;
      })
      .attr("dy", function (d) {
        return (d.source.y + d.target.y) / 2 + 10;
      })
      .classed("weight-label", true)
      .text(function (d) {
        return d.weight;
      });

    paths
      .enter()
      .append("path")
      .classed("no-selected-edges", true)
      .style("marker-end", "url(#end-arrow)")
      .attr("id", function (d) {
        return d.source.id + "to" + d.target.id;
      })
      .attr("d", function (d) {
        return (
          "M" +
          d.source.x +
          "," +
          d.source.y +
          "L" +
          d.target.x +
          "," +
          d.target.y
        );
      })
      .on("mousedown", function (d) {
        thisGraph.pathMouseDown.call(thisGraph, d3.select(this), d);
      })
      .on("mouseup", function (d) {
        state.mouseDownLink = null;
      });

    // remove old links
    paths.exit().remove();

    // update existing nodes
    thisGraph.circles = thisGraph.circles.data(thisGraph.nodes, function (d) {
      return d.id;
    });
    thisGraph.circles.attr("transform", function (d) {
      return "translate(" + d.x + "," + d.y + ")";
    });

    // add new nodes
    var newGs = thisGraph.circles.enter().append("g");

    newGs
      .classed(consts.circleGClass, true)
      .attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
      })

      .on("mouseover", function (d) {
        if (state.shiftNodeDrag) {
          d3.select(this).classed(consts.connectClass, true);
        }
      })
      .on("mouseout", function (d) {
        d3.select(this).classed(consts.connectClass, false);
      })
      .on("mousedown", function (d) {
        thisGraph.circleMouseDown.call(thisGraph, d3.select(this), d);
      })
      .on("mouseup", function (d) {
        thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
      })
      .call(thisGraph.drag);

    newGs.append("circle")
      .attr("r", String(consts.nodeRadius))
      .attr("id", function (d) {
        return d.id;
      })
      .classed("no-selected-nodes", true)

    newGs.each(function (d) {
      thisGraph.insertTitleLinebreaks(d3.select(this), d.title);
    });

    // remove old nodes
    thisGraph.circles.exit().remove();
  };

  GraphCreator.prototype.zoomed = function () {
    this.state.justScaleTransGraph = true;
    d3.select("." + this.consts.graphClass).attr(
      "transform",
      "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")"
    );
  };

  GraphCreator.prototype.updateWindow = function (svg) {
    var docEl = document.documentElement,
      bodyEl = document.getElementsByTagName("body")[0];
    var x = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth;
    var y = window.innerHeight || docEl.clientHeight || bodyEl.clientHeight;
    svg.attr("width", x).attr("height", y);
  };

  /**** Main ****/
  window.onbeforeunload = function () {
    return "Los cambios no se guardarán al salir.";
  };

  var docEl = document.documentElement,
    bodyEl = document.getElementsByTagName("body")[0];

  var width = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth,
    height = window.innerHeight || docEl.clientHeight || bodyEl.clientHeight;

  var xLoc = width / 3.5,
    yLoc = 100;

  // initial node data
  var nodes = [
    { title: "0", id: 0, x: xLoc, y: yLoc },
    { title: "1", id: 1, x: xLoc, y: yLoc + 200 },
  ];
  var edges = [{ source: nodes[1], target: nodes[0], weight: 10 }];

  /** Main SVG **/
  var svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  var graph = new GraphCreator(svg, nodes, edges);
  graph.setIdCt(2);
  graph.updateGraph();
})(window.d3, window.saveAs, window.Blob);