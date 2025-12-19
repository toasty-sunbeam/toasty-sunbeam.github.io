import { visit } from 'unist-util-visit';
import type { Node } from 'unist';
import type { VFile } from 'vfile';

// --- Server-side Remark Plugin ---

export function remarkDetectFootnotes() {
    return (tree: Node, file: VFile) => {
        let hasFootnotes = false;
        visit(tree, 'footnoteDefinition', (node) => {
            hasFootnotes = true;
            return false; // stop
        });

        if (hasFootnotes) {
            // Ensure astro data object exists
            const data = file.data as any;
            data.astro = data.astro || {};
            data.astro.frontmatter = data.astro.frontmatter || {};
            data.astro.frontmatter.hasFootnotes = true;
        }
    };
}

// --- Client-side Footnote Logic ---

export function initFootnotes() {
    const footnotesSection = document.querySelector('.footnotes') as HTMLElement;
    if (!footnotesSection) return;

    const sidebar = document.querySelector('.right-sidebar') as HTMLElement;
    const footnotesContainer = document.querySelector('#footnotes-container') as HTMLElement;
    if (!sidebar || !footnotesContainer) return;

    // Clear existing items
    footnotesContainer.innerHTML = '';

    const ol = footnotesSection.querySelector('ol');
    if (!ol) return;

    // Hide original footer
    footnotesSection.style.display = 'none';

    // With TOC in left sidebar, footnotes are alone in right sidebar.
    // Anchor to the container.
    // #footnotes-container has position: relative, so top:0 starts inside it.

    const containerRect = footnotesContainer.getBoundingClientRect();
    const posts = Array.from(ol.children);
    let lastBottom = 0;

    posts.forEach((li, index) => {
        const id = li.id;
        const refLink = document.querySelector(`a[href="#${id}"]`);

        if (refLink) {
            const newItem = document.createElement('div');
            newItem.className = 'sidebar-footnote';

            // Add Bold Number
            const number = index + 1;
            newItem.innerHTML = `<b>${number}.</b> ` + li.innerHTML;

            newItem.style.position = 'absolute';
            newItem.style.width = '100%';

            footnotesContainer.appendChild(newItem);

            const refRect = refLink.getBoundingClientRect();

            // Calculate top relative to container top
            // If ref is above container (e.g. early text), this is negative.
            const relativeTop = refRect.top - containerRect.top;

            // Collision detection
            // 1. Must be below previous footnote (+ margin)
            // 2. Must be >= 0 (inside container)

            let top = Math.max(relativeTop, lastBottom + 10);
            top = Math.max(top, 0);

            newItem.style.top = `${top}px`;

            lastBottom = top + newItem.offsetHeight;
        }
    });
}
