import http from 'node:http';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import worker from '../dist/server/index.js';
const root='.preview-state';await fs.mkdir(root,{recursive:true});
const file=key=>root+'/'+Buffer.from(key).toString('base64url')+'.json';
const bucket={
 async get(key){try{const v=JSON.parse(await fs.readFile(file(key),'utf8'));return {etag:v.etag,text:async()=>v.value,json:async()=>JSON.parse(v.value)};}catch{return null;}},
 async put(key,value,options={}){const before=await this.get(key),c=options.onlyIf||{};if(c.etagDoesNotMatch==='*'&&before)return null;if(c.etagMatches&&before?.etag!==c.etagMatches)return null;const etag=createHash('sha256').update(value).digest('hex');await fs.writeFile(file(key),JSON.stringify({value,etag}));return {etag};},
 async delete(key){try{await fs.unlink(file(key));}catch{}}
};
http.createServer(async(req,res)=>{try{const buffers=[];for await(const c of req)buffers.push(c);const body=Buffer.concat(buffers),request=new Request('http://127.0.0.1:4320'+req.url,{method:req.method,headers:req.headers,...(body.length?{body,duplex:'half'}:{})});const response=await worker.fetch(request,{BUCKET:bucket});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(err){res.writeHead(500);res.end(err.message);}}).listen(4320,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4320'));
