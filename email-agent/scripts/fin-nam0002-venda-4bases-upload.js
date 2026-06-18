#!/usr/bin/env node
'use strict';
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUBDOMAIN     = 'mcn29v1t3hsj32w921hh7z9yz2xm';
const CLIENT_ID     = 'xrttn26q5nobbq3ty5vsthgw';
const CLIENT_SECRET = 'kd2cmIW3Gufk00wfB7pIXjvu';
const MID_FIN       = '518005767';
const CAT_EMAIL     = 275626;
const CAT_IMG       = 275201;
const DATE          = '20260619';
const TIPO          = 'VND';
const CAMPAIGN      = 'NAM0002';

const TEMPLATE = fs.readFileSync(path.join(__dirname, '../brands/finclass/templates/campanha.html'), 'utf8');
const IMG_FILE = 'C:/Users/vitoria.esteves/AppData/Local/Temp/docx_work/media/image1.png';
const IMG_NAME = 'FIN-NAM0002-20260619-venda-depoimento';
const OUT      = path.join(__dirname, '../output');

const SUBJECT   = 'Se você gosta de trabalhar até os 80 anos…';
const PREHEADER = '…não abra este e-mail ⚠️';

// ── 4 bases com links distintos ───────────────────────────────────────────────
const BASES = [
  {
    key:  'BCAR',
    label: 'CARRINHO',
    pfx:  'FIN-VIN-EML-X-BCAR-20260615-ORG-NAM0002-AS-EML_BS_CAR_20260615_',
    utm:  'BASECARRINHOABANDONADO',
  },
  {
    key:  'BFIN',
    label: 'FINCLASS',
    pfx:  'FIN-VIN-EML-X-BFIN-20260615-ORG-NAM0002-AS-EML_BS_FIN_20260615_',
    utm:  'BASEFINCLASS',
  },
  {
    key:  'BEXASSIN',
    label: 'EXASSIN',
    pfx:  'FIN-VIN-EML-X-BEXASSIN-20260615-ORG-NAM0002-AS-EML_BS_EX_20260615_',
    utm:  'BASEEXASSINANTES',
  },
  {
    key:  'BHL',
    label: 'HOTLIST',
    pfx:  'FIN-VIN-EML-X-BHL-20260615-ORG-NAM0002-AS-EML_BS_ANV0006_20260615_',
    utm:  'BASEHOTLIST',
  },
];

function ampBlock(base) {
  return `<!--
%%[
  set @jid      = [JobID]
  set @pfx      = "${base.pfx}"
  set @utm      = "${base.utm}"
  set @link_tag = concat("https://sl.finclass.com/nam0002-dia-dos-namorados-2026/convite/?pmp=",@pfx,@jid,"&src=",@pfx,@jid,"&sck=",@pfx,@jid,"&utm_medium=",@utm,"&utm_source=EMAIL&utm_content=ORGANICO&utm_campaign=NAM0002&utm_term=",@pfx,@jid)
]%%
-->`;
}

function inlineCTA() {
  return `<table cellspacing="0" cellpadding="0" border="0" role="presentation" align="center" style="margin:8px auto 32px auto;">
  <tr>
    <td align="center" bgcolor="#00E7F9" style="border-radius:40px;">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="%%=redirectto(@link_tag)=%%" style="height:54px;v-text-anchor:middle;width:320px;" arcsize="50%" fillcolor="#00E7F9" stroked="f"><w:anchorlock/><center style="color:#000000;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;">QUERO APROVEITAR</center></v:roundrect><![endif]-->
      <!--[if !mso]><!-->
      <a href="%%=redirectto(@link_tag)=%%" target="_blank"
         style="background-color:#00e7f9;border-radius:40px;color:#000000;display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:54px;text-align:center;text-decoration:none;width:320px;letter-spacing:0.5px;-webkit-text-size-adjust:none;mso-hide:all;">QUERO APROVEITAR</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

function buildCorpo(imgUrl) {
  function p(t) {
    return `<p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.8;">${t}</p>`;
  }
  const depoimento = `<table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:4px 0 28px 0;">
  <tr><td align="center" style="padding:0;">
    <img src="${imgUrl}" alt="Depoimento de aluna Finclass" width="520" border="0"
         style="display:block;width:100%;max-width:520px;height:auto;" />
  </td></tr>
</table>`;
  return [
    p('Enquanto voc&ecirc; l&ecirc; este e-mail, seu dinheiro est&aacute; perdendo valor.'),
    p('<strong>Pior do que isso: o seu tempo est&aacute; se esgotando.</strong>'),
    p('A Maria (aquela nossa aluna aposentada) percebeu isso a tempo.'),
    p('Ela parou de dar desculpas e come&ccedil;ou com o que tinha.'),
    p('<strong>Hoje, ela recebe mais de R$&nbsp;1.621,00 extras todos os meses.</strong>'),
    depoimento,
    p('Sabe o que isso significa?'),
    p('Significa que ela n&atilde;o depende mais s&oacute; da boa vontade do governo ou de uma aposentadoria miser&aacute;vel para viver bem.'),
    p('Ela tem liberdade.'),
    p('<strong>E voc&ecirc;? Qual &eacute; o seu plano?</strong>'),
    p('Continuar trabalhando 8 horas por dia para chegar ao fim do m&ecirc;s e ver o saldo zerado?'),
    p('Continuar adiando a viagem ou o conforto da sua fam&iacute;lia porque &ldquo;o mercado est&aacute; inst&aacute;vel&rdquo;?'),
    p('<strong>A verdade d&oacute;i, mas precisa ser dita: quem n&atilde;o tem um m&eacute;todo, est&aacute; trabalhando para enriquecer os outros, menos a si mesmo.</strong>'),
    p('<strong>Esta &eacute; a sua &uacute;ltima oportunidade.</strong>'),
    p('<strong>Em breve encerramos a condi&ccedil;&atilde;o de 50% de DESCONTO.</strong>'),
    inlineCTA(),
    p('<strong>&Eacute; o fim do prazo. Em poucos dias, o acesso &agrave; mesma estrat&eacute;gia que a Maria usa e mais de 100 mil alunos vai custar o dobro.</strong>'),
    p('Voc&ecirc; pode continuar tentando adivinhar qual &eacute; a pr&oacute;xima a&ccedil;&atilde;o que vai subir (e provavelmente perder dinheiro no processo), ou pode ter os melhores especialistas do mercado te dizendo exatamente o que fazer.'),
    p('<strong>A escolha &eacute; bin&aacute;ria:</strong>'),
    p('Ou voc&ecirc; ignora este e-mail e continua exatamente onde est&aacute; hoje (com as mesmas contas e as mesmas preocupa&ccedil;&otilde;es).'),
    p('Ou voc&ecirc; aproveita os 50% de desconto agora e come&ccedil;a a construir o seu &ldquo;sal&aacute;rio extra&rdquo;, exatamente como a Maria fez.'),
  ].join('\n');
}

