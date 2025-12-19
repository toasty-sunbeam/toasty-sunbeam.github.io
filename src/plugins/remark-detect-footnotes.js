
import { visit } from 'unist-util-visit';

export function remarkDetectFootnotes() {
    return (tree, file) => {
        let hasFootnotes = false;
        visit(tree, 'footnoteDefinition', (node) => {
            hasFootnotes = true;
            return false; // stop
        });

        if (hasFootnotes) {
            // Ensure astro data object exists
            file.data.astro = file.data.astro || {};
            file.data.astro.frontmatter = file.data.astro.frontmatter || {};
            file.data.astro.frontmatter.hasFootnotes = true;
        }
    };
}
