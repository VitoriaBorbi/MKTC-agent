#!/usr/bin/env node
'use strict';
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUBDOMAIN     = 'mcn29v1t3hsj32w921hh7z9yz2xm';
const CLIENT_ID     = 'xrttn26q5nobbq3ty5vsthgw';
const CLIENT_SECRET = 'kd2cmIW3Gufk00wfB7pIXjvu';
const MID_FIN       = '518005767';
const CAT_EMAIL     = 275234;  // outros/avulsos Finclass
const DATE          = '20260619';
const TIPO          = 'CAP';
const CAMPAIGN      = 'LEADGEN0009';

const TEMPLATE = fs.readFileSync(path.join(__dirname, '../brands/finclass/templates/transacional-card.html'), 'utf8');
const OUT      = path.join(__dirname, '../output');

const SUBJECT   = '🏆 Sua planilha da Copa 2030 está aqui!';
const PREHEADER = 'Descubra agora quanto guardar por mês para estar no estádio em 2030';

const CTA_URL  = 'https://download.grupo-primo.com/finclass/leadgen/copa2030_planejador_finclass.xlsx';
const CTA_TEXT = 'Baixar minha planilha agora';
const PS_URL   = 'https://finc.ly/c17217a46e';

function buildCorpo() {
  function p(t) { return `<p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.75;">${t}</p>`; }
  return [
    p('A sua <strong>Planilha da Copa 2030</strong> est&aacute; pronta para baixar. &Eacute; s&oacute; clicar no bot&atilde;o abaixo.'),
    `<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#092F4F;line-height:1.75;">Como usar a planilha:</p>`,
    `<p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:2;">` +
      `&bull;&nbsp;Escolha o seu cen&aacute;rio &mdash; s&oacute; os jogos do Brasil ou a experi&ecirc;ncia completa<br/>` +
      `&bull;&nbsp;Veja quanto voc&ecirc; precisa poupar e investir por m&ecirc;s a partir de hoje<br/>` +
      `&bull;&nbsp;Simples assim. Em menos de 5 minutos voc&ecirc; j&aacute; sabe se a meta &eacute; vi&aacute;vel e o que fazer para chegar l&aacute;.` +
    `</p>`,
    p('Uma coisa importante: a planilha mostra o poder dos juros compostos agindo a seu favor. Quanto antes voc&ecirc; come&ccedil;ar, menor o esfor&ccedil;o mensal. Quem come&ccedil;a hoje em 2026 chega em 2030 com muito mais f&ocirc;lego do que quem deixa para 2028.'),
    p('<strong>P.S.</strong> A planilha &eacute; o come&ccedil;o. Se voc&ecirc; quiser entender de verdade como fazer o dinheiro trabalhar por voc&ecirc; &mdash; em metas como essa e em tantas outras &mdash; a Finclass tem os melhores professores de finan&ccedil;as do Brasil reunidos em um s&oacute; lugar. <a href="' + PS_URL + '" style="color:#00b5c8;text-decoration:underline;">Clique aqui que te conto melhor!</a>'),
  ].join('\n');
}

function buildHtml() {
  return TEMPLATE
    .replace(/\{\{email_subject\}\}/g,      () => SUBJECT)
    .replace(/\{\{email_preheader\}\}/g,    () => PREHEADER)
    .replace(/\{\{email_card_titulo\}\}/g,  () => 'Boa escolha! Voc&ecirc; acabou de dar o primeiro passo para transformar um sonho em meta.')
    .replace(/\{\{email_corpo\}\}/g,        () => buildCorpo())
    .replace(/\{\{email_cta_url\}\}/g,      () => CTA_URL)
    .replace(/\{\{email_cta_texto\}\}/g,    () => CTA_TEXT);
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
  const b = JSON.stringify({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET, account_id: MID_FIN });
  const r = await req({ hostname: SUBDOMAIN+'.auth.marketingcloudapis.com', path: '/v2/token', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, b);
  const p = JSON.parse(r.raw); if (r.status !== 200) throw new Error('Auth: '+r.raw);
  return p.access_token;
}

async function postAsset(token, name, html) {
  const payload = JSON.stringify({ name, assetType: { name: 'htmlemail', id: 208 }, views: { html: { content: html }, subjectline: { content: SUBJECT } }, category: { id: CAT_EMAIL } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: '/asset/v1/content/assets', method: 'POST', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length } }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 201 || r.status === 200) return { assetId: p.id, customerKey: p.customerKey };
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
  console.log(' Finclass LEADGEN0009 — Welcome Email');
  console.log('================================================\n');

  const token = await getToken();
  console.log('✓ Token Finclass\n');

  const html    = buildHtml();
  const outFile = `${DATE}-fin-leadgen0009-welcome.html`;
  fs.writeFileSync(path.join(OUT, outFile), html, 'utf8');
  console.log(`✓ HTML salvo → ${outFile}\n`);

  process.stdout.write('POST asset... ');
  const { assetId, customerKey: ck0 } = await postAsset(token, `FIN-LEADGEN0009-WELCOME-TEMP`, html);
  console.log(`CB: ${assetId}`);

  process.stdout.write('GET ES ID... ');
  const { esId, customerKey } = await getEsId(token, assetId);
  console.log(`ES: ${esId}`);

  const finalName = `[${TIPO}][${esId}][EML][${DATE}][${CAMPAIGN}][WELCOME FIN]`;
  process.stdout.write(`PUT rename... `);
  await putAsset(token, assetId, customerKey || ck0, finalName, html);
  console.log('✓\n');

  console.log('================================================');
  console.log(' RESULTADO');
  console.log('================================================');
  console.log(`  Subject  : ${SUBJECT}`);
  console.log(`  CB Asset : ${assetId}`);
  console.log(`  ES ID    : ${esId}`);
  console.log(`  Nome     : ${finalName}`);
  console.log(`  Preview  : email-agent/output/${outFile}\n`);
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
