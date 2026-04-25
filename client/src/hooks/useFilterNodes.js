import { useEffect } from 'react';

export function useFilterNodes(cy, nodeFilter) {
    useEffect(() => {
        if (!cy) return;
        cy.batch(() => {
            cy.nodes().forEach((n) => {
                try {
                    if (nodeFilter.ids && nodeFilter.ids.length && !nodeFilter.ids.includes(n.id())) {
                        n.hide();
                    } else if (
                        !nodeFilter.filter ||
                        n.data('label').toLowerCase().match(nodeFilter.filter.toLowerCase() + '.*')
                    ) {
                        n.show();
                    } else {
                        n.hide();
                    }
                } catch (err) {
                    console.error('Error filtering node', n.id(), err);
                    n.hide();
                }
            });
        });
    }, [cy, nodeFilter]);
}
