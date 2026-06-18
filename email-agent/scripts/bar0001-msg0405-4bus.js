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
const LINK          = 'https://r.clique.ly/88669dda4a';
const OUT           = path.join(__dirname, '../output');

// ── BU configs ────────────────────────────────────────────────────────────────
const BUS = [
  { key: 'finclass',     label: 'FINCLASS', mid: '518005767', categoryId: 275626,  template: path.join(__dirname, '../brands/finclass/templates/campanha.html'),     ampField: 'nome',       textColor: '#1a1a1a', textContent: false },
  { key: 'thiago-nigro', label: 'TN',       mid: '518006236', categoryId: 320765,  template: path.join(__dirname, '../brands/thiago-nigro/templates/campanha.html'),  ampField: 'FirstName',  textColor: '#1a1a1a', textContent: false },
  { key: 'bruno-perini', label: 'BP',       mid: '518006235', categoryId: 320764,  template: path.join(__dirname, '../brands/bruno-perini/templates/campanha.html'),  ampField: 'FirstName',  textColor: '#1a1a1a', textContent: false },
  { key: 'faculdade-hub',label: 'HUB',      mid: '518005749', categoryId: 320766,  template: path.join(__dirname, '../brands/faculdade-hub/templates/campanha.html'), ampField: 'nome',       textColor: '#000000', textContent: true  },
];

// ── AMPscript blocks ──────────────────────────────────────────────────────────
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

// ── Conteúdo dos 2 emails ─────────────────────────────────────────────────────
const EMAILS = [
  {
    num: '04',
    subject:   '🔴 Estamos ao vivo agora — entra na transmissão!',
    preheader: 'O Fabio Baroni está ao vivo agora tirando dúvidas sobre o Combão',
    ctaTxt:    'ENTRAR NA LIVE AGORA',
    corpo: (textColor) => {
      function p(t) { return `<p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:${textColor};line-height:1.8;">${t}</p>`; }
      return [
        p('%%=v(@line)=%%'),
        p('&#128308; <strong>ESTAMOS AO VIVO</strong>'),
        p('&#127897;&#65039; O Fabio Baroni está ao vivo agora para tirar todas as suas dúvidas sobre o Combão Grupo Primo + AGF.'),
        p('&#128071; Acesse pelo botão abaixo e entra na transmissão agora:'),
      ].join('\n');
    },
    textContent: `🔴 ESTAMOS AO VIVO

🎙️ O Fabio Baroni está ao vivo agora para tirar todas as suas dúvidas sobre o Combão Grupo Primo + AGF.

👇 Acesse pelo link abaixo e entra na transmissão agora:
${LINK}

---
%%Member_Busname%% %%Member_Addr%%, %%Member_City%%, %%Member_State%%, %%Member_PostalCode%% %%Member_Country%%
%%=CloudPagesURL(31, 'email', emailaddr, 'jobID', jobid, 'emailName', emailname_)=%%
%%profile_center_url%%`,
  },
  {
    num: '05',
    subject:   '👀 A live está rolando — onde você está?',
    preheader: 'O Fabio Baroni já está ao vivo e as dúvidas já estão rolando',
    ctaTxt:    'ENTRAR AGORA',
    corpo: (textColor) => {
      function p(t) { return `<p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:${textColor};line-height:1.8;">${t}</p>`; }
      return [
        p('%%=v(@line)=%%'),
        p('&#128064; <strong>Cadê você?</strong>'),
        p('&#128308; O Fabio Baroni já está ao vivo e as dúvidas já estão rolando.'),
        p('&#9888;&#65039; Essa é a sua chance de resolver tudo antes de tomar sua decisão sobre o Legado — e a Live não fica gravada por muito tempo.'),
        p('&#128071; Entre agora pelo botão abaixo:'),
      ].join('\n');
    },
    textContent: `👀 A live está rolando — onde você está?

🔴 O Fabio Baroni já está ao vivo e as dúvidas já estão rolando.

⚠️ Essa é a sua chance de resolver tudo antes de tomar sua decisão sobre o Legado — e a Live não fica gravada por muito tempo.

👇 Entre agora pelo link abaixo:
${LINK}

---
%%Member_Busname%% %%Member_Addr%%, %%Member_City%%, %%Member_State%%, %%Member_PostalCode%% %%Member_Country%%
%%=CloudPagesURL(31, 'email', emailaddr, 'jobID', jobid, 'emailName', emailname_)=%%
%%profile_center_url%%`,
  },
];

