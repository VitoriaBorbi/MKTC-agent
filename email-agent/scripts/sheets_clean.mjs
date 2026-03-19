import fs from 'fs';
import https from 'https';
import crypto from 'crypto';

const creds = JSON.parse(fs.readFileSync('email-agent/credentials/google-service-account.json', 'utf8'));
const SPREADSHEET_ID = '1soiS9kihONG5jHNm0IxJ9jWVNUM39fYPH0F6PBnO9zE';
const S = 0;

function b64url(s) { return Buffer.from(s).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,''); }
function apiReq(hostname, method, path, data, headers={}) {
  return new Promise((resolve,reject) => {
    const body = typeof data==='string' ? data : JSON.stringify(data);
    const r = https.request({hostname,path,method,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),...headers}},
      res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve(d));});
    r.on('error',reject); r.write(body); r.end();
  });
}
function apiGet(hostname, path, headers={}) {
  return new Promise((resolve,reject) => {
    const r=https.request({hostname,path,method:'GET',headers},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve(d));});
    r.on('error',reject); r.end();
  });
}

// Auth
const now=Math.floor(Date.now()/1000);
const h=b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
const p=b64url(JSON.stringify({iss:creds.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',exp:now+3600,iat:now}));
const sgn=crypto.createSign('RSA-SHA256'); sgn.update(`${h}.${p}`);
const sig=sgn.sign(creds.private_key,'base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
const token=JSON.parse(await apiReq('oauth2.googleapis.com','POST','/token',
  `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${h}.${p}.${sig}`,
  {'Content-Type':'application/x-www-form-urlencoded'})).access_token;
if(!token){console.error('Token failed');process.exit(1);}
console.log('✓ Token OK');

const sheetMeta = JSON.parse(await apiGet('sheets.googleapis.com',
  `/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets(properties,conditionalFormats)`,
  {Authorization:`Bearer ${token}`}));
const filaSheet = sheetMeta.sheets?.find(s=>s.properties.sheetId===S);
const cfCount = filaSheet?.conditionalFormats?.length || 0;
const colCount = filaSheet?.properties?.gridProperties?.columnCount || 17;
console.log(`CF rules: ${cfCount} | cols: ${colCount}`);

// Encolher para 17 colunas se tiver mais
if (colCount > 17) {
  const dr = JSON.parse(await apiReq('sheets.googleapis.com','POST',
    `/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
    {requests:[{deleteDimension:{range:{sheetId:S,dimension:'COLUMNS',startIndex:17,endIndex:colCount}}}]},
    {Authorization:`Bearer ${token}`}));
  if (dr.spreadsheetId) console.log(`✓ Colunas reduzidas: ${colCount} → 17`);
}

const R = (si,ei,sc,ec)=>({sheetId:S,startRowIndex:si,endRowIndex:ei,startColumnIndex:sc,endColumnIndex:ec});
const COL = (si,ei,px)=>({updateDimensionProperties:{range:{sheetId:S,dimension:'COLUMNS',startIndex:si,endIndex:ei},properties:{pixelSize:px},fields:'pixelSize'}});
const rgb = hex=>({red:parseInt(hex.slice(1,3),16)/255,green:parseInt(hex.slice(3,5),16)/255,blue:parseInt(hex.slice(5,7),16)/255});

// ─── PALETTE — Finclass ───────────────────────
const NAVY    = '#092F4F';
const CYAN    = '#00E7F9';
const BG_DATA = '#FFFFFF';
const BG_COL_A= '#F0F4F8';
const BG_AGENT= '#F7F9FB';
const TEXT    = '#1A2332';
const TEXT_SM = '#8BA3BC';
const BORDER  = '#DDE5EE';
const BORDER_STR = '#B8CDD8';

// Status badges
const STATUS = {
  rascunho:             { badge:'#78909C', row:'#F5F7F9' },
  pendente:             { badge:'#E65100', row:'#FFF8F0' },
  aguardando_aprovacao: { badge:'#0097A7', row:'#F0FAFB' },
  aprovado:             { badge:'#2E7D32', row:'#F2FAF2' },
  agendado:             { badge:'#1565C0', row:'#F0F5FF' },
  revisar:              { badge:'#AD1457', row:'#FFF0F5' },
  enviado:              { badge:'#546E7A', row:'#F5F6F7' },
};
const ERROS = ['erro_docx','erro_html','erro_upload_sfmc','erro_agendamento'];

const requests = [];

// ─── Limpar toda data validation existente ────
requests.push({repeatCell:{range:{sheetId:S,startRowIndex:1,endRowIndex:1000,startColumnIndex:0,endColumnIndex:17},cell:{},fields:'dataValidation'}});

// ─── Delete CF ────────────────────────────────
for (let i=cfCount-1; i>=0; i--) requests.push({deleteConditionalFormatRule:{sheetId:S,index:i}});

// ─── Freeze ───────────────────────────────────
requests.push({updateSheetProperties:{properties:{sheetId:S,gridProperties:{frozenRowCount:1,frozenColumnCount:1}},fields:'gridProperties.frozenRowCount,gridProperties.frozenColumnCount'}});

// ─── Row heights ──────────────────────────────
requests.push({updateDimensionProperties:{range:{sheetId:S,dimension:'ROWS',startIndex:0,endIndex:1},properties:{pixelSize:46},fields:'pixelSize'}});
requests.push({updateDimensionProperties:{range:{sheetId:S,dimension:'ROWS',startIndex:1,endIndex:1000},properties:{pixelSize:36},fields:'pixelSize'}});

// ─── Column widths (A–Q = 17 cols) ───────────
// A  status
requests.push(COL(0,1,168));
// B  tipo
requests.push(COL(1,2,100));
// C  template
requests.push(COL(2,3,125));
// D  nome
requests.push(COL(3,4,240));
// E  docx_link
requests.push(COL(4,5,85));
// F  data_envio
requests.push(COL(5,6,108));
// G  horario
requests.push(COL(6,7,70));
// H  de_envio
requests.push(COL(7,8,260));
// I  de_exclusao
requests.push(COL(8,9,260));
// J  sfmc_asset_id
requests.push(COL(9,10,112));
// K  sfmc_send_id
requests.push(COL(10,11,180));
// L  obs
requests.push(COL(11,12,240));
// M  campanha
requests.push(COL(12,13,108));
// N  preview_url
requests.push(COL(13,14,105));
// O  send_classification
requests.push(COL(14,15,120));
// P  sender_profile
requests.push(COL(15,16,210));
// Q  tracking_category
requests.push(COL(16,17,170));

// ─── Header row text ──────────────────────────
const HEADERS = ['status','tipo','template','nome','docx_link','data_envio','horario',
  'de_envio','de_exclusao','sfmc_asset_id','sfmc_send_id','obs','campanha',
  'preview_url','send_classification','sender_profile','tracking_category'];
requests.push({updateCells:{
  range:R(0,1,0,17),
  rows:[{values:HEADERS.map(h=>({userEnteredValue:{stringValue:h}}))}],
  fields:'userEnteredValue'
}});

// ─── Header formatting ────────────────────────
// Full header: navy
requests.push({repeatCell:{
  range:R(0,1,0,17),
  cell:{userEnteredFormat:{
    backgroundColor:rgb(NAVY),
    textFormat:{foregroundColor:{red:1,green:1,blue:1},bold:true,fontSize:9},
    horizontalAlignment:'CENTER',verticalAlignment:'MIDDLE',wrapStrategy:'CLIP'
  }},
  fields:'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
}});
// DE cols header: navy + muted text
requests.push({repeatCell:{range:R(0,1,7,9),cell:{userEnteredFormat:{backgroundColor:rgb('#0D3654'),textFormat:{foregroundColor:rgb('#7AADCA'),bold:true,fontSize:9}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}});
// Agent cols header (J, K): darkest + most muted
requests.push({repeatCell:{range:R(0,1,9,12),cell:{userEnteredFormat:{backgroundColor:rgb('#0A2336'),textFormat:{foregroundColor:rgb('#456880'),bold:true,fontSize:9}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}});
// Config cols (O–Q): navy with cyan text
requests.push({repeatCell:{range:R(0,1,14,17),cell:{userEnteredFormat:{backgroundColor:rgb(NAVY),textFormat:{foregroundColor:rgb(CYAN),bold:true,fontSize:9}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}});

// Header bottom border: cyan line
requests.push({updateBorders:{range:R(0,1,0,17),bottom:{style:'SOLID_MEDIUM',colorStyle:{rgbColor:rgb(CYAN)}}}});

// ─── Data cells base ──────────────────────────
requests.push({repeatCell:{
  range:R(1,1000,0,17),
  cell:{userEnteredFormat:{
    backgroundColor:rgb(BG_DATA),
    textFormat:{foregroundColor:rgb(TEXT),fontSize:10},
    verticalAlignment:'MIDDLE',wrapStrategy:'CLIP'
  }},
  fields:'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,wrapStrategy)'
}});

// Col A: off-white + bold (badge)
requests.push({repeatCell:{range:R(1,1000,0,1),cell:{userEnteredFormat:{backgroundColor:rgb(BG_COL_A),textFormat:{bold:true,fontSize:10}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}});
// Nome: bold
requests.push({repeatCell:{range:R(1,1000,3,4),cell:{userEnteredFormat:{textFormat:{bold:true,fontSize:10}}},fields:'userEnteredFormat(textFormat)'}});
// Data + horario: bold, centered
requests.push({repeatCell:{range:R(1,1000,5,7),cell:{userEnteredFormat:{textFormat:{bold:true,fontSize:10},horizontalAlignment:'CENTER'}},fields:'userEnteredFormat(textFormat,horizontalAlignment)'}});
// DE cols: wrap text
requests.push({repeatCell:{range:R(1,1000,7,9),cell:{userEnteredFormat:{wrapStrategy:'WRAP',textFormat:{fontSize:9}}},fields:'userEnteredFormat(wrapStrategy,textFormat)'}});
// Agent cols (J, K, L): muted italic
requests.push({repeatCell:{range:R(1,1000,9,12),cell:{userEnteredFormat:{backgroundColor:rgb(BG_AGENT),textFormat:{foregroundColor:rgb(TEXT_SM),fontSize:9,italic:true}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}});
// N (preview): muted
requests.push({repeatCell:{range:R(1,1000,13,14),cell:{userEnteredFormat:{backgroundColor:rgb(BG_AGENT),textFormat:{foregroundColor:rgb(TEXT_SM),fontSize:9,italic:true}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}});
// obs: wrap
requests.push({repeatCell:{range:R(1,1000,11,12),cell:{userEnteredFormat:{wrapStrategy:'WRAP'}},fields:'userEnteredFormat(wrapStrategy)'}});

// ─── Borders ──────────────────────────────────
const THICK_CYAN = {style:'SOLID_THICK',colorStyle:{rgbColor:rgb(CYAN)}};
const THIN       = {style:'SOLID',colorStyle:{rgbColor:rgb(BORDER)}};

// Group separators: thick cyan left border
for (const col of [7,9,14]) {
  requests.push({updateBorders:{range:R(0,1000,col,col+1),left:THICK_CYAN}});
}
// Col B: medium separator
requests.push({updateBorders:{range:R(0,1000,1,2),left:{style:'SOLID_MEDIUM',colorStyle:{rgbColor:rgb(BORDER_STR)}}}});
// Col A right
requests.push({updateBorders:{range:R(0,1000,0,1),right:{style:'SOLID_MEDIUM',colorStyle:{rgbColor:rgb(BORDER_STR)}}}});
// Thin bottom borders
requests.push({updateBorders:{range:R(1,1000,0,17),bottom:THIN}});

// ─── Dropdowns ────────────────────────────────
// A: status
requests.push({setDataValidation:{range:R(1,1000,0,1),rule:{condition:{type:'ONE_OF_LIST',values:[
  {userEnteredValue:'rascunho'},{userEnteredValue:'pendente'},{userEnteredValue:'aguardando_aprovacao'},
  {userEnteredValue:'aprovado'},{userEnteredValue:'agendado'},{userEnteredValue:'revisar'},
  {userEnteredValue:'enviado'},{userEnteredValue:'erro_docx'},{userEnteredValue:'erro_html'},
  {userEnteredValue:'erro_upload_sfmc'},{userEnteredValue:'erro_agendamento'}
]},showCustomUi:true,strict:false}}});
// B: tipo
requests.push({setDataValidation:{range:R(1,1000,1,2),rule:{condition:{type:'ONE_OF_LIST',values:[
  {userEnteredValue:'individual'},{userEnteredValue:'campanha'}
]},showCustomUi:true,strict:false}}});
// C: template
requests.push({setDataValidation:{range:R(1,1000,2,3),rule:{condition:{type:'ONE_OF_LIST',values:[
  {userEnteredValue:'news'},{userEnteredValue:'campanha'},{userEnteredValue:'conteudo'},
  {userEnteredValue:'relatorio'},{userEnteredValue:'comunicado'},{userEnteredValue:'consultor-elite'}
]},showCustomUi:true,strict:false}}});
// O: send_classification
requests.push({setDataValidation:{range:R(1,1000,14,15),rule:{condition:{type:'ONE_OF_LIST',values:[
  {userEnteredValue:'83'},{userEnteredValue:'84'}
]},showCustomUi:true,strict:false}}});
// P: sender_profile
requests.push({setDataValidation:{range:R(1,1000,15,16),rule:{condition:{type:'ONE_OF_LIST',values:[
  {userEnteredValue:'285 — Fin News'},
  {userEnteredValue:'194 — Equipe Finclass'},
  {userEnteredValue:'270 — Conteudo - Finclass'},
  {userEnteredValue:'294 — Consultor de Elite'}
]},showCustomUi:true,strict:false}}});
// Q: tracking_category
requests.push({setDataValidation:{range:R(1,1000,16,17),rule:{condition:{type:'ONE_OF_LIST',values:[
  {userEnteredValue:'320503 — news'},
  {userEnteredValue:'320491 — campanha'},
  {userEnteredValue:'315907 — conteudo'},
  {userEnteredValue:'278546 — relatorio'},
  {userEnteredValue:'276056 — comunicado'},
  {userEnteredValue:'317554 — consultor-elite'}
]},showCustomUi:true,strict:false}}});

// ─── Conditional formatting ───────────────────
let cfIdx=0;
function addCF(formula, badgeHex, rowHex) {
  requests.push({addConditionalFormatRule:{index:cfIdx++,rule:{
    ranges:[R(1,1000,1,17)],
    booleanRule:{condition:{type:'CUSTOM_FORMULA',values:[{userEnteredValue:formula}]},
      format:{backgroundColor:rgb(rowHex)}}
  }}});
  requests.push({addConditionalFormatRule:{index:cfIdx++,rule:{
    ranges:[R(1,1000,0,1)],
    booleanRule:{condition:{type:'CUSTOM_FORMULA',values:[{userEnteredValue:formula}]},
      format:{backgroundColor:rgb(badgeHex),textFormat:{foregroundColor:{red:1,green:1,blue:1},bold:true}}}
  }}});
}

for (const [status, {badge, row}] of Object.entries(STATUS)) {
  addCF(`=$A2="${status}"`, badge, row);
}
for (const erro of ERROS) {
  addCF(`=$A2="${erro}"`, '#C62828', '#FFF0F0');
}

console.log(`Total requests: ${requests.length}`);
const resp = JSON.parse(await apiReq('sheets.googleapis.com','POST',
  `/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,{requests},{Authorization:`Bearer ${token}`}));
if (resp.spreadsheetId) { console.log('✅ Layout Finclass restaurado!'); }
else { console.error('❌', JSON.stringify(resp).substring(0,600)); }
