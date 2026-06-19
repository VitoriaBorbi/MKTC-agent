#!/usr/bin/env node
'use strict';
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUBDOMAIN     = 'mcn29v1t3hsj32w921hh7z9yz2xm';
const CLIENT_ID     = 'xrttn26q5nobbq3ty5vsthgw';
const CLIENT_SECRET = 'kd2cmIW3Gufk00wfB7pIXjvu';
const MID_TN        = '518006236';
const CAT_EMAIL     = 320765;
const CAT_IMG       = 320780;
const DATE          = '20260617';
const TIPO          = 'AQU';
const CAMPAIGN      = 'BAR0001';

const TEMPLATE  = fs.readFileSync(path.join(__dirname, '../brands/thiago-nigro/templates/campanha.html'), 'utf8');
const IMG_FILE  = 'C:/Users/vitoria.esteves/AppData/Local/Temp/docx_work/media3/image1.png';
const IMG_NAME  = 'TN-BAR0001-20260617-live-aovivo';
const OUT       = path.join(__dirname, '../output');

// ── Email definitions ─────────────────────────────────────────────────────────
const EMAILS = [
  {
    key:        'EMAIL01-HOTGERAL',
    subject:    'Hoje às 18h — Live tira dúvidas sobre o Legado',
    preheader:  'O Fabio Baroni responde tudo ao vivo',
    ctaUrl:     'https://r.clique.ly/8e984b0e73',
    ctaText:    'Quero saber mais sobre o Legado',
    hasHero:    false,
    label:      'LIVENOTIF HOTGERAL TN',
  },
  {
    key:        'EMAIL01-HOTCLIENTES',
    subject:    'Hoje às 18h — Live tira dúvidas sobre o Legado',
    preheader:  'O Fabio Baroni responde tudo ao vivo',
    ctaUrl:     'https://r.clique.ly/1486118e9d',
    ctaText:    'Quero saber mais sobre o Legado',
    hasHero:    false,
    label:      'LIVENOTIF HOTCLIENTES TN',
  },
  {
    key:        'EMAIL02-HOTGERAL',
    subject:    '🔴 Estamos ao vivo agora',
    preheader:  'Live Tira dúvidas sobre o Legado',
    ctaUrl:     'https://r.clique.ly/b0811ab58b',
    ctaText:    'ASSISTIR AO VIVO',
    hasHero:    true,
    label:      'AOVIVO HOTGERAL TN',
  },
  {
    key:        'EMAIL02-HOTCLIENTES',
    subject:    '🔴 Estamos ao vivo agora',
    preheader:  'Live Tira dúvidas sobre o Legado',
    ctaUrl:     'https://r.clique.ly/d47f48a4f1',
    ctaText:    'ASSISTIR AO VIVO',
    hasHero:    true,
    label:      'AOVIVO HOTCLIENTES TN',
  },
];

// ── AMPscript ────────────────────────────────────────────────────────────────
const AMP_BLOCK = `<!--
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

// ── Corpo builders ────────────────────────────────────────────────────────────
function p(t) {
  return `<p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.8;">${t}</p>`;
}

function corpo01() {
  return [
    p('%%=v(@line)=%%'),
    p('Hoje &agrave;s 18h tem um encontro ao vivo.'),
    p('O <strong>Fabio Baroni</strong>, s&oacute;cio do AGF, vai estar na frente da c&acirc;mera para tirar todas as suas d&uacute;vidas sobre o <strong>Comb&atilde;o Grupo Primo + AGF</strong> &mdash; os 16 produtos, as condi&ccedil;&otilde;es de entrada e tudo o que voc&ecirc; precisa saber antes de tomar sua decis&atilde;o.'),
    p('MBA do Barsi, 2 anos de carteiras recomendadas dos dois grupos, os maiores treinamentos do Nigro e do Perini, qualquer d&uacute;vida que voc&ecirc; ainda tiver, esse &eacute; o momento de resolver.'),
    p('<strong>Marque no seu alarme: hoje &agrave;s 18h.</strong>'),
    p('O link de acesso ser&aacute; enviado no grupo do telegram e tamb&eacute;m no seu WhatsApp.'),
  ].join('\n');
}

function corpo02() {
  return [
    p('%%=v(@line)=%%'),
    p('O <strong>F&aacute;bio Baroni</strong> acabou de entrar ao vivo.'),
    p('Ele est&aacute; agora tirando d&uacute;vidas ao vivo sobre o <strong>Comb&atilde;o Grupo Primo + AGF</strong>: os 16 produtos, as condi&ccedil;&otilde;es de entrada e tudo o que voc&ecirc; precisa saber para tomar sua decis&atilde;o.'),
    p('Entre na live agora pelo bot&atilde;o abaixo.'),
  ].join('\n');
}

function buildHero(imgUrl) {
  return `<tr>
      <td align="center" style="padding:0;background-color:#0f0f0f;" bgcolor="#0f0f0f">
        <img src="${imgUrl}" alt="O Legado — Grupo Primo + AGF — Estamos ao vivo" width="600" height="auto"
             border="0" class="hero-img" style="display:block;width:100%;max-width:600px;height:auto;" />
      </td>
    </tr>`;
}

