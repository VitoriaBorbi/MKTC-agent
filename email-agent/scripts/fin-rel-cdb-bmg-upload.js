#!/usr/bin/env node
'use strict';
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUBDOMAIN     = 'mcn29v1t3hsj32w921hh7z9yz2xm';
const CLIENT_ID     = 'xrttn26q5nobbq3ty5vsthgw';
const CLIENT_SECRET = 'kd2cmIW3Gufk00wfB7pIXjvu';
const MID_FIN       = '518005767';
const CAT_EMAIL     = 275176;
const DATE          = '20260617';
const TIPO          = 'REL';

const TEMPLATE = fs.readFileSync(path.join(__dirname, '../brands/finclass/templates/relatorio.html'), 'utf8');
const OUT      = path.join(__dirname, '../output');

const SUBJECT   = 'Carteira de Valorização: CDB do BMG e Tesouro Reserva entram como RF pós-fixada';
const PREHEADER = 'CDB do BMG a 107% do CDI e Tesouro Reserva chegam à Carteira ARCA';
const CTA_URL   = 'https://app.finclass.com/carteira/10830e24-6830-40c1-bc23-699b060ec73e/report';
const CTA_TXT   = 'LER O RELATÓRIO';

// ── HTML helpers ──────────────────────────────────────────────────────────────
function p(t, extraStyle) {
  const base = 'margin:0 0 22px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.85;';
  return `<p style="${base}${extraStyle||''}">${t}</p>`;
}

// ── Corpo (seção "texto para e-mail" do docx) ─────────────────────────────────
const CORPO = [
  // Linha de destaque: "NOVO RELATÓRIO DISPONÍVEL"
  `<p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#00E7F9;text-transform:uppercase;letter-spacing:2px;line-height:1.4;">NOVO RELATÓRIO DISPONÍVEL</p>`,
  // Título do relatório
  `<p style="margin:0 0 28px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;color:#092F4F;line-height:1.35;">Carteira de Valorização: CDB do BMG e Tesouro Reserva</p>`,
  // Divider
  `<table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 28px 0;"><tr><td style="background-color:#E0E0E0;height:1px;font-size:0;line-height:0;">&nbsp;</td></tr></table>`,
  // Corpo do email
  p('O novo relatório já está disponível na plataforma da Finclass. Nele, detalhamos as atualizações na alocação de renda fixa pós-fixada da Carteira de Valorização ARCA.'),
  p('O material apresenta os critérios de seleção de novos emissores de CDB adotados pela equipe (liquidez diária, rating mínimo, Patrimônio Líquido e Índice de Basileia) e explica a entrada de dois novos ativos: o CDB do Banco BMG com rentabilidade de <strong>107% do CDI</strong> e o Tesouro Reserva, o novo título do Tesouro Direto lançado em 2026.'),
  p('Boa leitura!'),
].join('\n');

function buildHtml() {
  return TEMPLATE
    .replace(/\{\{email_subject\}\}/g,    SUBJECT)
    .replace(/\{\{email_preheader\}\}/g,  PREHEADER)
    .replace(/\{\{email_corpo\}\}/g,      CORPO)
    .replace(/\{\{email_cta_url\}\}/g,    CTA_URL)
    .replace(/\{\{email_cta_texto\}\}/g,  CTA_TXT);
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
  console.log(' Finclass Relatório — CDB BMG + Tesouro Reserva');
  console.log('================================================\n');

  const html = buildHtml();
  fs.writeFileSync(path.join(OUT, `${DATE}-finclass-rel-cdb-bmg-tesouro-reserva.html`), html, 'utf8');

  const token = await getToken();
  console.log('✓ Token Finclass\n');

  const tempName = 'FIN-REL-CDB-BMG-TESOURO-RESERVA-TEMP';
  process.stdout.write(`POST "${tempName}"... `);
  const { assetId, customerKey: ck0, existing } = await postAsset(token, tempName, html);
  console.log(`CB: ${assetId}${existing ? ' (existente)' : ' ✓'}`);

  process.stdout.write('ES ID... ');
  const { esId, customerKey } = await getEsId(token, assetId);
  console.log(`ES: ${esId}`);

  const finalName = `[${TIPO}][${esId}][EML][${DATE}][CART VALORIZACAO][CDB BMG TR JUN26]`;
  process.stdout.write(`Rename → "${finalName}"... `);
  await putAsset(token, assetId, customerKey || ck0, finalName, html);
  console.log('✓\n');

  console.log('================================================');
  console.log(' RESULTADO');
  console.log('================================================');
  console.log(`  Subject  : ${SUBJECT}`);
  console.log(`  CTA      : ${CTA_URL}`);
  console.log(`  CB Asset : ${assetId}`);
  console.log(`  ES ID    : ${esId}`);
  console.log(`  Nome     : ${finalName}`);
  console.log(`  Sender   : Equipe Finclass (194)`);
  console.log(`  Preview  : email-agent/output/${DATE}-finclass-rel-cdb-bmg-tesouro-reserva.html\n`);
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
