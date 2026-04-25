import { useEffect } from 'react';

export function useFilterConnected(cy, nodeFilter, edgeFilter) {
    useEffect(() => {
        if (!cy) return;
        if (!(nodeFilter.filter || nodeFilter.ids) || !nodeFilter.connected) return;

        cy.batch(() => {
            cy.nodes(':visible').forEach((root) => {
                let nodes = cy.collection();

                if (!nodeFilter.direction || nodeFilter.direction === 'both' || nodeFilter.direction === 'inbound') {
                    nodes.merge(root.predecessors());
                }
                if (!nodeFilter.direction || nodeFilter.direction === 'both' || nodeFilter.direction === 'outbound') {
                    nodes.merge(root.successors());
                }
                nodes.merge(root);

                nodes.forEach((goal) => {
                    const path = nodes.aStar({
                        root,
                        goal,
                        weight: (e) => {
                            const linkType = e.data('linkType');
                            if (
                                (linkType === 'compile' && edgeFilter.compile) ||
                                (linkType === 'provided' && edgeFilter.provided) ||
                                (linkType === 'grouping' && edgeFilter.grouping) ||
                                (linkType === 'test' && edgeFilter.test)
                            ) {
                                return 1;
                            }
                            return 10000000;
                        },
                    });

                    if (path.distance && path.distance < 10000000) {
                        goal.show();
                    }
                });
            });
        });
    }, [cy, nodeFilter, edgeFilter]);
}
