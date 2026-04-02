"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

const TIER = {
  0: { bg: 'rgba(255,255,255,0.05)', border: 'var(--gborder)', text: 'var(--ewhite)', dot: '#3B8BEB', label: 'Executive' },
  1: { bg: 'rgba(255,255,255,0.05)', border: 'var(--gborder)', text: 'var(--ewhite)', dot: '#7F77DD', label: 'Director' },
  2: { bg: 'rgba(255,255,255,0.05)', border: 'var(--gborder)', text: 'var(--ewhite)', dot: '#1D9E75', label: 'Manager' },
  3: { bg: 'rgba(255,255,255,0.05)', border: 'var(--gborder)', text: 'var(--ewhite)', dot: '#BA7517', label: 'Lead' },
};

const CARD_W = 200;
const CARD_GAP_X = 40;
const CARD_GAP_Y = 80;
const CONNECTOR_COLOR = 'var(--gborder)';

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function tierColor(tier: number) {
  return (TIER as any)[Math.min(tier ?? 0, 3)];
}

function findNode(id: string, node: any): any {
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const found = findNode(id, c);
    if (found) return found;
  }
  return null;
}

function matchesSearch(node: any, term: string) {
  if (!term) return true;
  const t = term.toLowerCase();
  return (
    node.name.toLowerCase().includes(t) ||
    node.role.toLowerCase().includes(t) ||
    (node.country ?? '').toLowerCase().includes(t)
  );
}

function AvatarCard({ node, isSelected, searchTerm, onSelect, onToggle, isExpanded }: any) {
  const c = tierColor(node.tier);
  const initials = getInitials(node.name);
  const hasChildren = (node.children ?? []).length > 0;
  const hasFellows = node.fellows > 0;

  const dim = searchTerm && !matchesSearch(node, searchTerm);
  const highlight = searchTerm && matchesSearch(node, searchTerm);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }} id={`card_${node.id}`}>
      <div
        className="gc"
        onClick={() => onSelect(node.id)}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow2)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
        style={{
          width: CARD_W,
          background: 'var(--gb)',
          border: `1px solid ${isSelected || highlight ? '#3B8BEB' : 'var(--gborder)'}`,
          borderRadius: 20,
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          opacity: dim ? 0.3 : 1,
          boxShadow: isSelected ? `0 0 20px rgba(59, 139, 235, 0.4)` : highlight ? `0 0 15px rgba(59, 139, 235, 0.2)` : 'var(--shadow)',
        }}
      >
        {hasFellows && (
          <div style={{
            position: 'absolute', top: -8, right: -8,
            background: '#3B8BEB', color: '#fff',
            width: 24, height: 24, borderRadius: '50%',
            fontSize: 11, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--ebase)',
          }}>
            {node.fellows}
          </div>
        )}

        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: c.bg, border: `2px solid ${c.dot}`, color: c.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 800, fontFamily: "var(--font)",
          marginBottom: 12, position: 'relative',
        }}>
          {initials}
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 12, height: 12, borderRadius: '50%',
            background: hasFellows ? '#2EC27E' : '#94a3b8',
            border: '2px solid var(--ebase)',
          }} />
        </div>

        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ewhite)', fontFamily: "var(--font)", textAlign: 'center', lineHeight: 1.2, marginBottom: 4 }}>
          {node.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--emuted)', fontFamily: "var(--font)", textAlign: 'center', lineHeight: 1.4, marginBottom: 8 }}>
          {node.role}
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
          background: 'rgba(255,255,255,0.05)', color: c.dot, border: `1px solid ${c.dot}40`, marginBottom: 6,
          fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.5px"
        }}>
          {c.label}
        </div>
        {node.country && (
          <div style={{ fontSize: 11, color: 'var(--emuted)', textAlign: 'center', fontFamily: "var(--font)" }}>
            Cohort {node.country}
          </div>
        )}
      </div>

      {hasChildren && (
        <button
          onClick={e => { e.stopPropagation(); onToggle(node.id); }}
          style={{
            position: 'absolute', bottom: -14, left: '50%',
            transform: 'translateX(-50%)',
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--gbs)', border: '1px solid var(--gborder)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10,
            color: 'var(--emuted)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            transition: 'all 0.2s',
          }}
        >
          {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </button>
      )}
    </div>
  );
}