function buildHtml(base, imgUrl) {
  let html = TEMPLATE
    .replace(/\{\{email_subject\}\}/g,    () => SUBJECT)
    .replace(/\{\{email_preheader\}\}/g,  () => PREHEADER)
    .replace(/\{\{email_hero_html\}\}/g,  () => '')
    .replace(/\{\{email_corpo\}\}/g,      () => buildCorpo(imgUrl))
    .replace(/\{\{email_cta_texto\}\}/g,  () => 'QUERO PARAR DE PERDER DINHEIRO')
    .replace(/\{\{email_cta_url\}\}/g,    () => '%%=redirectto(@link_tag)=%%')
    .replace(/\{\{email_assinatura\}\}/g, () => 'Abra&ccedil;o,<br/><strong>Equipe Finclass</strong>');

  html = html.replace('<!-- Preheader oculto -->', () => ampBlock(base) + '\n\n  <!-- Preheader oculto -->');
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
  const b = JSON.stringify({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET, account_id: MID_FIN });
  const r = await req({ hostname: SUBDOMAIN+'.auth.marketingcloudapis.com', path: '/v2/token', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, b);
  const p = JSON.parse(r.raw); if (r.status !== 200) throw new Error('Auth: '+r.raw);
  return p.access_token;
}

async function uploadImg(token) {
  const lookup = async () => {
    const s = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets?$filter=name%20eq%20'${IMG_NAME}'`, method: 'GET', headers: { 'Authorization': 'Bearer '+token } }, null);
    const sp = JSON.parse(s.raw); const it = sp.items && sp.items[0];
    if (!it) throw new Error('Imagem não encontrada após conflito');
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
  console.log(` Finclass NAM0002 Venda — 4 bases (${BASES.length} emails)`);
  console.log('================================================\n');

  const token = await getToken();
  console.log('✓ Token Finclass\n');

  process.stdout.write('Upload imagem hero... ');
  const imgUrl = await uploadImg(token);
  console.log('✓\n  →', imgUrl, '\n');

  // Assets já existentes — só PUT com imagem corrigida
  const EXISTING = [
    { key: 'BCAR',     assetId: 41418, esId: '31946' },
    { key: 'BFIN',     assetId: 41419, esId: '31947' },
    { key: 'BEXASSIN', assetId: 41420, esId: '31948' },
    { key: 'BHL',      assetId: 41421, esId: '31949' },
  ];

  const results = [];

  for (const ex of EXISTING) {
    const base = BASES.find(b => b.key === ex.key);
    console.log(`─── ${base.key}`);

    const html    = buildHtml(base, imgUrl);
    const outFile = `${DATE}-fin-nam0002-venda-${base.key.toLowerCase()}.html`;
    fs.writeFileSync(path.join(OUT, outFile), html, 'utf8');

    process.stdout.write(`  GET customerKey... `);
    const { customerKey } = await getEsId(token, ex.assetId);
    process.stdout.write(`ok | PUT CB ${ex.assetId}... `);

    const finalName = `[${TIPO}][${ex.esId}][EML][${DATE}][${CAMPAIGN}][VENDA ${base.key} FIN]`;
    await putAsset(token, ex.assetId, customerKey, finalName, html);
    console.log('✓');

    results.push({ base: base.key, assetId: ex.assetId, esId: ex.esId, name: finalName });
  }

  console.log('\n================================================');
  console.log(' RESULTADO FINAL');
  console.log('================================================');
  for (const r of results) {
    console.log(`\n  ${r.base}`);
    console.log(`    CB: ${r.assetId}  |  ES: ${r.esId}`);
    console.log(`    ${r.name}`);
  }
  console.log('');
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
