import {callAlphaXiv,foldersFrom} from "../_shared/alphaxiv.js";
export async function onRequestGet({env}){try{const p=await callAlphaXiv(env,"list_library",{include_papers:true});return Response.json({folders:foldersFrom(p),raw:p},{headers:{"Cache-Control":"no-store"}})}catch(e){return Response.json({error:e.message},{status:500})}}
