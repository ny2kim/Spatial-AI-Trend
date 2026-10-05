# Private Research OS deployment

This folder contains UI and server code only. It must contain **no private research data or credentials**.

Required setup:
1. Deploy this `private-app/` directory as a Cloudflare Pages project.
2. Protect the entire Pages hostname with Cloudflare Zero Trust / Access and allow only your own account/email.
3. In alphaXiv → Settings → API Keys, create a headless API key. Do not paste it into GitHub or the website. Store it as the Cloudflare secret `ALPHAXIV_API_KEY`.
4. Create a Cloudflare KV namespace and bind it as `RESEARCH_DATA`; this stores private Topic Radar / Topic Map / Ideas Lab data.
5. Set the deployed protected URL in the root `research-os-config.js` as `privateWorkspaceUrl`.

The public Today page then opens this protected workspace for Save and Track Topic actions. NotebookLM remains semi-automatic for a non-Enterprise account: selected paper URLs are copied and NotebookLM is opened for Add sources.
