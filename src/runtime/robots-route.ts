/**
 * GET /robots.txt, from the admin settings (Plugins → Tapestry SEO). Public; cached briefly so a
 * change shows within minutes. ADR 0001.
 */
import type { APIRoute } from 'astro';
import { buildRobotsTxt } from '../robots.js';
import { loadSeoSettings } from './settings-store.js';
import { robotsContext } from './site.js';

export const prerender = false;

export const GET: APIRoute = async (context) =>
	new Response(buildRobotsTxt(await loadSeoSettings(), robotsContext(context)), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=300',
			'X-Content-Type-Options': 'nosniff',
		},
	});
