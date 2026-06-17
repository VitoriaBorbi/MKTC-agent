#!/usr/bin/env node
'use strict';
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUBDOMAIN     = 'mcn29v1t3hsj32w921hh7z9yz2xm';
const CLIENT_ID     = 'xrttn26q5nobbq3ty5vsthgw';
const CLIENT_SECRET = 'kd2cmIW3Gufk00wfB7pIXjvu';
const MID_HUB       = '518005749';
const CAT_HUB       = 320766;
const DATE          = '20260617';
const TIPO          = 'TRX';

const TEMPLATE = fs.readFileSync(path.join(__dirname, '../brands/faculdade-hub/templates/super-premium.html'), 'utf8');
const OUT = path.join(__dirname, '../output');

const SUBJECT   = 'Bem-vindo(a) à Faculdade HUB — suas credenciais de acesso';
const PREHEADER = 'Confira seu e-mail institucional e os próximos passos';

// ── Paleta Hub ────────────────────────────────────────────────────────────────
const AMBER = '#8B6C3E';
const SAGE  = '#dfe1d9';

// ── HTML helpers ──────────────────────────────────────────────────────────────
function p(t) {
  return `<p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:17px;color:#000000;line-height:1.85;">${t}</p>`;
}
function ps(t) {
  return `<p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#333333;line-height:1.75;">${t}</p>`;
}
function secHeader(title) {
  return `<p style="margin:28px 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:${AMBER};line-height:1.4;">&#9632; ${title}</p>
<table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 18px 0;"><tr><td style="background-color:${SAGE};height:1px;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}
function warningBox(text) {
  return `<table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:4px 0 22px 0;"><tr><td style="background-color:#FEF8EE;border:1px solid #D4A847;border-radius:4px;padding:14px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#7A5C30;font-style:italic;line-height:1.7;">${text}</td></tr></table>`;
}
function credBox() {
  return `<table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 26px 0;"><tr><td style="background-color:#F7F6F2;border-left:4px solid ${AMBER};padding:20px 24px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 3px 0;font-size:13px;color:#888888;line-height:1.4;">E-mail institucional:</p>
<p style="margin:0 0 18px 0;font-size:18px;font-weight:bold;color:#000000;line-height:1.3;">%%email_institucional%%</p>
<p style="margin:0 0 3px 0;font-size:13px;color:#888888;line-height:1.4;">Senha de acesso:</p>
<p style="margin:0;font-size:18px;font-weight:bold;color:#000000;line-height:1.3;">%%senha_acesso%%</p>
</td></tr></table>`;
}
function linkRow(href, label) {
  return `<p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#000000;line-height:1.6;">&#9632;&nbsp; <a href="${href}" style="color:${AMBER};text-decoration:underline;">${label}</a></p>`;
}

// ── Corpo HTML ────────────────────────────────────────────────────────────────
// REGRA HUB: NUNCA usar %%FirstName%%. Usar %%nome%% (campo da DE).
function buildCorpo() {
  return [
    p('Olá, <strong>%%nome%%</strong>!'),
    p('É com muita alegria que damos as boas-vindas a você à <strong>Faculdade HUB</strong>! Você foi um dos <strong>1.000 primeiros inscritos</strong> na promoção de Aniversário do MyHUB.IA e conquistou uma <strong>bolsa integral</strong> para cursar um MBA conosco. Parabéns por essa conquista — ela é reflexo do seu comprometimento com o aprendizado e com o seu desenvolvimento.'),

    secHeader('Próximo passo: confirmação do pré-requisito'),

    p('Para ingressar no MBA, é necessário possuir <strong>graduação completa</strong> em qualquer área do conhecimento.'),
    p('&#9632;&nbsp; <strong>Se você já é graduado(a):</strong> encaminhe um novo e-mail para <a href="mailto:secretaria@faculdadehub.com" style="color:${AMBER};">secretaria@faculdadehub.com</a> com a cópia do seu <strong>diploma ou certificado de conclusão</strong> em anexo, para que possamos dar continuidade ao seu processo de matrícula.'.replace('${AMBER}', AMBER)),
    p('&#9632;&nbsp; <strong>Se ainda não concluiu a graduação:</strong> não se preocupe! Oferecemos a opção de <strong>Extensão Universitária</strong>, que garante seu desenvolvimento profissional e acadêmico com certificação enquanto o requisito para o MBA ainda não é atendido.'),
    warningBox('Por gentileza, não responda diretamente a este e-mail. Para envio de documentos ou dúvidas, utilize o endereço indicado acima.'),

    secHeader('Seu E-mail Institucional'),

    p('Criamos um e-mail institucional exclusivo para você, que será utilizado para acessar as plataformas da Faculdade HUB:'),
    credBox(),

    secHeader('Acesso ao Ambiente Virtual de Aprendizagem (AVA)'),

    p('Após a confirmação da sua titulação, você terá acesso completo às plataformas abaixo:'),
    `<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#000000;line-height:1.6;">Plataforma de Aulas (LMS)</p>`,
    linkRow('https://lms.faculdadehub.com.br/', 'https://lms.faculdadehub.com.br/'),
    ps('Usuário: seu e-mail institucional acima<br/>Senha: seu CPF (somente números, sem pontos ou traços)'),

    `<p style="margin:16px 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#000000;line-height:1.6;">Portal do Aluno</p>`,
    linkRow('https://grupoprimo.educacional24x7.com.br/advance4/advance4portal/pages/adm/login.php?db=0150', 'Portal do Aluno — Faculdade HUB'),
    ps('Usuário: CPF sem pontuação<br/>Senha: CPF sem pontuação'),
    warningBox('O acesso ao Portal do Aluno será liberado após a confirmação da sua titulação.'),

    p('Estamos à disposição para qualquer esclarecimento e ansiosos para ter você em nossa comunidade. Seja bem-vindo(a) à Faculdade HUB — onde o aprendizado transforma trajetórias!'),
  ].join('\n');
}

