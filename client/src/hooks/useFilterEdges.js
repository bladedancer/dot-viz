import { useEffect } from 'react';

export function useFilterEdges(cy, edgeFilter) {
    useEffect(() => {
        if (!cy) return;
        cy.batch(() => {
            cy.edges().forEach((e) => {
                const linkType = e.data('linkType');
                if (linkType === 'compile') {
                    edgeFilter.compile ? e.show() : e.hide();
                } else if (linkType === 'provided') {
                    edgeFilter.provided ? e.show() : e.hide();
                } else if (linkType === 'grouping') {
                    edgeFilter.grouping ? e.show() : e.hide();
                } else if (linkType === 'test') {
                    edgeFilter.test ? e.show() : e.hide();
                }
            });
        });
    }, [cy, edgeFilter]);
}
