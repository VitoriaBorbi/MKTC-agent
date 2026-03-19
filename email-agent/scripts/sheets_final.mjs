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
  `/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.conditionalFormats`,
  {Authorization:`Bearer ${token}`}));
const cfCount = sheetMeta.sheets?.[0]?.conditionalFormats?.length || 0;
console.log(`CF rules: ${cfCount}`);

const R = (si,ei,sc,ec) => ({sheetId:S,startRowIndex:si,endRowIndex:ei,startColumnIndex:sc,endColumnIndex:ec});
const COL = (si,ei,px) => ({updateDimensionProperties:{range:{sheetId:S,dimension:'COLUMNS',startIndex:si,endIndex:ei},properties:{pixelSize:px},fields:'pixelSize'}});
const rgb = hex => ({red:parseInt(hex.slice(1,3),16)/255, green:parseInt(hex.slice(3,5),16)/255, blue:parseInt(hex.slice(5,7),16)/255});

// ══════════════════════════════════════
//  PALETTE — restraint is the luxury
// ══════════════════════════════════════
const NAVY      = '#0A2540';  // header
const WHITE     = '#FFFFFF';
const OFF_WHITE = '#F8FAFC';  // alternating rows
const TEXT      = '#0A2540';  // dark navy text
const TEXT_MID  = '#64748B';  // secondary text
const TEXT_MUTED= '#94A3B8';  // agent cols
const BORDER    = '#E2E8F0';  // thin separator

// Status: [stripe/text color, row tint]
const STATUS = {
  rascunho:             ['#94A3B8', WHITE],
  pendente:             ['#F97316', '#FFFBF7'],
  aguardando_aprovacao: ['#06B6D4', '#F7FEFF'],
  aprovado:             ['#22C55E', '#F7FFF9'],
  agendado:             ['#3B82F6', '#F7F9FF'],
  revisar:              ['#F43F5E', '#FFF7F8'],
  enviado:              ['#64748B', OFF_WHITE],
};
const ERROS = ['erro_docx','erro_html','erro_upload_sfmc','erro_agendamento'];

const requests = [];

// Delete CF
for (let i=cfCount-1; i>=0; i--) requests.push({deleteConditionalFormatRule:{sheetId:S,index:i}});

// Freeze
requests.push({updateSheetProperties:{properties:{sheetId:S,gridProperties:{frozenRowCount:1,frozenColumnCount:1}},fields:'gridProperties.frozenRowCount,gridProperties.frozenColumnCount'}});

// Row heights
requests.push({updateDimensionProperties:{range:{sheetId:S,dimension:'ROWS',startIndex:0,endIndex:1},properties:{pixelSize:44},fields:'pixelSize'}});
requests.push({updateDimensionProperties:{range:{sheetId:S,dimension:'ROWS',startIndex:1,endIndex:1000},properties:{pixelSize:34},fields:'pixelSize'}});

// Column widths
requests.push(COL(0,1,160));   // A
requests.push(COL(1,2,96));    // B
requests.push(COL(2,3,240));   // C
requests.push(COL(3,4,80));    // D
requests.push(COL(4,5,104));   // E
requests.push(COL(5,6,68));    // F
requests.push(COL(6,16,130));  // G-P
requests.push(COL(16,26,130)); // Q-Z
requests.push(COL(26,27,110)); // AA
requests.push(COL(27,28,148)); // AB
requests.push(COL(28,29,240)); // AC
requests.push(COL(29,30,120)); // AD
requests.push(COL(30,31,100)); // AE
requests.push(COL(31,32,100)); // AF
requests.push(COL(32,33,104)); // AG

// ─── HEADER ───────────────────────────
// Base: deep navy
requests.push({repeatCell:{
  range:R(0,1,0,33),
  cell:{userEnteredFormat:{
    backgroundColor:rgb(NAVY),
    textFormat:{foregroundColor:{red:1,green:1,blue:1},bold:true,fontSize:9},
    horizontalAlignment:'CENTER',verticalAlignment:'MIDDLE',wrapStrategy:'CLIP'
  }},
  fields:'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
}});

