import { realSupabase, isRealSupabaseConfigured } from "./supabase";
import { GraphNode, GraphEdge } from "../types";

const LOCAL_NODES_KEY = "hippocampus_graph_nodes_v1";
const LOCAL_EDGES_KEY = "hippocampus_graph_edges_v1";

export function getDefaultGraphData(userId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const defaultNodes: GraphNode[] = [
    { id: "root", label: "ジョアンナ", node_type: "root", user_id: userId },
    
    // Category Nodes
    { id: "profile", label: "Profile (基本情報)", node_type: "category", user_id: userId },
    { id: "preferences", label: "Preferences (好み)", node_type: "category", user_id: userId },
    { id: "projects", label: "Projects (プロジェクト)", node_type: "category", user_id: userId },
    { id: "goals", label: "Goals (目標)", node_type: "category", user_id: userId },
    { id: "rules", label: "Rules (自分ルール)", node_type: "category", user_id: userId },
    { id: "relationships", label: "Relationships (人間関係)", node_type: "category", user_id: userId },

    // Details Nodes
    { id: "profile_name", label: "名前: ジョアンナ", node_type: "detail", user_id: userId },
    { id: "profile_role", label: "役割: ライフプランアシスタント", node_type: "detail", user_id: userId },
    { id: "pref_coffee", label: "深煎りコーヒー (朝の活力にゃ)", node_type: "detail", user_id: userId },
    { id: "pref_cats", label: "無類の猫好き (司書猫と対話)", node_type: "detail", user_id: userId },
    { id: "proj_brain", label: "海馬記憶データベースの開発", node_type: "detail", user_id: userId },
    { id: "goal_peace", label: "日々の自己理解と心の平穏", node_type: "detail", user_id: userId },
    { id: "rule_diary", label: "毎晩5分、音声で心を吐き出す", node_type: "detail", user_id: userId },
    { id: "rel_librarian", label: "司書猫ジェミニ (心理的アドバイザー)", node_type: "detail", user_id: userId }
  ];

  const defaultEdges: GraphEdge[] = [
    // Root to categories
    { id: "e_root_profile", parent_id: "root", child_id: "profile", user_id: userId },
    { id: "e_root_pref", parent_id: "root", child_id: "preferences", user_id: userId },
    { id: "e_root_proj", parent_id: "root", child_id: "projects", user_id: userId },
    { id: "e_root_goals", parent_id: "root", child_id: "goals", user_id: userId },
    { id: "e_root_rules", parent_id: "root", child_id: "rules", user_id: userId },
    { id: "e_root_rel", parent_id: "root", child_id: "relationships", user_id: userId },

    // Categories to details
    { id: "e_prof_name", parent_id: "profile", child_id: "profile_name", user_id: userId },
    { id: "e_prof_role", parent_id: "profile", child_id: "profile_role", user_id: userId },
    { id: "e_pref_coffee", parent_id: "preferences", child_id: "pref_coffee", user_id: userId },
    { id: "e_pref_cats", parent_id: "preferences", child_id: "pref_cats", user_id: userId },
    { id: "e_proj_brain", parent_id: "projects", child_id: "proj_brain", user_id: userId },
    { id: "e_goal_peace", parent_id: "goals", child_id: "goal_peace", user_id: userId },
    { id: "e_rule_diary", parent_id: "rules", child_id: "rule_diary", user_id: userId },
    { id: "e_rel_lib", parent_id: "relationships", child_id: "rel_librarian", user_id: userId }
  ];

  return { nodes: defaultNodes, edges: defaultEdges };
}

