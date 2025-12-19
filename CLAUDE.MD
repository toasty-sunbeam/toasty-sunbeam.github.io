# Project Overview

This is a personal blog for James Harris, built with Astro and styled with Tailwind CSS v4.

## Tech Stack

- **Framework**: Astro v5.16.5
- **Styling**: Tailwind CSS v4.1.18 with Vite plugin
- **Package Manager**: pnpm
- **Language**: TypeScript

## Project Structure

```
blog-astro/
├── public/          # Static assets (images, favicon, etc.)
├── src/
│   ├── pages/       # Astro pages (file-based routing)
│   │   └── index.astro
│   └── styles/      # Global styles
│       └── global.css
├── astro.config.mjs # Astro configuration
├── package.json
└── tsconfig.json
```

## Key Commands

- `pnpm dev` - Start development server at localhost:4321
- `pnpm build` - Build production site to ./dist/
- `pnpm preview` - Preview production build locally
- `pnpm astro` - Run Astro CLI commands
- `pnpm install <package>` - Install packages (use pnpm, not npm)

## Development Notes

### Routing
- Pages are automatically routed based on file names in `src/pages/`
- Currently has a single index page at the root

### Styling
- Uses Tailwind CSS v4 integrated via Vite plugin
- Global styles imported in index.astro
- Modern @tailwindcss/vite plugin for better performance

### Components
- Astro components should be placed in `src/components/` (directory not yet created)
- Supports React, Vue, Svelte, and Preact with appropriate integrations

## Current State

The project is in its initial setup phase with:
- Basic Astro minimal template
- Tailwind CSS configured and working
- Single homepage with "James Harris" title
- Ready for blog content and component development

## Next Steps Suggestions

- Add blog post content structure
- Create reusable components (Header, Footer, BlogPost, etc.)
- Set up content collections for blog posts
- Add layout components
- Implement blog listing and individual post pages
- Configure SEO metadata