// ── Build HTML ────────────────────────────────────────────────────────────────
function buildHtml(bu, email) {
  const tmpl = fs.readFileSync(bu.template, 'utf8');
  const amp  = bu.ampField === 'nome' ? ampNome() : ampFirstName();
  const corpo = email.corpo(bu.textColor);

  let html = tmpl
    .replace(/\{\{email_subject\}\}/g,    email.subject)
    .replace(/\{\{email_preheader\}\}/g,  email.preheader)
    .replace(/\{\{email_hero_html\}\}/g,  '')
    .replace(/\{\{email_corpo\}\}/g,      corpo)
    .replace(/\{\{email_cta_texto\}\}/g,  email.ctaTxt)
    .replace(/\{\{email_cta_url\}\}/g,    LINK)
    .replace(/\{\{email_assinatura\}\}/g, 'Abra&ccedil;os!');

  html = html.replace('<!-- Preheader oculto -->', amp + '\n\n  <!-- Preheader oculto -->');

  if (/%%FirstName%%/i.test(html) && bu.key === 'faculdade-hub') {
    throw new Error('ABORTADO: %%FirstName%% no HTML Hub!');
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
  const p = JSON.parse(r.raw); if (r.status !== 200) throw new Error('Auth: '+r.raw);
  return p.access_token;
}

async function postAsset(token, name, html, subject, categoryId, textContent) {
  const views = { html: { content: html }, subjectline: { content: subject } };
  if (textContent) views.text = { content: textContent };
  const payload = JSON.stringify({ name, assetType: { name: 'htmlemail', id: 208 }, views, category: { id: categoryId } });
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

async function putAsset(token, assetId, customerKey, finalName, html, subject, categoryId, textContent) {
  const views = { html: { content: html }, subjectline: { content: subject } };
  if (textContent) views.text = { content: textContent };
  const payload = JSON.stringify({ id: assetId, customerKey, name: finalName, assetType: { name: 'htmlemail', id: 208 }, views, category: { id: categoryId } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets/${assetId}`, method: 'PUT', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length } }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 200 || r.status === 201) return p;
  throw new Error(`PUT (${r.status}): ${JSON.stringify(p).slice(0,400)}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n================================================');
  console.log(` BAR0001 MSG 04 + MSG 05 — 4 BUs (${BUS.length * EMAILS.length} emails)`);
  console.log('================================================\n');
  console.log(`  Link CTA: ${LINK}\n`);

  const results = [];

  for (const email of EMAILS) {
    console.log(`══ MSG ${email.num}: "${email.subject}"`);

    for (const bu of BUS) {
      process.stdout.write(`  ${bu.label}... `);
      const html  = buildHtml(bu, email);
      const fname = `${DATE}-bar0001-msg${email.num}-${bu.key}.html`;
      fs.writeFileSync(path.join(OUT, fname), html, 'utf8');

      const token     = await getToken(bu.mid);
      const tempName  = `BAR0001-MSG${email.num}-${bu.label}-TEMP`;
      const textArg   = bu.textContent ? email.textContent : null;
      const { assetId, customerKey: ck0, existing } = await postAsset(token, tempName, html, email.subject, bu.categoryId, textArg);
      const { esId, customerKey } = await getEsId(token, assetId);
      const finalName = `[${TIPO}][${esId}][EML][${DATE}][${CAMPAIGN}][MSG ${email.num} ${bu.label}]`;
      await putAsset(token, assetId, customerKey || ck0, finalName, html, email.subject, bu.categoryId, textArg);

      console.log(`CB: ${assetId} | ES: ${esId}${existing ? ' (existente)' : ''}`);
      results.push({ msg: email.num, bu: bu.label, assetId, esId, name: finalName });
    }
    console.log('');
  }

  console.log('================================================');
  console.log(' RESULTADO FINAL');
  console.log('================================================');
  for (const r of results) {
    console.log(`  MSG ${r.msg} ${r.bu.padEnd(10)} CB: ${r.assetId}  ES: ${r.esId}`);
    console.log(`    ${r.name}`);
  }
  console.log('');
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
