#!/usr/bin/env node
'use strict';
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUBDOMAIN     = 'mcn29v1t3hsj32w921hh7z9yz2xm';
const CLIENT_ID     = 'xrttn26q5nobbq3ty5vsthgw';
const CLIENT_SECRET = 'kd2cmIW3Gufk00wfB7pIXjvu';
const DATE          = '20260617';
const TIPO          = 'VND';
const CAMPAIGN      = 'BAR0001';
const OUT           = path.join(__dirname, '../output');

const SUBJECT   = 'Hoje às 18h — Live tira dúvidas sobre o Legado';
const PREHEADER = 'O Fabio Baroni responde tudo ao vivo';

// ── BU configs ────────────────────────────────────────────────────────────────
const BUS = [
  {
    key: 'finclass',
    label: 'FINCLASS',
    mid: '518005767',
    categoryId: 275626,
    template: path.join(__dirname, '../brands/finclass/templates/campanha.html'),
    ampField: 'nome',       // AttributeValue("nome")
    textColor: '#1a1a1a',
    textContent: false,
  },
  {
    key: 'thiago-nigro',
    label: 'TN',
    mid: '518006236',
    categoryId: 320765,
    template: path.join(__dirname, '../brands/thiago-nigro/templates/campanha.html'),
    ampField: 'FirstName',
    textColor: '#1a1a1a',
    textContent: false,
  },
  {
    key: 'bruno-perini',
    label: 'BP',
    mid: '518006235',
    categoryId: 320764,
    template: path.join(__dirname, '../brands/bruno-perini/templates/campanha.html'),
    ampField: 'FirstName',
    textColor: '#1a1a1a',
    textContent: false,
  },
  {
    key: 'faculdade-hub',
    label: 'HUB',
    mid: '518005749',
    categoryId: 320766,
    template: path.join(__dirname, '../brands/faculdade-hub/templates/campanha.html'),
    ampField: 'nome',
    textColor: '#000000',
    textContent: true,      // Hub SEMPRE exige views.text.content (CAN-SPAM)
  },
];

// ── AMPscript blocks ──────────────────────────────────────────────────────────
// Injetados antes do <!-- Preheader oculto --> — SEMPRE dentro de <!-- -->

function ampNome() {
  return `<!--
%%[
  set @nome = AttributeValue("nome")
  if empty(@nome) or @nome == "no" or @nome == "." or RegExMatch(@nome, "[0-9]", 0) > 0 then
    set @line = ""
  else
    set @firstName = @nome
    if indexOf(@nome, "@") > 0 then
      set @firstName = ""
    else
      if indexOf(@nome, " ") > 0 then
        set @firstName = Substring(@nome, 1, Subtract(IndexOf(@nome, " "), 1))
      endif
    endif
    if @firstName == "" then
      set @line = ""
    else
      set @line = concat(Propercase(@firstName), ",")
    endif
  endif
]%%
-->`;
}

function ampFirstName() {
  return `<!--
%%[
  set @fn = AttributeValue("FirstName")
  if empty(@fn) or @fn == "no" or @fn == "." or RegExMatch(@fn, "[0-9]", 0) > 0 then
    set @line = ""
  else
    if indexOf(@fn, " ") > 0 then
      set @firstName = Substring(@fn, 1, Subtract(IndexOf(@fn, " "), 1))
    else
      set @firstName = @fn
    endif
    set @line = concat(Propercase(@firstName), ",")
  endif
]%%
-->`;
}

// ── Corpo HTML ────────────────────────────────────────────────────────────────
function buildCorpo(textColor) {
  function p(t) { return `<p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:${textColor};line-height:1.8;">${t}</p>`; }
  return [
    p('%%=v(@line)=%%'),
    p('Hoje às 18h tem um encontro ao vivo.'),
    p('O Fabio Baroni, sócio do AGF, vai estar na frente da câmera para tirar todas as suas dúvidas sobre o Combão Grupo Primo + AGF — os 16 produtos, as condições de entrada e tudo o que você precisa saber antes de tomar sua decisão.'),
    p('MBA do Barsi, 2 anos de carteiras recomendadas dos dois grupos, os maiores treinamentos do Nigro e do Perini, qualquer dúvida que você ainda tiver, esse é o momento de resolver.'),
    p('Marque no seu alarme: <strong>hoje às 18h.</strong>'),
    p('O link de acesso será enviado no grupo do telegram e também no seu WhatsApp.'),
  ].join('\n');
}

// ── Plain-text Hub (obrigatório CAN-SPAM) ────────────────────────────────────
const HUB_TEXT_CONTENT = `Hoje às 18h — Live tira dúvidas sobre o Legado

O Fabio Baroni responde tudo ao vivo.

Hoje às 18h tem um encontro ao vivo.

O Fabio Baroni, sócio do AGF, vai estar na frente da câmera para tirar todas as suas dúvidas sobre o Combão Grupo Primo + AGF — os 16 produtos, as condições de entrada e tudo o que você precisa saber antes de tomar sua decisão.

MBA do Barsi, 2 anos de carteiras recomendadas dos dois grupos, os maiores treinamentos do Nigro e do Perini, qualquer dúvida que você ainda tiver, esse é o momento de resolver.

Marque no seu alarme: hoje às 18h.

O link de acesso será enviado no grupo do telegram e também no seu WhatsApp.

Abraços!

---
Atualizar perfil: %%profile_center_url%%
Cancelar inscrição: %%=CloudPagesURL(31, 'email', emailaddr, 'jobID', jobid, 'emailName', emailname_)=%%

%%Member_Busname%% %%Member_Addr%%, %%Member_City%%, %%Member_State%%, %%Member_PostalCode%% %%Member_Country%%`;

