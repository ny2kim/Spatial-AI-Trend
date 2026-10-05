const ENDPOINT="https://api.alphaxiv.org/mcp/v1";
function parseSSE(text){const lines=text.split(/\r?\n/).filter(x=>x.startsWith("data:"));for(let i=lines.length-1;i>=0;i--){try{return JSON.parse(lines[i].slice(5).trim())}catch{}}throw new Error("Invalid MCP SSE response")}
function unwrap(result){if(!result)return result;if(result.structuredContent)return result.structuredContent;for(const c of (result.content||[])){if(c.type==="text"&&c.text){try{return JSON.parse(c.text)}catch{return {text:c.text}}}}return result}
export async function callAlphaXiv(env,name,args={}){
 if(!env.ALPHAXIV_API_KEY)throw new Error("ALPHAXIV_API_KEY is not configured");
 const version="2026-07-28";
 const body={jsonrpc:"2.0",id:crypto.randomUUID(),method:"tools/call",params:{name,arguments:args,_meta:{"io.modelcontextprotocol/protocolVersion":version,"io.modelcontextprotocol/clientInfo":{name:"research-os",version:"1.0.0"},"io.modelcontextprotocol/clientCapabilities":{}}}};
 const r=await fetch(ENDPOINT,{method:"POST",headers:{"Authorization":"Bearer "+env.ALPHAXIV_API_KEY,"Content-Type":"application/json","Accept":"application/json, text/event-stream","MCP-Protocol-Version":version,"Mcp-Method":"tools/call","Mcp-Name":name},body:JSON.stringify(body)});
 const text=await r.text();if(!r.ok)throw new Error("alphaXiv MCP "+r.status+": "+text.slice(0,300));
 const msg=(r.headers.get("content-type")||"").includes("text/event-stream")?parseSSE(text):JSON.parse(text);
 if(msg.error)throw new Error(msg.error.message||"alphaXiv MCP error");
 return unwrap(msg.result);
}
export function foldersFrom(payload){if(Array.isArray(payload))return payload;if(Array.isArray(payload?.folders))return payload.folders;if(Array.isArray(payload?.library?.folders))return payload.library.folders;return []}
