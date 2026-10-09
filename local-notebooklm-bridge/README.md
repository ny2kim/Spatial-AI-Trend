# Research OS → NotebookLM (personal Google account, Mac)

This is an **optional local bridge**. No Google cookies, passwords, or private papers are stored in GitHub. It uses the community-maintained [notebooklm-py](https://github.com/teng-lin/notebooklm-py) client, which relies on an **unofficial** NotebookLM interface and may break when Google changes it.

## Setup (Mac Terminal)

```bash
cd ~/Downloads
git clone https://github.com/ny2kim/Spatial-AI-Trend.git
cd Spatial-AI-Trend
python3 -m venv .venv
source .venv/bin/activate
pip install -U "notebooklm-py[browser]"
notebooklm login
python local-notebooklm-bridge/server.py
```

If the repository is already cloned, run `git pull` instead of `git clone`. Run `notebooklm login` again if the local login expires. Keep the terminal open while using the feature. Use Ctrl+C to stop.

## Use

1. Open the protected Research OS Private Workspace in Chrome on the same Mac.
2. Open alphaXiv Library, check up to 10 papers.
3. Click **Analyze selected in NotebookLM**.
4. A local confirmation page opens at `http://127.0.0.1:8765/import`. Click **Create Notebook and Add Sources**.
5. Wait for the results, then click **Open new notebook**.

Only public arXiv `https://arxiv.org/abs/...` or `/pdf/...` links are accepted by the bridge. A failure for an individual source is displayed rather than silently ignored. This creates a new notebook on each confirmed import. Source URL ingestion may fail for some arXiv pages; if it does, PDF upload is a future enhancement.

## Security and limitations

- Bound to `127.0.0.1` only, never a public network interface.
- The local confirmation step and per-process random token prevent background cross-site requests from immediately creating notebooks.
- No official personal NotebookLM API is used. Local authentication is stored by notebooklm-py on your Mac, not in this repo.
- Do not expose or port-forward 8765.
- Google account, source quota, and Google UI changes may affect reliability.
- The Private Workspace must be redeployed separately if it is hosted outside GitHub Pages.