// ── Build HTML ────────────────────────────────────────────────────────────────
function buildHtml(bu) {
  const tmpl = fs.readFileSync(bu.template, 'utf8');
  const amp   = bu.ampField === 'nome' ? ampNome() : ampFirstName();
  const corpo = buildCorpo(bu.textColor);

  let html = tmpl
    .replace(/\{\{email_subject\}\}/g,    SUBJECT)
    .replace(/\{\{email_preheader\}\}/g,  PREHEADER)
    .replace(/\{\{email_hero_html\}\}/g,  '')
    .replace(/\{\{email_corpo\}\}/g,      corpo)
    .replace(/\{\{email_cta_texto\}\}/g,  '')
    .replace(/\{\{email_cta_url\}\}/g,    '#')
    .replace(/\{\{email_assinatura\}\}/g, 'Abra&ccedil;os!');

  // Remover bloco CTA (sem botão neste email)
  if (html.includes('<!-- CTA PRINCIPAL -->')) {
    const ctaIdx = html.indexOf('<!-- CTA PRINCIPAL -->');
    const sigIdx = html.indexOf('<!-- Assinatura', ctaIdx);
    if (sigIdx > ctaIdx) html = html.slice(0, ctaIdx) + html.slice(sigIdx);
  }

  // Injetar AMPscript antes do preheader oculto
  html = html.replace('<!-- Preheader oculto -->', amp + '\n\n  <!-- Preheader oculto -->');

  // Checklist de segurança
  if (/%%FirstName%%/i.test(html) && bu.key === 'faculdade-hub') {
    throw new Error('ABORTADO: %%FirstName%% encontrado no HTML Hub!');
  }

  return html;
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

async function getToken(mid) {
  const b = JSON.stringify({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET, account_id: mid });
  const r = await req({ hostname: SUBDOMAIN+'.auth.marketingcloudapis.com', path: '/v2/token', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, b);
  const p = JSON.parse(r.raw); if (r.status !== 200) throw new Error('Auth ('+mid+'): '+r.raw);
  return p.access_token;
}

async function postAsset(token, name, html, categoryId, textContent) {
  const views = {
    html:        { content: html },
    subjectline: { content: SUBJECT },
  };
  if (textContent) views.text = { content: textContent };

  const payload = JSON.stringify({ name, assetType: { name: 'htmlemail', id: 208 }, views, category: { id: categoryId } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({
    hostname: SUBDOMAIN+'.rest.marketingcloudapis.com',
    path: '/asset/v1/content/assets', method: 'POST',
    headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length }
  }, buf);
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

async function putAsset(token, assetId, customerKey, finalName, html, categoryId, textContent) {
  const views = {
    html:        { content: html },
    subjectline: { content: SUBJECT },
  };
  if (textContent) views.text = { content: textContent };

  const payload = JSON.stringify({ id: assetId, customerKey, name: finalName, assetType: { name: 'htmlemail', id: 208 }, views, category: { id: categoryId } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({
    hostname: SUBDOMAIN+'.rest.marketingcloudapis.com',
    path: `/asset/v1/content/assets/${assetId}`, method: 'PUT',
    headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length }
  }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 200 || r.status === 201) return p;
  throw new Error(`PUT ${assetId} (${r.status}): ${JSON.stringify(p).slice(0,400)}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n================================================');
  console.log(' BAR0001 Email 01 — Live Tira Dúvidas (4 BUs)');
  console.log('================================================\n');

  const results = [];

  for (const bu of BUS) {
    console.log(`─── ${bu.label}`);

    const html = buildHtml(bu);
    const fname = `2026-06-17-bar0001-email01-${bu.key}.html`;
    fs.writeFileSync(path.join(OUT, fname), html, 'utf8');

    const token = await getToken(bu.mid);
    process.stdout.write(`  ✓ Token | POST... `);

    const tempName = `BAR0001-EMAIL01-${bu.label}-TEMP`;
    const textArg  = bu.textContent ? HUB_TEXT_CONTENT : null;
    const { assetId, customerKey: ck0, existing } = await postAsset(token, tempName, html, bu.categoryId, textArg);
    process.stdout.write(`CB: ${assetId}${existing ? ' (existente)' : ' ✓'} | ES ID... `);

    const { esId, customerKey } = await getEsId(token, assetId);
    process.stdout.write(`ES: ${esId} | Rename... `);

    const finalName = `[${TIPO}][${esId}][EML][${DATE}][${CAMPAIGN}][EMAIL 01 ${bu.label}]`;
    await putAsset(token, assetId, customerKey || ck0, finalName, html, bu.categoryId, textArg);
    console.log('✓\n');

    results.push({ bu: bu.label, assetId, esId, name: finalName });
  }

  console.log('================================================');
  console.log(' RESULTADO');
  console.log('================================================');
  for (const r of results) {
    console.log(`\n  ${r.bu}`);
    console.log(`    CB Asset : ${r.assetId}`);
    console.log(`    ES ID    : ${r.esId}`);
    console.log(`    Nome     : ${r.name}`);
  }
  console.log('');
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
