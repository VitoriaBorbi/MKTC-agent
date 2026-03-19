import fs from 'fs';
import https from 'https';
import crypto from 'crypto';

const creds = JSON.parse(fs.readFileSync('email-agent/credentials/google-service-account.json','utf8'));
const SPREADSHEET_ID = '1soiS9kihONG5jHNm0IxJ9jWVNUM39fYPH0F6PBnO9zE';
const S = 0;

function b64url(s){return Buffer.from(s).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');}
function apiReq(hostname,method,path,data,headers={}){return new Promise((resolve,reject)=>{
  const body=typeof data==='string'?data:JSON.stringify(data);
  const r=https.request({hostname,path,method,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),...headers}},
    res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve(d));});
  r.on('error',reject);r.write(body);r.end();
});}
function apiGet(hostname,path,headers={}){return new Promise((resolve,reject)=>{
  const r=https.request({hostname,path,method:'GET',headers},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve(d));});
  r.on('error',reject);r.end();
});}

// Auth
const now=Math.floor(Date.now()/1000);
const h=b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
const p=b64url(JSON.stringify({iss:creds.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',exp:now+3600,iat:now}));
const sgn=crypto.createSign('RSA-SHA256');sgn.update(`${h}.${p}`);
const sig=sgn.sign(creds.private_key,'base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
const token=JSON.parse(await apiReq('oauth2.googleapis.com','POST','/token',
  `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${h}.${p}.${sig}`,
  {'Content-Type':'application/x-www-form-urlencoded'})).access_token;
if(!token){console.error('Token failed');process.exit(1);}
console.log('✓ Token OK');

// ── Read current state ──────────────────────────────
const meta = JSON.parse(await apiGet('sheets.googleapis.com',
  `/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets(properties,conditionalFormats,bandedRanges)`,
  {Authorization:`Bearer ${token}`}));
const sheet = meta.sheets?.[0];
const cfCount = sheet?.conditionalFormats?.length || 0;
const bandingIds = (sheet?.bandedRanges || []).map(b=>b.bandedRangeId);
const colCount = sheet?.properties?.gridProperties?.columnCount || 35;
console.log(`CF: ${cfCount}, Bandings: ${bandingIds.length}, Cols: ${colCount}`);

// Read existing data rows (A2:AI1000)
const dataResp = JSON.parse(await apiGet('sheets.googleapis.com',
  `/v4/spreadsheets/${SPREADSHEET_ID}/values/Fila%21A2%3AAI1000`,
  {Authorization:`Bearer ${token}`}));
const rows = dataResp.values || [];
console.log(`Linhas com dados: ${rows.length}`);

// OLD column indices (0-based)
// 0=status,1=tipo,2=nome,3=docx,4=data,5=horario
// 6-15=de_envio_1..10, 16-25=de_exclusao_1..10
// 26=asset_id,27=send_id,28=obs,29=template_id,30=preview,31=send_class,32=campanha
// 33=sender,34=tracking

// Migrate existing rows to new structure
// NEW: 0=status,1=tipo,2=template,3=nome,4=docx,5=data,6=horario
//       7=de_envio,8=de_exclusao,9=asset_id,10=send_id,11=obs
//       12=campanha,13=preview,14=send_class,15=sender,16=tracking
function migrateRow(old) {
  const g = i => old[i] || '';
  // Combine non-empty DEs into comma-separated
  const deEnvio = [6,7,8,9,10,11,12,13,14,15].map(i=>g(i)).filter(v=>v).join(', ');
  const deExcl  = [16,17,18,19,20,21,22,23,24,25].map(i=>g(i)).filter(v=>v).join(', ');
  return [
    g(0),  // status
    g(1),  // tipo
    g(29), // template_id → col C
    g(2),  // nome
    g(3),  // docx
    g(4),  // data
    g(5),  // horario
    deEnvio,
    deExcl,
    g(26), // asset_id
    g(27), // send_id
    g(28), // obs
    g(32), // campanha
    g(30), // preview
    g(31), // send_class
    g(33), // sender
    g(34), // tracking
  ];
}
const migratedRows = rows.map(migrateRow);

// ── Helpers ────────────────────────────────────────
const R = (si,ei,sc,ec)=>({sheetId:S,startRowIndex:si,endRowIndex:ei,startColumnIndex:sc,endColumnIndex:ec});
const COL = (si,ei,px)=>({updateDimensionProperties:{range:{sheetId:S,dimension:'COLUMNS',startIndex:si,endIndex:ei},properties:{pixelSize:px},fields:'pixelSize'}});
const rgb = hex=>({red:parseInt(hex.slice(1,3),16)/255,green:parseInt(hex.slice(3,5),16)/255,blue:parseInt(hex.slice(5,7),16)/255});

const NAVY       = '#0A2540';
const CYAN       = '#06B6D4';
const WHITE      = '#FFFFFF';
const OFF_WHITE  = '#F8FAFC';
const TEXT       = '#0A2540';
const TEXT_MID   = '#64748B';
const TEXT_MUTED = '#94A3B8';
const BORDER     = '#E2E8F0';
const BG_AGENT   = '#F8FAFC';

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

// ── Phase 1: clear structure ────────────────────────
const phase1 = [];

// Delete CF rules
for(let i=cfCount-1;i>=0;i--) phase1.push({deleteConditionalFormatRule:{sheetId:S,index:i}});
// Delete bandings
for(const id of bandingIds) phase1.push({deleteBanding:{bandedRangeId:id}});
// Delete all columns from index 6 onwards
phase1.push({deleteDimension:{range:{sheetId:S,dimension:'COLUMNS',startIndex:6,endIndex:colCount}}});

console.log(`Phase 1: ${phase1.length} requests`);
const r1=JSON.parse(await apiReq('sheets.googleapis.com','POST',
  `/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,{requests:phase1},{Authorization:`Bearer ${token}`}));
if(!r1.spreadsheetId){console.error('Phase 1 failed:',JSON.stringify(r1).substring(0,300));process.exit(1);}
console.log('✓ Phase 1 done (cleared old structure)');

// ── Phase 2: insert new columns (need 11 more, currently have 6: A-F) ──
const phase2 = [
  // Insert TEMPLATE column at index 2 (between TIPO and NOME)
  {insertDimension:{range:{sheetId:S,dimension:'COLUMNS',startIndex:2,endIndex:3},inheritFromBefore:false}},
  // After this: A=status,B=tipo,C=template_NEW,D=nome,E=docx,F=data,G=horario
  // Append 10 more columns for: H-Q (de_envio, de_exclusao, asset, send, obs, campanha, preview, send_class, sender, tracking)
  {appendDimension:{sheetId:S,dimension:'COLUMNS',length:10}},
];
const r2=JSON.parse(await apiReq('sheets.googleapis.com','POST',
  `/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,{requests:phase2},{Authorization:`Bearer ${token}`}));
if(!r2.spreadsheetId){console.error('Phase 2 failed:',JSON.stringify(r2).substring(0,300));process.exit(1);}
console.log('✓ Phase 2 done (inserted new columns)');

// ── Phase 3: format + headers + dropdowns + CF ──────
// New layout (17 cols, 0-16):
// 0=STATUS,1=TIPO,2=TEMPLATE,3=NOME,4=DOCX,5=DATA,6=H
// 7=DEs ENVIO,8=DEs EXCLUSÃO
// 9=ASSET ID,10=SEND ID,11=OBS,12=CAMPANHA
// 13=PREVIEW,14=SEND CLASS,15=SENDER,16=TRACKING
const NCOLS = 17;
const HEADERS = ['STATUS','TIPO','TEMPLATE','NOME','DOCX','DATA','H','DEs ENVIO','DEs EXCLUSÃO','ASSET ID','SEND ID','OBS','CAMPANHA','PREVIEW','SEND CLASS','SENDER','TRACKING'];

const phase3 = [
  // Freeze
  {updateSheetProperties:{properties:{sheetId:S,gridProperties:{frozenRowCount:1,frozenColumnCount:1}},fields:'gridProperties.frozenRowCount,gridProperties.frozenColumnCount'}},

  // Row heights
  {updateDimensionProperties:{range:{sheetId:S,dimension:'ROWS',startIndex:0,endIndex:1},properties:{pixelSize:44},fields:'pixelSize'}},
  {updateDimensionProperties:{range:{sheetId:S,dimension:'ROWS',startIndex:1,endIndex:1000},properties:{pixelSize:34},fields:'pixelSize'}},

  // Column widths
  COL(0,1,160),  // STATUS
  COL(1,2,96),   // TIPO
  COL(2,3,118),  // TEMPLATE
  COL(3,4,240),  // NOME
  COL(4,5,80),   // DOCX
  COL(5,6,104),  // DATA
  COL(6,7,64),   // H
  COL(7,8,280),  // DEs ENVIO — wide, text list
  COL(8,9,280),  // DEs EXCLUSÃO — wide, text list
  COL(9,10,110), // ASSET ID
  COL(10,11,148),// SEND ID
  COL(11,12,240),// OBS
  COL(12,13,104),// CAMPANHA
  COL(13,14,100),// PREVIEW
  COL(14,15,100),// SEND CLASS
  COL(15,16,175),// SENDER
  COL(16,17,175),// TRACKING

  // Header: full navy
  {repeatCell:{range:R(0,1,0,NCOLS),cell:{userEnteredFormat:{
    backgroundColor:rgb(NAVY),
    textFormat:{foregroundColor:{red:1,green:1,blue:1},bold:true,fontSize:9},
    horizontalAlignment:'CENTER',verticalAlignment:'MIDDLE',wrapStrategy:'CLIP'
  }},fields:'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'}},

  // Header text overrides: agent cols muted, config cols cyan
  {repeatCell:{range:R(0,1,9,13),cell:{userEnteredFormat:{textFormat:{foregroundColor:rgb('#2E5470'),bold:true,fontSize:9}}},fields:'userEnteredFormat(textFormat)'}},
  {repeatCell:{range:R(0,1,13,17),cell:{userEnteredFormat:{textFormat:{foregroundColor:rgb(CYAN),bold:true,fontSize:9}}},fields:'userEnteredFormat(textFormat)'}},

  // Header labels
  {updateCells:{range:R(0,1,0,NCOLS),rows:[{values:HEADERS.map(v=>({userEnteredValue:{stringValue:v}}))}],fields:'userEnteredValue'}},

  // Header bottom: cyan
  {updateBorders:{range:R(0,1,0,NCOLS),bottom:{style:'SOLID_MEDIUM',colorStyle:{rgbColor:rgb(CYAN)}}}},

  // Data: white, dark text, middle, clip
  {repeatCell:{range:R(1,1000,0,NCOLS),cell:{userEnteredFormat:{
    backgroundColor:rgb(WHITE),
    textFormat:{foregroundColor:rgb(TEXT),fontSize:10},
    verticalAlignment:'MIDDLE',wrapStrategy:'CLIP'
  }},fields:'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,wrapStrategy)'}},

  // Col A: off-white + bold centered
  {repeatCell:{range:R(1,1000,0,1),cell:{userEnteredFormat:{backgroundColor:rgb(OFF_WHITE),textFormat:{bold:true,fontSize:10},horizontalAlignment:'CENTER'}},fields:'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'}},

  // NOME: bold
  {repeatCell:{range:R(1,1000,3,4),cell:{userEnteredFormat:{textFormat:{bold:true,fontSize:10}}},fields:'userEnteredFormat(textFormat)'}},

  // DATA + H: centered, medium
  {repeatCell:{range:R(1,1000,5,7),cell:{userEnteredFormat:{textFormat:{foregroundColor:rgb(TEXT_MID),fontSize:10},horizontalAlignment:'CENTER'}},fields:'userEnteredFormat(textFormat,horizontalAlignment)'}},

  // DEs columns: monospace-ish, smaller, wrap
  {repeatCell:{range:R(1,1000,7,9),cell:{userEnteredFormat:{textFormat:{foregroundColor:rgb(TEXT_MID),fontSize:9},wrapStrategy:'WRAP'}},fields:'userEnteredFormat(textFormat,wrapStrategy)'}},

  // Agent cols (9-11, 13-16): muted italic
  {repeatCell:{range:R(1,1000,9,12),cell:{userEnteredFormat:{backgroundColor:rgb(BG_AGENT),textFormat:{foregroundColor:rgb(TEXT_MUTED),fontSize:9,italic:true}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}},
  {repeatCell:{range:R(1,1000,13,17),cell:{userEnteredFormat:{backgroundColor:rgb(BG_AGENT),textFormat:{foregroundColor:rgb(TEXT_MUTED),fontSize:9,italic:true}}},fields:'userEnteredFormat(backgroundColor,textFormat)'}},

  // OBS: wrap
  {repeatCell:{range:R(1,1000,11,12),cell:{userEnteredFormat:{wrapStrategy:'WRAP',backgroundColor:rgb(WHITE),textFormat:{foregroundColor:rgb(TEXT_MID),fontSize:10}}},fields:'userEnteredFormat(wrapStrategy,backgroundColor,textFormat)'}},

  // Borders: thin row separators + col A right
  {updateBorders:{range:R(1,1000,0,NCOLS),bottom:{style:'SOLID',colorStyle:{rgbColor:rgb(BORDER)}}}},
  {updateBorders:{range:R(1,1000,0,1),right:{style:'SOLID',colorStyle:{rgbColor:rgb('#CBD5E1')}}}},

  // Banding: alternating white/off-white
  {addBanding:{bandedRange:{range:R(1,1000,0,NCOLS),rowProperties:{
    firstBandColor:rgb(WHITE),
    secondBandColor:rgb(OFF_WHITE)
  }}}},

  // Dropdowns — NO arrows (showCustomUi:false) except TEMPLATE (showCustomUi:true = visible)
  // Col A: status
  {setDataValidation:{range:R(1,1000,0,1),rule:{condition:{type:'ONE_OF_LIST',values:[
    {userEnteredValue:'rascunho'},{userEnteredValue:'pendente'},{userEnteredValue:'aguardando_aprovacao'},
    {userEnteredValue:'aprovado'},{userEnteredValue:'agendado'},{userEnteredValue:'revisar'},
    {userEnteredValue:'enviado'},{userEnteredValue:'erro_docx'},{userEnteredValue:'erro_html'},
    {userEnteredValue:'erro_upload_sfmc'},{userEnteredValue:'erro_agendamento'}
  ]},showCustomUi:true,strict:false}}},

  // Col B: tipo
  {setDataValidation:{range:R(1,1000,1,2),rule:{condition:{type:'ONE_OF_LIST',values:[
    {userEnteredValue:'individual'},{userEnteredValue:'campanha'}
  ]},showCustomUi:true,strict:false}}},

  // Col C: template
  {setDataValidation:{range:R(1,1000,2,3),rule:{condition:{type:'ONE_OF_LIST',values:[
    {userEnteredValue:'news'},{userEnteredValue:'campanha'},{userEnteredValue:'conteudo'},
    {userEnteredValue:'relatorio'},{userEnteredValue:'comunicado'},{userEnteredValue:'consultor-elite'}
  ]},showCustomUi:true,strict:false}}},

  // Col P: sender profiles
  {setDataValidation:{range:R(1,1000,15,16),rule:{condition:{type:'ONE_OF_LIST',values:[
    {userEnteredValue:'Equipe Finclass (194)'},
    {userEnteredValue:'Conteúdo - Finclass (270)'},
    {userEnteredValue:'Consultor de Elite (294)'},
    {userEnteredValue:'Fin News (285)'},
    {userEnteredValue:'Rodrigo Xavier - Finclass (280)'},
    {userEnteredValue:'Ricardo Figueiredo - Finclass (199)'},
    {userEnteredValue:'Eduardo Perez (319)'},
    {userEnteredValue:'Evandro Medeiros (318)'},
  ]},showCustomUi:true,strict:false}}},

  // Col Q: tracking categories
  {setDataValidation:{range:R(1,1000,16,17),rule:{condition:{type:'ONE_OF_LIST',values:[
    {userEnteredValue:'Campanhas/2026 (320491)'},
    {userEnteredValue:'Newsletter/2026 (320503)'},
    {userEnteredValue:'Conteúdo Finclass (315907)'},
    {userEnteredValue:'Consultor de Elite (317554)'},
    {userEnteredValue:'Recomendações (278546)'},
    {userEnteredValue:'Outros (276056)'},
  ]},showCustomUi:true,strict:false}}},
];

// Conditional formatting
let cfIdx=0;
function addCF(formula,badgeColor,rowTint){
  phase3.push({addConditionalFormatRule:{index:cfIdx++,rule:{ranges:[R(1,1000,1,NCOLS)],booleanRule:{condition:{type:'CUSTOM_FORMULA',values:[{userEnteredValue:formula}]},format:{backgroundColor:rgb(rowTint)}}}}} );
  phase3.push({addConditionalFormatRule:{index:cfIdx++,rule:{ranges:[R(1,1000,0,1)],booleanRule:{condition:{type:'CUSTOM_FORMULA',values:[{userEnteredValue:formula}]},format:{backgroundColor:rgb(badgeColor),textFormat:{foregroundColor:{red:1,green:1,blue:1},bold:true}}}}}} );
}
for(const [status,[badge,row]] of Object.entries(STATUS)) addCF(`=$A2="${status}"`,badge,row);
for(const erro of ERROS) addCF(`=$A2="${erro}"`, '#F43F5E', '#FFF7F8');

console.log(`Phase 3: ${phase3.length} requests`);
const r3=JSON.parse(await apiReq('sheets.googleapis.com','POST',
  `/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,{requests:phase3},{Authorization:`Bearer ${token}`}));
if(!r3.spreadsheetId){console.error('Phase 3 failed:',JSON.stringify(r3).substring(0,400));process.exit(1);}
console.log('✓ Phase 3 done (formatted)');

// ── Phase 4: write back migrated data ───────────────
if(migratedRows.length>0){
  const writeResp=JSON.parse(await apiReq('sheets.googleapis.com','POST',
    `/v4/spreadsheets/${SPREADSHEET_ID}/values/Fila%21A2%3AQ${1+migratedRows.length}:clear`,
    {},{Authorization:`Bearer ${token}`}));

  const valResp=JSON.parse(await apiReq('sheets.googleapis.com','PUT',
    `/v4/spreadsheets/${SPREADSHEET_ID}/values/Fila%21A2%3AQ${1+migratedRows.length}?valueInputOption=RAW`,
    {values:migratedRows},{Authorization:`Bearer ${token}`}));
  console.log(`✓ Phase 4: migrated ${migratedRows.length} row(s)`);
}

console.log('\n✅ Reestruturação completa! Nova estrutura: A-Q (17 colunas)');
console.log('STATUS | TIPO | TEMPLATE | NOME | DOCX | DATA | H | DEs ENVIO | DEs EXCLUSÃO | ASSET ID | SEND ID | OBS | CAMPANHA | PREVIEW | SEND CLASS | SENDER | TRACKING');
