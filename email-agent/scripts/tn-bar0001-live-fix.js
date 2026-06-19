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
const TIPO          = 'AQU';
const CAMPAIGN      = 'BAR0001';

const TEMPLATE = fs.readFileSync(path.join(__dirname, '../brands/thiago-nigro/templates/campanha.html'), 'utf8');
const OUT      = path.join(__dirname, '../output');

const EMAILS = [
  {
    assetId:   41482,
    esId:      '31971',
    date:      '20260620',
    subject:   'Thiago Nigro e Louise Barsi respondem tudo, ao vivo',
    preheader: 'É no dia 23/06',
    ctaText:   'Finalize sua inscrição',
    ctaUrl:    'https://r.clique.ly/8e984b0e73',
    label:     'ANUNCIO HOTGERAL TN',
    corpo:     corpo1,
  },
  {
    assetId:   41483,
    esId:      '31972',
    date:      '20260620',
    subject:   'Thiago Nigro e Louise Barsi respondem tudo, ao vivo',
    preheader: 'É no dia 23/06',
    ctaText:   'Finalize sua inscrição',
    ctaUrl:    'https://r.clique.ly/1486118e9d',
    label:     'ANUNCIO HOTCLIENTES TN',
    corpo:     corpo1,
  },
  {
    assetId:   41484,
    esId:      '31973',
    date:      '20260621',
    subject:   'Tire suas dúvidas com quem realmente importa!',
    preheader: 'Thiago Nigro e Louise Barsi ao vivo dia 23/06 às 19h.',
    ctaText:   'FINALIZAR MINHA INSCRIÇÃO',
    ctaUrl:    'https://r.clique.ly/b0811ab58b',
    label:     'OBJBREAK HOTGERAL TN',
    corpo:     corpo2,
  },
  {
    assetId:   41485,
    esId:      '31974',
    date:      '20260621',
    subject:   'Tire suas dúvidas com quem realmente importa!',
    preheader: 'Thiago Nigro e Louise Barsi ao vivo dia 23/06 às 19h.',
    ctaText:   'FINALIZAR MINHA INSCRIÇÃO',
    ctaUrl:    'https://r.clique.ly/d47f48a4f1',
    label:     'OBJBREAK HOTCLIENTES TN',
    corpo:     corpo2,
  },
];

function p(t) {
  return `<p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.8;">${t}</p>`;
}

function corpo1() {
  return [
    p('Voc&ecirc; tem uma d&uacute;vida sobre o Legado que ainda n&atilde;o te fez tomar a decis&atilde;o?'),
    p('Talvez seja o MBA. Talvez a forma de pagamento. Talvez o que exatamente est&aacute; incluso no combo.'),
    p('No dia <strong>23/06, &agrave;s 19h</strong>, essa d&uacute;vida deixa de existir.'),
    p('<strong>Thiago Nigro</strong> e <strong>Louise Barsi</strong> v&atilde;o entrar ao vivo numa conversa tira-d&uacute;vidas sobre o Legado e a oferta da campanha. Sem roteiro engessado, respondendo o que mais aparece no chat.'),
    p('Essa &eacute; a chance de decidir olhando tudo de frente, com quem realmente entende do assunto e est&aacute; encabe&ccedil;ando essa campanha.'),
    p('<strong>Marque na sua agenda: segunda-feira, 23/06, &agrave;s 19h.</strong>'),
    p('E se voc&ecirc; j&aacute; sabe que quer entrar, n&atilde;o precisa esperar a live para isso.'),
  ].join('\n');
}

function corpo2() {
  return [
    p('Existe uma diferen&ccedil;a entre n&atilde;o querer e n&atilde;o ter certeza.'),
    p('Quem n&atilde;o quer, j&aacute; saiu. Se voc&ecirc; ainda est&aacute; aqui, lendo este e-mail, &eacute; porque o desejo existe. O que falta &eacute; clareza.'),
    p('E clareza &eacute; exatamente o que a live do dia <strong>23/06, &agrave;s 19h</strong> vai te entregar.'),
    p('<strong>Thiago Nigro</strong> e <strong>Louise Barsi</strong> v&atilde;o responder ao vivo o que mais trava a decis&atilde;o:'),
    `<p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:2;">&bull;&nbsp;O que est&aacute; incluso no combo<br/>&bull;&nbsp;Como funciona o MBA do Barsi<br/>&bull;&nbsp;O acesso &agrave;s carteiras dos dois grupos<br/>&bull;&nbsp;As formas de pagamento</p>`,
    p('Tudo direto, sem resposta pela metade.'),
    p('<strong>Anote: segunda-feira, 23/06, &agrave;s 19h.</strong>'),
    p('Agora, se ao ler isso voc&ecirc; percebeu que a sua d&uacute;vida j&aacute; n&atilde;o &eacute; mais d&uacute;vida, n&atilde;o tem motivo pra adiar.'),
  ].join('\n');
}

function buildHtml(email) {
  let html = TEMPLATE
    .replace(/\{\{email_subject\}\}/g,    () => email.subject)
    .replace(/\{\{email_preheader\}\}/g,  () => email.preheader)
    .replace(/\{\{email_hero_html\}\}/g,  () => '')
    .replace(/\{\{email_corpo\}\}/g,      () => email.corpo())
    .replace(/\{\{email_cta_texto\}\}/g,  () => email.ctaText)
    .replace(/\{\{email_cta_url\}\}/g,    () => email.ctaUrl)
    .replace(/\{\{email_assinatura\}\}/g, () => email.label.includes('ANUNCIO')
      ? 'Vemos voc&ecirc; na ter&ccedil;a!<br/>Abra&ccedil;os.'
      : 'Esperamos voc&ecirc; na live.<br/>Abra&ccedil;os!');
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

async function getCustomerKey(token, assetId) {
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets/${assetId}`, method: 'GET', headers: { 'Authorization': 'Bearer '+token } }, null);
  return JSON.parse(r.raw).customerKey;
}

async function putAsset(token, email, html) {
  const finalName = `[${TIPO}][${email.esId}][EML][${email.date}][${CAMPAIGN}][${email.label}]`;
  const ck = await getCustomerKey(token, email.assetId);
  const payload = JSON.stringify({ id: email.assetId, customerKey: ck, name: finalName, assetType: { name: 'htmlemail', id: 208 }, views: { html: { content: html }, subjectline: { content: email.subject } }, category: { id: CAT_EMAIL } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets/${email.assetId}`, method: 'PUT', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length } }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 200 || r.status === 201) return finalName;
  throw new Error(`PUT (${r.status}): ${JSON.stringify(p).slice(0,400)}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n================================================');
  console.log(' TN BAR0001 Live — fix copies (PUT x4)');
  console.log('================================================\n');

  const token = await getToken();
  console.log('✓ Token Thiago Nigro\n');

  for (const email of EMAILS) {
    process.stdout.write(`─── CB ${email.assetId} ${email.label}... `);
    const html      = buildHtml(email);
    const outFile   = `${email.date}-tn-bar0001-${email.label.toLowerCase().replace(/ /g,'_')}.html`;
    fs.writeFileSync(path.join(OUT, outFile), html, 'utf8');
    const finalName = await putAsset(token, email, html);
    console.log(`✓  →  ${finalName}`);
  }

  console.log('\n✓ 4 assets atualizados.');
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
