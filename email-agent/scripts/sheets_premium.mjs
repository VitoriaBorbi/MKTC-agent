import fs from 'fs';
import https from 'https';
import crypto from 'crypto';

const creds = JSON.parse(fs.readFileSync('email-agent/credentials/google-service-account.json', 'utf8'));
const SPREADSHEET_ID = '1soiS9kihONG5jHNm0IxJ9jWVNUM39fYPH0F6PBnO9zE';
const S = 0; // sheetId Fila

function b64url(s) {
  return Buffer.from(s).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
function req(hostname, method, path, data, headers={}) {
  return new Promise((resolve, reject) => {
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    const opts = {hostname, path, method,
      headers: {'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),...headers}};
    const r = https.request(opts, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(d)); });
    r.on('error', reject); r.write(body); r.end();
  });
}
function get(hostname, path, headers={}) {
  return new Promise((resolve, reject) => {
    const r = https.request({hostname, path, method:'GET', headers}, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(d));
    });
    r.on('error', reject); r.end();
  });
}

// Auth
const now = Math.floor(Date.now()/1000);
const h = b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
const p = b64url(JSON.stringify({iss:creds.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',exp:now+3600,iat:now}));
const sgn = crypto.createSign('RSA-SHA256');
sgn.update(`${h}.${p}`);
const sig = sgn.sign(creds.private_key,'base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
const jwt = `${h}.${p}.${sig}`;

const tokenResp = await req('oauth2.googleapis.com','POST','/token',
  `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  {'Content-Type':'application/x-www-form-urlencoded'});
const token = JSON.parse(tokenResp).access_token;
if (!token) { console.error('Token failed:', tokenResp); process.exit(1); }
console.log('✓ Token OK');

// Get current sheet to count CF rules
const sheetData = await get('sheets.googleapis.com',
  `/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.conditionalFormats`,
  {Authorization:`Bearer ${token}`});
const sheet = JSON.parse(sheetData).sheets?.find(s => s.conditionalFormats) || {conditionalFormats:[]};
const cfCount = sheet.conditionalFormats?.length || 0;
console.log(`CF rules existentes: ${cfCount}`);

// Helpers
const R = (si,ei,sc,ec) => ({sheetId:S,startRowIndex:si,endRowIndex:ei,startColumnIndex:sc,endColumnIndex:ec});
const COL = (si,ei,px) => ({updateDimensionProperties:{range:{sheetId:S,dimension:'COLUMNS',startIndex:si,endIndex:ei},properties:{pixelSize:px},fields:'pixelSize'}});
const rgb = (hex) => ({ red: parseInt(hex.slice(1,3),16)/255, green: parseInt(hex.slice(3,5),16)/255, blue: parseInt(hex.slice(5,7),16)/255 });

// Status design system
const STATUS = {
  rascunho:             { badge:'#607D8B', row:'#F5F7F8' },
  pendente:             { badge:'#E65100', row:'#FFF3E0' },
  aguardando_aprovacao: { badge:'#00838F', row:'#E0F7FA' },
  aprovado:             { badge:'#2E7D32', row:'#E8F5E9' },
  agendado:             { badge:'#1565C0', row:'#E8EAF6' },
  revisar:              { badge:'#AD1457', row:'#FCE4EC' },
  enviado:              { badge:'#455A64', row:'#ECEFF1' },
};
const ERROS = ['erro_docx','erro_html','erro_upload_sfmc','erro_agendamento'];
const ERRO_BADGE = '#B71C1C';
const ERRO_ROW   = '#FFEBEE';

const requests = [];

// 1. Delete all existing CF rules (highest to lowest)
for (let i = cfCount - 1; i >= 0; i--) {
  requests.push({deleteConditionalFormatRule:{sheetId:S,index:i}});
}

// 2. Freeze
requests.push({updateSheetProperties:{properties:{sheetId:S,gridProperties:{frozenRowCount:1,frozenColumnCount:1}},fields:'gridProperties.frozenRowCount,gridProperties.frozenColumnCount'}});

// 3. Header: full navy
requests.push({repeatCell:{
  range:R(0,1,0,33),
  cell:{userEnteredFormat:{
    backgroundColor:rgb('#092F4F'),
    textFormat:{foregroundColor:{red:1,green:1,blue:1},bold:true,fontSize:9},
    horizontalAlignment:'CENTER',verticalAlignment:'MIDDLE',wrapStrategy:'CLIP'
  }},
  fields:'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
}});

// 3b. Header group accent: DEs (G-P) and exclusão (Q-Z) slightly lighter
requests.push({repeatCell:{
  range:R(0,1,6,26),
  cell:{userEnteredFormat:{backgroundColor:rgb('#0D3D5E')}},
  fields:'userEnteredFormat(backgroundColor)'
}});
// Config cols (AD-AG): accent with cyan hint
requests.push({repeatCell:{
  range:R(0,1,29,33),
  cell:{userEnteredFormat:{backgroundColor:rgb('#083650')}},
  fields:'userEnteredFormat(backgroundColor)'
}});

// 4. Row heights
requests.push({updateDimensionProperties:{range:{sheetId:S,dimension:'ROWS',startIndex:0,endIndex:1},properties:{pixelSize:46},fields:'pixelSize'}});
requests.push({updateDimensionProperties:{range:{sheetId:S,dimension:'ROWS',startIndex:1,endIndex:1000},properties:{pixelSize:36},fields:'pixelSize'}});

// 5. Column widths
requests.push(COL(0,1,165));   // A status
requests.push(COL(1,2,100));   // B tipo
requests.push(COL(2,3,230));   // C nome
requests.push(COL(3,4,85));    // D docx_link
requests.push(COL(4,5,108));   // E data_envio
requests.push(COL(5,6,72));    // F horario
requests.push(COL(6,16,140));  // G-P de_envio 1-10
requests.push(COL(16,26,140)); // Q-Z de_exclusao 1-10
requests.push(COL(26,27,115)); // AA sfmc_asset_id
requests.push(COL(27,28,155)); // AB sfmc_send_id
requests.push(COL(28,29,230)); // AC obs
requests.push(COL(29,30,128)); // AD template_id
requests.push(COL(30,31,108)); // AE preview_url
requests.push(COL(31,32,108)); // AF send_classification
requests.push(COL(32,33,108)); // AG campanha

// 6. Default data cells: middle + clip
requests.push({repeatCell:{
  range:R(1,1000,0,33),
  cell:{userEnteredFormat:{verticalAlignment:'MIDDLE',wrapStrategy:'CLIP',textFormat:{fontSize:10}}},
  fields:'userEnteredFormat(verticalAlignment,wrapStrategy,textFormat)'
}});

// 7. Key data columns: bold (status, nome, data)
requests.push({repeatCell:{range:R(1,1000,0,1),cell:{userEnteredFormat:{textFormat:{bold:true,fontSize:10}}},fields:'userEnteredFormat(textFormat)'}});
requests.push({repeatCell:{range:R(1,1000,2,3),cell:{userEnteredFormat:{textFormat:{bold:true,fontSize:10}}},fields:'userEnteredFormat(textFormat)'}});
requests.push({repeatCell:{range:R(1,1000,4,6),cell:{userEnteredFormat:{textFormat:{bold:true,fontSize:10},horizontalAlignment:'CENTER'}},fields:'userEnteredFormat(textFormat,horizontalAlignment)'}});

// 8. obs: wrap
requests.push({repeatCell:{range:R(1,1000,28,29),cell:{userEnteredFormat:{wrapStrategy:'WRAP'}},fields:'userEnteredFormat(wrapStrategy)'}});

// 9. Agent columns (AA, AB, AE): muted background + italic
requests.push({repeatCell:{
  range:R(1,1000,26,28),
  cell:{userEnteredFormat:{backgroundColor:rgb('#F4F6F8'),textFormat:{italic:true,foregroundColor:rgb('#546E7A')}}},
  fields:'userEnteredFormat(backgroundColor,textFormat)'
}});
requests.push({repeatCell:{
  range:R(1,1000,30,31),
  cell:{userEnteredFormat:{backgroundColor:rgb('#F4F6F8'),textFormat:{italic:true,foregroundColor:rgb('#546E7A')}}},
  fields:'userEnteredFormat(backgroundColor,textFormat)'
}});

// 10. Column group left borders (thick cyan at group boundaries)
const BORDER_THICK = {style:'SOLID_THICK',colorStyle:{rgbColor:rgb('#00C8D8')}};
const BORDER_MED   = {style:'SOLID',colorStyle:{rgbColor:rgb('#B0BEC5')}};
const groupStarts = [6, 16, 26, 29]; // G, Q, AA, AD
for (const col of groupStarts) {
  requests.push({updateBorders:{
    range:R(0,1000,col,col+1),
    left:BORDER_THICK
  }});
}
// Softer border before tipo and nome group (col B)
requests.push({updateBorders:{range:R(0,1000,1,2),left:{style:'SOLID_MEDIUM',colorStyle:{rgbColor:rgb('#455A64')}}}});

// 11. Header bottom border (thin white separator)
requests.push({updateBorders:{
  range:R(0,1,0,33),
  bottom:{style:'SOLID_MEDIUM',colorStyle:{rgbColor:{red:0,green:0.906,blue:0.976}}}  // cyan
}});

// 12. Dropdowns
requests.push({setDataValidation:{range:R(1,1000,0,1),rule:{condition:{type:'ONE_OF_LIST',values:[
  {userEnteredValue:'rascunho'},{userEnteredValue:'pendente'},{userEnteredValue:'aguardando_aprovacao'},
  {userEnteredValue:'aprovado'},{userEnteredValue:'agendado'},{userEnteredValue:'revisar'},
  {userEnteredValue:'enviado'},{userEnteredValue:'erro_docx'},{userEnteredValue:'erro_html'},
  {userEnteredValue:'erro_upload_sfmc'},{userEnteredValue:'erro_agendamento'}
]},showCustomUi:true,strict:false}}});
requests.push({setDataValidation:{range:R(1,1000,1,2),rule:{condition:{type:'ONE_OF_LIST',values:[
  {userEnteredValue:'individual'},{userEnteredValue:'campanha'}
]},showCustomUi:true,strict:false}}});
requests.push({setDataValidation:{range:R(1,1000,29,30),rule:{condition:{type:'ONE_OF_LIST',values:[
  {userEnteredValue:'news'},{userEnteredValue:'campanha'},{userEnteredValue:'conteudo'},
  {userEnteredValue:'relatorio'},{userEnteredValue:'comunicado'},{userEnteredValue:'consultor-elite'}
]},showCustomUi:true,strict:false}}});

// 13. Conditional formatting — TWO rules per status:
//     a) Row tint: cols B–AG (1-33)
//     b) Badge:   col A only (0-1), solid color + white bold text
let cfIdx = 0;

function addStatusCF(formula, badgeHex, rowHex) {
  // Row tint (cols B-AG)
  requests.push({addConditionalFormatRule:{index:cfIdx++,rule:{
    ranges:[R(1,1000,1,33)],
    booleanRule:{
      condition:{type:'CUSTOM_FORMULA',values:[{userEnteredValue:formula}]},
      format:{backgroundColor:rgb(rowHex)}
    }
  }}});
  // Badge (col A only)
  requests.push({addConditionalFormatRule:{index:cfIdx++,rule:{
    ranges:[R(1,1000,0,1)],
    booleanRule:{
      condition:{type:'CUSTOM_FORMULA',values:[{userEnteredValue:formula}]},
      format:{
        backgroundColor:rgb(badgeHex),
        textFormat:{foregroundColor:{red:1,green:1,blue:1},bold:true}
      }
    }
  }}});
}

for (const [status, colors] of Object.entries(STATUS)) {
  addStatusCF(`=$A2="${status}"`, colors.badge, colors.row);
}
// Errors (individual rules, no regex)
for (const erro of ERROS) {
  addStatusCF(`=$A2="${erro}"`, ERRO_BADGE, ERRO_ROW);
}

console.log(`Total requests: ${requests.length}`);

const resp = await req('sheets.googleapis.com','POST',
  `/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
  {requests},
  {Authorization:`Bearer ${token}`}
);
const parsed = JSON.parse(resp);
if (parsed.spreadsheetId) {
  console.log('✅ Layout premium aplicado!');
} else {
  console.error('❌ Erro:', JSON.stringify(parsed).substring(0,600));
}
