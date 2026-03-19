import fs from 'fs';
import https from 'https';
import crypto from 'crypto';

const creds = JSON.parse(fs.readFileSync('email-agent/credentials/google-service-account.json', 'utf8'));
const SPREADSHEET_ID = '1BuIfkkILSg8X2Dr08xXF0KDOHPF76Rx2Dcr6Bi1gswA';

function b64url(s) { return Buffer.from(s).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,''); }
function apiReq(hostname, method, path, data, headers={}) {
  return new Promise((resolve,reject) => {
    const body = typeof data==='string' ? data : JSON.stringify(data);
    const r = https.request({hostname,path,method,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),...headers}},
      res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve(d));});
    r.on('error',reject); r.write(body); r.end();
  });
}
function apiGet(hostname, path, headers={}) {
  return new Promise((resolve,reject) => {
    const r=https.request({hostname,path,method:'GET',headers},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve(d));});
    r.on('error',reject); r.end();
  });
}

const now=Math.floor(Date.now()/1000);
const h=b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
const p=b64url(JSON.stringify({iss:creds.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',exp:now+3600,iat:now}));
const sgn=crypto.createSign('RSA-SHA256'); sgn.update(`${h}.${p}`);
const sig=sgn.sign(creds.private_key,'base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
const token=JSON.parse(await apiReq('oauth2.googleapis.com','POST','/token',
  `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${h}.${p}.${sig}`,
  {'Content-Type':'application/x-www-form-urlencoded'})).access_token;

// Ler a linha 1 da Fila para ver os headers atuais
const r = JSON.parse(await apiGet('sheets.googleapis.com',
  `/v4/spreadsheets/${SPREADSHEET_ID}/values/Fila%21A1%3AQ1`,
  {Authorization:`Bearer ${token}`}));
console.log('Headers linha 1:', JSON.stringify(r.values?.[0]));

// Ver estrutura da sheet
const meta = JSON.parse(await apiGet('sheets.googleapis.com',
  `/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets(properties)`,
  {Authorization:`Bearer ${token}`}));
meta.sheets.forEach(s => {
  const p = s.properties;
  console.log(` sheetId=${p.sheetId} title="${p.title}" cols=${p.gridProperties?.columnCount} rows=${p.gridProperties?.rowCount}`);
});
