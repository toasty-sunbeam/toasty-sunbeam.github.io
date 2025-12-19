export interface Frontmatter {
	title: string;
	description?: string;
	excerpt?: string;
	pubDate: string | Date;
	comments: boolean;
	cardColor: string;
	toc?: boolean;
}
