#!/usr/bin/env node
'use strict';
// Fix v2: GET para inspecionar o que está no CB 41335, depois faz PUT completo
// com AMPscript declarado tanto no HTML quanto no TEXT
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUBDOMAIN     = 'mcn29v1t3hsj32w921hh7z9yz2xm';
const CLIENT_ID     = 'xrttn26q5nobbq3ty5vsthgw';
const CLIENT_SECRET = 'kd2cmIW3Gufk00wfB7pIXjvu';
const MID_HUB       = '518005749';
const CAT_HUB       = 320766;
const ASSET_ID      = 41335;
const SUBJECT       = 'Bem-vindo(a) à Faculdade HUB — suas credenciais de acesso';
const HTML_FILE     = path.join(__dirname, '../output/2026-06-17-hub-bvmba001-bolsistas.html');

// Bloco AMPscript para injetar no HTML (antes de <!-- Preheader oculto -->)
const AMP_HTML_BLOCK = `<!--
%%[
  set @nome       = AttributeValue("nome")
  set @email_inst = AttributeValue("email_institucional")
  set @senha      = AttributeValue("senha_acesso")
]%%
-->`;

// Text version com bloco AMPscript próprio (text ctx é independente do HTML)
const TEXT_CONTENT = `%%[
  set @nome       = AttributeValue("nome")
  set @email_inst = AttributeValue("email_institucional")
  set @senha      = AttributeValue("senha_acesso")
]%%
Bem-vindo(a) à Faculdade HUB — suas credenciais de acesso

Olá, %%=v(@nome)=%%!

É com muita alegria que damos as boas-vindas a você à Faculdade HUB!

PRÓXIMO PASSO: CONFIRMAÇÃO DO PRÉ-REQUISITO

Para ingressar no MBA, é necessário possuir graduação completa em qualquer área do conhecimento.

Se você já é graduado(a): encaminhe um novo e-mail para secretaria@faculdadehub.com com cópia do seu diploma ou certificado de conclusão em anexo.

Se ainda não concluiu a graduação: oferecemos a opção de Extensão Universitária com certificação.

SEU E-MAIL INSTITUCIONAL

E-mail institucional: %%=v(@email_inst)=%%
Senha de acesso: %%=v(@senha)=%%

ACESSO AO AVA (após confirmação da titulação)

Plataforma de Aulas (LMS): https://lms.faculdadehub.com.br/
Usuário: seu e-mail institucional | Senha: CPF sem pontuação

Portal do Aluno: https://grupoprimo.educacional24x7.com.br/advance4/advance4portal/pages/adm/login.php?db=0150
Usuário: CPF sem pontuação | Senha: CPF sem pontuação

Atenciosamente,
Secretaria Acadêmica — Faculdade HUB | Grupo Primo

---
Atualizar perfil: %%profile_center_url%%
Cancelar inscrição: %%=CloudPagesURL(31, 'email', emailaddr, 'jobID', jobid, 'emailName', emailname_)=%%

%%Member_Busname%% %%Member_Addr%%, %%Member_City%%, %%Member_State%%, %%Member_PostalCode%% %%Member_Country%%`;

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

async function getAsset(token) {
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets/${ASSET_ID}`, method: 'GET', headers: { 'Authorization': 'Bearer '+token } }, null);
  return JSON.parse(r.raw);
}

function buildFixedHtml(currentHtml) {
  let html = currentHtml;

  // Se ainda tem o bloco AMPscript da v1, não duplicar
  const alreadyFixed = html.includes('set @email_inst = AttributeValue("email_institucional")');

  if (!alreadyFixed) {
    html = html.replace('<!-- Preheader oculto -->', AMP_HTML_BLOCK + '\n\n  <!-- Preheader oculto -->');
  }

  // Substituir qualquer personalization string remanescente
  html = html.replace(/%%nome%%/g,               '%%=v(@nome)=%%');
  html = html.replace(/%%email_institucional%%/g, '%%=v(@email_inst)=%%');
  html = html.replace(/%%senha_acesso%%/g,        '%%=v(@senha)=%%');

  return html;
}

async function putAsset(token, customerKey, html) {
  const payload = JSON.stringify({
    id: ASSET_ID, customerKey,
    name: `[TRX][31921][EML][20260617][BVMBA001][BOLSISTAS HUB]`,
    assetType: { name: 'htmlemail', id: 208 },
    views: {
      html:        { content: html },
      subjectline: { content: SUBJECT },
      text:        { content: TEXT_CONTENT },
    },
    category: { id: CAT_HUB },
  });
  const buf = Buffer.from(payload, 'utf8');
  const r = await req({
    hostname: SUBDOMAIN+'.rest.marketingcloudapis.com',
    path: `/asset/v1/content/assets/${ASSET_ID}`, method: 'PUT',
    headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Content-Length': buf.length }
  }, buf);
  const p = JSON.parse(r.raw);
  if (r.status === 200 || r.status === 201) return p;
  throw new Error(`PUT (${r.status}): ${JSON.stringify(p).slice(0,400)}`);
}

async function main() {
  console.log('\n================================================');
  console.log(' Hub BVMBA001 — fix v2 (AMPscript em HTML + Text)');
  console.log('================================================\n');

  const token = await getToken();
  console.log('✓ Token Hub\n');

  // GET para inspecionar
  process.stdout.write('GET CB 41335... ');
  const asset = await getAsset(token);
  const currentHtml  = (asset.views && asset.views.html  && asset.views.html.content)  || '';
  const currentText  = (asset.views && asset.views.text  && asset.views.text.content)  || '';
  console.log('ok\n');

  // Diagnóstico
  const htmlHasRaw  = currentHtml.includes('%%email_institucional%%') || currentHtml.includes('%%senha_acesso%%');
  const textHasRaw  = currentText.includes('%%email_institucional%%') || currentText.includes('%%senha_acesso%%');
  const htmlHasAmp  = currentHtml.includes('AttributeValue("email_institucional")');
  const textHasAmp  = currentText.includes('AttributeValue("email_institucional")');

  console.log('  Diagnóstico HTML:');
  console.log(`    Raw %%field%%        : ${htmlHasRaw ? '⚠️  AINDA PRESENTE' : '✓ não encontrado'}`);
  console.log(`    AttributeValue()     : ${htmlHasAmp ? '✓ presente' : '✗ ausente'}`);
  console.log('  Diagnóstico TEXT:');
  console.log(`    Raw %%field%%        : ${textHasRaw ? '⚠️  AINDA PRESENTE' : '✓ não encontrado'}`);
  console.log(`    AttributeValue()     : ${textHasAmp ? '✓ presente' : '✗ ausente'}`);
  console.log('');

  // Rebuild HTML fixado
  const fixedHtml = buildFixedHtml(currentHtml);

  // Verificação final
  const stillRaw = fixedHtml.includes('%%email_institucional%%') || fixedHtml.includes('%%senha_acesso%%');
  if (stillRaw) throw new Error('Ainda há personalization strings raw no HTML após o fix!');
  console.log('✓ HTML sem personalization strings raw\n');

  // Salvar output atualizado
  fs.writeFileSync(HTML_FILE, fixedHtml, 'utf8');
  console.log('✓ Output HTML salvo\n');

  process.stdout.write(`PUT CB ${ASSET_ID}... `);
  await putAsset(token, asset.customerKey, fixedHtml);
  console.log('✓\n');

  console.log('CB 41335 atualizado.');
  console.log('Text version agora tem bloco %%[ set @email_inst = ... ]%% próprio.');
  console.log('\nTente o test send novamente selecionando um assinante.');
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
