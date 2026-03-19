import fs from 'fs';
import https from 'https';
import crypto from 'crypto';

const creds = JSON.parse(fs.readFileSync('email-agent/credentials/google-service-account.json', 'utf8'));
const SPREADSHEET_ID = '1soiS9kihONG5jHNm0IxJ9jWVNUM39fYPH0F6PBnO9zE';
const S = 0;

function b64url(s) { return Buffer.from(s).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,''); }
function apiReq(hostname, method, path, data, headers={}) {
  return new Promise((resolve, reject) => {
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    const r = https.request({hostname,path,method,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),...headers}},
      res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve(d));});
    r.on('error',reject); r.write(body); r.end();
  });
}
function apiGet(hostname, path, headers={}) {
  return new Promise((resolve,reject)=>{
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

// Count existing CF rules
const sheetMeta = JSON.parse(await apiGet('sheets.googleapis.com',
  `/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.conditionalFormats`,
  {Authorization:`Bearer ${token}`}));
const cfCount = sheetMeta.sheets?.[0]?.conditionalFormats?.length || 0;
console.log(`CF rules existentes: ${cfCount}`);

// Helpers
const R = (si,ei,sc,ec)=>({sheetId:S,startRowIndex:si,endRowIndex:ei,startColumnIndex:sc,endColumnIndex:ec});
const COL = (si,ei,px)=>({updateDimensionProperties:{range:{sheetId:S,dimension:'COLUMNS',startIndex:si,endIndex:ei},properties:{pixelSize:px},fields:'pixelSize'}});
const rgb = hex=>({red:parseInt(hex.slice(1,3),16)/255,green:parseInt(hex.slice(3,5),16)/255,blue:parseInt(hex.slice(5,7),16)/255});

// ══════════════════════════════════════════════
//  DARK MODE PALETTE
// ══════════════════════════════════════════════
const BG_MAIN    = '#0D1B2A';  // dark navy — main data bg
const BG_HEADER  = '#060D14';  // almost black — header
const BG_FROZEN  = '#111F30';  // frozen col A bg (slightly lighter)
const BG_AGENT   = '#0A1520';  // agent cols (AA AB AE)
const TEXT_MAIN  = '#D8E4EF';  // soft white
const TEXT_MUTED = '#5B7A96';  // muted blue-gray (agent cols)
const CYAN       = '#00E7F9';  // Finclass cyan
const CYAN_DIM   = '#00B8C8';  // dimmer cyan (borders)
const BORDER_DIM = '#1A3048';  // subtle dark border

// Status: [badge, row tint on dark bg]
const STATUS = {
  rascunho:             ['#4A6572', '#0D1A23'],
  pendente:             ['#E65100', '#1A0E00'],
  aguardando_aprovacao: ['#00B8C8', '#00141A'],
  aprovado:             ['#00A550', '#001A0D'],
  agendado:             ['#1A6FFF', '#000D1A'],
  revisar:              ['#C2185B', '#1A0010'],
  enviado:              ['#37474F', '#0D1418'],
};
const ERRO_BADGE = '#D50000';
const ERRO_ROW   = '#1A0505';
const ERROS = ['erro_docx','erro_html','erro_upload_sfmc','erro_agendamento'];

const requests = [];

// ─── DELETE existing CF rules ────────────────
for (let i = cfCount-1; i >= 0; i--) {
  requests.push({deleteConditionalFormatRule:{sheetId:S,index:i}});
}

// ─── FREEZE ──────────────────────────────────
requests.push({updateSheetProperties:{properties:{sheetId:S,gridProperties:{frozenRowCount:1,frozenColumnCount:1}},fields:'gridProperties.frozenRowCount,gridProperties.frozenColumnCount'}});

// ─── ROW HEIGHTS ─────────────────────────────
requests.push({updateDimensionProperties:{range:{sheetId:S,dimension:'ROWS',startIndex:0,endIndex:1},properties:{pixelSize:48},fields:'pixelSize'}});
requests.push({updateDimensionProperties:{range:{sheetId:S,dimension:'ROWS',startIndex:1,endIndex:1000},properties:{pixelSize:38},fields:'pixelSize'}});

// ─── COLUMN WIDTHS ───────────────────────────
requests.push(COL(0,1,170));   // A status
requests.push(COL(1,2,100));   // B tipo
requests.push(COL(2,3,240));   // C nome
requests.push(COL(3,4,85));    // D docx_link
requests.push(COL(4,5,110));   // E data_envio
requests.push(COL(5,6,72));    // F horario
requests.push(COL(6,16,140));  // G-P de_envio
requests.push(COL(16,26,140)); // Q-Z de_exclusao
requests.push(COL(26,27,115)); // AA
requests.push(COL(27,28,155)); // AB
requests.push(COL(28,29,240)); // AC obs
requests.push(COL(29,30,128)); // AD template_id
requests.push(COL(30,31,108)); // AE preview_url
requests.push(COL(31,32,108)); // AF send_classification
requests.push(COL(32,33,110)); // AG campanha

// ─── HEADER ──────────────────────────────────
// Full header: almost black
requests.push({repeatCell:{
  range:R(0,1,0,33),
  cell:{userEnteredFormat:{
    backgroundColor:rgb(BG_HEADER),
    textFormat:{foregroundColor:rgb(TEXT_MAIN),bold:true,fontSize:9},
    horizontalAlignment:'CENTER',verticalAlignment:'MIDDLE',wrapStrategy:'CLIP'
  }},
  fields:'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
}});

// Header group tints: DEs group (#0A1520), config group (#080E18)
requests.push({repeatCell:{range:R(0,1,6,26),cell:{userEnteredFormat:{backgroundColor:rgb('#0A1825'),textFormat:{foregroundColor:rgb('#8BA5BC'),bold:true,fontSize:9}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}});
requests.push({repeatCell:{range:R(0,1,29,33),cell:{userEnteredFormat:{backgroundColor:rgb('#060E18'),textFormat:{foregroundColor:rgb(CYAN),bold:true,fontSize:9}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}});
// Agent cols header
requests.push({repeatCell:{range:R(0,1,26,29),cell:{userEnteredFormat:{backgroundColor:rgb('#090F18'),textFormat:{foregroundColor:rgb('#5B7A96'),bold:true,fontSize:9}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}});

// ─── DATA CELLS: dark base ───────────────────
// All data: dark navy bg + soft white text
requests.push({repeatCell:{
  range:R(1,1000,0,33),
  cell:{userEnteredFormat:{
    backgroundColor:rgb(BG_MAIN),
    textFormat:{foregroundColor:rgb(TEXT_MAIN),fontSize:10},
    verticalAlignment:'MIDDLE',wrapStrategy:'CLIP'
  }},
  fields:'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,wrapStrategy)'
}});

// Frozen col A: slightly different dark shade
requests.push({repeatCell:{
  range:R(1,1000,0,1),
  cell:{userEnteredFormat:{backgroundColor:rgb(BG_FROZEN),textFormat:{bold:true,fontSize:10}}},
  fields:'userEnteredFormat(backgroundColor,textFormat)'
}});

// Nome column: bold
requests.push({repeatCell:{range:R(1,1000,2,3),cell:{userEnteredFormat:{textFormat:{bold:true,fontSize:10}}},fields:'userEnteredFormat(textFormat)'}});

// Data + horario: bold, centered
requests.push({repeatCell:{range:R(1,1000,4,6),cell:{userEnteredFormat:{textFormat:{bold:true,fontSize:10},horizontalAlignment:'CENTER'}},fields:'userEnteredFormat(textFormat,horizontalAlignment)'}});

// Agent cols: dimmer bg + muted text + italic
requests.push({repeatCell:{range:R(1,1000,26,29),cell:{userEnteredFormat:{backgroundColor:rgb(BG_AGENT),textFormat:{italic:true,foregroundColor:rgb(TEXT_MUTED),fontSize:10}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}});
requests.push({repeatCell:{range:R(1,1000,30,31),cell:{userEnteredFormat:{backgroundColor:rgb(BG_AGENT),textFormat:{italic:true,foregroundColor:rgb(TEXT_MUTED),fontSize:10}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}});

// obs: wrap
requests.push({repeatCell:{range:R(1,1000,28,29),cell:{userEnteredFormat:{wrapStrategy:'WRAP'}},fields:'userEnteredFormat(wrapStrategy)'}});

// ─── BORDERS ─────────────────────────────────
const THICK_CYAN = {style:'SOLID_THICK',colorStyle:{rgbColor:rgb(CYAN_DIM)}};
const MED_DARK   = {style:'SOLID_MEDIUM',colorStyle:{rgbColor:rgb('#1E3A5A')}};
const THIN_DARK  = {style:'SOLID',colorStyle:{rgbColor:rgb(BORDER_DIM)}};

// Header bottom: solid cyan
requests.push({updateBorders:{range:R(0,1,0,33),bottom:{style:'SOLID_MEDIUM',colorStyle:{rgbColor:rgb(CYAN)}}}});

// Column group separators (thick cyan)
for (const col of [6,16,26,29]) {
  requests.push({updateBorders:{range:R(0,1000,col,col+1),left:THICK_CYAN}});
}
// Col B: medium separator
requests.push({updateBorders:{range:R(0,1000,1,2),left:MED_DARK}});

// Thin horizontal lines between data rows
requests.push({updateBorders:{
  range:R(1,1000,0,33),
  bottom:THIN_DARK, top:THIN_DARK
}});

// ─── DROPDOWNS ───────────────────────────────
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

// ─── CONDITIONAL FORMATTING ──────────────────
let cfIdx = 0;
function addCF(formula, badgeHex, rowHex) {
  // Row tint (cols B-AG)
  requests.push({addConditionalFormatRule:{index:cfIdx++,rule:{
    ranges:[R(1,1000,1,33)],
    booleanRule:{condition:{type:'CUSTOM_FORMULA',values:[{userEnteredValue:formula}]},
      format:{backgroundColor:rgb(rowHex)}}
  }}});
  // Badge col A: solid + white bold
  requests.push({addConditionalFormatRule:{index:cfIdx++,rule:{
    ranges:[R(1,1000,0,1)],
    booleanRule:{condition:{type:'CUSTOM_FORMULA',values:[{userEnteredValue:formula}]},
      format:{backgroundColor:rgb(badgeHex),textFormat:{foregroundColor:{red:1,green:1,blue:1},bold:true}}}
  }}});
}

for (const [status, [badge, row]] of Object.entries(STATUS)) {
  addCF(`=$A2="${status}"`, badge, row);
}
for (const erro of ERROS) {
  addCF(`=$A2="${erro}"`, ERRO_BADGE, ERRO_ROW);
}

console.log(`Total requests: ${requests.length}`);
const resp = JSON.parse(await apiReq('sheets.googleapis.com','POST',
  `/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,{requests},{Authorization:`Bearer ${token}`}));
if (resp.spreadsheetId) { console.log('✅ Dark mode premium aplicado!'); }
else { console.error('❌', JSON.stringify(resp).substring(0,600)); }
