import fs from 'fs';
import https from 'https';
import crypto from 'crypto';

const creds = JSON.parse(fs.readFileSync('email-agent/credentials/google-service-account.json', 'utf8'));
const SPREADSHEET_ID = '1soiS9kihONG5jHNm0IxJ9jWVNUM39fYPH0F6PBnO9zE';

function b64url(s) {
  return Buffer.from(s).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
function post(hostname, path, data, headers={}) {
  return new Promise((resolve, reject) => {
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    const req = https.request({hostname, path, method:'POST',
      headers: {'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),...headers}
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(d)); });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

const now = Math.floor(Date.now()/1000);
const header = b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
const payload = b64url(JSON.stringify({
  iss: creds.client_email,
  scope: 'https://www.googleapis.com/auth/spreadsheets',
  aud: 'https://oauth2.googleapis.com/token',
  exp: now+3600, iat: now
}));
const sign = crypto.createSign('RSA-SHA256');
sign.update(`${header}.${payload}`);
const sig = sign.sign(creds.private_key,'base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
const jwt = `${header}.${payload}.${sig}`;

const tokenResp = await post('oauth2.googleapis.com', '/token',
  `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  {'Content-Type':'application/x-www-form-urlencoded'});
const token = JSON.parse(tokenResp).access_token;
if (!token) { console.error('Token failed:', tokenResp); process.exit(1); }
console.log('✓ Token OK');

const S = 0; // sheetId Fila

const R = (si, ei, sc, ec) => ({sheetId:S, startRowIndex:si, endRowIndex:ei, startColumnIndex:sc, endColumnIndex:ec});
const COL = (si, ei, px) => ({updateDimensionProperties:{range:{sheetId:S,dimension:'COLUMNS',startIndex:si,endIndex:ei},properties:{pixelSize:px},fields:'pixelSize'}});
const CF = (idx, formula, bgRed, bgGreen, bgBlue, fgWhite=false) => ({
  addConditionalFormatRule: { index: idx, rule: {
    ranges: [R(1,1000,0,33)],
    booleanRule: {
      condition: {type:'CUSTOM_FORMULA', values:[{userEnteredValue: formula}]},
      format: {
        backgroundColor: {red:bgRed, green:bgGreen, blue:bgBlue},
        ...(fgWhite ? {textFormat:{foregroundColor:{red:1,green:1,blue:1}}} : {})
      }
    }
  }}
});

const requests = [
  // Freeze
  {updateSheetProperties:{properties:{sheetId:S,gridProperties:{frozenRowCount:1,frozenColumnCount:1}},fields:'gridProperties.frozenRowCount,gridProperties.frozenColumnCount'}},

  // Header: navy bg, white bold
  {repeatCell:{
    range: R(0,1,0,33),
    cell:{userEnteredFormat:{
      backgroundColor:{red:0.035,green:0.184,blue:0.310},
      textFormat:{foregroundColor:{red:1,green:1,blue:1},bold:true,fontSize:10},
      horizontalAlignment:'CENTER', verticalAlignment:'MIDDLE', wrapStrategy:'CLIP'
    }},
    fields:'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
  }},

  // Row heights
  {updateDimensionProperties:{range:{sheetId:S,dimension:'ROWS',startIndex:0,endIndex:1},properties:{pixelSize:44},fields:'pixelSize'}},
  {updateDimensionProperties:{range:{sheetId:S,dimension:'ROWS',startIndex:1,endIndex:1000},properties:{pixelSize:36},fields:'pixelSize'}},

  // Column widths
  COL(0,1,170),   // A status
  COL(1,2,100),   // B tipo
  COL(2,3,230),   // C nome
  COL(3,4,90),    // D docx_link
  COL(4,5,110),   // E data_envio
  COL(5,6,75),    // F horario
  COL(6,16,145),  // G-P de_envio 1-10
  COL(16,26,145), // Q-Z de_exclusao 1-10
  COL(26,27,120), // AA sfmc_asset_id
  COL(27,28,160), // AB sfmc_send_id
  COL(28,29,230), // AC obs
  COL(29,30,130), // AD template_id
  COL(30,31,110), // AE preview_url
  COL(31,32,110), // AF send_classification
  COL(32,33,110), // AG campanha

  // Data cells: vertical middle, clip
  {repeatCell:{range:R(1,1000,0,33),cell:{userEnteredFormat:{verticalAlignment:'MIDDLE',wrapStrategy:'CLIP'}},fields:'userEnteredFormat(verticalAlignment,wrapStrategy)'}},
  // obs: wrap
  {repeatCell:{range:R(1,1000,28,29),cell:{userEnteredFormat:{wrapStrategy:'WRAP'}},fields:'userEnteredFormat(wrapStrategy)'}},
  // Agent cols (AA, AB, AE): light gray
  {repeatCell:{range:R(1,1000,26,28),cell:{userEnteredFormat:{backgroundColor:{red:0.961,green:0.961,blue:0.961}}},fields:'userEnteredFormat(backgroundColor)'}},
  {repeatCell:{range:R(1,1000,30,31),cell:{userEnteredFormat:{backgroundColor:{red:0.961,green:0.961,blue:0.961}}},fields:'userEnteredFormat(backgroundColor)'}},

  // Dropdowns
  {setDataValidation:{range:R(1,1000,0,1),rule:{condition:{type:'ONE_OF_LIST',values:[
    {userEnteredValue:'rascunho'},{userEnteredValue:'pendente'},{userEnteredValue:'aguardando_aprovacao'},
    {userEnteredValue:'aprovado'},{userEnteredValue:'agendado'},{userEnteredValue:'revisar'},
    {userEnteredValue:'enviado'},{userEnteredValue:'erro_docx'},{userEnteredValue:'erro_html'},
    {userEnteredValue:'erro_upload_sfmc'},{userEnteredValue:'erro_agendamento'}
  ]},showCustomUi:true,strict:false}}},
  {setDataValidation:{range:R(1,1000,1,2),rule:{condition:{type:'ONE_OF_LIST',values:[
    {userEnteredValue:'individual'},{userEnteredValue:'campanha'}
  ]},showCustomUi:true,strict:false}}},
  {setDataValidation:{range:R(1,1000,29,30),rule:{condition:{type:'ONE_OF_LIST',values:[
    {userEnteredValue:'news'},{userEnteredValue:'campanha'},{userEnteredValue:'conteudo'},
    {userEnteredValue:'relatorio'},{userEnteredValue:'comunicado'},{userEnteredValue:'consultor-elite'}
  ]},showCustomUi:true,strict:false}}},

  // Conditional formatting (full row based on col A)
  CF(0, '=$A2="pendente"',             1.0,   0.976, 0.769),
  CF(1, '=$A2="aguardando_aprovacao"', 0.878, 0.933, 1.0),
  CF(2, '=$A2="aprovado"',             0.851, 0.953, 0.851),
  CF(3, '=$A2="agendado"',             0.180, 0.490, 0.196, true),
  CF(4, '=$A2="revisar"',              1.0,   0.878, 0.706),
  CF(5, '=$A2="enviado"',              0.906, 0.906, 0.906),
  CF(6,  '=$A2="erro_docx"',          1.0, 0.878, 0.878),
  CF(7,  '=$A2="erro_html"',          1.0, 0.878, 0.878),
  CF(8,  '=$A2="erro_upload_sfmc"',   1.0, 0.878, 0.878),
  CF(9,  '=$A2="erro_agendamento"',   1.0, 0.878, 0.878),
];

const resp = await post('sheets.googleapis.com',
  `/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
  {requests},
  {Authorization: `Bearer ${token}`}
);
const parsed = JSON.parse(resp);
if (parsed.spreadsheetId) {
  console.log('✅ Formatação aplicada com sucesso!');
} else {
  console.error('❌ Erro:', JSON.stringify(parsed).substring(0, 500));
}
