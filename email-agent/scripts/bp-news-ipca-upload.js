#!/usr/bin/env node
'use strict';
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUBDOMAIN     = 'mcn29v1t3hsj32w921hh7z9yz2xm';
const CLIENT_ID     = 'xrttn26q5nobbq3ty5vsthgw';
const CLIENT_SECRET = 'kd2cmIW3Gufk00wfB7pIXjvu';
const MID_BP        = '518006235';
const CAT_EMAIL     = 320764;
const CAT_IMG       = 320778;
const DATE          = '20260619';
const TIPO          = 'AQU';
const CAMPAIGN      = 'NEWS-BP';

const TEMPLATE = fs.readFileSync(path.join(__dirname, '../brands/bruno-perini/templates/news.html'), 'utf8');
const IMG_FILE  = 'C:/Users/vitoria.esteves/AppData/Local/Temp/docx_work/media2/image1.png';
const IMG_NAME  = 'BP-NEWS-20260619-ipca-headline';
const OUT       = path.join(__dirname, '../output');

const SUBJECT   = 'Será que ainda veremos IPCA + 9%?';
const PREHEADER = 'O Tesouro IPCA 2032 chegou a 8,51% ao ano. O que esse nível sinaliza?';

function imgBlock(url) {
  return `<table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:4px 0 28px 0;">
  <tr><td align="center" style="padding:0;">
    <img src="${url}" alt="Tesouro IPCA+ passa de 8,5% e atinge recorde da série" width="520" border="0"
         style="display:block;margin:0 auto;width:100%;max-width:520px;height:auto;" />
  </td></tr>
</table>`;
}

function buildCorpo(imgUrl) {
  function p(t) { return `<p style="margin:0 0 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.8;">${t}</p>`; }

  return [
    p('Nos &uacute;ltimos dias, o Tesouro IPCA 2032 atingiu uma marca que n&atilde;o passa despercebida: o t&iacute;tulo chegou a oferecer IPCA + 8,51% ao ano.'),
    imgBlock(imgUrl),
    p('Para colocar essa movimenta&ccedil;&atilde;o em perspectiva, h&aacute; apenas dois meses o mesmo papel pagava IPCA + 7,43%. Em um intervalo muito curto, o investidor passou a exigir mais de 1 ponto percentual adicional de juro real para emprestar dinheiro ao governo brasileiro.'),
    p('<strong>Mas o que isso significa na pr&aacute;tica?</strong>'),
    p('Se um investidor aplicasse R$&nbsp;10 mil nesse t&iacute;tulo hoje e carregasse o investimento at&eacute; o vencimento, teria algo pr&oacute;ximo de R$&nbsp;22 mil ao final do per&iacute;odo. Descontando a infla&ccedil;&atilde;o acumulada, o ganho real ainda seria expressivo, com patrim&ocirc;nio equivalente a quase R$&nbsp;17 mil em valores de hoje.'),
    p('Isso levanta uma quest&atilde;o importante: com uma renda fixa oferecendo retornos t&atilde;o elevados, qual &eacute; o incentivo para assumir os riscos de empreender, investir em novos neg&oacute;cios ou alocar recursos em projetos produtivos?'),
    p('A resposta n&atilde;o est&aacute; apenas na rentabilidade do investimento, mas no ambiente econ&ocirc;mico que produz taxas t&atilde;o altas.'),
    p('Mesmo ap&oacute;s a redu&ccedil;&atilde;o da Selic anunciada na &uacute;ltima quarta-feira, o Brasil continua liderando os rankings globais de juros reais. Nossa taxa permanece v&aacute;rias vezes acima da observada em outros pa&iacute;ses emergentes, superando economias que tamb&eacute;m enfrentam desafios fiscais e pol&iacute;ticos.'),
    p('Esse cen&aacute;rio costuma ser interpretado como um sinal de desconfian&ccedil;a.'),
    p('&Eacute; verdade que o Brasil n&atilde;o &eacute; o pa&iacute;s mais endividado do mundo. Tamb&eacute;m &eacute; verdade que d&eacute;ficits fiscais fazem parte da realidade de praticamente todas as grandes economias. O problema est&aacute; na combina&ccedil;&atilde;o entre o tamanho da d&iacute;vida e o custo para financi&aacute;-la.'),
    p('Hoje, o Brasil possui uma rela&ccedil;&atilde;o d&iacute;vida/PIB semelhante &agrave; de muitos pa&iacute;ses desenvolvidos. A diferen&ccedil;a &eacute; que pa&iacute;ses ricos normalmente conseguem se financiar pagando juros muito baixos. J&aacute; o Brasil precisa oferecer uma remunera&ccedil;&atilde;o bastante elevada para atrair compradores para sua d&iacute;vida.'),
    p('Quando o governo &eacute; obrigado a pagar mais de 8% ao ano acima da infla&ccedil;&atilde;o para captar recursos, o mercado est&aacute; enviando uma mensagem clara: existe uma percep&ccedil;&atilde;o de risco que precisa ser compensada.'),
    p('Por isso, a taxa do Tesouro IPCA n&atilde;o deve ser vista apenas como uma oportunidade de investimento. Ela tamb&eacute;m funciona como um term&ocirc;metro da confian&ccedil;a dos investidores na trajet&oacute;ria fiscal e econ&ocirc;mica do pa&iacute;s.'),
    p('Talvez o dado mais impressionante seja que os t&iacute;tulos indexados &agrave; infla&ccedil;&atilde;o voltaram para patamares semelhantes aos observados durante o auge da crise econ&ocirc;mica do governo Dilma Rousseff, per&iacute;odo que culminou na maior recess&atilde;o da hist&oacute;ria da Rep&uacute;blica.'),
    p('Independentemente da vis&atilde;o pol&iacute;tica de cada um, o mercado parece estar precificando um grau de incerteza que n&atilde;o v&iacute;amos h&aacute; muitos anos.'),
    p('A pergunta que fica &eacute;: estamos pr&oacute;ximos do limite ou ainda veremos t&iacute;tulos p&uacute;blicos pagando IPCA + 9%?'),
  ].join('\n');
}

