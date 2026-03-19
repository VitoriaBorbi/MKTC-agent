import fs from 'fs';
import https from 'https';
import crypto from 'crypto';

const creds = JSON.parse(fs.readFileSync('email-agent/credentials/google-service-account.json', 'utf8'));
const SPREADSHEET_ID = '1BuIfkkILSg8X2Dr08xXF0KDOHPF76Rx2Dcr6Bi1gswA';
const S = 1001;

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

// Criar abas faltantes
const existingIds = new Set(sheetMeta.sheets.map(s=>s.properties.sheetId));
const existingNames = new Set(sheetMeta.sheets.map(s=>s.properties.title));
const createReqs = [];
if (!existingIds.has(1002)) createReqs.push({addSheet:{properties:{sheetId:1002,title:'Recorrentes',index:1}}});
if (!existingIds.has(1004)) createReqs.push({addSheet:{properties:{sheetId:1004,title:'Config',index:3}}});
if (createReqs.length) {
  const cr = JSON.parse(await apiReq('sheets.googleapis.com','POST',
    `/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,{requests:createReqs},{Authorization:`Bearer ${token}`}));
  if (cr.spreadsheetId) console.log('✓ Abas criadas:', createReqs.map(r=>r.addSheet.properties.title).join(', '));
}

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

// ─── PALETTE — Faculdade Hub (black/white) ────
const HEADER_BG    = '#0F1014';
const ACCENT       = '#D5D5D5';
const DE_HDR_BG    = '#1A1D24';
const AGENT_HDR_BG = '#131417';
const BG_DATA  = '#FFFFFF';
const BG_COL_A = '#F5F5F5';
const BG_AGENT = '#FAFAFA';
const TEXT     = '#111111';
const TEXT_SM  = '#888888';
const BORDER   = '#E0E0E0';
const BORDER_STR = '#BBBBBB';

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
requests.push(COL(0,1,168));   // A  status
requests.push(COL(1,2,100));   // B  tipo
requests.push(COL(2,3,125));   // C  template
requests.push(COL(3,4,240));   // D  nome
requests.push(COL(4,5,85));    // E  docx_link
requests.push(COL(5,6,108));   // F  data_envio
requests.push(COL(6,7,70));    // G  horario
requests.push(COL(7,8,260));   // H  de_envio
requests.push(COL(8,9,260));   // I  de_exclusao
requests.push(COL(9,10,112));  // J  sfmc_asset_id
requests.push(COL(10,11,180)); // K  sfmc_send_id
requests.push(COL(11,12,240)); // L  obs
requests.push(COL(12,13,108)); // M  campanha
requests.push(COL(13,14,105)); // N  preview_url
requests.push(COL(14,15,120)); // O  send_classification
requests.push(COL(15,16,210)); // P  sender_profile
requests.push(COL(16,17,170)); // Q  tracking_category

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
// Full header: dark black
requests.push({repeatCell:{
  range:R(0,1,0,17),
  cell:{userEnteredFormat:{
    backgroundColor:rgb(HEADER_BG),
    textFormat:{foregroundColor:{red:1,green:1,blue:1},bold:true,fontSize:9},
    horizontalAlignment:'CENTER',verticalAlignment:'MIDDLE',wrapStrategy:'CLIP'
  }},
  fields:'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
}});
// DE cols header
requests.push({repeatCell:{range:R(0,1,7,9),cell:{userEnteredFormat:{backgroundColor:rgb(DE_HDR_BG),textFormat:{foregroundColor:rgb('#A0A0A0'),bold:true,fontSize:9}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}});
// Agent cols header (J, K, L)
requests.push({repeatCell:{range:R(0,1,9,12),cell:{userEnteredFormat:{backgroundColor:rgb(AGENT_HDR_BG),textFormat:{foregroundColor:rgb('#666666'),bold:true,fontSize:9}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}});
// Config cols (O–Q)
requests.push({repeatCell:{range:R(0,1,14,17),cell:{userEnteredFormat:{backgroundColor:rgb(HEADER_BG),textFormat:{foregroundColor:rgb(ACCENT),bold:true,fontSize:9}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}});

// Header bottom border: accent line
requests.push({updateBorders:{range:R(0,1,0,17),bottom:{style:'SOLID_MEDIUM',colorStyle:{rgbColor:rgb(ACCENT)}}}});

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

// Col A: off-white + bold
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
const THICK_ACCENT = {style:'SOLID_THICK',colorStyle:{rgbColor:rgb(ACCENT)}};
const THIN         = {style:'SOLID',colorStyle:{rgbColor:rgb(BORDER)}};

for (const col of [7,9,14]) {
  requests.push({updateBorders:{range:R(0,1000,col,col+1),left:THICK_ACCENT}});
}
requests.push({updateBorders:{range:R(0,1000,1,2),left:{style:'SOLID_MEDIUM',colorStyle:{rgbColor:rgb(BORDER_STR)}}}});
requests.push({updateBorders:{range:R(0,1000,0,1),right:{style:'SOLID_MEDIUM',colorStyle:{rgbColor:rgb(BORDER_STR)}}}});
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
// C: template — Hub: só news e campanha
requests.push({setDataValidation:{range:R(1,1000,2,3),rule:{condition:{type:'ONE_OF_LIST',values:[
  {userEnteredValue:'news'},{userEnteredValue:'campanha'}
]},showCustomUi:true,strict:false}}});
// O: send_classification
requests.push({setDataValidation:{range:R(1,1000,14,15),rule:{condition:{type:'ONE_OF_LIST',values:[
  {userEnteredValue:'83'}
]},showCustomUi:true,strict:false}}});
// P: sender_profile
requests.push({setDataValidation:{range:R(1,1000,15,16),rule:{condition:{type:'ONE_OF_LIST',values:[
  {userEnteredValue:'286 — Faculdade HUB'},
  {userEnteredValue:'297 — Bruno Perini'},
  {userEnteredValue:'142 — MBA - Faculdade HUB'},
  {userEnteredValue:'311 — MyHUB.IA'},
  {userEnteredValue:'230 — Thiago Nigro - Faculdade HUB'}
]},showCustomUi:true,strict:false}}});
// Q: tracking_category
requests.push({setDataValidation:{range:R(1,1000,16,17),rule:{condition:{type:'ONE_OF_LIST',values:[
  {userEnteredValue:'316407 — Newsletter'},
  {userEnteredValue:'278080 — Campanhas'}
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
if (resp.spreadsheetId) { console.log('✅ Layout Hub aplicado!'); }
else { console.error('❌', JSON.stringify(resp).substring(0,600)); }
