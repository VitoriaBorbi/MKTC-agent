#!/usr/bin/env node
'use strict';
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUBDOMAIN     = 'mcn29v1t3hsj32w921hh7z9yz2xm';
const CLIENT_ID     = 'xrttn26q5nobbq3ty5vsthgw';
const CLIENT_SECRET = 'kd2cmIW3Gufk00wfB7pIXjvu';
const MID_FIN       = '518005767';
const CAT_IMG       = 275201;
const CAT_CAMP      = 275626;
const CAMPAIGN      = 'NAM0002';
const DATE          = '20260610';
const TIPO          = 'VND';

const TEMPLATE = fs.readFileSync(path.join(__dirname, '../brands/finclass/templates/campanha.html'), 'utf8');
const OUT = path.join(__dirname, '../output');

const BASES = [
  {
    label: 'CARRINHO ABANDONADO',
    name:  'CARRINHO',
    url:   'https://sl.finclass.com/nam0002-dia-dos-namorados-2026/convite/?pmp=FIN-VIN-EML-X-BCAR-20260608-ORG-NAM0003-AS-EML_BS_CAR_20260608_JOBID&src=FIN-VIN-EML-X-BCAR-20260608-ORG-NAM0003-AS-EML_BS_CAR_20260608_JOBID&sck=FIN-VIN-EML-X-BCAR-20260608-ORG-NAM0003-AS-EML_BS_CAR_20260608_JOBID&utm_medium=BASECARRINHOABANDONADO&utm_source=EMAIL&utm_content=ORGANICO&utm_campaign=NAM0003&utm_term=FIN-VIN-EML-X-BCAR-20260608-ORG-NAM0003-AS-EML_BS_CAR_20260608_JOBID',
  },
  {
    label: 'LEADS FINCLASS',
    name:  'LEADS FIN',
    url:   'https://sl.finclass.com/nam0002-dia-dos-namorados-2026/convite/?pmp=FIN-VIN-EML-X-BFIN-20260608-ORG-NAM0003-AS-EML_BS_FIN_20260608_JOBID&src=FIN-VIN-EML-X-BFIN-20260608-ORG-NAM0003-AS-EML_BS_FIN_20260608_JOBID&sck=FIN-VIN-EML-X-BFIN-20260608-ORG-NAM0003-AS-EML_BS_FIN_20260608_JOBID&utm_medium=BASEFINCLASS&utm_source=EMAIL&utm_content=ORGANICO&utm_campaign=NAM0003&utm_term=FIN-VIN-EML-X-BFIN-20260608-ORG-NAM0003-AS-EML_BS_FIN_20260608_JOBID',
  },
  {
    label: 'EX ASSINANTES',
    name:  'EX ASSINANTES',
    url:   'https://sl.finclass.com/nam0002-dia-dos-namorados-2026/convite/?pmp=FIN-VIN-EML-X-BEXASSIN-20260608-ORG-NAM0003-AS-EML_BS_EX_20260608_JOBID&src=FIN-VIN-EML-X-BEXASSIN-20260608-ORG-NAM0003-AS-EML_BS_EX_20260608_JOBID&sck=FIN-VIN-EML-X-BEXASSIN-20260608-ORG-NAM0003-AS-EML_BS_EX_20260608_JOBID&utm_medium=BASEEXASSINANTES&utm_source=EMAIL&utm_content=ORGANICO&utm_campaign=NAM0003&utm_term=FIN-VIN-EML-X-BEXASSIN-20260608-ORG-NAM0003-AS-EML_BS_EX_20260608_JOBID',
  },
  {
    label: 'HOTLIST ANV0006',
    name:  'HOTLIST ANV0006',
    url:   'https://sl.finclass.com/nam0002-dia-dos-namorados-2026/convite/?pmp=FIN-VIN-EML-X-BHL-20260608-ORG-NAM0003-AS-EML_BS_ANV0006_20260608_JOBID&src=FIN-VIN-EML-X-BHL-20260608-ORG-NAM0003-AS-EML_BS_ANV0006_20260608_JOBID&sck=FIN-VIN-EML-X-BHL-20260608-ORG-NAM0003-AS-EML_BS_ANV0006_20260608_JOBID&utm_medium=BASEHOTLIST&utm_source=EMAIL&utm_content=ORGANICO&utm_campaign=NAM0003&utm_term=FIN-VIN-EML-X-BHL-20260608-ORG-NAM0003-AS-EML_BS_ANV0006_20260608_JOBID',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  const IMG_NAME = 'NAM0002-depoimento-felipe-isaac';
  const file = 'C:/Users/vitoria.esteves/AppData/Local/Temp/docx_work2/media/image1.png';
  const lookup = async () => {
    const s = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets?$filter=name%20eq%20'${IMG_NAME}'`, method: 'GET', headers: { 'Authorization': 'Bearer '+token } }, null);
    const sp = JSON.parse(s.raw); const it = sp.items && sp.items[0];
    if (!it) throw new Error('Imagem não encontrada no SFMC');
    return it.fileProperties && it.fileProperties.publishedURL || it.publishedURL;
  };
  if (!fs.existsSync(file)) { console.log('  (arquivo local não encontrado, buscando URL existente no SFMC)'); return lookup(); }
  const b64  = fs.readFileSync(file).toString('base64');
  const payload = JSON.stringify({ name: IMG_NAME, assetType: { name: 'png', id: 28 }, file: b64, category: { id: CAT_IMG } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: '/asset/v1/content/assets', method: 'POST', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length } }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 201 || r.status === 200) return p.fileProperties && p.fileProperties.publishedURL || p.publishedURL;
  if (p.errorcode === 118039 || p.errorcode === 10006 || (p.message||'').toLowerCase().includes('unique')) return lookup();
  throw new Error('Img upload: ' + JSON.stringify(p).slice(0,200));
}

function buildHtml(imgUrl, ctaUrl) {
  const AMPSCRIPT_NOME = `<!--
%%[
  set @nome = AttributeValue("nome")
  if empty(@nome) or @nome == "no" or @nome == "." or RegExMatch(@nome, "[0-9]", 0) > 0 then
    set @line = "Olá"
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
      set @line = "Olá,"
    else
      set @line = concat("Olá, ",@name)
    endif
  endif
]%%
-->`;

  const imgBlock = `<table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 20px 0;"><tr><td align="center" style="padding: 0;"><img src="${imgUrl}" alt="Depoimento Felipe Isaac — dividendos de $0,82 para $1.000/mês" width="520" border="0" style="display:block;width:100%;max-width:520px;height:auto;border-radius:8px;" /></td></tr></table>`;

  function p(t) { return `<p style="margin: 0 0 18px 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; color: #1a1a1a; line-height: 1.8;">${t}</p>`; }

  const corpo = [
    p('%%=v(@line)=%%,'),
    p('Mais do que tudo, esse &eacute; um teste de QI Financeiro&hellip;'),
    p('D&aacute; uma olhada no que esse aluno da Finclass postou na comunidade:'),
    imgBlock,
    p('<strong>Sabe o que isso significa na pr&aacute;tica?</strong>'),
    p('<strong>Significa que quando o Felipe sai para jantar hoje, n&atilde;o &eacute; ele quem paga a conta. S&atilde;o os dividendos.</strong>'),
    p('No come&ccedil;o, o dinheiro dele comprava um caf&eacute; (R$ 0,82). Hoje, gera mais de R$ 700 limpos todo m&ecirc;s.'),
    p('Agora, olhe para o calend&aacute;rio&hellip;'),
    p('Faltam 28 semanas pro Natal, depois R&eacute;veillon, Carnaval&hellip; e o pr&oacute;ximo Dia dos Namorados.'),
    p('O tempo vai passar de qualquer jeito.'),
    p('E a&iacute; a gente pergunta: nessas datas, voc&ecirc; quer estar parcelando a viagem em 12 vezes ou quer a liberdade de olhar para a pessoa que ama, ou para si mesmo, com a certeza de que o seu patrim&ocirc;nio pagou tudo &agrave; vista?'),
    p('Para voc&ecirc; parar de empurrar o seu futuro com a barriga, criamos uma proposta especial neste m&ecirc;s dos namorados:'),
    `<ul style="margin: 0 0 18px 0; padding-left: 24px; font-family: Arial, Helvetica, sans-serif; font-size: 16px; color: #1a1a1a; line-height: 2.2;">
      <li><strong>Finclass com 40% OFF:</strong> menos de R$ 2 por dia para aprender a investir com os maiores especialistas do mercado.</li>
      <li><strong>6 meses de Duo Gourmet GR&Aacute;TIS:</strong> voc&ecirc; pede dois pratos nos melhores restaurantes do Brasil e paga s&oacute; um.</li>
    </ul>`,
    p('<strong>Fa&ccedil;a as contas:</strong> se voc&ecirc; usar o benef&iacute;cio do restaurante apenas uma vez por m&ecirc;s, a economia do prato gratuito paga a assinatura da Finclass e ainda te d&aacute; lucro.'),
    p('Na pr&aacute;tica, n&oacute;s te damos o conhecimento para multiplicar seu patrim&ocirc;nio e ainda pagamos metade dos seus jantares pelos pr&oacute;ximos 6 meses.'),
    p('N&atilde;o existe argumento racional para ficar de fora.'),
    p('Ou voc&ecirc; entra hoje, ou assume que prefere continuar deixando o seu dinheiro parado.'),
  ].join('\n');

  const html = TEMPLATE
    .replace(/\{\{email_subject\}\}/g,    'De $0,82 pra $750/mês.')
    .replace(/\{\{email_preheader\}\}/g,  'Confira antes de 12/06.')
    .replace(/\{\{email_hero_html\}\}/g,  '')
    .replace(/\{\{email_corpo\}\}/g,      corpo)
    .replace(/\{\{email_cta_texto\}\}/g,  'Trocar desculpas por dividendos &rarr;')
    .replace(/\{\{email_cta_url\}\}/g,    `%%=redirectto('${ctaUrl}')=%%`)
    .replace(/\{\{email_assinatura\}\}/g, '<p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #1a1a1a; line-height: 1.6;">Abra&ccedil;o,<br/><strong>Thiago Nigro e Equipe Finclass</strong></p>');

  // Injetar AMPscript após tracking div
  return html.replace(
    '<!-- Preheader oculto -->',
    AMPSCRIPT_NOME + '\n\n  <!-- Preheader oculto -->'
  );
}

async function postAsset(token, tempName, html) {
  const payload = JSON.stringify({ name: tempName, assetType: { name: 'htmlemail', id: 208 }, views: { html: { content: html }, subjectline: { content: 'De $0,82 pra $750/mês.' } }, category: { id: CAT_CAMP } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: '/asset/v1/content/assets', method: 'POST', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length } }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 201 || r.status === 200) return { assetId: p.id, customerKey: p.customerKey };
  if (p.errorcode === 118039) {
    const s = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets?$filter=name%20eq%20'${encodeURIComponent(tempName)}'`, method: 'GET', headers: { 'Authorization': 'Bearer '+token } }, null);
    const sp = JSON.parse(s.raw); const ex = sp.items && sp.items[0];
    if (!ex) throw new Error('Existente não achado');
    return { assetId: ex.id, customerKey: ex.customerKey, existing: true };
  }
  throw new Error(`POST (${r.status}): ${JSON.stringify(p).slice(0,300)}`);
}

async function getEsId(token, assetId) {
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets/${assetId}`, method: 'GET', headers: { 'Authorization': 'Bearer '+token } }, null);
  const p = JSON.parse(r.raw);
  return { esId: p.legacyData && p.legacyData.legacyId ? String(p.legacyData.legacyId) : null, customerKey: p.customerKey };
}