function buildHtml(imgUrl) {
  return TEMPLATE
    .replace(/\{\{email_subject\}\}/g,     () => SUBJECT)
    .replace(/\{\{email_preheader\}\}/g,   () => PREHEADER)
    .replace(/\{\{email_corpo\}\}/g,       () => buildCorpo(imgUrl))
    .replace(/\{\{email_assinatura\}\}/g,  () => 'Abra&ccedil;os,<br/><strong>Bruno Perini</strong>');
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
  const b = JSON.stringify({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET, account_id: MID_BP });
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

async function postAsset(token, name, html) {
  const payload = JSON.stringify({ name, assetType: { name: 'htmlemail', id: 208 }, views: { html: { content: html }, subjectline: { content: SUBJECT } }, category: { id: CAT_EMAIL } });
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
  console.log(' Bruno Perini — News IPCA');
  console.log('================================================\n');

  const token = await getToken();
  console.log('✓ Token Bruno Perini\n');

  process.stdout.write('Upload imagem... ');
  const imgUrl = await uploadImg(token);
  console.log('✓\n  →', imgUrl, '\n');

  const html    = buildHtml(imgUrl);
  const outFile = `${DATE}-bp-news-ipca.html`;
  fs.writeFileSync(path.join(OUT, outFile), html, 'utf8');
  console.log(`✓ HTML salvo → ${outFile}\n`);

  process.stdout.write('POST asset... ');
  const { assetId, customerKey: ck0 } = await postAsset(token, `BP-NEWS-IPCA-${DATE}-TEMP`, html);
  console.log(`CB: ${assetId}`);

  process.stdout.write('GET ES ID... ');
  const { esId, customerKey } = await getEsId(token, assetId);
  console.log(`ES: ${esId}`);

  const finalName = `[${TIPO}][${esId}][EML][${DATE}][${CAMPAIGN}][IPCA-9PCT BP]`;
  process.stdout.write('PUT rename... ');
  await putAsset(token, assetId, customerKey || ck0, finalName, html);
  console.log('✓\n');

  console.log('================================================');
  console.log(' RESULTADO');
  console.log('================================================');
  console.log(`  Subject  : ${SUBJECT}`);
  console.log(`  CB Asset : ${assetId}`);
  console.log(`  ES ID    : ${esId}`);
  console.log(`  Nome     : ${finalName}`);
  console.log(`  Preview  : email-agent/output/${outFile}\n`);
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
