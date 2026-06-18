#!/usr/bin/env node
'use strict';
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUBDOMAIN     = 'mcn29v1t3hsj32w921hh7z9yz2xm';
const CLIENT_ID     = 'xrttn26q5nobbq3ty5vsthgw';
const CLIENT_SECRET = 'kd2cmIW3Gufk00wfB7pIXjvu';
const MID_FIN       = '518005767';
const CAT_EMAIL     = 275626;  // campanha Finclass
const CAT_IMG       = 275201;  // imagens Finclass
const DATE          = '20260618';
const TIPO          = 'VND';
const CAMPAIGN      = 'NAM0002';

const TEMPLATE  = fs.readFileSync(path.join(__dirname, '../brands/finclass/templates/campanha.html'), 'utf8');
const IMG_FILE  = 'C:/Users/vitoria.esteves/AppData/Local/Temp/docx_work/media/image1.png';
const IMG_NAME  = 'FIN-NAM0002-20260618-copa-carrinho';
const OUT       = path.join(__dirname, '../output');

const SUBJECT   = 'O Brasil tem 18% de chance de ser Hexa…';
const PREHEADER = 'E tem um jogo que a gente sempre vence.';

// AMPscript — nome + link com JOBID dinâmico
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

  set @jid  = [JobID]
  set @pfx  = "FIN-VIN-EML-X-BCAR-20260617-ORG-NAM0002-AS-EML_BS_CAR_20260617_"
  set @link_tag = concat("https://sl.finclass.com/nam0002-dia-dos-namorados-2026/convite/?pmp=",@pfx,@jid,"&src=",@pfx,@jid,"&sck=",@pfx,@jid,"&utm_medium=BASECARRINHOABANDONADO&utm_source=EMAIL&utm_content=ORGANICO&utm_campaign=NAM0002&utm_term=",@pfx,@jid)
]%%
-->`;

function buildHero(imgUrl) {
  // {{email_hero_html}} fica dentro da <table width="600"> principal → retornar <tr><td>
  return `<tr>
      <td align="center" style="padding:0;background-color:#0a0e27;" bgcolor="#0a0e27">
        <img src="${imgUrl}" alt="Copa do Mundo — Finclass 50% OFF" width="600" height="auto"
             border="0" class="hero-img" style="display:block;width:100%;max-width:600px;height:auto;" />
      </td>
    </tr>`;
}

function buildCorpo() {
  function p(t, extra) {
    return `<p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.8;${extra||''}">${t}</p>`;
  }
  return [
    p('%%=v(@line)=%%'),
    p('Deixa a gente te contar sobre o jogo que o Brasil nunca perdeu.'),
    p('N&atilde;o &eacute; o jogo contra a Coreia, nem contra Camar&otilde;es e nem o que voc&ecirc; vai assistir sexta-feira.'),
    p('<strong>&Eacute; o jogo dos juros compostos.</strong>'),
    p('Enquanto voc&ecirc; est&aacute; de olho no placar, tem gente que est&aacute; de olho em outro n&uacute;mero:'),
    `<p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:48px;font-weight:bold;color:#00E7F9;line-height:1.1;text-align:center;">364,5%</p>`,
    p('<strong>Essa &eacute; a rentabilidade acumulada das carteiras da Finclass desde o in&iacute;cio.</strong>'),
    p('Pra voc&ecirc; ter uma ideia do que isso significa na pr&aacute;tica:'),
    p('<strong>&rarr; Quem aplicou R$&nbsp;10.000 quando a Finclass lan&ccedil;ou suas carteiras teria hoje mais de R$&nbsp;46.450.</strong>'),
    p('<strong>&rarr; Quem aplicou R$&nbsp;1.000 por m&ecirc;s durante 3 anos, seguindo as recomenda&ccedil;&otilde;es, estaria bem na frente do CDI.</strong>'),
    p('<strong>&rarr; Os investimentos internacionais da carteira valorizaram 42,23% s&oacute; nos &uacute;ltimos 12 meses.</strong>'),
    p('<strong>Copa do Mundo tem a cada quatro anos, mas os juros compostos trabalham 365 dias por ano.</strong>'),
    p('<strong>Nos pr&oacute;ximos dias, voc&ecirc; pode entrar na Finclass com 50% de desconto.</strong>'),
    p('Sim, metade do pre&ccedil;o para acessar as mesmas carteiras que acumularam 364% de retorno, +85 cursos com os melhores nomes do mercado financeiro, e um plano de estudo personalizado que come&ccedil;a a funcionar j&aacute; na primeira semana.'),
  ].join('\n');
}

function buildHtml(imgUrl) {
  // Usar função arrow para evitar interpretação de $& como padrão especial do replace()
  let html = TEMPLATE
    .replace(/\{\{email_subject\}\}/g,    () => SUBJECT)
    .replace(/\{\{email_preheader\}\}/g,  () => PREHEADER)
    .replace(/\{\{email_hero_html\}\}/g,  () => buildHero(imgUrl))
    .replace(/\{\{email_corpo\}\}/g,      () => buildCorpo())
    .replace(/\{\{email_cta_texto\}\}/g,  () => 'ENTRAR COM 50% OFF AGORA')
    .replace(/\{\{email_cta_url\}\}/g,    () => '%%=redirectto(@link_tag)=%%')
    .replace(/\{\{email_assinatura\}\}/g, () => 'Abra&ccedil;o,<br/><strong>Time Finclass</strong>');

  // Injetar AMPscript antes do preheader oculto
  html = html.replace('<!-- Preheader oculto -->', AMP_BLOCK + '\n\n  <!-- Preheader oculto -->');
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
  throw new Error('Img upload: '+JSON.stringify(p).slice(0,300));
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
  console.log(' Finclass NAM0002 — Carrinho Abandonado (Copa)');
  console.log(' [fix hero layout]');
  console.log('================================================\n');

  const token = await getToken();
  console.log('✓ Token Finclass\n');

  // Reusar URL da imagem já subida (evitar duplicate)
  process.stdout.write('Lookup imagem existente... ');
  const imgUrl = await uploadImg(token);
  console.log('✓\n  →', imgUrl, '\n');

  const html = buildHtml(imgUrl);
  const outFile = `${DATE}-fin-nam0002-carrinho-copa.html`;
  fs.writeFileSync(path.join(OUT, outFile), html, 'utf8');
  console.log(`✓ HTML salvo → ${outFile}\n`);

  // CB 41412 já existe — fazer PUT direto
  const EXISTING_ASSET_ID = 41412;
  const EXISTING_ES_ID    = '31944';
  process.stdout.write('GET customerKey CB 41412... ');
  const { customerKey } = await getEsId(token, EXISTING_ASSET_ID);
  console.log('ok');

  const finalName = `[${TIPO}][${EXISTING_ES_ID}][EML][${DATE}][${CAMPAIGN}][CARRINHO COPA FIN]`;
  process.stdout.write(`PUT CB ${EXISTING_ASSET_ID}... `);
  await putAsset(token, EXISTING_ASSET_ID, customerKey, finalName, html);
  console.log('✓\n');

  console.log('================================================');
  console.log(' RESULTADO');
  console.log('================================================');
  console.log(`  Subject  : ${SUBJECT}`);
  console.log(`  CB Asset : ${EXISTING_ASSET_ID}`);
  console.log(`  ES ID    : ${EXISTING_ES_ID}`);
  console.log(`  Nome     : ${finalName}`);
  console.log(`  Sender   : Equipe Finclass (194)`);
  console.log(`  Preview  : email-agent/output/${outFile}\n`);
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
