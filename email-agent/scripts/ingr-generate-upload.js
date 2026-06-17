#!/usr/bin/env node
'use strict';
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUBDOMAIN     = 'mcn29v1t3hsj32w921hh7z9yz2xm';
const CLIENT_ID     = 'xrttn26q5nobbq3ty5vsthgw';
const CLIENT_SECRET = 'kd2cmIW3Gufk00wfB7pIXjvu';
const MID_FIN       = '518005767';
const CAT_CAMP      = 275626;
const DATE          = '20260616';
const TIPO          = 'COM';
const WPP           = 'https://api.whatsapp.com/send?phone=5511913084339';

const TEMPLATE = fs.readFileSync(path.join(__dirname, '../brands/finclass/templates/comunicado.html'), 'utf8');
const OUT = path.join(__dirname, '../output');

// ── HTML helpers ──────────────────────────────────────────────────────────────
function p(t)  { return `<p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.75;">${t}</p>`; }
function h2(t) { return `<p style="margin:24px 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:17px;color:#1a1a1a;line-height:1.4;"><strong>${t}</strong></p>`; }

function infoBox() {
  return `<table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 20px 0;"><tr><td style="background-color:#f5f5f5;border-left:4px solid #00E7F9;padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.9;">
    &#128197; 20 de Setembro de 2026<br/>&#128205; Gin&aacute;sio Ibirapuera, S&atilde;o Paulo
  </td></tr></table>`;
}

function ctaBtn(url) {
  return `<table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0 24px 0;"><tr><td align="center">
    <table cellpadding="0" cellspacing="0" border="0" role="presentation" align="center"><tr>
      <td align="center" bgcolor="#FFDD00" style="border-radius:40px;">
        <a href="${url}" style="background-color:#FFDD00;border-radius:40px;color:#000000;display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:52px;text-align:center;text-decoration:none;width:280px;">CONFIRMAR MINHA PARTICIPA&Ccedil;&Atilde;O</a>
      </td>
    </tr></table>
  </td></tr></table>`;
}

function wppFooter(textBefore) {
  return p(`${textBefore} <a href="${WPP}" style="color:#00E7F9;">(11) 91308-4339</a> no WhatsApp ou <a href="${WPP}" style="color:#00E7F9;">clicando aqui</a>.`);
}

function finclassEventDesc() {
  return [
    p('O Finday &eacute; o maior evento de educa&ccedil;&atilde;o financeira do Brasil, realizado pela Finclass. Um dia inteiro dedicado a transformar a rela&ccedil;&atilde;o das pessoas com o dinheiro &mdash; com palestras de especialistas de alto n&iacute;vel, pain&eacute;is exclusivos, networking com uma comunidade que pensa grande e experi&ecirc;ncias que voc&ecirc; n&atilde;o vai encontrar em nenhum outro lugar.'),
    infoBox(),
  ].join('\n');
}

function assinatura(texto) {
  return p(`${texto}<br/><strong>Equipe Finclass</strong>`);
}

// ── Corpo por base ─────────────────────────────────────────────────────────────
const AMPSCRIPT_NOME = `<!--
%%[
  set @nome = AttributeValue("nome")
  if empty(@nome) or @nome == "no" or @nome == "." or RegExMatch(@nome, "[0-9]", 0) > 0 then
    set @line = "Ol&aacute;"
  else
    set @firstName = @nome
    if indexOf(@nome, "@") > 0 then
      set @firstName = "nulable"
    else
      if indexOf(@nome, " ") > 0 then
        set @firstName = Substring(@nome,1, Subtract(IndexOf(@nome," "),1))
      endif
      if indexOf(@nome, ".") > 0 then
        set @firstName = Substring(@nome, 1, IndexOf(@nome, "."))
      endif
    endif
    set @name = Propercase(@firstName)
    if @name == "nulable" then
      set @line = "Ol&aacute;,"
    else
      set @line = concat("Ol&aacute;, ",@name)
    endif
  endif
]%%
-->`;

