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
const DATE          = '20260617';
const TIPO          = 'VND';
const CAMPAIGN      = 'BAR0001';

const TEMPLATE = fs.readFileSync(path.join(__dirname, '../brands/thiago-nigro/templates/campanha.html'), 'utf8');
const OUT = path.join(__dirname, '../output');

// ── HTML helpers ──────────────────────────────────────────────────────────────
function p(t)  { return `<p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.8;">${t}</p>`; }
function check(t) { return `<p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.6;">&#9989;&nbsp; ${t}</p>`; }

// ── Corpos ────────────────────────────────────────────────────────────────────
function corpo12() {
  return [
    p('O Thiago gravou um v&iacute;deo super importante.'),
    p('N&atilde;o &eacute; uma aula. N&atilde;o &eacute; um an&uacute;ncio. &Eacute; ele, na frente da c&acirc;mera, explicando com as pr&oacute;prias palavras porque <strong>O Legado</strong> existe, o que voc&ecirc; vai ter acesso e porque essa oferta nunca mais vai aparecer do jeito que est&aacute; agora.'),
    p('O v&iacute;deo est&aacute; no meio da p&aacute;gina da oferta. Basta clicar no bot&atilde;o desse e-mail e rolar o site para baixo at&eacute; o v&iacute;deo.'),
    p('Vale menos de 10 minutos do seu tempo para entender se <strong>O Legado</strong> faz sentido para o futuro da sua vida financeira.'),
  ].join('\n');
}

function corpo13() {
  return [
    p('%%FirstName%%,'),
    p('Olha que loucura essa lista a seguir:'),
    check('MBA do Barsi &mdash; menos de R$ 5.000'),
    check('Carteiras recomendadas pelos Grupos Primo e AGF por 2 anos &mdash; 0 Reais'),
    check('Do Mil ao Milh&atilde;o &mdash; 0 Reais'),
    check('Viver de Renda &mdash; 0 Reais'),
    check('Jeito Barsi de Investir &mdash; 0 Reais'),
    check('Investidor em 33 Dias &mdash; 0 Reais'),
    check('Outras Mentorias, document&aacute;rios e outros acessos dos dois grupos &mdash; 0 Reais'),
    `<p style="margin:18px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.8;">&nbsp;</p>`,
    p('O MBA Value Investing do Luiz Barsi custa, fora dessa campanha, R$ 12.000.'),
    p('Ele nunca entrou em nenhum pacote. Nunca esteve em combo. Nunca saiu por menos do que foi lan&ccedil;ado.'),
    p('S&oacute; que dentro do <strong>Legado</strong>, ele entra por menos de R$ 5.000. E todos os outros produtos sa&iacute;em <strong>DE GRA&Ccedil;A</strong>!'),
    p('N&atilde;o existe outro lugar no mercado onde voc&ecirc; acessa esse n&iacute;vel de conte&uacute;do, acesso e ferramentas por esse valor. E depois que essa campanha fechar, o MBA volta para os R$ 12.000 e cada produto volta ao seu pre&ccedil;o original.'),
    p('Finalize sua inscri&ccedil;&atilde;o no Legado pelo bot&atilde;o abaixo:'),
  ].join('\n');
}

function corpo14() {
  return [
    p('%%FirstName%%,'),
    p('Voc&ecirc; merece honestidade mais do que uma boa frase de efeito.'),
    p('<strong>O Legado n&atilde;o vai se repetir.</strong>'),
    p('N&atilde;o &eacute; uma estrat&eacute;gia de marketing para acelerar sua decis&atilde;o. &Eacute; a realidade de como essa campanha nasceu.'),
    p('Pela primeira vez na hist&oacute;ria, Thiago Nigro, Bruno Perini, Luiz Barsi e Louise Barsi se alinharam para reunir o que cada um construiu em d&eacute;cadas em uma &uacute;nica oferta, com um &uacute;nico pre&ccedil;o.'),
    p('Esse tipo de alinhamento n&atilde;o acontece por acidente. E n&atilde;o acontece duas vezes.'),
    p('Quando essa janela fechar, o MBA Value Investing volta a custar R$ 12.000 sozinho.'),
    p('O Do Mil ao Milh&atilde;o, o Viver de Renda, o Jeito Barsi de Investir &mdash; cada um volta ao seu valor de mercado.'),
    p('As carteiras recomendadas dos dois grupos voltam a ser assinaturas separadas.'),
    p('<strong>O Legado ainda est&aacute; aberto. Mas n&atilde;o por muito tempo.</strong>'),
    p('Clique no bot&atilde;o abaixo e fa&ccedil;a sua inscri&ccedil;&atilde;o agora.'),
  ].join('\n');
}

