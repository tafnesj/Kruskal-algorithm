/*..................................
  Kruskal Algorithm in JavaScript
..................................*/
'use strict';

process.stdin.resume();
process.stdin.setEncoding('utf-8');

let inputString = '';
let currentLine = 0;

process.stdin.on('data', inputStdin => {
    inputString += inputStdin;
});

process.stdin.on('end', _ => {
    inputString = inputString.trim().split('\n').map(string => {
        return string.trim();
    });
    main();    
});

function readline() {
    return inputString[currentLine++];
}

function order(A, B) {
  return A.weight-B.weight;
}

function main(){ 
  let total_weight=0;
  let aux_read = (readline().split(' '));
  let num_nodes = aux_read[0];
  let num_edges = aux_read[1];
  // console.log(num_nodes,num_edges);

  for(let i=0; i<num_nodes; i++){
    parent[i]=i;
    size_component[i]=1;
    // console.log(i,size_component[i]);
  }

  let edges = [];

  for(let i=0; i<num_edges; i++){
    aux_read = (readline().split(' '));
    let to = parseInt(aux_read[0]);
    let from = parseInt(aux_read[1]);
    let weight = parseInt(aux_read[2]);
    // console.log(to, from, weight);

    to--; from--;
    edges.push({to:to,from:from,weight:weight});
  }

  edges.sort(order);
  // console.log(edges);

  for(let i=0; i<num_edges; i++){
    if(unionBySize(edges[i].to,edges[i].from)){
      total_weight+=edges[i].weight;
    }
  }

  console.log(total_weight);
  return 0;
}

let parent = [];
let size_component = [];

class edge{
  constructor(to, from, weight){
    this.to=to;
    this.from=from;
    this.weight=weight;
  }
}

// Search main parent: return represent
function represent(i){
  if(parent[i]==i){
    return i;
  }else{
    return parent[i]=represent(parent[i]);
  }
}

// Join components
function unionBySize(u, v){
  u = represent(u);
  v = represent(v);

  if(u==v){
    // Can't join because they're in the same component
    return false;
  }else{
    if(size_component[u]<size_component[v]){
      // "U" always are the most high value
      [u,v]=[v,u];
    }
    // New represent
    parent[v]=u;
    // Change size of the component
    size_component[u]+=size_component[v];
  }
  // Can join
  return true;
}