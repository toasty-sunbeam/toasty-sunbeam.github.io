import rss from '@astrojs/rss';
import type { APIContext, MarkdownInstance } from 'astro';
import type { Frontmatter } from '../frontmatter';

export function GET(context: APIContext) {
	const posts = Object.values(import.meta.glob<MarkdownInstance<Frontmatter>>('./posts/*.mdx', { eager: true }))
		.sort((a, b) => new Date(b.frontmatter.pubDate).getTime() - new Date(a.frontmatter.pubDate).getTime());

	return rss({
		title: 'James Harris',
		description: 'Blog posts by James Harris',
		site: context.site!,
		items: posts.map((post) => ({
			title: post.frontmatter.title,
			pubDate: new Date(post.frontmatter.pubDate),
			description: post.frontmatter.description,
			link: post.url,
		})),
	});
}