// Load Nodes and Edges from Supabase or Local Storage
export async function loadGraphData(userId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const actualUserId = userId || "guest";
  
  if (isRealSupabaseConfigured && realSupabase) {
    try {
      // Query Nodes
      const { data: nodesData, error: nodesError } = await realSupabase
        .from("graph_nodes")
        .select("*")
        .eq("user_id", actualUserId);
      
      // Query Edges
      const { data: edgesData, error: edgesError } = await realSupabase
        .from("graph_edges")
        .select("*")
        .eq("user_id", actualUserId);

      if (nodesError || edgesError) {
        console.warn("Supabase graph tables query failed, falling back to local storage.", nodesError || edgesError);
      } else if (nodesData && nodesData.length > 0) {
        // Map Supabase objects (e.g. rename columns if they differ slightly)
        const mappedNodes: GraphNode[] = nodesData.map((n: any) => ({
          id: n.id,
          label: n.label || n.name || "無題のノード",
          node_type: n.node_type || "detail",
          user_id: n.user_id
        }));

        const mappedEdges: GraphEdge[] = edgesData ? edgesData.map((e: any) => ({
          id: e.id,
          parent_id: e.parent_id,
          child_id: e.child_id,
          user_id: e.user_id
        })) : [];

        return { nodes: mappedNodes, edges: mappedEdges };
      } else {
        // Supabase is configured but tables are empty for this user, seed them!
        console.log("Supabase graph is empty for user. Seeding default nodes/edges...");
        const defaults = getDefaultGraphData(actualUserId);
        
        // Push default nodes to Supabase
        const { error: seedNodesErr } = await realSupabase.from("graph_nodes").insert(
          defaults.nodes.map(n => ({
            id: n.id,
            label: n.label,
            node_type: n.node_type,
            user_id: actualUserId
          }))
        );

        // Push default edges to Supabase
        const { error: seedEdgesErr } = await realSupabase.from("graph_edges").insert(
          defaults.edges.map(e => ({
            id: e.id,
            parent_id: e.parent_id,
            child_id: e.child_id,
            user_id: actualUserId
          }))
        );

        if (!seedNodesErr && !seedEdgesErr) {
          return defaults;
        } else {
          console.warn("Failed to seed Supabase graph tables, returning memory defaults.", seedNodesErr, seedEdgesErr);
          return defaults;
        }
      }
    } catch (err) {
      console.error("Exception in Supabase loadGraphData, falling back to local storage.", err);
    }
  }

  // Local sandbox fallback
  const storedNodesStr = localStorage.getItem(`${LOCAL_NODES_KEY}_${actualUserId}`);
  const storedEdgesStr = localStorage.getItem(`${LOCAL_EDGES_KEY}_${actualUserId}`);

  if (storedNodesStr && storedEdgesStr) {
    try {
      const nodes = JSON.parse(storedNodesStr) as GraphNode[];
      const edges = JSON.parse(storedEdgesStr) as GraphEdge[];
      return { nodes, edges };
    } catch {
      // JSON parse error
    }
  }

  // Default initial seed for local
  const defaults = getDefaultGraphData(actualUserId);
  localStorage.setItem(`${LOCAL_NODES_KEY}_${actualUserId}`, JSON.stringify(defaults.nodes));
  localStorage.setItem(`${LOCAL_EDGES_KEY}_${actualUserId}`, JSON.stringify(defaults.edges));
  return defaults;
}

// Save Nodes and Edges locally
function saveGraphLocal(userId: string, nodes: GraphNode[], edges: GraphEdge[]) {
  const actualUserId = userId || "guest";
  localStorage.setItem(`${LOCAL_NODES_KEY}_${actualUserId}`, JSON.stringify(nodes));
  localStorage.setItem(`${LOCAL_EDGES_KEY}_${actualUserId}`, JSON.stringify(edges));
}

// Add Node and Edge to Parent
export async function addGraphNode(
  userId: string,
  label: string,
  nodeType: string,
  parentId?: string
): Promise<{ node: GraphNode; edge?: GraphEdge }> {
  const actualUserId = userId || "guest";
  const newNodeId = "node_" + Math.random().toString(36).substring(2, 11);
  const newNode: GraphNode = {
    id: newNodeId,
    label,
    node_type: nodeType,
    user_id: actualUserId
  };

  let newEdge: GraphEdge | undefined;
  if (parentId) {
    const newEdgeId = "edge_" + Math.random().toString(36).substring(2, 11);
    newEdge = {
      id: newEdgeId,
      parent_id: parentId,
      child_id: newNodeId,
      user_id: actualUserId
    };
  }

  if (isRealSupabaseConfigured && realSupabase) {
    try {
      const { error: nodeErr } = await realSupabase.from("graph_nodes").insert({
        id: newNode.id,
        label: newNode.label,
        node_type: newNode.node_type,
        user_id: actualUserId
      });

      if (!nodeErr) {
        if (newEdge) {
          const { error: edgeErr } = await realSupabase.from("graph_edges").insert({
            id: newEdge.id,
            parent_id: newEdge.parent_id,
            child_id: newEdge.child_id,
            user_id: actualUserId
          });
          if (edgeErr) {
            console.warn("Failed to insert graph edge on Supabase", edgeErr);
          }
        }
        
        // Also keep local copy updated for smooth offline experience
        const localData = await loadGraphData(actualUserId);
        localData.nodes.push(newNode);
        if (newEdge) localData.edges.push(newEdge);
        saveGraphLocal(actualUserId, localData.nodes, localData.edges);

        return { node: newNode, edge: newEdge };
      } else {
        console.warn("Supabase graph insert node failed, using client fallback", nodeErr);
      }
    } catch (err) {
      console.error("Supabase insert graph exception", err);
    }
  }

  // Local fallback
  const localData = await loadGraphData(actualUserId);
  localData.nodes.push(newNode);
  if (newEdge) localData.edges.push(newEdge);
  saveGraphLocal(actualUserId, localData.nodes, localData.edges);

  return { node: newNode, edge: newEdge };
}

