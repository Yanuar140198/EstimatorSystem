import { useMemo, useState } from 'react';
import { WbsItem } from '../App';

interface WbsTableProps {
  items: WbsItem[];
  activeId: number | null;
  onSelect: (item: WbsItem) => void;
}

interface TreeNode extends WbsItem {
  children: TreeNode[];
  rollupQty: number;
}

export default function WbsTable({ items, activeId, onSelect }: WbsTableProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState('');

  const tree = useMemo(() => {
    const map = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];
    items.forEach((item) => {
      map.set(item.id, { ...item, children: [], rollupQty: item.quantity });
    });
    map.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    const computeRollup = (node: TreeNode): number => {
      const childTotal = node.children.reduce((sum, child) => sum + computeRollup(child), 0);
      node.rollupQty = node.children.length > 0 ? childTotal : node.quantity;
      return node.rollupQty;
    };
    roots.forEach((root) => computeRollup(root));
    return roots;
  }, [items]);

  const filteredTree = useMemo(() => {
    if (!search) return tree;
    const lower = search.toLowerCase();
    const filterNode = (node: TreeNode): TreeNode | null => {
      const matches = node.wbsCode.toLowerCase().includes(lower) || node.name.toLowerCase().includes(lower);
      const children = node.children
        .map(filterNode)
        .filter((child): child is TreeNode => Boolean(child));
      if (matches || children.length > 0) {
        return { ...node, children };
      }
      return null;
    };
    return tree.map(filterNode).filter((node): node is TreeNode => Boolean(node));
  }, [search, tree]);

  const toggle = (id: number) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderNode = (node: TreeNode, depth = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded[node.id] ?? true;
    const shouldExpand = search ? true : isExpanded;
    return (
      <div key={node.id}>
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition ${
            activeId === node.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'
          }`}
        >
          <button type="button" onClick={() => onSelect(node)} className="flex flex-1 items-start gap-3 text-left">
            <div className="min-w-[80px] text-xs font-semibold text-slate-500">{node.wbsCode}</div>
            <div>
              <div className="font-semibold">{node.name}</div>
              <div className="text-xs text-slate-500">
                Qty: {node.quantity} {node.unit} · Rollup: {node.rollupQty.toLocaleString('id-ID')} {node.unit}
              </div>
            </div>
          </button>
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggle(node.id)}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500"
            >
              {shouldExpand ? 'Collapse' : 'Expand'}
            </button>
          )}
        </div>
        {hasChildren && shouldExpand && (
          <div className="ml-6 mt-2 space-y-2 border-l border-dashed border-slate-200 pl-4">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">WBS Tree</h2>
          <p className="text-sm text-slate-500">Kelola struktur pekerjaan sampai level 5.</p>
        </div>
        <input
          type="text"
          placeholder="Cari WBS code / deskripsi"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-3">{filteredTree.map((node) => renderNode(node))}</div>
    </div>
  );
}
