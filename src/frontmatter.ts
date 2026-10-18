export interface Frontmatter {
	title: string;
	description?: string;
	pubDate: string | Date;
	comments: boolean;
	cardColor: string;
	toc?: boolean;
	tags?: string | null;
}