function buildHtml(email, imgUrl) {
  const corpo = email.key.startsWith('EMAIL01') ? corpo01() : corpo02();
  const hero  = email.hasHero ? buildHero(imgUrl) : '';

  let html = TEMPLATE
    .replace(/\{\{email_subject\}\}/g,    () => email.subject)
    .replace(/\{\{email_preheader\}\}/g,  () => email.preheader)
    .replace(/\{\{email_hero_html\}\}/g,  () => hero)
    .replace(/\{\{email_corpo\}\}/g,      () => corpo)
    .replace(/\{\{email_cta_url\}\}/g,    () => email.ctaUrl)
    .replace(/\{\{email_cta_texto\}\}/g,  () => email.ctaText)
    .replace(/\{\{email_assinatura\}\}/g, () => 'Abra&ccedil;os!');

  html = html.replace('<!-- Preheader oculto -->', () => AMP_BLOCK + '\n\n  <!-- Preheader oculto -->');
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

async function getToken() {
  const b = JSON.stringify({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET, account_id: MID_TN });
  const r = await req({ hostname: SUBDOMAIN+'.auth.marketingcloudapis.com', path: '/v2/token', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, b);
  const p = JSON.parse(r.raw); if (r.status !== 200) throw new Error('Auth: '+r.raw);
  return p.access_token;
}

async function uploadImg(token) {
  const lookup = async () => {
    const s = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets?$filter=name%20eq%20'${IMG_NAME}'`, method: 'GET', headers: { 'Authorization': 'Bearer '+token } }, null);
    const sp = JSON.parse(s.raw); const it = sp.items && sp.items[0];
    if (!it) throw new Error('Imagem não encontrada: '+IMG_NAME);
    return it.fileProperties && it.fileProperties.publishedURL || it.publishedURL;
  };
  const b64 = fs.readFileSync(IMG_FILE).toString('base64');
  const payload = JSON.stringify({ name: IMG_NAME, assetType: { name: 'png', id: 28 }, file: b64, category: { id: CAT_IMG } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: '/asset/v1/content/assets', method: 'POST', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length } }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 201 || r.status === 200) return p.fileProperties && p.fileProperties.publishedURL || p.publishedURL;
  if (p.errorcode === 118039 || p.errorcode === 10006 || (p.message||'').toLowerCase().includes('unique')) return lookup();
  throw new Error('Img: '+JSON.stringify(p).slice(0,300));
}

async function postAsset(token, name, subject, html) {
  const payload = JSON.stringify({ name, assetType: { name: 'htmlemail', id: 208 }, views: { html: { content: html }, subjectline: { content: subject } }, category: { id: CAT_EMAIL } });
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

async function putAsset(token, assetId, customerKey, name, subject, html) {
  const payload = JSON.stringify({ id: assetId, customerKey, name, assetType: { name: 'htmlemail', id: 208 }, views: { html: { content: html }, subjectline: { content: subject } }, category: { id: CAT_EMAIL } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets/${assetId}`, method: 'PUT', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length } }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 200 || r.status === 201) return p;
  throw new Error(`PUT (${r.status}): ${JSON.stringify(p).slice(0,400)}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n================================================');
  console.log(` TN BAR0001 Live — ${EMAILS.length} emails`);
  console.log('================================================\n');

  const token = await getToken();
  console.log('✓ Token Thiago Nigro\n');

  process.stdout.write('Upload imagem hero (ao vivo)... ');
  const imgUrl = await uploadImg(token);
  console.log('✓\n  →', imgUrl, '\n');

  const results = [];

  for (const email of EMAILS) {
    console.log(`─── ${email.key}`);
    const html    = buildHtml(email, imgUrl);
    const outFile = `${DATE}-tn-bar0001-${email.key.toLowerCase().replace(/-/g,'_')}.html`;
    fs.writeFileSync(path.join(OUT, outFile), html, 'utf8');

    process.stdout.write(`  POST... `);
    const { assetId, customerKey: ck0 } = await postAsset(token, `TN-BAR0001-${email.key}-TEMP`, email.subject, html);
    process.stdout.write(`CB: ${assetId} | ES... `);

    const { esId, customerKey } = await getEsId(token, assetId);
    process.stdout.write(`ES: ${esId} | Rename... `);

    const finalName = `[${TIPO}][${esId}][EML][${DATE}][${CAMPAIGN}][${email.label}]`;
    await putAsset(token, assetId, customerKey || ck0, finalName, email.subject, html);
    console.log('✓');

    results.push({ key: email.key, assetId, esId, name: finalName });
  }

  console.log('\n================================================');
  console.log(' RESULTADO FINAL');
  console.log('================================================');
  for (const r of results) {
    console.log(`\n  ${r.key}  CB: ${r.assetId}  ES: ${r.esId}`);
    console.log(`    ${r.name}`);
  }
  console.log('');
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
