import { visit } from 'unist-util-visit';
import type { Node } from 'unist';

interface Element extends Node {
    type: 'element';
    tagName: string;
    properties: Record<string, unknown>;
}

interface MdxJsxAttribute {
    type: 'mdxJsxAttribute';
    name: string;
    value?: unknown;
}

interface MdxJsxElement extends Node {
    type: 'mdxJsxFlowElement' | 'mdxJsxTextElement';
    name: string | null;
    attributes: (MdxJsxAttribute | { type: string })[];
}

// --- Server-side Rehype Plugin ---
//
// Embedded players (YouTube and the like) are pasted in with hard-coded pixel
// sizes, which overflow on narrow screens. Let each iframe shrink to fit its
// column, keeping the aspect ratio given by its own width and height.

function isMdxJsxElement(node: Node): node is MdxJsxElement {
    return node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';
}

function responsiveStyle(width: unknown, height: unknown): string | null {
    const w = Number(width);
    const h = Number(height);
    if (!(w > 0 && h > 0)) return null;
    return `max-width: 100%; height: auto; aspect-ratio: ${w} / ${h}`;
}

function appendStyle(existing: unknown, extra: string): string {
    const base = typeof existing === 'string' ? existing.trim().replace(/;$/, '') : '';
    return base ? `${base}; ${extra}` : extra;
}

export function rehypeResponsiveEmbeds() {
    return (tree: Node) => {
        // iframes written in Markdown (or HTML in .md files)
        visit(tree, 'element', (node: Element) => {
            if (node.tagName !== 'iframe') return;
            const style = responsiveStyle(node.properties.width, node.properties.height);
            if (style) node.properties.style = appendStyle(node.properties.style, style);
        });

        // iframes written as JSX in .mdx files
        visit(tree, isMdxJsxElement, (node) => {
            if (node.name !== 'iframe') return;
            const attrs = node.attributes.filter(
                (a): a is MdxJsxAttribute => a.type === 'mdxJsxAttribute',
            );
            const get = (name: string) => attrs.find((a) => a.name === name);
            const style = responsiveStyle(get('width')?.value, get('height')?.value);
            if (!style) return;

            const styleAttr = get('style');
            if (!styleAttr) {
                node.attributes.push({ type: 'mdxJsxAttribute', name: 'style', value: style });
            } else if (typeof styleAttr.value === 'string') {
                styleAttr.value = appendStyle(styleAttr.value, style);
            }
            // A style given as a JS expression is left alone.
        });
    };
}