// Update existing Node
export async function updateGraphNode(
  userId: string,
  nodeId: string,
  label: string,
  nodeType: string
): Promise<GraphNode> {
  const actualUserId = userId || "guest";
  
  if (isRealSupabaseConfigured && realSupabase) {
    try {
      const { error } = await realSupabase
        .from("graph_nodes")
        .update({ label, node_type: nodeType })
        .eq("id", nodeId)
        .eq("user_id", actualUserId);

      if (!error) {
        // Update local
        const localData = await loadGraphData(actualUserId);
        const node = localData.nodes.find(n => n.id === nodeId);
        if (node) {
          node.label = label;
          node.node_type = nodeType;
        }
        saveGraphLocal(actualUserId, localData.nodes, localData.edges);
        return { id: nodeId, label, node_type: nodeType, user_id: actualUserId };
      } else {
        console.warn("Supabase update graph node failed", error);
      }
    } catch (err) {
      console.error("Supabase update graph node exception", err);
    }
  }

  // Local fallback
  const localData = await loadGraphData(actualUserId);
  const node = localData.nodes.find(n => n.id === nodeId);
  if (node) {
    node.label = label;
    node.node_type = nodeType;
  }
  saveGraphLocal(actualUserId, localData.nodes, localData.edges);
  return { id: nodeId, label, node_type: nodeType, user_id: actualUserId };
}

// Delete Node (and all associated recursive child nodes and edges)
export async function deleteGraphNode(userId: string, nodeId: string): Promise<boolean> {
  const actualUserId = userId || "guest";
  
  // We need to delete this node, all edges connected to it, and potentially orphan children or cascade-delete children.
  // To keep it clean and robust, we do a client-side recursive collection of all subnode IDs under this node.
  const localData = await loadGraphData(actualUserId);
  const nodeIdsToDelete = new Set<string>();
  
  function collectChildren(id: string) {
    nodeIdsToDelete.add(id);
    const childEdges = localData.edges.filter(e => e.parent_id === id);
    childEdges.forEach(edge => {
      if (!nodeIdsToDelete.has(edge.child_id)) {
        collectChildren(edge.child_id);
      }
    });
  }

  // Don't allow deleting the root node
  if (nodeId === "root") {
    return false;
  }

  collectChildren(nodeId);

  if (isRealSupabaseConfigured && realSupabase) {
    try {
      const idsArray = Array.from(nodeIdsToDelete);
      
      // Delete edges where child or parent is deleted
      const { error: edgesErr } = await realSupabase
        .from("graph_edges")
        .delete()
        .eq("user_id", actualUserId)
        .or(`parent_id.in.(${idsArray.join(",")}),child_id.in.(${idsArray.join(",")})`);

      // Delete the nodes
      const { error: nodesErr } = await realSupabase
        .from("graph_nodes")
        .delete()
        .eq("user_id", actualUserId)
        .in("id", idsArray);

      if (!nodesErr && !edgesErr) {
        // Also update local copy
        const filteredNodes = localData.nodes.filter(n => !nodeIdsToDelete.has(n.id));
        const filteredEdges = localData.edges.filter(
          e => !nodeIdsToDelete.has(e.parent_id) && !nodeIdsToDelete.has(e.child_id)
        );
        saveGraphLocal(actualUserId, filteredNodes, filteredEdges);
        return true;
      } else {
        console.warn("Supabase graph delete failed", nodesErr, edgesErr);
      }
    } catch (err) {
      console.error("Supabase delete graph exception", err);
    }
  }

  // Local fallback
  const filteredNodes = localData.nodes.filter(n => !nodeIdsToDelete.has(n.id));
  const filteredEdges = localData.edges.filter(
    e => !nodeIdsToDelete.has(e.parent_id) && !nodeIdsToDelete.has(e.child_id)
  );
  saveGraphLocal(actualUserId, filteredNodes, filteredEdges);
  return true;
}
