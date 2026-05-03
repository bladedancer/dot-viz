import { useEffect } from 'react';

export function useFilter(sigma, graph, nodeFilter, edgeFilter, graphVersion, visibleIdsRef, groupSelection, selection) {
    useEffect(() => {
        if (!graph || !graph.order) {
            visibleIdsRef.current = new Set();
            return;
        }

        const filterText  = nodeFilter.text ? nodeFilter.text.toLowerCase() : '';
        const activeGroups = groupSelection?.length > 0 ? new Set(groupSelection) : null;
        const direction    = nodeFilter.direction;

        // ── Connected mode: BFS from selected nodes ───────────────────────────
        if (nodeFilter.connected) {
            const seeds   = (selection || []).filter((id) => graph.hasNode(id));
            const visible = new Set(seeds);

            const bfs = (startNodes, getNeighbors) => {
                const queue   = [...startNodes];
                const visited = new Set(startNodes);
                while (queue.length) {
                    const current = queue.shift();
                    for (const nb of getNeighbors(current)) {
                        if (!visited.has(nb)) {
                            visited.add(nb);
                            visible.add(nb);
                            queue.push(nb);
                        }
                    }
                }
            };

            const outNeighbors = (id) => {
                const r = [];
                graph.forEachOutEdge(id, (_, edgeAttrs, _src, tgt) => {
                    if (edgeFilter[edgeAttrs.linkType]) r.push(tgt);
                });
                return r;
            };

            const inNeighbors = (id) => {
                const r = [];
                graph.forEachInEdge(id, (_, edgeAttrs, src) => {
                    if (edgeFilter[edgeAttrs.linkType]) r.push(src);
                });
                return r;
            };

            // Run each direction as an independent BFS so visited sets don't
            // interfere — 'both' is the true union of outbound and inbound results.
            if (direction === 'outbound' || direction === 'both') bfs(seeds, outNeighbors);
            if (direction === 'inbound'  || direction === 'both') bfs(seeds, inNeighbors);

            visibleIdsRef.current = visible;
            sigma.refresh();
            return;
        }

        // ── Text / group filter ───────────────────────────────────────────────
        if (!filterText && !activeGroups) {
            visibleIdsRef.current = new Set(graph.nodes());
            sigma.refresh();
            return;
        }

        const seeds = [];
        graph.forEachNode((id, attrs) => {
            if (activeGroups && !activeGroups.has(attrs.group)) return;
            if (filterText && !(attrs.label && attrs.label.toLowerCase().includes(filterText))) return;
            seeds.push(id);
        });

        visibleIdsRef.current = new Set(seeds);
        sigma.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sigma, graph, nodeFilter, edgeFilter, graphVersion, groupSelection, selection]);
    // visibleIdsRef is a ref — intentionally not in deps
}