// ── Definição dos 6 emails (3 copies × 2 bases) ───────────────────────────────
// ATENÇÃO: links bs_geral / bs_clientes por email — nunca cruzar
const EMAILS = [
  {
    num: 12, base: 'HOTLIST GERAL',    link: 'https://r.clique.ly/1dcbbd4f2f',
    subject: 'O Thiago gravou um vídeo sobre o Legado',
    preheader: 'Esse vídeo vai mudar o que você pensa sobre a oferta',
    ctaTxt: 'Assistir ao vídeo',
    corpo: corpo12,
  },
  {
    num: 12, base: 'HOTLIST CLIENTES', link: 'https://r.clique.ly/eb417a1b80',
    subject: 'O Thiago gravou um vídeo sobre o Legado',
    preheader: 'Esse vídeo vai mudar o que você pensa sobre a oferta',
    ctaTxt: 'Assistir ao vídeo',
    corpo: corpo12,
  },
  {
    num: 13, base: 'HOTLIST GERAL',    link: 'https://r.clique.ly/f8e1a3981f',
    subject: 'Essa é a receita para seu sucesso financeiro',
    preheader: 'Carteiras recomendadas + Do Mil ao Milhão e Viver de Renda = Free',
    ctaTxt: 'Concluir minha inscrição',
    corpo: corpo13,
  },
  {
    num: 13, base: 'HOTLIST CLIENTES', link: 'https://r.clique.ly/1050a39e57',
    subject: 'Essa é a receita para seu sucesso financeiro',
    preheader: 'Carteiras recomendadas + Do Mil ao Milhão e Viver de Renda = Free',
    ctaTxt: 'Concluir minha inscrição',
    corpo: corpo13,
  },
  {
    num: 14, base: 'HOTLIST GERAL',    link: 'https://r.clique.ly/c41e4196bd',
    subject: 'Isso nunca mais vai acontecer',
    preheader: 'Porque O Legado não se repete',
    ctaTxt: 'REALIZAR MINHA INSCRIÇÃO',
    corpo: corpo14,
  },
  {
    num: 14, base: 'HOTLIST CLIENTES', link: 'https://r.clique.ly/d0049b5160',
    subject: 'Isso nunca mais vai acontecer',
    preheader: 'Porque O Legado não se repete',
    ctaTxt: 'REALIZAR MINHA INSCRIÇÃO',
    corpo: corpo14,
  },
];

function buildHtml(email) {
  return TEMPLATE
    .replace(/\{\{email_subject\}\}/g,    email.subject)
    .replace(/\{\{email_preheader\}\}/g,  email.preheader)
    .replace(/\{\{email_hero_html\}\}/g,  '')
    .replace(/\{\{email_corpo\}\}/g,      email.corpo())
    .replace(/\{\{email_cta_texto\}\}/g,  email.ctaTxt)
    .replace(/\{\{email_cta_url\}\}/g,    email.link)
    .replace(/\{\{email_assinatura\}\}/g, 'Abra&ccedil;os!');
}

// ── SFMC ──────────────────────────────────────────────────────────────────────
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

async function postAsset(token, name, subject, html) {
  const payload = JSON.stringify({ name, assetType: { name: 'htmlemail', id: 208 }, views: { html: { content: html }, subjectline: { content: subject } }, category: { id: CAT_CAMP } });
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
  throw new Error(`POST (${r.status}): ${JSON.stringify(p).slice(0,300)}`);
}

async function getEsId(token, assetId) {
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets/${assetId}`, method: 'GET', headers: { 'Authorization': 'Bearer '+token } }, null);
  const p = JSON.parse(r.raw);
  return { esId: p.legacyData && p.legacyData.legacyId ? String(p.legacyData.legacyId) : null, customerKey: p.customerKey };
}

async function putAsset(token, assetId, customerKey, name, subject, html) {
  const payload = JSON.stringify({ id: assetId, customerKey, name, assetType: { name: 'htmlemail', id: 208 }, views: { html: { content: html }, subjectline: { content: subject } }, category: { id: CAT_CAMP } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets/${assetId}`, method: 'PUT', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length } }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 200 || r.status === 201) return p;
  throw new Error(`PUT (${r.status}): ${JSON.stringify(p).slice(0,300)}`);
}

async function main() {
  console.log('\n==============================================');
  console.log(' BAR0001 TN — 6 emails (3 copies × 2 bases)');
  console.log('==============================================');
  console.log('\n  MAPA DE LINKS:');
  for (const e of EMAILS) {
    console.log(`  Email ${e.num} ${e.base.padEnd(18)} → ${e.link}`);
  }
  console.log('');

  const token = await getToken();
  console.log('✓ Token TN BU\n');

  const results = [];

  for (const email of EMAILS) {
    const html = buildHtml(email);
    const slug = `bar0001-tn-email${email.num}-${email.base.toLowerCase().replace(/ /g,'-')}`;
    fs.writeFileSync(path.join(OUT, `2026-06-17-${slug}.html`), html, 'utf8');

    const tempName = `BAR0001-TN-EMAIL${email.num}-${email.base.replace(/ /g,'-')}-TEMP`;
    console.log(`── Email ${email.num} ${email.base}  →  ${email.link}`);
    process.stdout.write(`   POST "${tempName}"... `);
    const { assetId, customerKey: ck0, existing } = await postAsset(token, tempName, email.subject, html);
    console.log(`CB: ${assetId}${existing ? ' (existente)' : ' ✓'}`);

    process.stdout.write(`   ES ID... `);
    const { esId, customerKey } = await getEsId(token, assetId);
    console.log(`ES: ${esId}`);

    const finalName = `[${TIPO}][${esId}][EML][${DATE}][${CAMPAIGN}][EMAIL ${email.num} ${email.base}]`;
    process.stdout.write(`   Rename → "${finalName}"... `);
    await putAsset(token, assetId, customerKey || ck0, finalName, email.subject, html);
    console.log('✓\n');

    results.push({ num: email.num, base: email.base, link: email.link, subject: email.subject, assetId, esId, name: finalName });
  }

  console.log('==============================================');
  console.log(' RESUMO FINAL');
  console.log('==============================================');
  for (const r of results) {
    console.log(`\n  Email ${r.num} — ${r.base}`);
    console.log(`    Subject  : ${r.subject}`);
    console.log(`    Link CTA : ${r.link}`);
    console.log(`    CB Asset : ${r.assetId}`);
    console.log(`    ES ID    : ${r.esId}`);
    console.log(`    Nome     : ${r.name}`);
  }
  console.log('');
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