async function putRename(token, assetId, customerKey, finalName, html) {
  const payload = JSON.stringify({ id: assetId, customerKey, name: finalName, assetType: { name: 'htmlemail', id: 208 }, views: { html: { content: html }, subjectline: { content: 'De $0,82 pra $750/mês.' } }, category: { id: CAT_CAMP } });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets/${assetId}`, method: 'PUT', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length } }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 200 || r.status === 201) return p;
  throw new Error(`PUT (${r.status}): ${JSON.stringify(p).slice(0,300)}`);
}

async function main() {
  console.log('\n==============================================');
  console.log(' NAM0002 — 4 emails Dia dos Namorados');
  console.log('==============================================\n');

  const token = await getToken();
  console.log('✓ Token Finclass\n');

  process.stdout.write('Upload imagem Felipe Isaac... ');
  const imgUrl = await uploadImg(token);
  console.log('✓\n  →', imgUrl, '\n');

  const results = [];

  // Assets já criados — só PUT para corrigir o HTML
  const EXISTING = [
    { assetId: 41292, esId: '31896', label: 'CARRINHO ABANDONADO', name: 'CARRINHO' },
    { assetId: 41293, esId: '31897', label: 'LEADS FINCLASS',      name: 'LEADS FIN' },
    { assetId: 41294, esId: '31898', label: 'EX ASSINANTES',       name: 'EX ASSINANTES' },
    { assetId: 41295, esId: '31899', label: 'HOTLIST ANV0006',     name: 'HOTLIST ANV0006' },
  ];

  for (let i = 0; i < EXISTING.length; i++) {
    const ex = EXISTING[i];
    const base = BASES[i];
    const html = buildHtml(imgUrl, base.url);

    // Salvar preview local atualizado
    const fname = `2026-06-10-finclass-campanha-nam0002-${base.name.toLowerCase().replace(/ /g,'-')}.html`;
    fs.writeFileSync(path.join(OUT, fname), html, 'utf8');

    const finalName = `[${TIPO}][${ex.esId}][EML][${DATE}][${CAMPAIGN}][${ex.name}]`;
    console.log(`── ${ex.label}`);
    process.stdout.write(`   PUT ${ex.assetId} → "${finalName}"... `);
    const { customerKey } = await getEsId(token, ex.assetId);
    await putRename(token, ex.assetId, customerKey, finalName, html);
    console.log('✓');

    results.push({ label: ex.label, assetId: ex.assetId, esId: ex.esId, name: finalName });
  }

  console.log('==============================================');
  console.log(' RESUMO FINAL');
  console.log('==============================================');
  for (const r of results) {
    console.log(`\n  ${r.label}`);
    console.log(`    CB Asset : ${r.assetId}`);
    console.log(`    ES ID    : ${r.esId}`);
    console.log(`    Nome     : ${r.name}`);
  }
  console.log('');
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
