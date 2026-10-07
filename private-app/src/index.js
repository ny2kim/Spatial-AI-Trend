import { callAlphaXiv, foldersFrom } from "../functions/_shared/alphaxiv.js";

function json(data, init={}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), {...init, headers});
}

async function library(env) {
  const payload = await callAlphaXiv(env, "list_library", { include_papers: true });
  return json({ folders: foldersFrom(payload), raw: payload });
}

async function save(request, env) {
  const { paper, folderName = "Want to read" } = await request.json();
  if (!paper) return json({ error: "paper is required" }, { status: 400 });

  const args = { paper_ids_or_urls: [paper] };
  if (folderName && folderName !== "Want to read") {
    const lib = await callAlphaXiv(env, "list_library", {});
    const folders = foldersFrom(lib);
    let folder = folders.find((x) => x.name === folderName);

    if (!folder) {
      const created = await callAlphaXiv(env, "create_folder", { name: folderName });
      const id = created.folder_id || created.id;
      if (!id) throw new Error("Could not resolve created alphaXiv folder id");
      folder = { folder_id: id };
    }
    args.folder_id = folder.folder_id || folder.id;
  }

  const result = await callAlphaXiv(env, "save_papers_to_folder", args);
  return json({ ok: true, result });
}

const PRIVATE_KEYS = new Set(["topics", "ideas", "settings"]);

async function privateData(request, env, url) {
  const key = url.searchParams.get("key");
  if (!PRIVATE_KEYS.has(key)) return json({ error: "invalid key" }, { status: 400 });
  if (!env.RESEARCH_DATA) {
    if (request.method === "GET") return json({ value: [] });
    return json({ error: "RESEARCH_DATA KV binding is not configured" }, { status: 503 });
  }

  if (request.method === "GET") {
    const raw = await env.RESEARCH_DATA.get(key);
    return json({ value: raw ? JSON.parse(raw) : [] });
  }
  if (request.method === "PUT") {
    const { value } = await request.json();
    await env.RESEARCH_DATA.put(key, JSON.stringify(value));
    return json({ ok: true });
  }
  return json({ error: "method not allowed" }, { status: 405 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/library" && request.method === "GET") return await library(env);
      if (url.pathname === "/api/save" && request.method === "POST") return await save(request, env);
      if (url.pathname === "/api/private-data" && (request.method === "GET" || request.method === "PUT")) {
        return await privateData(request, env, url);
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      return json({ error: error?.message || "Internal error" }, { status: 500 });
    }
  }
};
