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

    const sidebar = document.querySelector('.toc-sidebar') as HTMLElement;
    const footnotesContainer = document.querySelector('#footnotes-container') as HTMLElement;
    if (!sidebar || !footnotesContainer) return;

    // Clear existing items (if any, e.g. on re-run)
    footnotesContainer.innerHTML = '';

    const ol = footnotesSection.querySelector('ol');
    if (!ol) return;

    // Hide original footer
    footnotesSection.style.display = 'none';

    // Check for TOC to avoid collision
    const tocObj = sidebar.querySelector('.toc');
    // Assuming the TOC component renders a nav or div with class 'toc' or similar inside sidebar. 
    // Based on previous file view, it was <TableOfContents>. I need to check its output.
    // The sidebar contains {showToc && <TableOfContents ...>}

    // We'll trust that children of sidebar before footnotesContainer are the TOC.
    // Let's measure the bottom of the last element before footnotesContainer in the sidebar?
    // Or simpler: get the bounding rect of the sidebar's content *before* we add footnotes?
    // Since footnotesContainer is empty and appended at end, assuming TOC is above it.

    // Let's get the initial offset caused by TOC
    let startOffset = 0;
    // We can look at the element just before footnotesContainer?
    // Or just measure the position of footnotesContainer relative to sidebar top?

    // Actually, rely on getBoundingClientRect() relative calc.
    // The footnotesContainer will naturally be below TOC in normal flow.
    // So existing `top` of footnotesContainer is the starting point.

    // Wait, the footnotes are absolute positioned *inside* footnotesContainer? 
    // If footnotesContainer is `position: relative` (CSS needed?) or sidebar is `position: relative`.
    // My previous CSS made `.toc-sidebar` relative.
    // So `top: 0` inside sidebar means top of sidebar.
    // Colliding with TOC means we need to start after TOC.

    // Let's find the TOC element or just use a logic that respects occupied space.

    // We'll calculate a "minimum top" based on layout.
    // If TOC is present, we need to know its height.
    // Since we are running in browser, we can measure.

    const sidebarRect = sidebar.getBoundingClientRect();
    const containerRect = footnotesContainer.getBoundingClientRect();

    // Offset of the container from the top of the sidebar
    const containerOffset = containerRect.top - sidebarRect.top;

    // So the first footnote must be at least at `0` relative to the footnotesContainer, 
    // which implies it's at `containerOffset` relative to the sidebar.
    // BUT, my previous logic positioned them absolute relative to sidebar (because sidebar was relative parent).
    // If I change footnotesContainer to be the relative parent, then `top: 0` is safely below TOC.
    // But we want to align with text.

    // If we align with text, `top` might be small (e.g. text is at top).
    // If TOC is huge, `top` (aligned with text) might be *inside* TOC.
    // So `top` must be `Math.max(alignedTop, tocHeight)`.

    const posts = Array.from(ol.children);
    let lastBottom = 0; // Relative to the sidebar (or container)

    // Use container as the anchor?
    // If I make footnotesContainer `position: relative` and `width: 100%`,
    // then `top: 0` inside it is below TOC.
    // The alignment calculation needs to account for this offset.

    // Let's assume absolute positioning relative to SIDEBAR for maximum control, 
    // but enforce min-top > TOC height.

    startOffset = containerOffset;

    posts.forEach((li, index) => {
        const id = li.id;
        const refLink = document.querySelector(`a[href="#${id}"]`);

        if (refLink) {
            const newItem = document.createElement('div');
            newItem.className = 'sidebar-footnote';

            // Add Bold Number
            const number = index + 1;
            // li.innerHTML might contain the backref arrow, we might want to keep or remove it.
            // Usually footnotes have the content.
            // Let's prepend the bold number.
            // Format: <b>1.</b> content...

            // We need to parse the content slightly to avoid double numbering if it exists?
            // Standard markdown rendering usually puts content in <p>.

            newItem.innerHTML = `<b>${number}.</b> ` + li.innerHTML;

            newItem.style.position = 'absolute';
            newItem.style.width = '100%';

            footnotesContainer.appendChild(newItem); // Even if absolute relative to sidebar?
            // If sidebar is relative, and container is static block,
            // appending to container but positioning absolute... 
            // If container has no position set, it defaults to sidebar (nearest positioned ancestor).

            const refRect = refLink.getBoundingClientRect();

            // Calculate top relative to sidebar top
            const relativeTop = refRect.top - sidebarRect.top;

            // Collision detection
            // 1. Must be below previous footnote (+ margin)
            // 2. Must be below TOC (startOffset)

            let top = Math.max(relativeTop, lastBottom + 10);
            top = Math.max(top, startOffset);

            newItem.style.top = `${top}px`;

            lastBottom = top + newItem.offsetHeight;
        }
    });
}
