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

const now=Math.floor(Date.now()/1000);
const h=b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
const p=b64url(JSON.stringify({iss:creds.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',exp:now+3600,iat:now}));
const sgn=crypto.createSign('RSA-SHA256'); sgn.update(`${h}.${p}`);
const sig=sgn.sign(creds.private_key,'base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
const token=JSON.parse(await apiReq('oauth2.googleapis.com','POST','/token',
  `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${h}.${p}.${sig}`,
  {'Content-Type':'application/x-www-form-urlencoded'})).access_token;
if(!token){console.error('Token failed');process.exit(1);}
console.log('✓ Token OK');

// Ler DEs do arquivo
const des = fs.readFileSync('/tmp/hub_des.txt','utf8').split('\n').map(l=>l.trim()).filter(Boolean).sort();
console.log(`DEs a escrever: ${des.length}`);

// Formatar como valores para a planilha
const values = [['DE Name'], ...des.map(d=>[d])];

// Usar values.update para escrever na aba Config
const body = JSON.stringify({ values, majorDimension: 'ROWS' });
const resp = JSON.parse(await apiReq('sheets.googleapis.com','PUT',
  `/v4/spreadsheets/${SPREADSHEET_ID}/values/Config%21A1%3AA${values.length}?valueInputOption=RAW`,
  body, {Authorization:`Bearer ${token}`}));

if (resp.updatedCells) {
  console.log(`✅ Config populada: ${resp.updatedCells} células escritas`);
} else {
  console.error('❌', JSON.stringify(resp).substring(0,400));
}
