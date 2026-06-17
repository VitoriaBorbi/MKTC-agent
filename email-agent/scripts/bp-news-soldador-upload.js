#!/usr/bin/env node
'use strict';
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUBDOMAIN     = 'mcn29v1t3hsj32w921hh7z9yz2xm';
const CLIENT_ID     = 'xrttn26q5nobbq3ty5vsthgw';
const CLIENT_SECRET = 'kd2cmIW3Gufk00wfB7pIXjvu';
const MID_BP        = '518006235';
const CAT_EMAIL     = 320764;
const CAT_IMG       = 320778;
const DATE          = '20260617';
const TIPO          = 'NWS';

const IMG_FILE  = 'C:/Users/vitoria.esteves/AppData/Local/Temp/docx_work/media/image1.png';
const IMG_NAME  = 'BP-NEWS-20260617-soldador-milionario';
const TEMPLATE  = fs.readFileSync(path.join(__dirname, '../brands/bruno-perini/templates/news.html'), 'utf8');
const OUT       = path.join(__dirname, '../output');

const SUBJECT   = 'O soldador que virou milionário';
const PREHEADER = 'Juan ganhava US$ 28/hora como soldador na SpaceX. Depois veio o IPO.';

// ── HTML helpers ──────────────────────────────────────────────────────────────
function p(t) {
  return `<p style="margin:0 0 22px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.85;">${t}</p>`;
}
function imgBlock(url) {
  return `<table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:4px 0 28px 0;">
  <tr><td align="center" style="padding:0;">
    <img src="${url}" alt="SpaceX — funcionários e o IPO" width="520" border="0"
         class="inline-img" style="display:block;width:100%;max-width:520px;height:auto;" />
  </td></tr>
</table>`;
}

function buildCorpo(imgUrl) {
  // Paragrafos antes da imagem (posição 14 no XML)
  const before = [
    p('Ol&aacute;,'),
    p('Juan Hernandez ganhava US$ 28 por hora como soldador na SpaceX.'),
    p('Quando pensamos em hist&oacute;rias de enriquecimento ligadas ao Vale do Sil&iacute;cio, normalmente imaginamos fundadores brilhantes, investidores visionários ou engenheiros geniais. Juan não era nenhum deles. Era um imigrante mexicano que trabalhava na fábrica, ajudando a construir foguetes todos os dias.'),
    p('Ao longo dos anos, recebeu cerca de US$ 10 mil em ações da empresa e continuou comprando mais por meio de deduções na folha de pagamento.'),
    p('Então veio o IPO. De repente, sua participação passou a valer mais de <strong>US$ 1 milhão.</strong>'),
    p('Mas talvez o mais interessante seja que essa história não é excepcional.'),
    p('Trevor Hise também entrou cedo na SpaceX. Recém-formado, abriu mão de uma carreira segura para apostar numa startup que admirava. Permaneceu na empresa por 12 anos e acumulou mais de 100 mil ações.'),
    p('Hoje, sua participação vale cerca de <strong>US$ 21 milhões.</strong>'),
    p('Aos 37 anos, ele se considera semiaposentado.'),
    p('Histórias como essas costumam ser apresentadas como consequência da genialidade de Elon Musk. E, sem dúvida, Musk merece boa parte dos créditos. Mas existe outro aspecto que recebe menos atenção.'),
    p('Durante duas décadas, a SpaceX distribuiu participação societária para funcionários de diferentes níveis da empresa.'),
    p('Não apenas executivos ou engenheiros, mas também soldadores, mecânicos, eletricistas e operadores de máquinas. Pessoas que dificilmente aparecem nas capas de revistas, mas que ajudaram a transformar uma ideia ambiciosa em uma das empresas mais valiosas do mundo.'),
    p('Segundo estimativas, o IPO transformou cerca de <strong>4.400 funcionários em milionários</strong>. Centenas deles ultrapassaram a marca dos US$ 100 milhões. Tudo isso porque possuíam uma pequena fração do negócio que ajudavam a construir.'),
  ].join('\n');

  // Imagem inline após parágrafo 13
  const img = imgBlock(imgUrl);

  // Paragrafos após a imagem
  const after = [
    p('Essa talvez seja uma das ideias mais poderosas do capitalismo moderno.'),
    p('O salário remunera o trabalho. Um aumento melhora o padrão de vida. Um bônus ajuda em objetivos específicos. Mas a participação em um negócio bem-sucedido é algo diferente. Ela permite que você se beneficie não apenas do seu esforço individual, mas também do crescimento de toda a organização.'),
    p('Foi assim com os funcionários da SpaceX. Foi assim com inúmeros colaboradores de empresas como Google, Microsoft e Amazon. E, em escala diferente, é exatamente o que acontece com investidores que acumulam participação em bons negócios ao longo do tempo.'),
    p('No fim das contas, a história não é sobre foguetes.'),
    p('Nem sobre Elon Musk.'),
    p('É sobre um soldador, um mecânico e um eletricista que passaram anos construindo uma empresa.'),
    p('E um dia descobriram que também estavam construindo sua própria riqueza.'),
  ].join('\n');

  return before + '\n' + img + '\n' + after;
}