function ConnectorCanvas({ nodes, containerRef }: any) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    const svg = svgRef.current;
    svg.innerHTML = '';

    nodes.forEach((node: any) => {
      const childEl = document.getElementById(`card_${node.id}`);
      const parentEl = document.getElementById(`card_${node._parentId}`);
      if (!childEl || !parentEl) return;

      const pRect = parentEl.getBoundingClientRect();
      const cRect = childEl.getBoundingClientRect();

      const px = pRect.left + pRect.width / 2 - containerRect.left;
      const py = pRect.bottom - containerRect.top + 14; 
      const cx = cRect.left + cRect.width / 2 - containerRect.left;
      const cy = cRect.top - containerRect.top;
      const mid = (py + cy) / 2;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${px},${py} C${px},${mid} ${cx},${mid} ${cx},${cy}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', CONNECTOR_COLOR);
      path.setAttribute('stroke-width', '2');
      if (node._depth > 2) path.setAttribute('stroke-dasharray', '6 6');
      svg.appendChild(path);
    });
  });

  return (
    <svg
      ref={svgRef}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
    />
  );
}

export function OrgTree({
  data,
  mode = 'org',
  defaultExpanded = 2,
  onNodeClick
}: {
  data: any,
  mode?: 'org' | 'country',
  defaultExpanded?: number,
  onNodeClick?: (node: any) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const init: Record<string, boolean> = {};
    function walk(node: any, depth: number) {
      init[node.id] = depth < defaultExpanded;
      (node.children ?? []).forEach((c: any) => walk(c, depth + 1));
    }
    walk(data, 0);
    setExpanded(init);
  }, [data, defaultExpanded]);

  const toggleNode = useCallback((id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const selectNode = useCallback((id: string) => {
    setSelected(prev => prev === id ? null : id);
    if (onNodeClick) {
       onNodeClick(findNode(id, data));
    }
  }, [onNodeClick, data]);

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    function walk(node: any) { next[node.id] = true; (node.children??[]).forEach(walk); }
    walk(data);
    setExpanded(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    function walk(node: any) { next[node.id] = node.id === data.id; (node.children??[]).forEach(walk); }
    walk(data);
    setExpanded(next);
  };

  const levels: any[][] = [];
  function buildLevels(node: any, depth: number, parentId: string | null) {
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push({ ...node, _parentId: parentId, _depth: depth });
    if (expanded[node.id] && (node.children ?? []).length > 0) {
      node.children.forEach((c: any) => buildLevels(c, depth + 1, node.id));
    }
  }
  buildLevels(data, 0, null);

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          onClick={expandAll}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--gborder)', background: 'var(--gb)', cursor: 'pointer', fontSize: 13, color: 'var(--emuted)', fontFamily: "var(--font)", fontWeight: 600 }}
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--gborder)', background: 'var(--gb)', cursor: 'pointer', fontSize: 13, color: 'var(--emuted)', fontFamily: "var(--font)", fontWeight: 600 }}
        >
          Collapse
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', border: '1px solid var(--gborder)', borderRadius: 12, background: 'var(--gb)' }}>
          <span style={{ fontSize: 16, color: 'var(--emuted)' }}>⌕</span>
          <input
            type="text"
            placeholder="Search alumni network..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontSize: 13, color: 'var(--ewhite)', outline: 'none', width: 200, fontFamily: "var(--font)", fontWeight: 500 }}
          />
        </div>
      </div>

      <div ref={containerRef} style={{ overflowX: 'auto', position: 'relative', paddingBottom: '3rem', paddingTop: '1rem' }}>
        {levels.map((level, li) => (
          <div key={li} style={{ display: 'flex', justifyContent: 'center', gap: CARD_GAP_X, position: 'relative', marginBottom: CARD_GAP_Y }}>
            {level.map(node => (
              <AvatarCard
                key={node.id}
                node={node}
                isSelected={selected === node.id}
                searchTerm={searchTerm}
                onSelect={selectNode}
                onToggle={toggleNode}
                isExpanded={!!expanded[node.id]}
              />
            ))}
          </div>
        ))}

        <ConnectorCanvas
          nodes={levels.slice(1).flat()}
          containerRef={containerRef}
        />
      </div>
    </div>
  );
}
