import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg'};
http.createServer(async(request,response)=>{try{const url=new URL(request.url,'http://localhost'),relative=decodeURIComponent(url.pathname==='/'?'index.html':url.pathname.slice(1)),file=path.resolve(root,relative);if(!file.startsWith(root))throw new Error('Invalid path');const body=await fs.readFile(file);response.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});response.end(body)}catch{response.writeHead(404);response.end('Not found')}}).listen(8765,'127.0.0.1',()=>console.log('LaysFlix local: http://127.0.0.1:8765'));