function buildHtml(imgUrl) {
  return TEMPLATE
    .replace(/\{\{email_subject\}\}/g,    SUBJECT)
    .replace(/\{\{email_preheader\}\}/g,  PREHEADER)
    .replace(/\{\{email_corpo\}\}/g,      buildCorpo(imgUrl))
    .replace(/\{\{email_assinatura\}\}/g, 'Abra&ccedil;os,<br/><strong>Bruno Perini</strong>');
}

// ── SFMC helpers ───────────────────────────────────────────────────────────────
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
  const b = JSON.stringify({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET, account_id: MID_BP });
  const r = await req({ hostname: SUBDOMAIN+'.auth.marketingcloudapis.com', path: '/v2/token', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, b);
  const p = JSON.parse(r.raw); if (r.status !== 200) throw new Error('Auth: '+r.raw);
  return p.access_token;
}

async function uploadImg(token) {
  const lookup = async () => {
    const s = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets?$filter=name%20eq%20'${IMG_NAME}'`, method: 'GET', headers: { 'Authorization': 'Bearer '+token } }, null);
    const sp = JSON.parse(s.raw); const it = sp.items && sp.items[0];
    if (!it) throw new Error('Imagem não encontrada no SFMC após conflito');
    return it.fileProperties && it.fileProperties.publishedURL || it.publishedURL;
  };
  const b64 = fs.readFileSync(IMG_FILE).toString('base64');
  const payload = JSON.stringify({ name: IMG_NAME, assetType: { name: 'png', id: 28 }, file: b64, category: { id: CAT_IMG } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: '/asset/v1/content/assets', method: 'POST', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length } }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 201 || r.status === 200) return p.fileProperties && p.fileProperties.publishedURL || p.publishedURL;
  if (p.errorcode === 118039 || p.errorcode === 10006 || (p.message||'').toLowerCase().includes('unique')) return lookup();
  throw new Error('Img upload: '+JSON.stringify(p).slice(0,300));
}

async function postAsset(token, name, html) {
  const payload = JSON.stringify({ name, assetType: { name: 'htmlemail', id: 208 }, views: { html: { content: html }, subjectline: { content: SUBJECT } }, category: { id: CAT_EMAIL } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: '/asset/v1/content/assets', method: 'POST', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length } }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 201 || r.status === 200) return { assetId: p.id, customerKey: p.customerKey };
  if (p.errorcode === 118039 || p.errorcode === 10006 || (p.message||'').toLowerCase().includes('unique')) {
    const s = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets?$filter=name%20eq%20'${encodeURIComponent(name)}'`, method: 'GET', headers: { 'Authorization': 'Bearer '+token } }, null);
    const sp = JSON.parse(s.raw); const ex = sp.items && sp.items[0];
    if (!ex) throw new Error('Existente não achado: '+name);
    return { assetId: ex.id, customerKey: ex.customerKey, existing: true };
  }
  throw new Error(`POST (${r.status}): ${JSON.stringify(p).slice(0,400)}`);
}

async function getEsId(token, assetId) {
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets/${assetId}`, method: 'GET', headers: { 'Authorization': 'Bearer '+token } }, null);
  const p = JSON.parse(r.raw);
  return { esId: p.legacyData && p.legacyData.legacyId ? String(p.legacyData.legacyId) : null, customerKey: p.customerKey };
}

async function putAsset(token, assetId, customerKey, finalName, html) {
  const payload = JSON.stringify({ id: assetId, customerKey, name: finalName, assetType: { name: 'htmlemail', id: 208 }, views: { html: { content: html }, subjectline: { content: SUBJECT } }, category: { id: CAT_EMAIL } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets/${assetId}`, method: 'PUT', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length } }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 200 || r.status === 201) return p;
  throw new Error(`PUT (${r.status}): ${JSON.stringify(p).slice(0,400)}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n================================================');
  console.log(' Bruno Perini News — O soldador que virou milionário');
  console.log('================================================\n');

  const token = await getToken();
  console.log('✓ Token BP\n');

  process.stdout.write('Upload imagem... ');
  const imgUrl = await uploadImg(token);
  console.log('✓\n  →', imgUrl, '\n');

  const html = buildHtml(imgUrl);
  fs.writeFileSync(path.join(OUT, `${DATE}-bp-news-soldador.html`), html, 'utf8');

  const tempName = 'BP-NEWS-SOLDADOR-MILIONARIO-TEMP';
  process.stdout.write(`POST "${tempName}"... `);
  const { assetId, customerKey: ck0, existing } = await postAsset(token, tempName, html);
  console.log(`CB: ${assetId}${existing ? ' (existente)' : ' ✓'}`);

  process.stdout.write('ES ID... ');
  const { esId, customerKey } = await getEsId(token, assetId);
  console.log(`ES: ${esId}`);

  const finalName = `[${TIPO}][${esId}][EML][${DATE}][BP NEWS][SOLDADOR MILIONARIO]`;
  process.stdout.write(`Rename → "${finalName}"... `);
  await putAsset(token, assetId, customerKey || ck0, finalName, html);
  console.log('✓\n');

  console.log('================================================');
  console.log(' RESULTADO');
  console.log('================================================');
  console.log(`  Subject  : ${SUBJECT}`);
  console.log(`  CB Asset : ${assetId}`);
  console.log(`  ES ID    : ${esId}`);
  console.log(`  Nome     : ${finalName}`);
  console.log(`  Preview  : email-agent/output/${DATE}-bp-news-soldador.html\n`);
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