function corpoA(url) {
  return [
    p('O maior evento de educa&ccedil;&atilde;o financeira do Brasil est&aacute; de volta &mdash; e vai ser hist&oacute;rico.'),
    p('O Finday acontece no dia <strong>20 de Setembro de 2026</strong>, com uma edi&ccedil;&atilde;o ainda mais especial e inesquec&iacute;vel.'),
    p('E o seu ingresso de 2025? Continua 100% v&aacute;lido. Voc&ecirc; n&atilde;o perde nada &mdash; s&oacute; precisa fazer a confirma&ccedil;&atilde;o de presen&ccedil;a e resgate do ingresso. As instru&ccedil;&otilde;es est&atilde;o logo abaixo.'),
    h2('O que &eacute; o Finday?'),
    finclassEventDesc(),
    p('Se voc&ecirc; quer dar o pr&oacute;ximo passo na sua jornada financeira, o Finday &eacute; onde isso acontece.'),
    h2('Como resgatar seu ingresso'),
    p('<strong>Acesse o link de confirma&ccedil;&atilde;o</strong>'),
    p('Clique no bot&atilde;o abaixo &mdash; voc&ecirc; ser&aacute; direcionado para um formul&aacute;rio.'),
    ctaBtn(url),
    p('Confirme sua participa&ccedil;&atilde;o e aguarde o recebimento do ingresso para resgate dentro de <strong>7 dias</strong> ap&oacute;s a confirma&ccedil;&atilde;o no formul&aacute;rio acima.'),
    p('<strong>Resgate seu ingresso</strong>'),
    p('Dentro de 7 dias ap&oacute;s o preenchimento do formul&aacute;rio de confirma&ccedil;&atilde;o, voc&ecirc; receber&aacute; um e-mail da Hotmart. Fa&ccedil;a o check-in e gere seu QRcode atrav&eacute;s do link da Hotmart. Pronto, seu ingresso estar&aacute; garantido para o Finday 2026. Basta utilizar o QRcode para entrar no evento.'),
    wppFooter('Qualquer d&uacute;vida ou problema entre em contato com o n&uacute;mero'),
    assinatura('Nos vemos em Setembro,<br/>'),
  ].join('\n');
}

function corpoB(url) {
  return [
    p('O maior evento de educa&ccedil;&atilde;o financeira do Brasil est&aacute; de volta &mdash; e vai ser hist&oacute;rico.'),
    p('O Finday acontece no dia <strong>20 de Setembro de 2026</strong>, com uma edi&ccedil;&atilde;o ainda mais especial e inesquec&iacute;vel.'),
    p('E o seu ingresso de 2025 com direito a acompanhante? Continua 100% v&aacute;lido. Voc&ecirc; n&atilde;o perde nada &mdash; s&oacute; precisa fazer a confirma&ccedil;&atilde;o de presen&ccedil;a e resgate do ingresso. As instru&ccedil;&otilde;es est&atilde;o logo abaixo.'),
    h2('O que &eacute; o Finday?'),
    finclassEventDesc(),
    p('Se voc&ecirc; quer dar o pr&oacute;ximo passo na sua jornada financeira, o Finday &eacute; onde isso acontece.'),
    h2('Como resgatar seu ingresso + o ingresso do seu acompanhante'),
    p('<strong>Acesse o link de confirma&ccedil;&atilde;o</strong>'),
    p('Clique no bot&atilde;o abaixo &mdash; voc&ecirc; ser&aacute; direcionado para um formul&aacute;rio.'),
    ctaBtn(url),
    p('Confirme sua participa&ccedil;&atilde;o e a do seu acompanhante, e aguarde o recebimento do ingresso para resgate dentro de alguns dias ap&oacute;s a confirma&ccedil;&atilde;o no formul&aacute;rio acima.'),
    p('<strong>Resgate seu ingresso</strong>'),
    p('Dentro de alguns dias ap&oacute;s o preenchimento do formul&aacute;rio de confirma&ccedil;&atilde;o, voc&ecirc; receber&aacute; um e-mail da Hotmart. Fa&ccedil;a o check-in e gere seu QRcode atrav&eacute;s do link da Hotmart. Pronto, seu ingresso estar&aacute; garantido para o Finday 2026. Basta utilizar o QRcode para entrar no evento.'),
    wppFooter('Qualquer d&uacute;vida ou problema entre em contato com o n&uacute;mero'),
    assinatura('Nos vemos em Setembro,<br/>'),
  ].join('\n');
}

