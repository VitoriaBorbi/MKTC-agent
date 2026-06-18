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
const DATE          = '20260621';
const TIPO          = 'VND';
const CAMPAIGN      = 'NAM0002';

const TEMPLATE = fs.readFileSync(path.join(__dirname, '../brands/finclass/templates/campanha.html'), 'utf8');
const OUT      = path.join(__dirname, '../output');

const IMGS = [
  { file: 'C:/Users/vitoria.esteves/AppData/Local/Temp/docx_work/media/image1.png', name: 'FIN-NAM0002-20260621-dep-kaue',        alt: 'Depoimento Kauê — Finclass' },
  { file: 'C:/Users/vitoria.esteves/AppData/Local/Temp/docx_work/media/image2.png', name: 'FIN-NAM0002-20260621-dep-guilherme',   alt: 'Depoimento Guilherme — Finclass' },
  { file: 'C:/Users/vitoria.esteves/AppData/Local/Temp/docx_work/media/image3.png', name: 'FIN-NAM0002-20260621-dep-pedro',       alt: 'Depoimento Pedro Augusto — Finclass' },
];

const SUBJECT   = 'Últimos dias com 50% de DESCONTO!';
const PREHEADER = 'Clique antes que expire.';

const BASES = [
  { key: 'BCAR',     pfx: 'FIN-VIN-EML-X-BCAR-20260615-ORG-NAM0002-AS-EML_BS_CAR_20260615_',           utm: 'BASECARRINHOABANDONADO' },
  { key: 'BFIN',     pfx: 'FIN-VIN-EML-X-BFIN-20260615-ORG-NAM0002-AS-EML_BS_FIN_20260615_',           utm: 'BASEFINCLASS' },
  { key: 'BEXASSIN', pfx: 'FIN-VIN-EML-X-BEXASSIN-20260615-ORG-NAM0002-AS-EML_BS_EX_20260615_',        utm: 'BASEEXASSINANTES' },
  { key: 'BHL',      pfx: 'FIN-VIN-EML-X-BHL-20260615-ORG-NAM0002-AS-EML_BS_ANV0006_20260615_',        utm: 'BASEHOTLIST' },
];

