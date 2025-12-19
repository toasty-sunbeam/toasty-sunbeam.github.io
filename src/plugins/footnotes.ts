import { visit } from 'unist-util-visit';
import type { Node, Parent } from 'unist';
import type { VFile } from 'vfile';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';

export interface FootnoteData {
    id: string;
    number: number;
    html: string;
}

interface FootnoteDefinition extends Parent {
    type: 'footnoteDefinition';
    identifier: string;
    label?: string;
}

// --- Server-side Remark Plugin ---

export function remarkExtractFootnotes() {
    return (tree: Node, file: VFile) => {
        const footnotes: FootnoteData[] = [];

        visit(tree, 'footnoteDefinition', (node: FootnoteDefinition) => {
            const identifier = node.identifier;

            // Convert children to HTML (the actual content of the footnote)
            // The node.children contains paragraphs, links, etc.
            let html = '';
            if (node.children && node.children.length > 0) {
                const contentHast = toHast({ type: 'root', children: node.children } as any);
                html = contentHast ? toHtml(contentHast) : '';
            }

            footnotes.push({
                id: `user-content-fn-${identifier}`,
                number: footnotes.length + 1,
                html,
            });
        });

        if (footnotes.length > 0) {
            const data = file.data as any;
            data.astro = data.astro || {};
            data.astro.frontmatter = data.astro.frontmatter || {};
            data.astro.frontmatter.hasFootnotes = true;
            data.astro.frontmatter.footnotes = footnotes;
        }
    };
}