function corpoC(url) {
  return [
    p('O maior evento de educa&ccedil;&atilde;o financeira do Brasil est&aacute; de volta &mdash; e vai ser hist&oacute;rico.'),
    p('O Finday acontece no dia <strong>20 de Setembro de 2026</strong>, com uma edi&ccedil;&atilde;o ainda mais especial e inesquec&iacute;vel.'),
    p('E o seu ingresso <strong>VIP</strong> de 2025? Continua 100% v&aacute;lido. Voc&ecirc; n&atilde;o perde nada &mdash; s&oacute; precisa fazer a confirma&ccedil;&atilde;o de presen&ccedil;a e resgate do ingresso. As instru&ccedil;&otilde;es est&atilde;o logo abaixo.'),
    h2('O que &eacute; o Finday?'),
    finclassEventDesc(),
    p('Se voc&ecirc; quer dar o pr&oacute;ximo passo na sua jornada financeira, o Finday &eacute; onde isso acontece.'),
    h2('Como resgatar seu ingresso VIP'),
    p('<strong>Acesse o link de confirma&ccedil;&atilde;o</strong>'),
    p('Clique no bot&atilde;o abaixo &mdash; voc&ecirc; ser&aacute; direcionado para um formul&aacute;rio.'),
    ctaBtn(url),
    p('Confirme sua participa&ccedil;&atilde;o e aguarde o recebimento do ingresso para resgate dentro de <strong>7 dias</strong> ap&oacute;s a confirma&ccedil;&atilde;o no formul&aacute;rio acima.'),
    p('<strong>Resgate seu ingresso</strong>'),
    p('Dentro de 7 dias ap&oacute;s o preenchimento do formul&aacute;rio de confirma&ccedil;&atilde;o, voc&ecirc; receber&aacute; um e-mail da Hotmart. Fa&ccedil;a o check-in e gere seu QRcode atrav&eacute;s do link da Hotmart. Pronto, seu ingresso estar&aacute; garantido para o Finday 2026. Basta utilizar o QRcode para entrar no evento.'),
    wppFooter('Qualquer d&uacute;vida ou problema entre em contato com o n&uacute;mero'),
    assinatura('Nos vemos em Setembro,<br/>'),
  ].join('\n');
}

function corpoD(url) {
  return [
    p('O maior evento de educa&ccedil;&atilde;o financeira do Brasil est&aacute; de volta &mdash; e vai ser hist&oacute;rico.'),
    p('O Finday acontece no dia <strong>20 de Setembro de 2026</strong>, com uma edi&ccedil;&atilde;o ainda mais especial e inesquec&iacute;vel.'),
    p('E o seu ingresso <strong>VIP</strong> de 2025 com direito a acompanhante? Continua 100% v&aacute;lido. Voc&ecirc; n&atilde;o perde nada &mdash; s&oacute; precisa fazer a confirma&ccedil;&atilde;o de presen&ccedil;a e resgate do ingresso. As instru&ccedil;&otilde;es est&atilde;o logo abaixo.'),
    h2('O que &eacute; o Finday?'),
    finclassEventDesc(),
    p('Se voc&ecirc; quer dar o pr&oacute;ximo passo na sua jornada financeira, o Finday &eacute; onde isso acontece.'),
    h2('Como resgatar seu ingresso VIP + o ingresso VIP do seu acompanhante'),
    p('<strong>Acesse o link de confirma&ccedil;&atilde;o</strong>'),
    p('Clique no bot&atilde;o abaixo &mdash; voc&ecirc; ser&aacute; direcionado para um formul&aacute;rio.'),
    ctaBtn(url),
    p('Confirme sua participa&ccedil;&atilde;o e a do seu acompanhante, e aguarde o recebimento do ingresso para resgate dentro de alguns dias ap&oacute;s a confirma&ccedil;&atilde;o no formul&aacute;rio acima.'),
    p('<strong>Resgate seu ingresso</strong>'),
    p('Dentro de alguns dias ap&oacute;s o preenchimento do formul&aacute;rio de confirma&ccedil;&atilde;o, voc&ecirc; receber&aacute; um e-mail da Hotmart. Fa&ccedil;a o check-in e gere seu QRcode atrav&eacute;s do link da Hotmart. Pronto, seu ingresso estar&aacute; garantido para o Finday 2026. Basta utilizar o QRcode para entrar no evento.'),
    wppFooter('Qualquer d&uacute;vida ou problema entre em contato com o n&uacute;mero'),
    assinatura('Nos vemos em Setembro,<br/>'),
  ].join('\n');
}

