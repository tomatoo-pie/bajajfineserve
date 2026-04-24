const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/bfhl", (req, res) => {
  const data = req.body.data || [];

  let invalid_entries = [];
  let duplicate_edges = [];
  let seen = new Set();

  let graph = {};
  let parentMap = {};
  let childSet = new Set();

  for (let raw of data) {
    let edge = raw.trim();

    if (!/^[A-Z]->[A-Z]$/.test(edge)) {
      invalid_entries.push(raw);
      continue;
    }

    let [u, v] = edge.split("->");

    if (u === v) {
      invalid_entries.push(raw);
      continue;
    }

    if (seen.has(edge)) {
      if (!duplicate_edges.includes(edge))
        duplicate_edges.push(edge);
      continue;
    }

    seen.add(edge);

    if (parentMap[v]) continue;

    parentMap[v] = u;

    if (!graph[u]) graph[u] = [];
    graph[u].push(v);

    if (!graph[v]) graph[v] = [];

    childSet.add(v);
  }

  let nodes = Object.keys(graph);
  let processed = new Set();
  let hierarchies = [];

  function detectCycle(node, visited, stack) {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;

    visited.add(node);
    stack.add(node);

    for (let child of graph[node]) {
      if (detectCycle(child, visited, stack)) return true;
    }

    stack.delete(node);
    return false;
  }

  function buildTree(node) {
    let obj = {};
    for (let child of graph[node]) {
      obj[child] = buildTree(child);
    }
    return obj;
  }

  function depth(node) {
    if (graph[node].length === 0) return 1;
    return 1 + Math.max(...graph[node].map(depth));
  }

  let total_trees = 0;
  let total_cycles = 0;
  let largest_root = "";
  let maxDepth = 0;

  for (let node of nodes) {
    if (processed.has(node)) continue;

    let stack = [node];
    let component = [];

    while (stack.length) {
      let cur = stack.pop();
      if (processed.has(cur)) continue;

      processed.add(cur);
      component.push(cur);

      for (let child of graph[cur]) stack.push(child);

      for (let p in graph) {
        if (graph[p].includes(cur)) stack.push(p);
      }
    }

    let root = component.find(n => !childSet.has(n));
    if (!root) root = component.sort()[0];

    let has_cycle = detectCycle(root, new Set(), new Set());

    if (has_cycle) {
      total_cycles++;
      hierarchies.push({
        root,
        tree: {},
        has_cycle: true
      });
    } else {
      let tree = {};
      tree[root] = buildTree(root);
      let d = depth(root);

      total_trees++;

      if (d > maxDepth || (d === maxDepth && root < largest_root)) {
        maxDepth = d;
        largest_root = root;
      }

      hierarchies.push({
        root,
        tree,
        depth: d
      });
    }
  }

  res.json({
    user_id: "yourname_ddmmyyyy",
    email_id: "your_email",
    college_roll_number: "your_roll",
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees,
      total_cycles,
      largest_tree_root: largest_root
    }
  });
});

app.listen(3000, () => console.log("Server running on 3000"));