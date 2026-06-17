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

const AMPSCRIPT_FIRSTNAME = `<!--
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

function p(t) { return `<p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.8;">${t}</p>`; }
function check(t) { return `<p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.6;">&#9989;&nbsp; ${t}</p>`; }

function corpo13() {
  return [
    p('%%=v(@line)=%%'),
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
    p('%%=v(@line)=%%'),
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

const ASSETS = [
  { assetId: 41315, esId: '31912', base: 'HOTLIST GERAL',    num: 13, link: 'https://r.clique.ly/f8e1a3981f', subject: 'Essa é a receita para seu sucesso financeiro',  preheader: 'Carteiras recomendadas + Do Mil ao Milhão e Viver de Renda = Free', ctaTxt: 'Concluir minha inscri&ccedil;&atilde;o', corpo: corpo13 },
  { assetId: 41316, esId: '31913', base: 'HOTLIST CLIENTES', num: 13, link: 'https://r.clique.ly/1050a39e57', subject: 'Essa é a receita para seu sucesso financeiro',  preheader: 'Carteiras recomendadas + Do Mil ao Milhão e Viver de Renda = Free', ctaTxt: 'Concluir minha inscri&ccedil;&atilde;o', corpo: corpo13 },
  { assetId: 41317, esId: '31914', base: 'HOTLIST GERAL',    num: 14, link: 'https://r.clique.ly/c41e4196bd', subject: 'Isso nunca mais vai acontecer',                  preheader: 'Porque O Legado não se repete',                                     ctaTxt: 'REALIZAR MINHA INSCRI&Ccedil;&Atilde;O', corpo: corpo14 },
  { assetId: 41318, esId: '31915', base: 'HOTLIST CLIENTES', num: 14, link: 'https://r.clique.ly/d0049b5160', subject: 'Isso nunca mais vai acontecer',                  preheader: 'Porque O Legado não se repete',                                     ctaTxt: 'REALIZAR MINHA INSCRI&Ccedil;&Atilde;O', corpo: corpo14 },
];

function buildHtml(a) {
  const html = TEMPLATE
    .replace(/\{\{email_subject\}\}/g,    a.subject)
    .replace(/\{\{email_preheader\}\}/g,  a.preheader)
    .replace(/\{\{email_hero_html\}\}/g,  '')
    .replace(/\{\{email_corpo\}\}/g,      a.corpo())
    .replace(/\{\{email_cta_texto\}\}/g,  a.ctaTxt)
    .replace(/\{\{email_cta_url\}\}/g,    a.link)
    .replace(/\{\{email_assinatura\}\}/g, 'Abra&ccedil;os!');
  // Injetar AMPscript antes do preheader oculto
  return html.replace('<!-- Preheader oculto -->', AMPSCRIPT_FIRSTNAME + '\n\n  <!-- Preheader oculto -->');
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

async function getAsset(token, assetId) {
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets/${assetId}`, method: 'GET', headers: { 'Authorization': 'Bearer '+token } }, null);
  return JSON.parse(r.raw);
}

async function putAsset(token, assetId, customerKey, name, subject, html) {
  const payload = JSON.stringify({ id: assetId, customerKey, name, assetType: { name: 'htmlemail', id: 208 }, views: { html: { content: html }, subjectline: { content: subject } }, category: { id: CAT_CAMP } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets/${assetId}`, method: 'PUT', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length } }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 200 || r.status === 201) return p;
  throw new Error(`PUT ${assetId} (${r.status}): ${JSON.stringify(p).slice(0,300)}`);
}

async function main() {
  console.log('\n==============================================');
  console.log(' BAR0001 TN — fix FirstName → AMPscript');
  console.log('==============================================\n');

  const token = await getToken();
  console.log('✓ Token TN\n');

  for (const a of ASSETS) {
    const html = buildHtml(a);
    const fname = `2026-06-17-bar0001-tn-email${a.num}-${a.base.toLowerCase().replace(/ /g,'-')}.html`;
    fs.writeFileSync(path.join(OUT, fname), html, 'utf8');

    const detail = await getAsset(token, a.assetId);
    const customerKey = detail.customerKey;
    const finalName = `[${TIPO}][${a.esId}][EML][${DATE}][${CAMPAIGN}][EMAIL ${a.num} ${a.base}]`;

    console.log(`── Email ${a.num} ${a.base}`);
    process.stdout.write(`   PUT ${a.assetId} → "${finalName}"... `);
    await putAsset(token, a.assetId, customerKey, finalName, a.subject, html);
    console.log('✓');
  }

  console.log('\nFeito. Emails 13 e 14 (ambas as bases) corrigidos.');
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
