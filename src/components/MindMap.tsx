import React, { useState, useEffect, useRef } from "react";
import Tree from "react-d3-tree";
import { realSupabase, isRealSupabaseConfigured } from "../utils/supabase";
import { UserProfile } from "../types";
import { Plus, Edit2, Trash2, HelpCircle, Network, Info, Save, X, Layers, RefreshCw } from "lucide-react";

interface NodeItem {
  id: string;
  label: string;
  node_type: string;
  user_id?: string | null;
  created_at?: string;
}

interface EdgeItem {
  id: string;
  parent_id: string;
  child_id: string;
  user_id?: string | null;
  created_at?: string;
}

interface MindMapProps {
  user: UserProfile | null;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const DEFAULT_NODES: NodeItem[] = [
  { id: "joanna", label: "ジョアンナ", node_type: "root" },
  { id: "profile", label: "プロフィール", node_type: "child" },
  { id: "preferences", label: "好み・価値観", node_type: "child" },
  { id: "projects", label: "プロジェクト", node_type: "child" },
  { id: "goals", label: "脳内目標", node_type: "child" },
  { id: "rules", label: "マイルール", node_type: "child" },
  { id: "relationships", label: "大切な関係性", node_type: "child" },
  { id: "prof-name", label: "名前: ジョアンナ", node_type: "leaf" },
  { id: "prof-role", label: "役割: AI司書補佐", node_type: "leaf" },
  { id: "pref-tea", label: "お茶: ほうじ茶", node_type: "leaf" },
  { id: "pref-place", label: "好きな場所: 図書館", node_type: "leaf" },
  { id: "proj-hippo", label: "海馬メモリアル", node_type: "leaf" },
  { id: "goal-self", label: "自己理解の深化", node_type: "leaf" },
  { id: "rule-breathe", label: "毎日3回の深呼吸", node_type: "leaf" },
  { id: "rel-noah", label: "ノア (司書長)", node_type: "leaf" }
];

const DEFAULT_EDGES: EdgeItem[] = [
  { id: "e1", parent_id: "joanna", child_id: "profile" },
  { id: "e2", parent_id: "joanna", child_id: "preferences" },
  { id: "e3", parent_id: "joanna", child_id: "projects" },
  { id: "e4", parent_id: "joanna", child_id: "goals" },
  { id: "e5", parent_id: "joanna", child_id: "rules" },
  { id: "e6", parent_id: "joanna", child_id: "relationships" },
  { id: "e7", parent_id: "profile", child_id: "prof-name" },
  { id: "e8", parent_id: "profile", child_id: "prof-role" },
  { id: "e9", parent_id: "preferences", child_id: "pref-tea" },
  { id: "e10", parent_id: "preferences", child_id: "pref-place" },
  { id: "e11", parent_id: "projects", child_id: "proj-hippo" },
  { id: "e12", parent_id: "goals", child_id: "goal-self" },
  { id: "e13", parent_id: "rules", child_id: "rule-breathe" },
  { id: "e14", parent_id: "relationships", child_id: "rel-noah" }
];

export default function MindMap({ user, showToast }: MindMapProps) {
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [edges, setEdges] = useState<EdgeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Form states for adding/editing node
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState({
    id: "",
    label: "",
    node_type: "child",
    parent_id: "joanna"
  });

  // SVG dimensions for tree centering
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [translate, setTranslate] = useState({ x: 400, y: 300 });

  // Load tree dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth || 800;
        const height = containerRef.current.offsetHeight || 600;
        setDimensions({ width, height });
        // Set root node in the center horizontally, and slightly left-biased for horizontal branching
        setTranslate({ x: width / 3, y: height / 2 });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Fetch or initialize graph nodes & edges
  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const userId = user?.id || null;
      const localKeyNodes = `hippocampus_graph_nodes_${userId || "guest"}`;
      const localKeyEdges = `hippocampus_graph_edges_${userId || "guest"}`;

      if (isRealSupabaseConfigured && realSupabase) {
        // 1. Fetch from Supabase with user_id filtering
        let queryNodes = realSupabase.from("graph_nodes").select("*");
        let queryEdges = realSupabase.from("graph_edges").select("*");

        if (userId) {
          queryNodes = queryNodes.eq("user_id", userId);
          queryEdges = queryEdges.eq("user_id", userId);
        } else {
          queryNodes = queryNodes.is("user_id", null);
          queryEdges = queryEdges.is("user_id", null);
        }

        const { data: nodesData, error: nodesError } = await queryNodes;
        const { data: edgesData, error: edgesError } = await queryEdges;

        if (nodesError || edgesError) {
          throw new Error("Supabase fetch failed, falling back to LocalStorage.");
        }

        // If table exists but has no data for this user, seed default nodes
        if (!nodesData || nodesData.length === 0) {
          console.log("Seeding default graph to Supabase for user:", userId);
          const seededNodes = DEFAULT_NODES.map(n => ({ ...n, user_id: userId }));
          const seededEdges = DEFAULT_EDGES.map(e => ({ ...e, user_id: userId }));

          await realSupabase.from("graph_nodes").insert(seededNodes);
          await realSupabase.from("graph_edges").insert(seededEdges);

          setNodes(seededNodes);
          setEdges(seededEdges);
          localStorage.setItem(localKeyNodes, JSON.stringify(seededNodes));
          localStorage.setItem(localKeyEdges, JSON.stringify(seededEdges));
        } else {
          setNodes(nodesData);
          setEdges(edgesData || []);
          localStorage.setItem(localKeyNodes, JSON.stringify(nodesData));
          localStorage.setItem(localKeyEdges, JSON.stringify(edgesData || []));
        }
      } else {
        // 2. Fetch from LocalStorage
        const localNodes = localStorage.getItem(localKeyNodes);
        const localEdges = localStorage.getItem(localKeyEdges);

        if (localNodes && localEdges) {
          setNodes(JSON.parse(localNodes));
          setEdges(JSON.parse(localEdges));
        } else {
          // Initialize defaults
          const seededNodes = DEFAULT_NODES.map(n => ({ ...n, user_id: userId }));
          const seededEdges = DEFAULT_EDGES.map(e => ({ ...e, user_id: userId }));
          localStorage.setItem(localKeyNodes, JSON.stringify(seededNodes));
          localStorage.setItem(localKeyEdges, JSON.stringify(seededEdges));
          setNodes(seededNodes);
          setEdges(seededEdges);
        }
      }
    } catch (e: any) {
      console.warn("Graph fetch failed. Using local storage sandbox backup.", e.message);
      // Fallback
      const userId = user?.id || null;
      const localKeyNodes = `hippocampus_graph_nodes_${userId || "guest"}`;
      const localKeyEdges = `hippocampus_graph_edges_${userId || "guest"}`;
      const localNodes = localStorage.getItem(localKeyNodes);
      const localEdges = localStorage.getItem(localKeyEdges);

      if (localNodes && localEdges) {
        setNodes(JSON.parse(localNodes));
        setEdges(JSON.parse(localEdges));
      } else {
        const seededNodes = DEFAULT_NODES.map(n => ({ ...n, user_id: userId }));
        const seededEdges = DEFAULT_EDGES.map(e => ({ ...e, user_id: userId }));
        localStorage.setItem(localKeyNodes, JSON.stringify(seededNodes));
        localStorage.setItem(localKeyEdges, JSON.stringify(seededEdges));
        setNodes(seededNodes);
        setEdges(seededEdges);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, [user]);

  const handleResetToDefaults = async () => {
    if (window.confirm("マインドマップを初期状態（日本語ラベル）に戻してもよろしいですか？追加したカスタムノードは削除されますにゃ。")) {
      setLoading(true);
      const userId = user?.id || null;
      const localKeyNodes = `hippocampus_graph_nodes_${userId || "guest"}`;
      const localKeyEdges = `hippocampus_graph_edges_${userId || "guest"}`;

      const seededNodes = DEFAULT_NODES.map(n => ({ ...n, user_id: userId }));
      const seededEdges = DEFAULT_EDGES.map(e => ({ ...e, user_id: userId }));

      setNodes(seededNodes);
      setEdges(seededEdges);
      localStorage.setItem(localKeyNodes, JSON.stringify(seededNodes));
      localStorage.setItem(localKeyEdges, JSON.stringify(seededEdges));

      if (isRealSupabaseConfigured && realSupabase) {
        try {
          if (userId) {
            await realSupabase.from("graph_nodes").delete().eq("user_id", userId);
            await realSupabase.from("graph_edges").delete().eq("user_id", userId);
          } else {
            await realSupabase.from("graph_nodes").delete().is("user_id", null);
            await realSupabase.from("graph_edges").delete().is("user_id", null);
          }
          await realSupabase.from("graph_nodes").insert(seededNodes);
          await realSupabase.from("graph_edges").insert(seededEdges);
          showToast("マインドマップを日本語の初期状態にリセットし、Supabaseと同期したにゃ！🎉", "success");
        } catch (err: any) {
          console.error("Failed to reset on Supabase:", err);
          showToast("ローカルのみ初期化しました。Supabaseへの同期は失敗したにゃ🐾", "info");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        showToast("マインドマップを日本語の初期状態にリセットしたにゃ！🐾", "success");
      }
    }
  };

  // Save graph data wrapper
  const saveGraphData = async (newNodes: NodeItem[], newEdges: EdgeItem[]) => {
    const userId = user?.id || null;
    const localKeyNodes = `hippocampus_graph_nodes_${userId || "guest"}`;
    const localKeyEdges = `hippocampus_graph_edges_${userId || "guest"}`;

    try {
      setNodes(newNodes);
      setEdges(newEdges);

      // Always backup locally
      localStorage.setItem(localKeyNodes, JSON.stringify(newNodes));
      localStorage.setItem(localKeyEdges, JSON.stringify(newEdges));

      if (isRealSupabaseConfigured && realSupabase) {
        // Perform clean delete and write operations for the CURRENT user only
        if (userId) {
          await realSupabase.from("graph_nodes").delete().eq("user_id", userId);
          await realSupabase.from("graph_edges").delete().eq("user_id", userId);
        } else {
          await realSupabase.from("graph_nodes").delete().is("user_id", null);
          await realSupabase.from("graph_edges").delete().is("user_id", null);
        }

        const nodesToPush = newNodes.map(n => ({
          id: n.id,
          label: n.label,
          node_type: n.node_type,
          user_id: userId
        }));
        const edgesToPush = newEdges.map(e => ({
          id: e.id,
          parent_id: e.parent_id,
          child_id: e.child_id,
          user_id: userId
        }));

        await realSupabase.from("graph_nodes").insert(nodesToPush);
        if (edgesToPush.length > 0) {
          await realSupabase.from("graph_edges").insert(edgesToPush);
        }
      }
    } catch (e: any) {
      console.error("Cloud graph sync failed:", e.message);
      showToast("クラウド同期中にエラーが発生しました。ローカルに保存したにゃ🐾", "info");
    }
  };

  // Convert flat nodes/edges into hierarchy for d3-tree
  const buildTreeData = (): any => {
    // Find the root node. Usually the one with node_type "root" or named "joanna"
    const rootNode = nodes.find(n => n.node_type === "root" || n.id === "joanna") || nodes[0];
    if (!rootNode) return null;

    const buildSubtree = (nodeId: string, visited: Set<string> = new Set()): any => {
      if (visited.has(nodeId)) {
        return { name: `[Loop: ${nodeId}]`, attributes: { id: nodeId, node_type: "leaf" } };
      }
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      const label = node ? node.label : nodeId;
      const type = node ? node.node_type : "child";

      // Find children edges
      const childrenEdges = edges.filter(e => e.parent_id === nodeId);
      const children = childrenEdges
        .map(e => buildSubtree(e.child_id, new Set(visited)))
        .filter(Boolean);

      return {
        name: label,
        attributes: {
          id: nodeId,
          node_type: type
        },
        children: children.length > 0 ? children : undefined
      };
    };

    return buildSubtree(rootNode.id);
  };

  const handleOpenAddNode = (parentId?: string) => {
    setFormMode("add");
    setFormData({
      id: "node_" + Date.now().toString().slice(-6),
      label: "",
      node_type: "leaf",
      parent_id: parentId || selectedNodeId || "joanna"
    });
    setShowFormModal(true);
  };

  const handleOpenEditNode = (nodeId: string) => {
    const target = nodes.find(n => n.id === nodeId);
    if (!target) return;

    // Find its parent
    const edge = edges.find(e => e.child_id === nodeId);

    setFormMode("edit");
    setFormData({
      id: target.id,
      label: target.label,
      node_type: target.node_type,
      parent_id: edge ? edge.parent_id : ""
    });
    setShowFormModal(true);
  };

  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label.trim()) {
      showToast("ノードのラベルを入力してくださいにゃ🐾", "error");
      return;
    }

    if (formMode === "add") {
      // Check if ID is unique
      const exists = nodes.some(n => n.id === formData.id);
      if (exists) {
        showToast("ノードIDが重複しています。別のIDにしてにゃ🐾", "error");
        return;
      }

      const newNode: NodeItem = {
        id: formData.id,
        label: formData.label,
        node_type: formData.node_type,
        user_id: user?.id || null,
        created_at: new Date().toISOString()
      };

      const newEdge: EdgeItem = {
        id: "edge_" + Date.now().toString().slice(-6) + "_" + Math.floor(Math.random() * 100),
        parent_id: formData.parent_id,
        child_id: formData.id,
        user_id: user?.id || null,
        created_at: new Date().toISOString()
      };

      const updatedNodes = [...nodes, newNode];
      const updatedEdges = [...edges, newEdge];

      await saveGraphData(updatedNodes, updatedEdges);
      showToast(`ノード「${formData.label}」を追加したにゃ！🎉`, "success");
    } else {
      // Edit mode
      const updatedNodes = nodes.map(n => {
        if (n.id === formData.id) {
          return { ...n, label: formData.label, node_type: formData.node_type };
        }
        return n;
      });

      // Update parent edge if modified and parent is not empty
      let updatedEdges = [...edges];
      if (formData.parent_id) {
        const edgeIndex = edges.findIndex(e => e.child_id === formData.id);
        if (edgeIndex > -1) {
          updatedEdges[edgeIndex] = { ...updatedEdges[edgeIndex], parent_id: formData.parent_id };
        } else {
          // If no edge existed, create one
          updatedEdges.push({
            id: "edge_" + Date.now().toString().slice(-6),
            parent_id: formData.parent_id,
            child_id: formData.id,
            user_id: user?.id || null,
            created_at: new Date().toISOString()
          });
        }
      }

      await saveGraphData(updatedNodes, updatedEdges);
      showToast(`ノード「${formData.label}」を更新したにゃ！✨`, "success");
    }

    setShowFormModal(false);
    setSelectedNodeId(formData.id);
  };