function ampBlock(base) {
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
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="%%=redirectto(@link_tag)=%%" style="height:54px;v-text-anchor:middle;width:320px;" arcsize="50%" fillcolor="#00E7F9" stroked="f"><w:anchorlock/><center style="color:#000000;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;">QUERO GOVERNAR MEU DINHEIRO</center></v:roundrect><![endif]-->
      <!--[if !mso]><!-->
      <a href="%%=redirectto(@link_tag)=%%" target="_blank"
         style="background-color:#00e7f9;border-radius:40px;color:#000000;display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:54px;text-align:center;text-decoration:none;width:320px;letter-spacing:0.5px;-webkit-text-size-adjust:none;mso-hide:all;">QUERO GOVERNAR MEU DINHEIRO</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

function imgBlock(url, alt) {
  return `<table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:4px 0 28px 0;">
  <tr><td align="center" style="padding:0;">
    <img src="${url}" alt="${alt}" width="380" border="0"
         style="display:block;margin:0 auto;width:100%;max-width:380px;height:auto;" />
  </td></tr>
</table>`;
}

function buildCorpo(urls) {
  function p(t) { return `<p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.8;">${t}</p>`; }
  function bullets(items) {
    return `<p style="margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1a1a1a;line-height:2;">` +
      items.map(i => `&bull;&nbsp;${i}`).join('<br/>') + `</p>`;
  }

  return [
    p('%%=v(@line)=%%'),
    p('Seu dinheiro acordou hoje.'),
    p('E algu&eacute;m decidiu por ele.'),
    p('Talvez n&atilde;o voc&ecirc;. Mas tenha certeza:'),
    p('<strong>TODO DINHEIRO VIVE SOB UM REGIME.</strong>'),
    p('N&atilde;o existe deixar parado... &ldquo;depois eu vejo&rdquo;.'),
    p('Ou ele vive sob regras claras. Ou vive sob o caos.'),
    p('Sem regras claras:'),
    bullets(['o dinheiro entra', 'se mistura', 'fica parado', 'perde valor', 'gera ansiedade']),
    p('<strong>E ningu&eacute;m sabe exatamente quem manda.</strong>'),
    p('Agora imagine o oposto.'),
    p('Imagine abrir sua conta e pensar:'),
    `<table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px 0;"><tr><td style="background-color:#f0fdff;border-left:4px solid #00e7f9;padding:18px 20px;font-family:Arial,Helvetica,sans-serif;font-size:17px;color:#0a0e27;font-style:italic;font-weight:bold;line-height:1.5;">&ldquo;Eu sei exatamente o que fazer pra multiplicar meu dinheiro acima da infla&ccedil;&atilde;o.&rdquo;</td></tr></table>`,
    p('Saber:'),
    bullets(['quais ativos te protegem', 'quais geram renda']),
    p('<strong>ISSO &Eacute; DEMOCRACIA FINANCEIRA.</strong>'),
    p('Dentro da Finclass, voc&ecirc; aprende a governar o seu dinheiro como um sistema profissional&hellip;'),
    p('<strong>E, assinando hoje, voc&ecirc; tem 50% de desconto para acessar mais de 85 cursos, carteiras recomendadas, an&aacute;lises constantes e b&ocirc;nus especiais que ajudam voc&ecirc; a estruturar sua vida financeira desde o in&iacute;cio do ano.</strong>'),
    p('Tudo em um &uacute;nico lugar, pensado para quem quer investir melhor, com mais seguran&ccedil;a e menos d&uacute;vida.'),
    inlineCTA(),
    p('<strong>E se voc&ecirc; acha que precisa de muito tempo pra ter algum resultado, veja o que disse o Kau&ecirc; ap&oacute;s alguns meses por aqui:</strong>'),
    imgBlock(urls[0], IMGS[0].alt),
    p('<strong>Ou ent&atilde;o o Guilherme, ap&oacute;s 1 ano e meio na Finclass:</strong>'),
    imgBlock(urls[1], IMGS[1].alt),
    p('<strong>Ou, por &uacute;ltimo, o que aconteceu com o Pedro Augusto, em menos de 12 meses:</strong>'),
    imgBlock(urls[2], IMGS[2].alt),
    p('Mas, mesmo deixando os depoimentos de lado, existe uma regra simples no mundo real que governa silenciosamente a vida financeira de todo mundo:'),
    p('<strong>Ou voc&ecirc; aprende a lidar com dinheiro.<br/>Ou algu&eacute;m vai ganhar dinheiro em cima da sua ignor&acirc;ncia.</strong>'),
    p('N&atilde;o existe terceira op&ccedil;&atilde;o.'),
    p('Voc&ecirc; j&aacute; sentiu isso, mesmo que nunca tenha colocado em palavras.'),
    p('Quando paga juros sem entender direito.<br/>Quando aceita um rendimento baixo &ldquo;porque &eacute; mais seguro&rdquo;.<br/>Quando compra algo achando que est&aacute; investindo.<br/>Quando deixa o dinheiro parado e ele encolhe mais r&aacute;pido do que deveria.'),
    p('<strong>Ignor&acirc;ncia financeira n&atilde;o &eacute; neutra.</strong>'),
    p('Ela tem custo, e esse custo se repete todos os anos.'),
    p('As pessoas que constroem patrim&ocirc;nio n&atilde;o s&atilde;o g&ecirc;nios.'),
    p('<strong>Na maioria das vezes, s&atilde;o s&oacute; pessoas que decidiram aprender o suficiente para n&atilde;o serem passadas para tr&aacute;s.</strong>'),
    p('Aprender como o dinheiro se multiplica. Como risco funciona. Como o tempo trabalha a favor de quem tem m&eacute;todo.'),
    p('A Finclass existe para isso.'),
    p('L&aacute; dentro voc&ecirc; encontra:'),
    bullets([
      'carteiras organizadas por fun&ccedil;&atilde;o, n&atilde;o por modismo',
      'a&ccedil;&otilde;es, FIIs, renda fixa, investimentos no exterior e prote&ccedil;&atilde;o patrimonial com pap&eacute;is claros',
      'um m&eacute;todo de aloca&ccedil;&atilde;o que elimina improviso',
      'conte&uacute;dos pr&aacute;ticos que explicam o porqu&ecirc; das decis&otilde;es',
      'atualiza&ccedil;&otilde;es constantes para voc&ecirc; n&atilde;o depender de palpite ou manchete',
    ]),
    p('Aprender deixa de ser um peso.<br/>E vira vantagem.'),
    p('Por isso, a oferta continua ativa.'),
    p('<strong>50% OFF na Finclass<br/>para voc&ecirc; terminar 2026 sabendo exatamente onde investir o seu dinheiro,<br/>em vez de deixar ele &agrave; merc&ecirc; de quem entende mais do que voc&ecirc;.</strong>'),
    p('E, al&eacute;m do desconto, voc&ecirc; ainda recebe b&ocirc;nus que ajudam a estruturar sua vida financeira desde j&aacute;:'),
    p('<strong>6 meses de Duo Gourmet</strong> &mdash; o clube que d&aacute; o segundo prato principal por conta da casa em milhares de restaurantes pelo Brasil. Voc&ecirc;s dois pedem, um dos pratos sai de gra&ccedil;a.'),
    p('<strong>Curso Como Financiar Sua Casa dos Sonhos</strong> &mdash; Financiamento, SAC vs. Price, quando financiar vs. alugar, e como pagar menos pela casa pr&oacute;pria.'),
  ].join('\n');
}

function buildHtml(base, urls) {
  let html = TEMPLATE
    .replace(/\{\{email_subject\}\}/g,    () => SUBJECT)
    .replace(/\{\{email_preheader\}\}/g,  () => PREHEADER)
    .replace(/\{\{email_hero_html\}\}/g,  () => '')
    .replace(/\{\{email_corpo\}\}/g,      () => buildCorpo(urls))
    .replace(/\{\{email_cta_texto\}\}/g,  () => 'QUERO GOVERNAR MEU DINHEIRO')
    .replace(/\{\{email_cta_url\}\}/g,    () => '%%=redirectto(@link_tag)=%%')
    .replace(/\{\{email_assinatura\}\}/g, () => 'Abra&ccedil;o,<br/><strong>Time Finclass</strong>');
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

async function uploadImg(token, img) {
  const lookup = async () => {
    const s = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets?$filter=name%20eq%20'${img.name}'`, method: 'GET', headers: { 'Authorization': 'Bearer '+token } }, null);
    const sp = JSON.parse(s.raw); const it = sp.items && sp.items[0];
    if (!it) throw new Error('Imagem não encontrada: '+img.name);
    return it.fileProperties && it.fileProperties.publishedURL || it.publishedURL;
  };
  const b64 = fs.readFileSync(img.file).toString('base64');
  const payload = JSON.stringify({ name: img.name, assetType: { name: 'png', id: 28 }, file: b64, category: { id: CAT_IMG } });
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

const EXISTING = [
  { key: 'BCAR',     assetId: 41430, esId: '31951' },
  { key: 'BFIN',     assetId: 41431, esId: '31952' },
  { key: 'BEXASSIN', assetId: 41432, esId: '31953' },
  { key: 'BHL',      assetId: 41433, esId: '31954' },
];

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n================================================');
  console.log(` Finclass NAM0002 Venda 2 — 4 bases (fix imgs)`);
  console.log('================================================\n');

  const token = await getToken();
  console.log('✓ Token Finclass\n');

  process.stdout.write('Lookup 3 imagens depoimentos... ');
  const urls = [];
  for (const img of IMGS) {
    urls.push(await uploadImg(token, img));
    process.stdout.write('✓ ');
  }
  console.log('\n');

  for (const ex of EXISTING) {
    const base = BASES.find(b => b.key === ex.key);
    console.log(`─── ${base.key}`);
    const html    = buildHtml(base, urls);
    const outFile = `${DATE}-fin-nam0002-venda2-${base.key.toLowerCase()}.html`;
    fs.writeFileSync(path.join(OUT, outFile), html, 'utf8');

    process.stdout.write(`  GET customerKey... `);
    const { customerKey } = await getEsId(token, ex.assetId);
    const finalName = `[${TIPO}][${ex.esId}][EML][${DATE}][${CAMPAIGN}][VENDA2 ${base.key} FIN]`;
    process.stdout.write(`PUT CB ${ex.assetId}... `);
    await putAsset(token, ex.assetId, customerKey, finalName, html);
    console.log('✓');
  }

  console.log('\n✓ Todos atualizados com imagens menores (380px)');
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
