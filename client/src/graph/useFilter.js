import { useEffect } from 'react';

export function useFilter(sigma, graph, nodeFilter, edgeFilter, graphVersion, visibleIdsRef, groupSelection) {
    useEffect(() => {
        if (!graph || !graph.order) {
            visibleIdsRef.current = new Set();
            return;
        }

        const filterText = nodeFilter.text ? nodeFilter.text.toLowerCase() : '';
        const activeGroups = groupSelection && groupSelection.length > 0 ? new Set(groupSelection) : null;

        if (!filterText && !activeGroups) {
            visibleIdsRef.current = new Set(graph.nodes());
            sigma.refresh();
            return;
        }

        // Step 1: find text-matching seed nodes (filtered by group selection if active)
        const seeds = [];
        graph.forEachNode((id, attrs) => {
            if (activeGroups && !activeGroups.has(attrs.group)) return;
            if (filterText && !(attrs.label && attrs.label.toLowerCase().includes(filterText))) return;
            seeds.push(id);
        });

        if (!nodeFilter.connected || !filterText) {
            visibleIdsRef.current = new Set(seeds);
            sigma.refresh();
            return;
        }

        // Step 2: BFS from each seed, respecting direction and edge filter
        const visible = new Set(seeds);
        const direction = nodeFilter.direction; // 'inbound' | 'outbound' | 'both'

        for (const seed of seeds) {
            if (!graph.hasNode(seed)) continue;
            const queue = [seed];
            const visited = new Set([seed]);

            while (queue.length) {
                const current = queue.shift();

                // Collect neighbors depending on direction
                const neighbors = [];
                if (direction === 'outbound' || direction === 'both') {
                    graph.forEachOutEdge(current, (edgeId, edgeAttrs, _src, tgt) => {
                        if (edgeFilter[edgeAttrs.linkType] && !visited.has(tgt)) {
                            neighbors.push(tgt);
                        }
                    });
                }
                if (direction === 'inbound' || direction === 'both') {
                    graph.forEachInEdge(current, (edgeId, edgeAttrs, src, _tgt) => {
                        if (edgeFilter[edgeAttrs.linkType] && !visited.has(src)) {
                            neighbors.push(src);
                        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sigma, graph, nodeFilter, edgeFilter, graphVersion, groupSelection]);
    // visibleIdsRef is a ref — intentionally not in deps
}
