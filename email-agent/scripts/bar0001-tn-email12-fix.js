#!/usr/bin/env node
'use strict';
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUBDOMAIN     = 'mcn29v1t3hsj32w921hh7z9yz2xm';
const CLIENT_ID     = 'xrttn26q5nobbq3ty5vsthgw';
const CLIENT_SECRET = 'kd2cmIW3Gufk00wfB7pIXjvu';
const MID_TN        = '518006236';
const CAT_CAMP      = 320765;
const CAT_IMG       = 320780;

// Assets a atualizar (gerados na sessão anterior)
const ASSETS = [
  { assetId: 41313, esId: '31910', base: 'HOTLIST GERAL',    link: 'https://youtu.be/AvcQVxpR_Cc' },
  { assetId: 41314, esId: '31911', base: 'HOTLIST CLIENTES', link: 'https://youtu.be/AvcQVxpR_Cc' },
];

const DATE     = '20260617';
const TIPO     = 'VND';
const CAMPAIGN = 'BAR0001';
const SUBJECT  = 'O Thiago gravou um vídeo sobre o Legado';
const PREHEADER = 'Esse vídeo vai mudar o que você pensa sobre a oferta';
const TEMPLATE = fs.readFileSync(path.join(__dirname, '../brands/thiago-nigro/templates/campanha.html'), 'utf8');
const OUT = path.join(__dirname, '../output');

function p(t) { return `<p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.8;">${t}</p>`; }

function buildHtml(imgUrl, ctaLink) {
  const imgBlock = `<table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px 0;">
  <tr><td align="center" style="padding:0;">
    <img src="${imgUrl}" alt="Thiago Nigro — O Legado (vídeo)" width="520" border="0"
         style="display:block;width:100%;max-width:520px;height:auto;border-radius:6px;" />
  </td></tr>
</table>`;

  const corpo = [
    p('O Thiago gravou um v&iacute;deo super importante.'),
    p('N&atilde;o &eacute; uma aula. N&atilde;o &eacute; um an&uacute;ncio. &Eacute; ele, na frente da c&acirc;mera, explicando com as pr&oacute;prias palavras porque <strong>O Legado</strong> existe, o que voc&ecirc; vai ter acesso e porque essa oferta nunca mais vai aparecer do jeito que est&aacute; agora.'),
    imgBlock,
    p('O v&iacute;deo est&aacute; no meio da p&aacute;gina da oferta. Basta clicar no bot&atilde;o desse e-mail e rolar o site para baixo at&eacute; o v&iacute;deo.'),
    p('Vale menos de 10 minutos do seu tempo para entender se <strong>O Legado</strong> faz sentido para o futuro da sua vida financeira.'),
  ].join('\n');

  return TEMPLATE
    .replace(/\{\{email_subject\}\}/g,    SUBJECT)
    .replace(/\{\{email_preheader\}\}/g,  PREHEADER)
    .replace(/\{\{email_hero_html\}\}/g,  '')
    .replace(/\{\{email_corpo\}\}/g,      corpo)
    .replace(/\{\{email_cta_texto\}\}/g,  'Assistir ao v&iacute;deo')
    .replace(/\{\{email_cta_url\}\}/g,    ctaLink)
    .replace(/\{\{email_assinatura\}\}/g, 'Abra&ccedil;os!');
}

function req(opts, body) {
  return new Promise((res, rej) => {
    const r = https.request(opts, resp => {
      const c = []; resp.on('data', d => c.push(d));
      resp.on('end', () => res({ status: resp.statusCode, raw: Buffer.concat(c).toString() }));
    });
    r.on('error', rej); if (body) r.write(body); r.end();
  });
}

async function getToken() {
  const b = JSON.stringify({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET, account_id: MID_TN });
  const r = await req({ hostname: SUBDOMAIN+'.auth.marketingcloudapis.com', path: '/v2/token', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, b);
  const p = JSON.parse(r.raw); if (r.status !== 200) throw new Error('Auth: '+r.raw);
  return p.access_token;
}

async function uploadImg(token) {
  const IMG_NAME = 'BAR0001-TN-EMAIL12-print-video';
  const file = 'C:/Users/vitoria.esteves/AppData/Local/Temp/bar0001/media/image1.png';
  const lookup = async () => {
    const s = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets?$filter=name%20eq%20'${IMG_NAME}'`, method: 'GET', headers: { 'Authorization': 'Bearer '+token } }, null);
    const sp = JSON.parse(s.raw); const it = sp.items && sp.items[0];
    if (!it) throw new Error('Imagem não encontrada no SFMC');
    return it.fileProperties && it.fileProperties.publishedURL || it.publishedURL;
  };
  const b64 = fs.readFileSync(file).toString('base64');
  const payload = JSON.stringify({ name: IMG_NAME, assetType: { name: 'png', id: 28 }, file: b64, category: { id: CAT_IMG } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: '/asset/v1/content/assets', method: 'POST', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length } }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 201 || r.status === 200) return p.fileProperties && p.fileProperties.publishedURL || p.publishedURL;
  if (p.errorcode === 118039 || p.errorcode === 10006 || (p.message||'').toLowerCase().includes('unique')) return lookup();
  throw new Error('Img upload: '+JSON.stringify(p).slice(0,200));
}

async function getAsset(token, assetId) {
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets/${assetId}`, method: 'GET', headers: { 'Authorization': 'Bearer '+token } }, null);
  return JSON.parse(r.raw);
}

async function putAsset(token, assetId, customerKey, name, html) {
  const payload = JSON.stringify({ id: assetId, customerKey, name, assetType: { name: 'htmlemail', id: 208 }, views: { html: { content: html }, subjectline: { content: SUBJECT } }, category: { id: CAT_CAMP } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets/${assetId}`, method: 'PUT', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length } }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 200 || r.status === 201) return p;
  throw new Error(`PUT ${assetId} (${r.status}): ${JSON.stringify(p).slice(0,300)}`);
}

async function main() {
  console.log('\n==============================================');
  console.log(' BAR0001 TN Email 12 — fix: print + link YT');
  console.log('==============================================\n');

  const token = await getToken();
  console.log('✓ Token TN\n');

  process.stdout.write('Upload print (image1.png)... ');
  const imgUrl = await uploadImg(token);
  console.log('✓\n  →', imgUrl, '\n');

  for (const a of ASSETS) {
    const html = buildHtml(imgUrl, a.link);
    const fname = `2026-06-17-bar0001-tn-email12-${a.base.toLowerCase().replace(/ /g,'-')}.html`;
    fs.writeFileSync(path.join(OUT, fname), html, 'utf8');

    const detail = await getAsset(token, a.assetId);
    const customerKey = detail.customerKey;
    const finalName = `[${TIPO}][${a.esId}][EML][${DATE}][${CAMPAIGN}][EMAIL 12 ${a.base}]`;

    console.log(`── ${a.base}  CB: ${a.assetId}`);
    process.stdout.write(`   PUT → "${finalName}"... `);
    await putAsset(token, a.assetId, customerKey, finalName, html);
    console.log('✓\n');
  }

  console.log('Pronto. Ambos os Email 12 atualizados com print + link YouTube.');
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
