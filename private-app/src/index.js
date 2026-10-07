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

async function updateLibrary(request, env) {
  const body = await request.json();
  const { paper, action, folderName, fromFolderName } = body || {};
  if (!paper) return json({ error: "paper is required" }, { status: 400 });

  const lib = await callAlphaXiv(env, "list_library", { include_papers: false });
  const folders = foldersFrom(lib);
  const byName = (name) => folders.find((x) => x.name === name);
  const folderId = (x) => x && (x.folder_id || x.id);

  async function ensureFolder(name) {
    let f = byName(name);
    if (f) return f;
    const created = await callAlphaXiv(env, "create_folder", { name });
    const id = created.folder_id || created.id;
    if (!id) throw new Error("Could not resolve created alphaXiv folder id");
    return { name, folder_id: id };
  }

  if (action === "set_status") {
    const statuses = ["Want to read", "Reading", "Completed"];
    if (!statuses.includes(folderName)) return json({ error: "invalid status" }, { status: 400 });
    const target = await ensureFolder(folderName);
    await callAlphaXiv(env, "save_papers_to_folder", { paper_ids_or_urls: [paper], folder_id: folderId(target) });
    for (const name of statuses) {
      if (name === folderName) continue;
      const f = byName(name);
      if (f) await callAlphaXiv(env, "remove_papers_from_folder", { paper_ids_or_urls: [paper], folder_id: folderId(f) });
    }
    return json({ ok: true, action, status: folderName });
  }

  if (action === "add_folder") {
    if (!folderName) return json({ error: "folderName is required" }, { status: 400 });
    const target = await ensureFolder(folderName);
    const result = await callAlphaXiv(env, "save_papers_to_folder", { paper_ids_or_urls: [paper], folder_id: folderId(target) });
    return json({ ok: true, action, folderName, result });
  }

  if (action === "remove_folder") {
    if (!folderName) return json({ error: "folderName is required" }, { status: 400 });
    const target = byName(folderName);
    if (!target) return json({ ok: true, action, folderName, skipped: true });
    const result = await callAlphaXiv(env, "remove_papers_from_folder", { paper_ids_or_urls: [paper], folder_id: folderId(target) });
    return json({ ok: true, action, folderName, result });
  }

  if (action === "move_folder") {
    if (!folderName || !fromFolderName) return json({ error: "fromFolderName and folderName are required" }, { status: 400 });
    const from = byName(fromFolderName);
    const to = await ensureFolder(folderName);
    if (!from) return json({ error: "source folder not found" }, { status: 404 });
    const result = await callAlphaXiv(env, "move_papers_between_folders", {
      paper_ids_or_urls: [paper],
      from_folder_id: folderId(from),
      to_folder_id: folderId(to)
    });
    return json({ ok: true, action, fromFolderName, folderName, result });
  }

  return json({ error: "invalid action" }, { status: 400 });
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
      if (url.pathname === "/api/library-update" && request.method === "POST") return await updateLibrary(request, env);
      if (url.pathname === "/api/private-data" && (request.method === "GET" || request.method === "PUT")) {
        return await privateData(request, env, url);
      }
      if (url.pathname === "/api/corpus" && request.method === "GET") {
        const upstream = await fetch("https://raw.githubusercontent.com/ny2kim/Spatial-AI-Trend/main/data/papers.json", { headers: { "User-Agent": "Research-OS" } });
        if (!upstream.ok) return json({ error: "Could not load public paper corpus" }, { status: 502 });
        const data = await upstream.json();
        return json(data);
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      return json({ error: error?.message || "Internal error" }, { status: 500 });
    }
  }
};
