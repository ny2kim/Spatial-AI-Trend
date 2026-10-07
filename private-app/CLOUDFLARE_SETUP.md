# Cloudflare Workers Builds settings

Use these settings when connecting this repository in Cloudflare:

- Project name: `spatial-ai-trend-private`
- Production branch: `main`
- Root directory: `private-app`
- Build command: leave blank
- Deploy command: `npx wrangler deploy`
- Preview command: `npx wrangler versions upload` or leave the dashboard default if previews are disabled
- Preview builds: off (recommended for this private research workspace)
- Protect with Cloudflare Access: on

After first deployment:
1. Add encrypted runtime secret `ALPHAXIV_API_KEY`.
2. Create/bind KV namespace as `RESEARCH_DATA`.
3. Restrict Cloudflare Access to the owner's account only.
4. Put the protected Worker URL into root `research-os-config.js`.

Never commit API keys or private research data to GitHub.