function corpoE(url) {
  return [
    p('O Finday est&aacute; chegando.'),
    p('Agora &eacute; s&oacute; resgatar seu ingresso e se preparar para um dia que vai mudar a forma como voc&ecirc; pensa sobre dinheiro.'),
    p('Lembrando que o Finday acontecer&aacute; no dia <strong>20 de setembro de 2026</strong>, com uma edi&ccedil;&atilde;o ainda mais especial e inesquec&iacute;vel.'),
    h2('O que &eacute; o Finday?'),
    finclassEventDesc(),
    h2('Como resgatar seu ingresso'),
    p('<strong>1. Confirme sua participa&ccedil;&atilde;o</strong>'),
    p('Clique no bot&atilde;o abaixo e preencha o formul&aacute;rio de confirma&ccedil;&atilde;o.'),
    ctaBtn(url),
    p('<strong>2. Localize seu ingresso</strong>'),
    p('O ingresso j&aacute; foi enviado pela Hotmart no momento da compra. Procure na sua caixa de entrada pelo assunto:'),
    p('<em>&ldquo;Voc&ecirc; acaba de receber um convite de evento. Confirme sua presen&ccedil;a!&rdquo;</em>'),
    p('N&atilde;o encontrou? Verifique a pasta de spam ou lixo eletr&ocirc;nico antes de entrar em contato.'),
    wppFooter('Alguma d&uacute;vida? Fale com a gente pelo WhatsApp:'),
    assinatura('Nos vemos em Setembro,<br/>'),
  ].join('\n');
}

function corpoF(url) {
  const amp = AMPSCRIPT_NOME;
  const corpo = [
    p('%%=v(@line)=%%,'),
    p('Voc&ecirc; deu o primeiro passo!'),
    p('Agora &eacute; hora de resgatar seu ingresso para <strong>A Nova Carreira</strong>, que acontecer&aacute; nos dias <strong>18 e 19 de setembro</strong>, e se preparar para um dia que pode mudar completamente o rumo da sua carreira.'),
    h2('O que &eacute; A Nova Carreira?'),
    p('Um evento criado pela Finclass para quem quer entrar no mercado financeiro, ou crescer dentro dele. Voc&ecirc; vai sair com um plano de a&ccedil;&atilde;o claro, execut&aacute;vel e personalizado: o passo a passo exato para come&ccedil;ar a buscar R$ 18 mil ou mais por m&ecirc;s trabalhando com prop&oacute;sito.'),
    p('No palco, nomes como o <strong>Thiago Nigro (O Primo Rico)</strong> e os fundadores da Portfel &mdash; uma das consultorias de investimentos que mais cresce no Brasil &mdash; v&atilde;o te mostrar o que ningu&eacute;m ensina: como conquistar seus primeiros clientes, quais carreiras realmente valem seu tempo e como entrar num setor que valoriza intelig&ecirc;ncia e esfor&ccedil;o.'),
    p('E tem mais: durante o evento, uma oportunidade exclusiva para quem quiser dar o pr&oacute;ximo passo dentro do pr&oacute;prio Grupo Primo.'),
    h2('Como resgatar seu ingresso'),
    p('<strong>1. Confirme sua participa&ccedil;&atilde;o</strong>'),
    p('Clique no bot&atilde;o abaixo e preencha o formul&aacute;rio de confirma&ccedil;&atilde;o do seu ingresso.'),
    ctaBtn(url),
    p('<strong>2. Localize seu ingresso</strong>'),
    p('O ingresso j&aacute; foi enviado pela Hotmart no momento da compra. Procure na sua caixa de entrada pelo assunto:'),
    p('<em>&ldquo;Voc&ecirc; acaba de receber um convite de evento. Confirme sua presen&ccedil;a!&rdquo;</em>'),
    p('N&atilde;o encontrou? Verifique a pasta de spam antes de entrar em contato.'),
    wppFooter('Alguma d&uacute;vida? Fale com a gente pelo WhatsApp:'),
    assinatura('Nos vemos l&aacute;.<br/>'),
  ].join('\n');
  return `${amp}\n\n${corpo}`;
}