// ── Text content (OBRIGATÓRIO Hub — CAN-SPAM) ─────────────────────────────────
// Deve conter endereço físico + %%profile_center_url%% para passar validação SFMC Hub
const TEXT_CONTENT = `Olá, %%nome%%!

É com muita alegria que damos as boas-vindas a você à Faculdade HUB! Você foi um dos 1.000 primeiros inscritos na promoção de Aniversário do MyHUB.IA e conquistou uma bolsa integral para cursar um MBA conosco.

PRÓXIMO PASSO: CONFIRMAÇÃO DO PRÉ-REQUISITO

Para ingressar no MBA, é necessário possuir graduação completa em qualquer área do conhecimento.

Se você já é graduado(a): encaminhe um novo e-mail para secretaria@faculdadehub.com com cópia do seu diploma ou certificado de conclusão em anexo.

Se ainda não concluiu a graduação: oferecemos a opção de Extensão Universitária com certificação.

Por gentileza, não responda diretamente a este e-mail. Para envio de documentos ou dúvidas, utilize o endereço indicado acima.

SEU E-MAIL INSTITUCIONAL

E-mail institucional: %%email_institucional%%
Senha de acesso: %%senha_acesso%%

ACESSO AO AVA (após confirmação da titulação)

Plataforma de Aulas (LMS): https://lms.faculdadehub.com.br/
Usuário: seu e-mail institucional | Senha: CPF sem pontuação

Portal do Aluno: https://grupoprimo.educacional24x7.com.br/advance4/advance4portal/pages/adm/login.php?db=0150
Usuário: CPF sem pontuação | Senha: CPF sem pontuação

O acesso ao Portal do Aluno será liberado após a confirmação da sua titulação.

Estamos à disposição para qualquer esclarecimento. Seja bem-vindo(a) à Faculdade HUB!

Atenciosamente,
Secretaria Acadêmica — Faculdade HUB | Grupo Primo

---
Atualizar perfil: %%profile_center_url%%
Cancelar inscrição: %%=CloudPagesURL(31, 'email', emailaddr, 'jobID', jobid, 'emailName', emailname_)=%%

%%Member_Busname%% %%Member_Addr%%, %%Member_City%%, %%Member_State%%, %%Member_PostalCode%% %%Member_Country%%`;