  const handleDeleteNode = async (nodeId: string) => {
    const target = nodes.find(n => n.id === nodeId);
    if (!target) return;

    if (target.node_type === "root" || target.id === "joanna") {
      showToast("ルートノード（ジョアンナ）は削除できませんにゃ！🐾", "error");
      return;
    }

    if (!window.confirm(`ノード「${target.label}」を削除しますか？\n（関連する親子関係も同時に消去されます）`)) {
      return;
    }

    // Filter out target node and its child nodes recursively
    const getDescendants = (id: string, visited = new Set<string>()): string[] => {
      visited.add(id);
      const directChildren = edges.filter(e => e.parent_id === id).map(e => e.child_id);
      let results = [...directChildren];
      for (const child of directChildren) {
        if (!visited.has(child)) {
          results = [...results, ...getDescendants(child, visited)];
        }
      }
      return results;
    };

    const toDeleteIds = [nodeId, ...getDescendants(nodeId)];

    const updatedNodes = nodes.filter(n => !toDeleteIds.includes(n.id));
    const updatedEdges = edges.filter(e => !toDeleteIds.includes(e.child_id) && !toDeleteIds.includes(e.parent_id));

    await saveGraphData(updatedNodes, updatedEdges);
    showToast(`ノード「${target.label}」と配下の子ノードを削除したにゃ🐾`, "info");
    setSelectedNodeId(null);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedNodeParentEdge = edges.find(e => e.child_id === selectedNodeId);
  const selectedNodeParent = selectedNodeParentEdge ? nodes.find(n => n.id === selectedNodeParentEdge.parent_id) : null;
  const selectedNodeChildren = edges.filter(e => e.parent_id === selectedNodeId).map(e => nodes.find(n => n.id === e.child_id)).filter(Boolean) as NodeItem[];

  // Custom node drawing within SVG for react-d3-tree
  const renderCustomNodeElement = ({ nodeDatum, toggleNode }: any) => {
    const isRoot = nodeDatum.attributes?.node_type === "root" || nodeDatum.attributes?.id === "joanna";
    const isChild = nodeDatum.attributes?.node_type === "child" || nodeDatum.attributes?.node_type === "category";
    const nodeId = nodeDatum.attributes?.id as string;
    const isSelected = selectedNodeId === nodeId;

    // Estimate width based on characters to prevent text wrapping or vertical squishing
    const labelRawText = nodeDatum.name || "";
    // Truncate if extremely long to avoid oversized overlap boxes, full name is displayed in side drawer
    const labelText = labelRawText.length > 20 ? labelRawText.slice(0, 20) + "..." : labelRawText;
    
    let estimatedWidth = 0;
    for (let i = 0; i < labelText.length; i++) {
      const code = labelText.charCodeAt(i);
      // Half-width chars (ASCII) get ~7px, full-width (Japanese) get ~12px
      estimatedWidth += (code >= 0 && code <= 128) ? 7 : 12;
    }
    
    const nodeWidth = Math.max(140, estimatedWidth + 28);
    const nodeHeight = 36;
    const xOffset = -nodeWidth / 2;
    const yOffset = -nodeHeight / 2;

    // Node colors
    let cardFill = "#FFFFFF";
    let cardStroke = "#E5E5E5";
    let textFill = "#374151";

    if (isRoot) {
      cardFill = "#4A5D4E"; // Forest green
      cardStroke = "#3D4F41";
      textFill = "#FFFFFF";
    } else if (isChild) {
      cardFill = "#E8F5E9"; // Mint green background
      cardStroke = "#81C784";
      textFill = "#1B5E20";
    } else if (isSelected) {
      cardFill = "#FFFDE7"; // Accent light yellow highlight
      cardStroke = "#FBC02D";
    }

    return (
      <g>
        {/* Node Shadow card container */}
        <rect
          width={nodeWidth}
          height={nodeHeight}
          x={xOffset}
          y={yOffset}
          rx="12"
          ry="12"
          fill={cardFill}
          stroke={isSelected ? "#D4AF37" : cardStroke}
          strokeWidth={isSelected ? "2.5" : "1.5"}
          filter="drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.04))"
          className="transition-all duration-150 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNodeId(nodeId);
            if (toggleNode) toggleNode();
          }}
        />

        {/* Text inside the Node with cross-browser dominantBaseline for perfect vertical centering */}
        <text
          fill={textFill}
          fontSize="11"
          fontWeight="700"
          textAnchor="middle"
          dominantBaseline="central"
          y="1"
          className="pointer-events-none select-none font-sans"
        >
          {labelText}
        </text>

        {/* Custom Toggle Collapse Button on the right edge */}
        {nodeDatum.children && nodeDatum.children.length > 0 && (
          <g
            transform={`translate(${nodeWidth / 2}, 0)`}
            onClick={(e) => {
              e.stopPropagation();
              toggleNode();
            }}
            className="cursor-pointer"
          >
            <circle r="7" fill="#4A5D4E" stroke="#FFFFFF" strokeWidth="1" />
            <text
              fill="#FFFFFF"
              fontSize="9"
              fontWeight="900"
              textAnchor="middle"
              dominantBaseline="central"
              y="0.5"
            >
              {nodeDatum.__rd3t?.collapsed ? "+" : "-"}
            </text>
          </g>
        )}
      </g>
    );
  };

  const treeData = buildTreeData();

  return (
    <div className="flex flex-col h-[calc(100vh-210px)] min-h-[500px] bg-[#FAF9F5] border border-stone-200 rounded-3xl overflow-hidden shadow-xs relative">
      
      {/* Mindmap controls bar */}
      <div className="bg-white px-6 py-3 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 z-10 shadow-2xs">
        <div className="text-left">
          <h3 className="font-serif font-black text-sm text-[#4A5D4E] flex items-center gap-1.5 leading-none">
            <Network className="w-4 h-4 text-[#81C784]" />
            脳内自己理解マインドマップ
          </h3>
          <p className="text-[10px] text-stone-500 font-bold mt-1">
            「ジョアンナ」を中心とする、価値観やルール、関係性の鳥瞰図（俯瞰図）だにゃ。ノードをタップして展開・縮小できます🐾
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleOpenAddNode()}
            className="px-3 py-1.5 bg-[#81C784] hover:bg-[#66BB6A] text-white font-black text-xs rounded-xl flex items-center gap-1 transition-all active:scale-95 shadow-sm cursor-pointer select-none"
          >
            <Plus className="w-3.5 h-3.5" />
            ノード追加
          </button>
          
          <button
            onClick={fetchGraphData}
            title="マップデータを同期・リフレッシュ"
            className="p-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleResetToDefaults}
            title="日本語の初期配置にリセット（カスタムノードは消去されます）"
            className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main split display: Map Tree & Detail side drawer */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        
        {/* Tree Container */}
        <div ref={containerRef} className="flex-1 h-full bg-[#FCFBF8] relative outline-none">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FAF9F5]/80 gap-3 z-10">
              <div className="w-10 h-10 border-4 border-[#81C784] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-stone-500 animate-pulse">マインドマップ編纂中だにゃ🐾...</p>
            </div>
          ) : treeData ? (
            <Tree
              data={treeData}
              orientation="horizontal"
              translate={translate}
              renderCustomNodeElement={renderCustomNodeElement}
              pathClassFunc={() => "stroke-amber-900/15 stroke-2 fill-none"}
              nodeSize={{ x: 80, y: 320 }}
              separation={{ siblings: 1.3, nonSiblings: 1.8 }}
              zoom={0.9}
              enableLegacyTransition={true}
              transitionDuration={400}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-500 p-8 text-center">
              <Info className="w-10 h-10 text-amber-600/50 mb-2" />
              <p className="text-xs font-bold">マップデータが見つかりません。新規作成してにゃ🐾</p>
            </div>
          )}

          {/* Helper overlay hints */}
          <div className="absolute bottom-3 left-4 bg-white/90 backdrop-blur-xs border border-stone-200 px-3 py-1.5 rounded-full text-[10px] text-stone-500 font-bold flex items-center gap-1 shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
            <span>ホイールで拡大縮小、ドラッグで移動、丸い <b>+</b> <b>-</b> で折りたためるにゃ🐾</span>
          </div>
        </div>

        {/* Selected Node Details side drawer */}
        {selectedNode && (
          <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-stone-100 flex flex-col shrink-0 z-10 animate-fade-in md:shadow-[-4px_0_15px_rgba(0,0,0,0.01)]">
            {/* Header */}
            <div className="p-4 border-b border-stone-50 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">🌿</span>
                <div className="text-left">
                  <h4 className="font-serif font-black text-xs text-stone-800">
                    選択中のノード
                  </h4>
                  <span className="text-[9px] font-mono font-bold text-stone-400 bg-stone-100 px-1 py-0.5 rounded">
                    ID: {selectedNode.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content info card */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-left text-xs font-semibold text-stone-700">
              
              {/* Display Label Card */}
              <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-stone-200/50 text-center">
                <span className="text-[10px] text-stone-400 block font-bold uppercase tracking-wider mb-1">ラベル</span>
                <span className="text-sm font-serif font-black text-stone-800">
                  {selectedNode.label}
                </span>
                <span className="block text-[9px] text-emerald-700 font-bold mt-1 bg-emerald-50 py-0.5 px-2 rounded-full w-max mx-auto border border-emerald-100">
                  タイプ: {selectedNode.node_type === "root" ? "主軸 (Root)" : selectedNode.node_type === "child" ? "カテゴリー" : "要素ノード"}
                </span>
              </div>

              {/* Hierarchy path list */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-stone-400 block font-bold">つながり（親子関係）</span>
                
                {selectedNodeParent && (
                  <div className="p-2.5 bg-stone-50 rounded-xl flex items-center justify-between border border-stone-100">
                    <span className="text-[10px] text-stone-400">親ノード</span>
                    <button
                      onClick={() => setSelectedNodeId(selectedNodeParent.id)}
                      className="font-bold text-stone-800 hover:text-[#4A5D4E] underline cursor-pointer"
                    >
                      {selectedNodeParent.label}
                    </button>
                  </div>
                )}

                <div className="p-2.5 bg-stone-50 rounded-xl space-y-1.5 border border-stone-100">
                  <div className="flex justify-between items-center text-[10px] text-stone-400">
                    <span>子ノード一覧</span>
                    <span className="bg-stone-200 px-1.5 py-0.2 rounded-full font-bold">
                      {selectedNodeChildren.length}件
                    </span>
                  </div>
                  {selectedNodeChildren.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedNodeChildren.map(child => (
                        <button
                          key={child.id}
                          onClick={() => setSelectedNodeId(child.id)}
                          className="px-2 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 hover:border-emerald-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-stone-400 italic block">子ノードはありませんにゃ。</span>
                  )}
                </div>
              </div>

              {/* Node actions block */}
              <div className="pt-2 border-t border-stone-100 grid grid-cols-2 gap-2 font-black">
                <button
                  onClick={() => handleOpenAddNode(selectedNode.id)}
                  className="p-2 bg-[#81C784] hover:bg-[#66BB6A] text-white rounded-xl flex items-center justify-center gap-1 text-[10px] transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                  子を追加
                </button>

                <button
                  onClick={() => handleOpenEditNode(selectedNode.id)}
                  className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-xl flex items-center justify-center gap-1 text-[10px] transition-all cursor-pointer active:scale-95"
                >
                  <Edit2 className="w-3 h-3" />
                  ノード編集
                </button>

                {selectedNode.node_type !== "root" && selectedNode.id !== "joanna" && (
                  <button
                    onClick={() => handleDeleteNode(selectedNode.id)}
                    className="col-span-2 p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl flex items-center justify-center gap-1 text-[10px] transition-all cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3 h-3" />
                    ノードと配下を一括削除
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Form Overlay Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#FCFBF8] rounded-3xl p-6 max-w-sm w-full border border-stone-200 shadow-2xl space-y-4 text-left font-sans">
            
            <div className="border-b border-stone-100 pb-2 flex items-center justify-between">
              <h4 className="font-serif font-black text-sm text-[#4A5D4E] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#81C784]" />
                {formMode === "add" ? "新しいノードの追加" : "既存ノードの編集"}
              </h4>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNode} className="space-y-3.5 text-xs font-bold text-stone-700">
              
              {/* Form Input fields */}
              <div className="space-y-1">
                <label className="block text-stone-500 font-bold">ノードID (ユニーク英語キー)</label>
                <input
                  type="text"
                  placeholder="例: target-goals"
                  disabled={formMode === "edit"}
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "") })}
                  className="w-full p-2.5 bg-[#FAF9F6] border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#4A5D4E] disabled:opacity-60"
                  required
                />
                {formMode === "add" && (
                  <span className="text-[9px] text-stone-400 block mt-0.5">※英数字・ハイフンのみ。後から変更できません。</span>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-stone-500 font-bold">ラベル名 (画面表示名)</label>
                <input
                  type="text"
                  placeholder="例: 目標設定"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full p-2.5 bg-[#FAF9F6] border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#4A5D4E]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-stone-500 font-bold">ノードタイプ</label>
                <select
                  value={formData.node_type}
                  disabled={formData.id === "joanna"}
                  onChange={(e) => setFormData({ ...formData, node_type: e.target.value })}
                  className="w-full p-2.5 bg-[#FAF9F6] border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#4A5D4E] disabled:opacity-60"
                >
                  <option value="child">カテゴリー (中階層)</option>
                  <option value="leaf">要素・アイテム (末端ノード)</option>
                  <option value="root" disabled>主軸 (Root) ※1つのみ</option>
                </select>
              </div>

              {formMode === "add" && (
                <div className="space-y-1">
                  <label className="block text-stone-500 font-bold">親ノードの指定</label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="w-full p-2.5 bg-[#FAF9F6] border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#4A5D4E]"
                    required
                  >
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.label} ({n.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2 font-black">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-xl transition-all cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#81C784] hover:bg-[#66BB6A] text-white rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  保存する
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