// Header: uppercase labels via updateCells
const HEADERS = [
  'STATUS','TIPO','NOME','DOCX','DATA','H',
  'DE 1','DE 2','DE 3','DE 4','DE 5','DE 6','DE 7','DE 8','DE 9','DE 10',
  'EX 1','EX 2','EX 3','EX 4','EX 5','EX 6','EX 7','EX 8','EX 9','EX 10',
  'ASSET ID','SEND ID','OBS','TEMPLATE','PREVIEW','SEND CLASS','CAMP'
];
requests.push({updateCells:{
  range:R(0,1,0,33),
  rows:[{values: HEADERS.map(v=>({userEnteredValue:{stringValue:v}}))}],
  fields:'userEnteredValue'
}});

// Header: muted text for DE columns (they're secondary info)
requests.push({repeatCell:{
  range:R(0,1,6,26),
  cell:{userEnteredFormat:{textFormat:{foregroundColor:rgb('#4A7A9B'),bold:true,fontSize:9}}},
  fields:'userEnteredFormat(textFormat)'
}});
// Agent cols header: even more muted
requests.push({repeatCell:{
  range:R(0,1,26,29),
  cell:{userEnteredFormat:{textFormat:{foregroundColor:rgb('#2E5470'),bold:true,fontSize:9}}},
  fields:'userEnteredFormat(textFormat)'
}});
// Config header: cyan accent
requests.push({repeatCell:{
  range:R(0,1,29,33),
  cell:{userEnteredFormat:{textFormat:{foregroundColor:rgb('#06B6D4'),bold:true,fontSize:9}}},
  fields:'userEnteredFormat(textFormat)'
}});

// Header bottom: 2px cyan
requests.push({updateBorders:{range:R(0,1,0,33),bottom:{style:'SOLID_MEDIUM',colorStyle:{rgbColor:rgb('#06B6D4')}}}});

// ─── DATA BASE ────────────────────────
// White for all data rows
requests.push({repeatCell:{
  range:R(1,1000,0,33),
  cell:{userEnteredFormat:{
    backgroundColor:rgb(WHITE),
    textFormat:{foregroundColor:rgb(TEXT),fontSize:10},
    verticalAlignment:'MIDDLE',wrapStrategy:'CLIP'
  }},
  fields:'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,wrapStrategy)'
}});

// Col A: slightly off-white + bold (neutral state)
requests.push({repeatCell:{
  range:R(1,1000,0,1),
  cell:{userEnteredFormat:{
    backgroundColor:rgb(OFF_WHITE),
    textFormat:{foregroundColor:rgb(TEXT_MID),bold:true,fontSize:10},
    horizontalAlignment:'CENTER'
  }},
  fields:'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
}});

// Nome: bold + dark
requests.push({repeatCell:{
  range:R(1,1000,2,3),
  cell:{userEnteredFormat:{textFormat:{bold:true,foregroundColor:rgb(TEXT),fontSize:10}}},
  fields:'userEnteredFormat(textFormat)'
}});

// Data + horario: centered, medium weight
requests.push({repeatCell:{
  range:R(1,1000,4,6),
  cell:{userEnteredFormat:{textFormat:{foregroundColor:rgb(TEXT_MID),fontSize:10},horizontalAlignment:'CENTER'}},
  fields:'userEnteredFormat(textFormat,horizontalAlignment)'
}});

// DE columns: muted text, smaller
requests.push({repeatCell:{
  range:R(1,1000,6,26),
  cell:{userEnteredFormat:{textFormat:{foregroundColor:rgb(TEXT_MID),fontSize:9}}},
  fields:'userEnteredFormat(textFormat)'
}});

// Agent cols: very muted + italic
requests.push({repeatCell:{
  range:R(1,1000,26,29),
  cell:{userEnteredFormat:{
    backgroundColor:rgb('#F8FAFC'),
    textFormat:{foregroundColor:rgb(TEXT_MUTED),fontSize:9,italic:true}
  }},
  fields:'userEnteredFormat(backgroundColor,textFormat)'
}});
requests.push({repeatCell:{
  range:R(1,1000,30,31),
  cell:{userEnteredFormat:{
    backgroundColor:rgb('#F8FAFC'),
    textFormat:{foregroundColor:rgb(TEXT_MUTED),fontSize:9,italic:true}
  }},
  fields:'userEnteredFormat(backgroundColor,textFormat)'
}});

