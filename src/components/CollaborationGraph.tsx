'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface GraphNode {
  id: string;
  name: string;
  instrument: string | null;
  instrumentLabel: string | null;
  artistType: string | null; // 'person' | 'group' | 'big band'
  photoUrl: string | null;
  gigCount: number;
  isCenter?: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
  weight: number;
}

interface Props {
  centerArtist: GraphNode;
  collaborators: GraphNode[];
  links: GraphLink[];
  locale: string;
  labels: {
    gigs: string;
    collaborators: string;
    dragHint: string;
    filterInstrument: string;
    filterType: string;
    filterMinGigs: string;
    filterAll: string;
    typePerson: string;
    typeGroup: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Instrument → color                                                 */
/* ------------------------------------------------------------------ */

const INSTRUMENT_COLORS: Record<string, string> = {
  saxophone: '#4ea8a6',
  tenor_saxophone: '#4ea8a6',
  alto_saxophone: '#4ea8a6',
  soprano_saxophone: '#4ea8a6',
  baritone_saxophone: '#4ea8a6',
  piano: '#7b6cb7',
  keyboards: '#7b6cb7',
  organ: '#7b6cb7',
  drums: '#c75a3a',
  percussion: '#c75a3a',
  bass: '#3a8cc7',
  electric_bass: '#3a8cc7',
  double_bass: '#3a8cc7',
  upright_bass: '#3a8cc7',
  trumpet: '#6aaa5e',
  trombone: '#6aaa5e',
  flugelhorn: '#6aaa5e',
  french_horn: '#6aaa5e',
  guitar: '#c7893a',
  electric_guitar: '#c7893a',
  acoustic_guitar: '#c7893a',
  vocals: '#b05e8a',
  voice: '#b05e8a',
  violin: '#d4a843',
  cello: '#d4a843',
  flute: '#70b8c7',
  clarinet: '#70b8c7',
  harmonica: '#70b8c7',
  vibraphone: '#a08cc7',
};

const DEFAULT_COLOR = '#888';
const CENTER_COLOR = '#C8A84E';

function instrumentKey(inst: string | null): string {
  if (!inst) return '';
  return inst.toLowerCase().replace(/[\s-]/g, '_');
}

function getColor(node: GraphNode): string {
  if (node.isCenter) return CENTER_COLOR;
  return INSTRUMENT_COLORS[instrumentKey(node.instrument)] || DEFAULT_COLOR;
}

function getRadius(node: GraphNode, maxGigs: number): number {
  if (node.isCenter) return 26;
  return Math.max(6, 6 + (node.gigCount / maxGigs) * 16);
}

/* ------------------------------------------------------------------ */
/*  Instrument color → group mapping (for legend/filter chips)         */
/* ------------------------------------------------------------------ */

const COLOR_GROUPS: Record<string, string[]> = {};
for (const [key, color] of Object.entries(INSTRUMENT_COLORS)) {
  (COLOR_GROUPS[color] ??= []).push(key);
}

/* ------------------------------------------------------------------ */
/*  D3 simulation types                                                */
/* ------------------------------------------------------------------ */

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  instrument: string | null;
  instrumentLabel: string | null;
  artistType: string | null;
  photoUrl: string | null;
  gigCount: number;
  isCenter?: boolean;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  weight: number;
}

/* ------------------------------------------------------------------ */
/*  Filter Chip — neutral grayscale style                              */
/* ------------------------------------------------------------------ */

function Chip({
  active,
  dot,
  onClick,
  children,
}: {
  active: boolean;
  dot?: string; // optional color dot (for instruments)
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] leading-none transition-all border whitespace-nowrap link-lift',
        active
          ? 'border-white/20 text-white/80 bg-white/5 hover:border-white/40'
          : 'border-[var(--border)] text-[var(--muted-foreground)] opacity-50 hover:opacity-75 hover:border-white/15',
      ].join(' ')}
    >
      {dot && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: dot, opacity: active ? 1 : 0.4 }}
        />
      )}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CollaborationGraph({ centerArtist, collaborators, links, labels }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const selectionsRef = useRef<{
    linkSel: d3.Selection<SVGLineElement, SimLink, SVGGElement, unknown>;
    nodeSel: d3.Selection<SVGGElement, SimNode, SVGGElement, unknown>;
    maxWeight: number;
    maxGigs: number;
  } | null>(null);

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    node: SimNode;
    connectedCount: number;
    totalGigs: number;
  } | null>(null);

  // ── Filter state ──
  const [activeInstruments, setActiveInstruments] = useState<Set<string>>(new Set());
  const [activeType, setActiveType] = useState<string | null>(null); // 'person' | 'group' | null
  const [minGigs, setMinGigs] = useState(1);

  // ── Derived: unique instruments present in data ──
  const instrumentChips = useMemo(() => {
    const seen = new Map<string, { color: string; label: string }>();
    for (const c of collaborators) {
      if (!c.instrument) continue;
      const color = INSTRUMENT_COLORS[instrumentKey(c.instrument)] || DEFAULT_COLOR;
      if (!seen.has(color)) {
        seen.set(color, { color, label: c.instrumentLabel || c.instrument });
      }
    }
    return [...seen.values()];
  }, [collaborators]);

  // ── Derived: has both persons and groups? ──
  const hasTypeVariety = useMemo(() => {
    let hasPerson = false;
    let hasGroup = false;
    for (const c of collaborators) {
      if (c.artistType === 'person') hasPerson = true;
      else if (c.artistType === 'group' || c.artistType === 'big band') hasGroup = true;
      if (hasPerson && hasGroup) return true;
    }
    return false;
  }, [collaborators]);

  // ── Derived: gig range ──
  const maxGigCount = useMemo(
    () => Math.max(1, ...collaborators.map((c) => c.gigCount)),
    [collaborators],
  );

  // ── Which node IDs pass all filters? ──
  const visibleIds = useMemo(() => {
    const ids = new Set<string>();
    ids.add(centerArtist.id);
    for (const c of collaborators) {
      // instrument filter
      if (activeInstruments.size > 0) {
        const color = INSTRUMENT_COLORS[instrumentKey(c.instrument)] || DEFAULT_COLOR;
        if (!activeInstruments.has(color)) continue;
      }
      // type filter (person vs group)
      if (activeType !== null) {
        const isGroup = c.artistType === 'group' || c.artistType === 'big band';
        if (activeType === 'person' && isGroup) continue;
        if (activeType === 'group' && !isGroup) continue;
      }
      // min gigs filter
      if (c.gigCount < minGigs) continue;
      ids.add(c.id);
    }
    return ids;
  }, [centerArtist.id, collaborators, activeInstruments, activeType, minGigs]);

  // ── Toggle helpers ──
  const toggleInstrument = useCallback((color: string) => {
    setActiveInstruments((prev) => {
      const next = new Set(prev);
      if (next.has(color)) next.delete(color);
      else next.add(color);
      return next;
    });
  }, []);

  const toggleType = useCallback((type: string) => {
    setActiveType((prev) => (prev === type ? null : type));
  }, []);

  const clearFilters = useCallback(() => {
    setActiveInstruments(new Set());
    setActiveType(null);
    setMinGigs(1);
  }, []);

  const hasActiveFilters = activeInstruments.size > 0 || activeType !== null || minGigs > 1;

  // ── Apply filter visuals (without restarting simulation) ──
  useEffect(() => {
    const sels = selectionsRef.current;
    if (!sels) return;
    const { linkSel, nodeSel, maxWeight } = sels;

    // Nodes
    nodeSel
      .transition()
      .duration(300)
      .style('opacity', (d: SimNode) => (visibleIds.has(d.id) ? 1 : 0.08));

    // Links: visible only if both endpoints visible
    linkSel
      .transition()
      .duration(300)
      .attr('stroke-opacity', (d: SimLink) => {
        const srcId = (d.source as SimNode).id ?? (d.source as string);
        const tgtId = (d.target as SimNode).id ?? (d.target as string);
        if (!visibleIds.has(srcId) || !visibleIds.has(tgtId)) return 0.02;
        return 0.15 + (d.weight / maxWeight) * 0.5;
      });
  }, [visibleIds]);

  // ── D3 setup (runs once per data change) ──
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    if (collaborators.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = Math.min(500, Math.max(360, width * 0.55));

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    const nodes: SimNode[] = [
      { ...centerArtist, isCenter: true },
      ...collaborators.map((c) => ({ ...c })),
    ];

    const nodeIds = new Set(nodes.map((n) => n.id));
    const simLinks: SimLink[] = links
      .filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target))
      .map((l) => ({ source: l.source, target: l.target, weight: l.weight }));

    const maxWeight = Math.max(1, d3.max(simLinks, (l) => l.weight) || 1);
    const maxGigs = Math.max(1, d3.max(nodes, (n) => n.gigCount) || 1);

    // Defs
    const defs = svg.append('defs');
    const glowFilter = defs.append('filter').attr('id', 'cg-glow');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'blur');
    const glowMerge = glowFilter.append('feMerge');
    glowMerge.append('feMergeNode').attr('in', 'blur');
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const glowBig = defs.append('filter').attr('id', 'cg-glow-big');
    glowBig.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'blur');
    const bigMerge = glowBig.append('feMerge');
    bigMerge.append('feMergeNode').attr('in', 'blur');
    bigMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // ── Cosmic background ──

    // Radial gradient for deep-space vignette
    const bgGrad = defs.append('radialGradient').attr('id', 'cg-space-bg');
    bgGrad.append('stop').attr('offset', '0%').attr('stop-color', '#0e0d0b');
    bgGrad.append('stop').attr('offset', '60%').attr('stop-color', '#0a0908');
    bgGrad.append('stop').attr('offset', '100%').attr('stop-color', '#060605');
    svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#cg-space-bg)');

    // Tiny star field
    const starGroup = svg.append('g').attr('class', 'stars');
    const starCount = Math.floor(width * height / 2400);
    for (let i = 0; i < starCount; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * height;
      const sr = Math.random() * 0.8 + 0.2;
      const so = Math.random() * 0.4 + 0.08;
      starGroup.append('circle')
        .attr('cx', sx).attr('cy', sy).attr('r', sr)
        .attr('fill', '#fff').attr('opacity', so);
    }

    // A few slightly brighter "distant stars"
    for (let i = 0; i < Math.floor(starCount / 8); i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * height;
      starGroup.append('circle')
        .attr('cx', sx).attr('cy', sy).attr('r', Math.random() * 0.5 + 0.8)
        .attr('fill', Math.random() > 0.5 ? '#C8A84E' : '#8aa8c8')
        .attr('opacity', Math.random() * 0.25 + 0.1);
    }

    // Planet-style radial gradient for nodes
    const planetGrad = defs.append('radialGradient').attr('id', 'cg-planet-sheen')
      .attr('cx', '35%').attr('cy', '30%').attr('r', '65%');
    planetGrad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(255,255,255,0.25)');
    planetGrad.append('stop').attr('offset', '50%').attr('stop-color', 'rgba(255,255,255,0.04)');
    planetGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(0,0,0,0.2)');

    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 3])
      .filter((event) => {
        // Allow pinch (ctrlKey on trackpad) but block regular scroll wheel
        if (event.type === 'wheel') return event.ctrlKey;
        return !event.button; // allow drag, touch, etc.
      })
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);

    const simulation = d3.forceSimulation<SimNode>(nodes)
      .force(
        'link',
        d3.forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((d) => 60 + (1 - d.weight / maxWeight) * 140),
      )
      .force('charge', d3.forceManyBody<SimNode>().strength((d) => (d.isCenter ? -400 : -120)))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimNode>().radius((d) => getRadius(d, maxGigs) + 6));

    simulationRef.current = simulation;

    // Links
    const linkSel = g
      .append('g')
      .selectAll<SVGLineElement, SimLink>('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', 'rgba(200, 168, 78, 0.12)')
      .attr('stroke-opacity', (d) => 0.15 + (d.weight / maxWeight) * 0.5)
      .attr('stroke-width', (d) => 0.5 + (d.weight / maxWeight) * 3.5);

    // Nodes
    const nodeSel = g
      .append('g')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    // Subtle orbit rings around center (decorative, in g so they pan/zoom)
    const centerNode = nodes.find((n) => n.isCenter);
    if (centerNode) {
      const orbitG = g.append('g').attr('class', 'orbits');
      [90, 150, 220].forEach((r, i) => {
        orbitG.append('circle')
          .attr('cx', width / 2).attr('cy', height / 2)
          .attr('r', r)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(200, 168, 78, 0.04)')
          .attr('stroke-width', 0.5)
          .attr('stroke-dasharray', i === 1 ? '2 6' : 'none');
      });
    }

    // Center outer ring
    nodeSel
      .filter((d) => !!d.isCenter)
      .append('circle')
      .attr('r', 34)
      .attr('fill', 'none')
      .attr('stroke', CENTER_COLOR)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.25)
      .attr('filter', 'url(#cg-glow-big)');

    // Main circles
    nodeSel
      .append('circle')
      .attr('r', (d) => getRadius(d, maxGigs))
      .attr('fill', (d) => getColor(d))
      .attr('fill-opacity', (d) => (d.isCenter ? 1 : 0.85))
      .attr('stroke', (d) => getColor(d))
      .attr('stroke-width', (d) => (d.isCenter ? 2 : 1))
      .attr('stroke-opacity', (d) => (d.isCenter ? 0.6 : 0.25))
      .attr('filter', (d) => (d.isCenter ? 'url(#cg-glow-big)' : 'url(#cg-glow)'));

    // Planet sheen overlay (gives 3D planet feel)
    nodeSel
      .append('circle')
      .attr('r', (d) => getRadius(d, maxGigs))
      .attr('fill', 'url(#cg-planet-sheen)')
      .attr('pointer-events', 'none');

    // Labels
    nodeSel
      .append('text')
      .attr('dy', (d) => getRadius(d, maxGigs) + 13)
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.isCenter ? CENTER_COLOR : '#8A8578'))
      .attr('font-size', (d) => (d.isCenter ? '12px' : '10px'))
      .attr('font-weight', (d) => (d.isCenter ? '600' : '400'))
      .attr('pointer-events', 'none')
      .text((d) => d.name);

    // Store selections for filter effect
    selectionsRef.current = { linkSel, nodeSel, maxWeight, maxGigs };

    // Hover
    nodeSel
      .on('mouseenter', (event, d) => {
        const connected = simLinks.filter(
          (l) =>
            (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id,
        );
        const connectedIds = new Set(
          connected.flatMap((l) => [(l.source as SimNode).id, (l.target as SimNode).id]),
        );
        const totalGigs = connected.reduce((sum, l) => sum + l.weight, 0);

        const color = getColor(d);
        linkSel
          .transition().duration(200)
          .attr('stroke', (l) =>
            (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id
              ? color
              : 'rgba(200, 168, 78, 0.12)',
          )
          .attr('stroke-opacity', (l) =>
            (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id
              ? 0.7
              : 0.06,
          );

        nodeSel
          .select('circle:last-of-type')
          .transition().duration(200)
          .attr('fill-opacity', (n) =>
            n.id === d.id || connectedIds.has(n.id) ? 1 : 0.15,
          );
        nodeSel
          .select('text')
          .transition().duration(200)
          .attr('fill-opacity', (n) =>
            n.id === d.id || connectedIds.has(n.id) ? 1 : 0.2,
          );

        const rect = container.getBoundingClientRect();
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          node: d,
          connectedCount: connectedIds.size - 1,
          totalGigs,
        });
      })
      .on('mousemove', (event) => {
        const rect = container.getBoundingClientRect();
        setTooltip((prev) =>
          prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : null,
        );
      })
      .on('mouseleave', () => {
        linkSel
          .transition().duration(300)
          .attr('stroke', 'rgba(200, 168, 78, 0.12)')
          .attr('stroke-opacity', (d) => 0.15 + (d.weight / maxWeight) * 0.5);
        nodeSel.select('circle:last-of-type')
          .transition().duration(300)
          .attr('fill-opacity', (d) => (d.isCenter ? 1 : 0.8));
        nodeSel.select('text')
          .transition().duration(300)
          .attr('fill-opacity', 1);
        setTooltip(null);
      });

    // Tick
    simulation.on('tick', () => {
      linkSel
        .attr('x1', (d) => (d.source as SimNode).x!)
        .attr('y1', (d) => (d.source as SimNode).y!)
        .attr('x2', (d) => (d.target as SimNode).x!)
        .attr('y2', (d) => (d.target as SimNode).y!);
      nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
      simulationRef.current = null;
      selectionsRef.current = null;
    };
  }, [centerArtist, collaborators, links]);

  if (collaborators.length === 0) return null;

  return (
    <div ref={containerRef} className="relative w-full space-y-3">
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Instrument chips */}
        {instrumentChips.length > 1 &&
          instrumentChips.map((chip) => (
            <Chip
              key={chip.color}
              active={activeInstruments.size === 0 || activeInstruments.has(chip.color)}
              dot={chip.color}
              onClick={() => toggleInstrument(chip.color)}
            >
              {chip.label}
            </Chip>
          ))}

        {/* Separator */}
        {instrumentChips.length > 1 && (hasTypeVariety || maxGigCount > 2) && (
          <span className="w-px h-4 bg-[var(--border)] mx-0.5" />
        )}

        {/* Person / Group toggle */}
        {hasTypeVariety && (
          <>
            <Chip active={activeType === 'person'} onClick={() => toggleType('person')}>
              {labels.typePerson}
            </Chip>
            <Chip active={activeType === 'group'} onClick={() => toggleType('group')}>
              {labels.typeGroup}
            </Chip>
          </>
        )}

        {/* Separator */}
        {hasTypeVariety && maxGigCount > 2 && (
          <span className="w-px h-4 bg-[var(--border)] mx-0.5" />
        )}

        {/* Min gigs — step buttons */}
        {maxGigCount > 2 && (
          <div className="inline-flex items-center h-7 rounded-lg border border-[var(--border)] overflow-hidden hover:border-white/20 transition-all">
            {Array.from({ length: Math.min(maxGigCount, 5) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMinGigs(minGigs === n ? 1 : n)}
                className={[
                  'px-2 h-full text-[11px] leading-none tabular-nums transition-all',
                  minGigs >= n
                    ? 'text-white/80 bg-white/5 hover:bg-white/10'
                    : 'text-[var(--muted-foreground)] opacity-40 hover:opacity-70 hover:bg-white/3',
                  n > 1 ? 'border-l border-[var(--border)]' : '',
                ].join(' ')}
              >
                {n}+
              </button>
            ))}
          </div>
        )}

        {/* Clear */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto h-7 px-2.5 rounded-lg text-[11px] leading-none border border-[var(--border)] text-[var(--muted-foreground)] hover:text-white/80 hover:border-white/20 transition-all link-lift"
          >
            {labels.filterAll}
          </button>
        )}
      </div>

      {/* ── Graph ── */}
      <svg
        ref={svgRef}
        className="w-full rounded-xl border border-[var(--border)]"
        style={{ minHeight: 360 }}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm shadow-lg backdrop-blur-sm animate-in fade-in duration-200"
          style={{
            left: tooltip.x + 16,
            top: tooltip.y - 12,
            transform: tooltip.x > (containerRef.current?.clientWidth || 600) - 240 ? 'translateX(-110%)' : undefined,
            maxWidth: 240,
          }}
        >
          <div className="font-medium text-[var(--foreground)]">{tooltip.node.name}</div>
          {tooltip.node.instrumentLabel && (
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{tooltip.node.instrumentLabel}</div>
          )}
          <div className="mt-2 pt-2 border-t border-[var(--border)] space-y-0.5 text-xs text-[var(--muted-foreground)]">
            <div>
              {tooltip.node.gigCount} {labels.gigs}
            </div>
            {!tooltip.node.isCenter && (
              <div>
                {tooltip.totalGigs} {labels.collaborators}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hint */}
      <p className="text-center text-xs text-[var(--muted-foreground)] opacity-60">
        {labels.dragHint}
      </p>
    </div>
  );
}
