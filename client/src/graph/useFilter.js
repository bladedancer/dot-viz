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
            const seeds = (selection || []).filter((id) => graph.hasNode(id));
            const visible = new Set(seeds);

            for (const seed of seeds) {
                const queue   = [seed];
                const visited = new Set([seed]);

                while (queue.length) {
                    const current   = queue.shift();
                    const neighbors = [];

                    if (direction === 'outbound' || direction === 'both') {
                        graph.forEachOutEdge(current, (_, edgeAttrs, _src, tgt) => {
                            if (edgeFilter[edgeAttrs.linkType] && !visited.has(tgt)) neighbors.push(tgt);
                        });
                    }
                    if (direction === 'inbound' || direction === 'both') {
                        graph.forEachInEdge(current, (_, edgeAttrs, src) => {
                            if (edgeFilter[edgeAttrs.linkType] && !visited.has(src)) neighbors.push(src);
                        });
                    }

                    for (const nb of neighbors) {
                        visited.add(nb);
                        visible.add(nb);
                        queue.push(nb);
                    }
                }
            }

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