function buildHtml() {
  const corpo = buildCorpo();
  return TEMPLATE
    .replace(/\{\{email_subject\}\}/g,    SUBJECT)
    .replace(/\{\{email_preheader\}\}/g,  PREHEADER)
    .replace(/\{\{email_hero_html\}\}/g,  '')
    .replace(/\{\{email_corpo\}\}/g,      corpo)
    .replace(/\{\{email_cta_texto\}\}/g,  'Acessar Plataforma de Aulas')
    .replace(/\{\{email_cta_url\}\}/g,    'https://lms.faculdadehub.com.br/')
    .replace(/\{\{email_assinatura\}\}/g, 'Atenciosamente,<br/><strong>Secretaria Acadêmica — Faculdade HUB | Grupo Primo</strong>');
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
  const b = JSON.stringify({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET, account_id: MID_HUB });
  const r = await req({ hostname: SUBDOMAIN+'.auth.marketingcloudapis.com', path: '/v2/token', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, b);
  const p = JSON.parse(r.raw); if (r.status !== 200) throw new Error('Auth: '+r.raw);
  return p.access_token;
}

async function postAsset(token, name, html) {
  // views.text.content incluído no POST — requisito Hub para passar validação CAN-SPAM
  const payload = JSON.stringify({
    name,
    assetType: { name: 'htmlemail', id: 208 },
    views: {
      html: { content: html },
      subjectline: { content: SUBJECT },
      text: { content: TEXT_CONTENT },
    },
    category: { id: CAT_HUB }
  });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({
    hostname: SUBDOMAIN+'.rest.marketingcloudapis.com',
    path: '/asset/v1/content/assets', method: 'POST',
    headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length }
  }, buf);
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
  const payload = JSON.stringify({
    id: assetId, customerKey, name: finalName,
    assetType: { name: 'htmlemail', id: 208 },
    views: {
      html: { content: html },
      subjectline: { content: SUBJECT },
      text: { content: TEXT_CONTENT },
    },
    category: { id: CAT_HUB }
  });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({
    hostname: SUBDOMAIN+'.rest.marketingcloudapis.com',
    path: `/asset/v1/content/assets/${assetId}`, method: 'PUT',
    headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length }
  }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 200 || r.status === 201) return p;
  throw new Error(`PUT (${r.status}): ${JSON.stringify(p).slice(0,400)}`);
}

async function main() {
  console.log('\n================================================');
  console.log(' Hub — Boas-Vindas MBA Bolsistas');
  console.log('================================================');
  console.log('\n  Variáveis DE (campos a criar na DE):');
  console.log('  - %%nome%%               → nome completo do aluno');
  console.log('  - %%email_institucional%% → ex: nome.sobrenome@faculdadehub.edu.br');
  console.log('  - %%senha_acesso%%        → senha inicial de acesso\n');
  console.log('  Regras Hub aplicadas:');
  console.log('  ✓ Sem %%FirstName%%');
  console.log('  ✓ views.text.content incluído no POST e PUT\n');

  // Checklist de segurança
  const html = buildHtml();
  if (/%%FirstName%%/i.test(html)) { console.error('ABORTADO: %%FirstName%% encontrado no HTML!'); process.exit(1); }
  if (!TEXT_CONTENT.includes('%%Member_Addr%%')) { console.error('ABORTADO: endereço físico faltando no text content!'); process.exit(1); }
  if (!TEXT_CONTENT.includes('%%profile_center_url%%')) { console.error('ABORTADO: profile_center_url faltando no text content!'); process.exit(1); }
  console.log('  ✓ Checklist Hub OK\n');

  fs.writeFileSync(path.join(OUT, '2026-06-17-hub-bvmba001-bolsistas.html'), html, 'utf8');

  const token = await getToken();
  console.log('✓ Token Hub BU\n');

  const tempName = 'HUB-BVMBA001-BOASVINDAS-TEMP';
  process.stdout.write(`POST "${tempName}"... `);
  const { assetId, customerKey: ck0, existing } = await postAsset(token, tempName, html);
  console.log(`CB: ${assetId}${existing ? ' (existente)' : ' ✓'}`);

  process.stdout.write('ES ID... ');
  const { esId, customerKey } = await getEsId(token, assetId);
  console.log(`ES: ${esId}`);

  const finalName = `[${TIPO}][${esId}][EML][${DATE}][BVMBA001][BOLSISTAS HUB]`;
  process.stdout.write(`Rename → "${finalName}"... `);
  await putAsset(token, assetId, customerKey || ck0, finalName, html);
  console.log('✓\n');

  console.log('================================================');
  console.log(' RESULTADO');
  console.log('================================================');
  console.log(`  Subject  : ${SUBJECT}`);
  console.log(`  CB Asset : ${assetId}`);
  console.log(`  ES ID    : ${esId}`);
  console.log(`  Nome     : ${finalName}`);
  console.log(`  Preview  : email-agent/output/2026-06-17-hub-bvmba001-bolsistas.html`);
  console.log('');
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