// ── Configuração dos 6 emails (link confirmado contra base) ───────────────────
// ATENÇÃO: cada base tem seu link exclusivo — não alterar cruzamentos
const EMAILS = [
  { id: 'A', campaign: 'INGR0003', base: 'BASE A', subject: '✅ Finday VOLTOU! Seu ingresso 2026 está garantido',          preheader: 'Saiba como confirmar',  link: 'https://finc.ly/bs_a', corpo: (u) => corpoA(u) },
  { id: 'B', campaign: 'INGR0003', base: 'BASE B', subject: '✅ Finday VOLTOU! Seus ingressos 2026 estão garantidos',        preheader: 'Saiba como confirmar',  link: 'https://finc.ly/bs_b', corpo: (u) => corpoB(u) },
  { id: 'C', campaign: 'INGR0003', base: 'BASE C', subject: '✅ Finday VOLTOU! Seu ingresso VIP 2026 está garantido',        preheader: 'Saiba como confirmar',  link: 'https://finc.ly/bs_c', corpo: (u) => corpoC(u) },
  { id: 'D', campaign: 'INGR0003', base: 'BASE D', subject: '✅ Finday VOLTOU! Seus ingressos VIPs 2026 estão garantidos',   preheader: 'Saiba como confirmar',  link: 'https://finc.ly/bs_d', corpo: (u) => corpoD(u) },
  { id: 'E', campaign: 'INGR0003', base: 'BASE E', subject: '✅ Resgate seu ingresso para o Finday 2026',                   preheader: 'Saiba como fazer.',     link: 'https://finc.ly/bs_e', corpo: (u) => corpoE(u) },
  { id: 'F', campaign: 'INGR0002', base: 'BASE F', subject: '🎟️ Resgate seu ingresso para A Nova Carreira',               preheader: 'Saiba como.',           link: 'https://finc.ly/bs_f', corpo: (u) => corpoF(u) },
];

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

function buildHtml(email) {
  const corpo = email.corpo(email.link);
  return TEMPLATE
    .replace(/\{\{email_subject\}\}/g,    email.subject)
    .replace(/\{\{email_preheader\}\}/g,  email.preheader)
    .replace(/\{\{email_corpo\}\}/g,      corpo)
    .replace(/\{\{email_cta_html\}\}/g,   '');
}

async function main() {
  console.log('\n==============================================');
  console.log(' INGR0002/0003 — 6 emails Finclass');
  console.log('==============================================');
  console.log('\n  MAPA DE LINKS (verificar antes de subir):');
  for (const e of EMAILS) {
    console.log(`  BASE ${e.id} [${e.campaign}] → ${e.link}`);
  }
  console.log('');

  const token = await getToken();
  console.log('✓ Token Finclass\n');

  const results = [];

  for (const email of EMAILS) {
    const html = buildHtml(email);
    const fname = `2026-06-16-finclass-comunicado-${email.campaign.toLowerCase()}-base${email.id.toLowerCase()}.html`;
    fs.writeFileSync(path.join(OUT, fname), html, 'utf8');

    const tempName = `INGR-BASE-${email.id}-TEMP`;
    console.log(`── BASE ${email.id} [${email.campaign}]  link: ${email.link}`);
    process.stdout.write(`   POST "${tempName}"... `);
    const { assetId, customerKey: ck0, existing } = await postAsset(token, tempName, email.subject, html);
    console.log(`CB: ${assetId}${existing ? ' (existente)' : ' ✓'}`);

    process.stdout.write(`   ES ID... `);
    const { esId, customerKey } = await getEsId(token, assetId);
    console.log(`ES: ${esId}`);

    const finalName = `[${TIPO}][${esId}][EML][${DATE}][${email.campaign}][${email.base}]`;
    process.stdout.write(`   Rename → "${finalName}"... `);
    await putAsset(token, assetId, customerKey || ck0, finalName, email.subject, html);
    console.log('✓\n');

    results.push({ id: email.id, campaign: email.campaign, base: email.base, link: email.link, assetId, esId, name: finalName, subject: email.subject });
  }

  console.log('==============================================');
  console.log(' RESUMO FINAL');
  console.log('==============================================');
  for (const r of results) {
    console.log(`\n  BASE ${r.id} [${r.campaign}]`);
    console.log(`    Subject  : ${r.subject}`);
    console.log(`    Link CTA : ${r.link}`);
    console.log(`    CB Asset : ${r.assetId}`);
    console.log(`    ES ID    : ${r.esId}`);
    console.log(`    Nome     : ${r.name}`);
  }
  console.log('');
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
