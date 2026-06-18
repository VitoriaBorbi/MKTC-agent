#!/usr/bin/env node
'use strict';
// Fix: %%nome%%, %%email_institucional%%, %%senha_acesso%% → AMPscript AttributeValue()
// Evita "Personalization error" no test send quando a DE ainda não existe
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

// AMPscript para as 3 variáveis da DE
// Dentro de <!-- --> conforme regra Hub
const AMP_BLOCK = `<!--
%%[
  set @nome       = AttributeValue("nome")
  set @email_inst = AttributeValue("email_institucional")
  set @senha      = AttributeValue("senha_acesso")
]%%
-->`;

const TEXT_CONTENT = `Bem-vindo(a) à Faculdade HUB — suas credenciais de acesso

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

function fixHtml(html) {
  // Injetar bloco AMPscript antes do preheader
  html = html.replace('<!-- Preheader oculto -->', AMP_BLOCK + '\n\n  <!-- Preheader oculto -->');
  // Substituir personalization strings por AMPscript v()
  html = html.replace(/%%nome%%/g,               '%%=v(@nome)=%%');
  html = html.replace(/%%email_institucional%%/g, '%%=v(@email_inst)=%%');
  html = html.replace(/%%senha_acesso%%/g,        '%%=v(@senha)=%%');
  return html;
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
  const b = JSON.stringify({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET, account_id: MID_HUB });
  const r = await req({ hostname: SUBDOMAIN+'.auth.marketingcloudapis.com', path: '/v2/token', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, b);
  const p = JSON.parse(r.raw); if (r.status !== 200) throw new Error('Auth: '+r.raw);
  return p.access_token;
}

async function getCustomerKey(token) {
  const r = await req({ hostname: SUBDOMAIN+'.rest.marketingcloudapis.com', path: `/asset/v1/content/assets/${ASSET_ID}`, method: 'GET', headers: { 'Authorization': 'Bearer '+token } }, null);
  const p = JSON.parse(r.raw);
  return p.customerKey;
}

async function putAsset(token, customerKey, html) {
  const payload = JSON.stringify({
    id: ASSET_ID, customerKey,
    name: `[TRX][31921][EML][20260617][BVMBA001][BOLSISTAS HUB]`,
    assetType: { name: 'htmlemail', id: 208 },
    views: {
      html: { content: html },
      subjectline: { content: SUBJECT },
      text: { content: TEXT_CONTENT },
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
  console.log(' Hub BVMBA001 — fix personalization strings');
  console.log('================================================\n');
  console.log('  %%nome%%               → %%=v(@nome)=%%');
  console.log('  %%email_institucional%% → %%=v(@email_inst)=%%');
  console.log('  %%senha_acesso%%        → %%=v(@senha)=%%\n');

  const rawHtml = fs.readFileSync(HTML_FILE, 'utf8');
  const fixedHtml = fixHtml(rawHtml);

  // Salvar HTML corrigido
  fs.writeFileSync(HTML_FILE, fixedHtml, 'utf8');
  console.log('✓ HTML corrigido salvo\n');

  const token = await getToken();
  console.log('✓ Token Hub\n');

  process.stdout.write('GET customerKey... ');
  const customerKey = await getCustomerKey(token);
  console.log(customerKey);

  process.stdout.write(`PUT CB ${ASSET_ID}... `);
  await putAsset(token, customerKey, fixedHtml);
  console.log('✓\n');

  console.log('CB 41335 atualizado. Teste de envio deve passar agora.');
}

main().catch(err => { console.error('\nERRO:', err.message); process.exit(1); });
