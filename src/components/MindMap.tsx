import React, { useState, useEffect, useRef } from "react";
import Tree from "react-d3-tree";
import { realSupabase, isRealSupabaseConfigured } from "../utils/supabase";
import { UserProfile } from "../types";
import { Plus, Edit2, Trash2, HelpCircle, Network, Info, Save, X, Layers, RefreshCw, Search, FileText, Sparkles, Clock, Copy, Check, Filter, MessageSquare, ExternalLink } from "lucide-react";

interface SearchResultItem {
  id: string;
  source: string;
  sourceLabel: string;
  title: string;
  category?: string;
  content: string;
  snippet: string;
  occurred_at?: string;
  created_at?: string;
  match_count: number;
}

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

  // Keyword Search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>("");
  const [searchKeywords, setSearchKeywords] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>("all");
  const [searchExecuted, setSearchExecuted] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"map" | "search">("map");
  const [selectedDetailItem, setSelectedDetailItem] = useState<SearchResultItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handlePerformSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const queryToSearch = searchQuery.trim();
    if (!queryToSearch) {
      setSearchResults([]);
      setSearchExecuted(false);
      setActiveSearchQuery("");
      setSearchKeywords([]);
      return;
    }

    setIsSearching(true);
    setSearchExecuted(true);
    setActiveSearchQuery(queryToSearch);
    const keywords = queryToSearch.split(/\s+/).filter(Boolean);
    setSearchKeywords(keywords);
    setActiveTab("search");

    try {
      const res = await fetch("/api/library/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryToSearch,
          userId: user?.id || "5fb13a09-5ce3-4aec-bb4e-8e357070b76b"
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err: any) {
      console.error("Search failed:", err);
      showToast("検索中にエラーが発生しましたにゃ🐾", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setActiveSearchQuery("");
    setSearchKeywords([]);
    setSearchResults([]);
    setSearchExecuted(false);
    setSelectedSourceFilter("all");
    setActiveTab("map");
  };

  const handleCopyText = (text: any, id: string) => {
    let strToCopy = "";
    if (typeof text === "string") {
      strToCopy = text;
    } else if (text && typeof text === "object") {
      strToCopy = text.original?.transcription || text.original?.manualNote || text.aiData?.summary || JSON.stringify(text);
    } else {
      strToCopy = String(text || "");
    }
    navigator.clipboard.writeText(strToCopy);
    setCopiedId(id);
    showToast("テキストをクリップボードにコピーしたにゃ！", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderHighlightedText = (rawText: any, keywords: string[]) => {
    let text = "";
    if (typeof rawText === "string") {
      text = rawText;
    } else if (rawText && typeof rawText === "object") {
      text = rawText.original?.transcription || rawText.original?.manualNote || rawText.aiData?.summary || JSON.stringify(rawText);
    } else {
      text = String(rawText || "");
    }

    if (!text || !keywords || keywords.length === 0) return text;
    const pattern = keywords
      .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .filter(Boolean)
      .join("|");
    if (!pattern) return text;

    try {
      const regex = new RegExp(`(${pattern})`, "gi");
      const parts = text.split(regex);

      return parts.map((part, idx) => {
        const isMatch = keywords.some(k => k.toLowerCase() === part.toLowerCase());
        if (isMatch) {
          return (
            <mark key={idx} className="bg-amber-200 text-stone-900 font-bold px-0.5 rounded-xs">
              {part}
            </mark>
          );
        }
        return part;
      });
    } catch {
      return text;
    }
  };

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
      
      {/* Mindmap controls & search bar */}
      <div className="bg-white px-6 py-3 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 z-10 shadow-2xs">
        <div className="text-left shrink-0">
          <h3 className="font-serif font-black text-sm text-[#4A5D4E] flex items-center gap-1.5 leading-none">
            <Network className="w-4 h-4 text-[#81C784]" />
            脳内自己理解マインドマップ ＆ 脳内図書館検索
          </h3>
          <p className="text-[10px] text-stone-500 font-bold mt-1">
            思考や感情の鳥瞰図（俯瞰図）閲覧と、過去の会話履歴・価値観のキーワード検索だにゃ🐾
          </p>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handlePerformSearch} className="flex-1 max-w-lg flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="会話履歴・価値観をキーワード検索 (例: 境界線, 草原のお兄さん)..."
              className="w-full pl-9 pr-8 py-1.5 bg-stone-50 hover:bg-white focus:bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#81C784] transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-3.5 py-1.5 bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            検索
          </button>
        </form>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
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

      {/* Sub-navigation View Tabs */}
      <div className="bg-stone-50 px-6 py-2 border-b border-stone-100 flex flex-wrap items-center justify-between text-xs font-bold shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("map")}
            className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "map"
                ? "bg-white text-[#4A5D4E] shadow-2xs border border-stone-200"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <Network className="w-3.5 h-3.5 text-[#81C784]" />
            マインドマップ
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "search"
                ? "bg-white text-[#4A5D4E] shadow-2xs border border-stone-200"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <Search className="w-3.5 h-3.5 text-amber-600" />
            キーワード検索結果
            {searchExecuted && (
              <span className="ml-1 px-1.5 py-0.2 bg-[#81C784]/20 text-[#2E6B34] text-[10px] rounded-full font-black">
                {searchResults.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "search" && searchExecuted && (
          <div className="text-[11px] text-stone-500 font-bold flex items-center gap-1">
            <span>検索ワード:</span>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md font-extrabold border border-amber-200">
              {activeSearchQuery}
            </span>
            <span>(全 <b className="text-[#4A5D4E]">{searchResults.length}</b> 件)</span>
          </div>
        )}
      </div>

      {/* Main Content Area: Map Tree OR Search Results */}
      {activeTab === "map" ? (
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
      ) : (
        /* KEYWORD SEARCH RESULTS VIEW */
        <div className="flex-1 bg-[#FCFBF8] p-4 md:p-6 overflow-y-auto space-y-4 text-left">
          {/* Source Filter Tabs */}
          {searchExecuted && searchResults.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-stone-200/60">
              <span className="text-xs font-extrabold text-stone-500 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" />
                絞り込み:
              </span>
              {[
                { id: "all", label: "すべて", count: searchResults.length },
                { id: "claude_chat_history", label: "Claude 会話", count: searchResults.filter(r => r.source === "claude_chat_history").length },
                { id: "chatgpt_chat_history", label: "ChatGPT 会話", count: searchResults.filter(r => r.source === "chatgpt_chat_history").length },
                { id: "joanna_value", label: "ジョアンナ価値観", count: searchResults.filter(r => r.source === "joanna_value").length },
                { id: "hippocampus_logs", label: "タイムライン記憶", count: searchResults.filter(r => r.source === "hippocampus_logs").length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedSourceFilter(tab.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                    selectedSourceFilter === tab.id
                      ? "bg-[#4A5D4E] text-white shadow-xs"
                      : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedSourceFilter === tab.id ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Results List */}
          {isSearching ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-[#81C784] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-stone-500 animate-pulse">脳内図書館の全書庫（Claude/ChatGPT/価値観/タイムライン）を検索中だにゃ🐾...</p>
            </div>
          ) : !searchExecuted ? (
            <div className="py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl border border-amber-200/60 flex items-center justify-center text-amber-700">
                <Search className="w-7 h-7" />
              </div>
              <h4 className="font-serif font-black text-sm text-[#4A5D4E]">脳内図書館 キーワード検索</h4>
              <p className="text-xs text-stone-500 font-bold leading-relaxed">
                上部の検索窓にキーワード（例: 「境界線」「草原のお兄さん」「ブラジル」）を入力して検索すると、ClaudeやChatGPTの過去対話・ジョアンナの記憶からピンポイントでヒットしますにゃ🐾
              </p>
            </div>
          ) : searchResults.filter(r => selectedSourceFilter === "all" || r.source === selectedSourceFilter).length === 0 ? (
            /* EMPTY STATE REQUIREMENTS */
            <div className="py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3 bg-white p-8 rounded-3xl border border-stone-200 shadow-2xs">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 text-2xl">
                🐱
              </div>
              <h4 className="font-serif font-black text-sm text-stone-800">
                該当する会話が見つかりませんでした
              </h4>
              <p className="text-xs text-stone-500 font-bold leading-relaxed">
                キーワード「<span className="text-amber-800 font-extrabold">{activeSearchQuery}</span>」に一致する記録は脳内図書館に見つからなかったにゃ。別の単語で試してみてください🐾
              </p>
              <button
                onClick={handleClearSearch}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer mt-2"
              >
                検索をリセット
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {searchResults
                .filter(r => selectedSourceFilter === "all" || r.source === selectedSourceFilter)
                .map((item, idx) => {
                  let sourceBadgeStyle = "bg-stone-100 text-stone-700 border-stone-200";
                  if (item.source === "claude_chat_history") {
                    sourceBadgeStyle = "bg-purple-100 text-purple-800 border-purple-200";
                  } else if (item.source === "chatgpt_chat_history") {
                    sourceBadgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-200";
                  } else if (item.source === "joanna_value") {
                    sourceBadgeStyle = "bg-amber-100 text-amber-900 border-amber-200";
                  } else if (item.source === "hippocampus_logs") {
                    sourceBadgeStyle = "bg-sky-100 text-sky-800 border-sky-200";
                  }

                  const formattedDate = item.occurred_at || item.created_at
                    ? new Date(item.occurred_at || item.created_at || "").toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit"
                      })
                    : "";

                  return (
                    <div
                      key={`${item.source}-${item.id}-${idx}`}
                      onClick={() => setSelectedDetailItem(item)}
                      className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs hover:shadow-md hover:border-[#81C784] transition-all cursor-pointer flex flex-col justify-between space-y-3 group text-left"
                    >
                      <div className="space-y-2">
                        {/* Header Badge & Metadata */}
                        <div className="flex items-center justify-between gap-1.5 flex-wrap text-[10px] font-extrabold">
                          <span className={`px-2 py-0.5 rounded-md border ${sourceBadgeStyle}`}>
                            {item.sourceLabel}
                          </span>

                          <div className="flex items-center gap-1 text-stone-400">
                            {item.match_count > 0 && (
                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded font-black">
                                {item.match_count}件一致
                              </span>
                            )}
                            {formattedDate && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3 text-stone-400" />
                                {formattedDate}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <h5 className="font-serif font-black text-xs text-stone-800 line-clamp-1 group-hover:text-[#4A5D4E] transition-colors">
                          {item.title}
                        </h5>

                        {/* Excerpt Snippet */}
                        <p className="text-[11px] text-stone-600 font-medium leading-relaxed line-clamp-3 bg-[#FAF9F6] p-2.5 rounded-xl border border-stone-100">
                          {renderHighlightedText(item.snippet || item.content, searchKeywords)}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] font-extrabold text-[#4A5D4E]">
                        <span className="flex items-center gap-1 group-hover:underline">
                          <FileText className="w-3 h-3" />
                          本文全体を見る
                        </span>
                        <span className="text-stone-400 group-hover:text-[#81C784]">→</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL OVERLAY */}
      {selectedDetailItem && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#FCFBF8] rounded-3xl p-6 max-w-2xl w-full border border-stone-200 shadow-2xl space-y-4 text-left font-sans max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="border-b border-stone-200 pb-3 flex items-start justify-between gap-2 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-extrabold">
                  <span className="px-2 py-0.5 bg-[#4A5D4E] text-white rounded-md">
                    {selectedDetailItem.sourceLabel}
                  </span>
                  {selectedDetailItem.category && (
                    <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md border border-stone-200">
                      {selectedDetailItem.category}
                    </span>
                  )}
                  {selectedDetailItem.occurred_at && (
                    <span className="text-stone-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(selectedDetailItem.occurred_at).toLocaleString("ja-JP")}
                    </span>
                  )}
                </div>
                <h3 className="font-serif font-black text-base text-stone-800">
                  {selectedDetailItem.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-full hover:bg-stone-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Text Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-white rounded-2xl border border-stone-200 text-xs text-stone-800 leading-relaxed space-y-3 font-sans whitespace-pre-wrap selection:bg-amber-200">
              {renderHighlightedText(selectedDetailItem.content, searchKeywords)}
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between font-black text-xs shrink-0">
              <button
                onClick={() => handleCopyText(selectedDetailItem.content, selectedDetailItem.id)}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedId === selectedDetailItem.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    コピー完了！
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    テキストをコピー
                  </>
                )}
              </button>

              <button
                onClick={() => setSelectedDetailItem(null)}
                className="px-5 py-2 bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white rounded-xl transition-all cursor-pointer shadow-xs"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

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