// obs: wrap
requests.push({repeatCell:{
  range:R(1,1000,28,29),
  cell:{userEnteredFormat:{wrapStrategy:'WRAP'}},
  fields:'userEnteredFormat(wrapStrategy)'
}});

// ─── BORDERS ──────────────────────────
// Only: header bottom (cyan) + thin row separators + col A right
requests.push({updateBorders:{range:R(1,1000,0,33),bottom:{style:'SOLID',colorStyle:{rgbColor:rgb(BORDER)}}}});
requests.push({updateBorders:{range:R(1,1000,0,1),right:{style:'SOLID',colorStyle:{rgbColor:rgb('#CBD5E1')}}}});

// ─── DROPDOWNS (sem flechinha) ────────
requests.push({setDataValidation:{range:R(1,1000,0,1),rule:{condition:{type:'ONE_OF_LIST',values:[
  {userEnteredValue:'rascunho'},{userEnteredValue:'pendente'},{userEnteredValue:'aguardando_aprovacao'},
  {userEnteredValue:'aprovado'},{userEnteredValue:'agendado'},{userEnteredValue:'revisar'},
  {userEnteredValue:'enviado'},{userEnteredValue:'erro_docx'},{userEnteredValue:'erro_html'},
  {userEnteredValue:'erro_upload_sfmc'},{userEnteredValue:'erro_agendamento'}
]},showCustomUi:false,strict:false}}});
requests.push({setDataValidation:{range:R(1,1000,1,2),rule:{condition:{type:'ONE_OF_LIST',values:[
  {userEnteredValue:'individual'},{userEnteredValue:'campanha'}
]},showCustomUi:false,strict:false}}});
requests.push({setDataValidation:{range:R(1,1000,29,30),rule:{condition:{type:'ONE_OF_LIST',values:[
  {userEnteredValue:'news'},{userEnteredValue:'campanha'},{userEnteredValue:'conteudo'},
  {userEnteredValue:'relatorio'},{userEnteredValue:'comunicado'},{userEnteredValue:'consultor-elite'}
]},showCustomUi:false,strict:false}}});

// ─── CONDITIONAL FORMATTING ───────────
// THE SAUCE: colored LEFT BORDER stripe on col A + colored text
// + very subtle row tint on B-AG
let cfIdx=0;

function addStatusCF(formula, color, rowTint) {
  // Row tint (B-AG): barely-there wash
  requests.push({addConditionalFormatRule:{index:cfIdx++,rule:{
    ranges:[R(1,1000,1,33)],
    booleanRule:{
      condition:{type:'CUSTOM_FORMULA',values:[{userEnteredValue:formula}]},
      format:{backgroundColor:rgb(rowTint)}
    }
  }}});
  // Col A: solid badge — colored bg + white bold text
  requests.push({addConditionalFormatRule:{index:cfIdx++,rule:{
    ranges:[R(1,1000,0,1)],
    booleanRule:{
      condition:{type:'CUSTOM_FORMULA',values:[{userEnteredValue:formula}]},
      format:{
        backgroundColor:rgb(color),
        textFormat:{foregroundColor:{red:1,green:1,blue:1},bold:true}
      }
    }
  }}});
}

for (const [status, [color, row]] of Object.entries(STATUS)) {
  addStatusCF(`=$A2="${status}"`, color, row);
}
for (const erro of ERROS) {
  addStatusCF(`=$A2="${erro}"`, '#F43F5E', '#FFF7F8');
}

// Alternating rows banding via dedicated banding request (not CF)
requests.push({addBanding:{bandedRange:{
  range:R(1,1000,0,33),
  rowProperties:{
    headerColor:rgb(NAVY),
    firstBandColor:rgb(WHITE),
    secondBandColor:rgb(OFF_WHITE)
  }
}}});

console.log(`Requests: ${requests.length}`);
const resp = JSON.parse(await apiReq('sheets.googleapis.com','POST',
  `/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,{requests},{Authorization:`Bearer ${token}`}));
if (resp.spreadsheetId) console.log('✅ Done.');
else console.error('❌', JSON.stringify(resp).substring(0,600));
