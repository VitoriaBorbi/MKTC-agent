<script runat="server">
Platform.Load("Core", "1.1.1");

// ============================================================
// CONFIG — replace with your actual Anthropic key
// ============================================================
var ANTHROPIC_KEY  = "YOUR_ANTHROPIC_API_KEY_HERE";
var ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
var MAX_TOKENS     = 4096;
var DE_EMAILS      = "MKTC_Emails";

// ============================================================
// RESPONSE HEADERS (wrapped — SetHeader unsupported in some SFMC envs)
// ============================================================
try {
  Response.SetHeader("Content-Type", "application/json; charset=utf-8");
  Response.SetHeader("Access-Control-Allow-Origin", "*");
  Response.SetHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  Response.SetHeader("Access-Control-Allow-Headers", "Content-Type");
} catch(headerErr) { /* ignore — SFMC sets Content-Type automatically */ }

// ============================================================
// PARSE REQUEST — suporta GET (query params) e POST (JSON body)
// ============================================================
var result = {};
var isOptions = (Platform.Request.Method == "OPTIONS");

if (!isOptions) {
  var req = {};
  var body = Platform.Request.GetPostData();

  if (body && body.length > 2) {
    // POST com JSON body
    try { req = Platform.Function.ParseJSON(body); } catch(e) { req = {}; }
  }

  // Fallback: ler da query string (GET requests)
  var action = req.action || Platform.Request.GetQueryStringParameter("action") || "";
  var bu     = req.bu     || Platform.Request.GetQueryStringParameter("bu")     || "finclass";

  // Para GET, parâmetros extras vêm da query string
  if (!req.id)     req.id     = Platform.Request.GetQueryStringParameter("id");
  if (!req.status) req.status = Platform.Request.GetQueryStringParameter("status");

  // ============================================================
  // ROUTER
  // ============================================================
  try {
    if      (action == "ping")             result = {success: true, message: "MKTC API ok"};
    else if (action == "list_emails")      result = actionListEmails(bu, req.status);
    else if (action == "get_email")        result = actionGetEmail(req.id);
    else if (action == "save_email")       result = actionSaveEmail(bu, req);
    else if (action == "delete_email")     result = actionDeleteEmail(req.id);
    else if (action == "generate_html")    result = actionGenerateHTML(bu, req);
    else if (action == "schedule_email")   result = actionScheduleEmail(bu, req);
    else if (action == "get_stats")        result = actionGetStats(bu);
    else if (action == "list_templates")   result = {success: true, data: getTemplates()};
    else result = {success: false, error: "Unknown action: " + action};
  } catch(e) {
    result = {success: false, error: e.message || String(e)};
  }
} // end !isOptions

Response.Write(isOptions ? "{}" : Stringify(result));

// ============================================================
// ACTION: list_emails
// ============================================================
function actionListEmails(bu, status) {
  var de = DataExtension.Init(DE_EMAILS);
  var rows;
  try {
    rows = de.Rows.Retrieve({Property: "BU", SimpleOperator: "equals", Value: bu});
  } catch(e) { rows = []; }

  rows = normalizeRows(rows);

  if (status && status != "all") {
    var filtered = [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].Status == status) filtered.push(rows[i]);
    }
    rows = filtered;
  }

  // Sort: most recent Updated_Date first (string sort works for ISO dates)
  rows.sort(function(a, b) {
    var da = a.Updated_Date || a.Created_Date || "";
    var db = b.Updated_Date || b.Created_Date || "";
    return db > da ? 1 : (db < da ? -1 : 0);
  });

  return {success: true, data: rows};
}

// ============================================================
// ACTION: get_email
// ============================================================
function actionGetEmail(id) {
  var de = DataExtension.Init(DE_EMAILS);
  var rows;
  try {
    rows = de.Rows.Retrieve({Property: "ID", SimpleOperator: "equals", Value: id});
  } catch(e) {
    return {success: false, error: "Not found"};
  }
  rows = normalizeRows(rows);
  if (rows.length === 0) return {success: false, error: "Email not found"};
  return {success: true, data: rows[0]};
}

// ============================================================
// ACTION: save_email (upsert)
// ============================================================
function actionSaveEmail(bu, email) {
  if (!email) return {success: false, error: "No email data"};

  var id  = email.ID || generateGUID();
  var now = Now();

  Platform.Function.UpsertDE(
    DE_EMAILS, 1, "ID", id,
    "ID",           id,
    "BU",           bu,
    "Nome",         email.Nome         || "Email sem nome",
    "Status",       email.Status       || "rascunho",
    "Assunto",      email.Assunto      || "",
    "Preheader",    email.Preheader    || "",
    "Template_ID",  email.Template_ID  || "full-hero",
    "HTML_Content", email.HTML_Content || "",
    "Send_Date",    email.Send_Date    || "",
    "Send_Time",    email.Send_Time    || "",
    "DE_Envio",     email.DE_Envio     || "",
    "DE_Exclusao",  email.DE_Exclusao  || "",
    "Obs",          email.Obs          || "",
    "Updated_Date", now
  );

  return {success: true, id: id};
}

// ============================================================
// ACTION: generate_html
// ============================================================
function actionGenerateHTML(bu, req) {
  var brand   = getBrandConfig(bu);
  var sysPrompt  = buildSystemPrompt(brand);
  var userContent = buildUserContent(req, brand);

  var payload = {
    model:      ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    system:     sysPrompt,
    messages:   [{role: "user", content: userContent}]
  };

  var response = HTTP.Post(
    "https://api.anthropic.com/v1/messages",
    "application/json",
    Stringify(payload),
    ["x-api-key",       "anthropic-version"],
    [ANTHROPIC_KEY,     "2023-06-01"]
  );

  if (!response || response.StatusCode != 200) {
    var errMsg = response
      ? ("HTTP " + response.StatusCode + ": " + (response.Content || "no body"))
      : "No HTTP response";
    return {success: false, error: errMsg};
  }

  var apiResult;
  try {
    apiResult = Platform.Function.ParseJSON(response.Content);
  } catch(e) {
    return {success: false, error: "Failed to parse Anthropic response"};
  }

  if (!apiResult.content || !apiResult.content[0]) {
    return {success: false, error: "Empty response from Anthropic"};
  }

  return {success: true, html: apiResult.content[0].text};
}

// ============================================================
// ACTION: get_stats
// ============================================================
function actionGetStats(bu) {
  var de = DataExtension.Init(DE_EMAILS);
  var rows;
  try {
    rows = de.Rows.Retrieve({Property: "BU", SimpleOperator: "equals", Value: bu});
  } catch(e) { rows = []; }
  rows = normalizeRows(rows);

  var stats = {total: 0, rascunho: 0, em_aprovacao: 0, aprovado: 0, agendado: 0, enviado: 0};
  for (var i = 0; i < rows.length; i++) {
    stats.total++;
    var s = rows[i].Status;
    if (s && stats[s] !== undefined) stats[s]++;
  }

  return {success: true, data: stats};
}

// ============================================================
// ACTION: delete_email
// ============================================================
function actionDeleteEmail(id) {
  if (!id) return {success: false, error: "No ID"};
  try {
    DataExtension.Init(DE_EMAILS).Rows.Remove("ID", id);
    return {success: true};
  } catch(e) {
    return {success: false, error: e.message || String(e)};
  }
}

// ============================================================
// ACTION: schedule_email  (uses WSProxy SOAP)
// ============================================================
function actionScheduleEmail(bu, req) {
  var mids = {
    "finclass":      "518005767",
    "bruno-perini":  "518006235",
    "faculdade-hub": "518005749",
    "thiago-nigro":  "518006236",
    "portfel":       "518004698"
  };

  var mid = mids[bu];
  if (!mid) return {success: false, error: "BU sem MID configurado: " + bu};

  var prox = new Script.Util.WSProxy();
  prox.setClientId({ID: mid});

  var desEnvio    = req.desEnvio    || [];
  var desExclusao = req.desExclusao || [];
  var emailId     = req.emailId     || "";
  var html        = req.html        || "";
  var assunto     = req.assunto     || req.emailNome || "Email";
  var sendDate    = req.sendDate    || "";
  var sendTime    = req.sendTime    || "09:00";
  var sendClassKey = req.sendClassKey || "";
  var categoryId  = req.categoryId  || "";
  var obs         = req.obs         || "";

  // Resolve source DE ObjectIDs
  var sourceOIDs = [];
  for (var i = 0; i < desEnvio.length; i++) {
    var oid = wsGetDEObjectID(prox, desEnvio[i]);
    if (!oid) return {success: false, error: "DE de envio não encontrada: " + desEnvio[i]};
    sourceOIDs.push(oid);
  }

  // Resolve exclusion DE ObjectIDs
  var exclOIDs = [];
  for (var j = 0; j < desExclusao.length; j++) {
    var eoid = wsGetDEObjectID(prox, desExclusao[j]);
    if (!eoid) return {success: false, error: "DE de exclusão não encontrada: " + desExclusao[j]};
    exclOIDs.push(eoid);
  }

  // BRT → UTC  (BRT = UTC-3, add 3 hours)
  // Parse date/time manually to avoid host TZ interpretation
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  var dateParts = sendDate.split("-");
  var timeParts = sendTime.split(":");
  var year = parseInt(dateParts[0], 10);
  var mon  = parseInt(dateParts[1], 10) - 1;
  var day  = parseInt(dateParts[2], 10);
  var hour = parseInt(timeParts[0], 10);
  var min  = parseInt(timeParts[1] || "0", 10);
  // Create as UTC then add 3h (because BRT = UTC-3, UTC = BRT+3)
  var utcBase = new Date(Date.UTC(year, mon, day, hour, min, 0));
  var utcDate = new Date(utcBase.getTime() + (3 * 3600 * 1000));
  var utcDatetime = utcDate.getUTCFullYear() + "-" + pad(utcDate.getUTCMonth()+1) + "-" + pad(utcDate.getUTCDate()) +
    "T" + pad(utcDate.getUTCHours()) + ":" + pad(utcDate.getUTCMinutes()) + ":00";

  // Build unique names
  var safeName = (req.emailNome || "email").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 35);
  var ts       = Now().getTime ? Now().getTime() : new Date().getTime();
  var esName   = safeName + "_" + ts;
  var esdKey   = safeName.slice(0, 28) + "-" + ts;

  // Create Email in Email Studio
  var esEmailId = wsCreateEmail(prox, esName, assunto, html, categoryId);
  if (!esEmailId) return {success: false, error: "Falha ao criar email no Email Studio (wsCreateEmail returned null)"};

  // Create EmailSendDefinition
  var esdOk = wsCreateESD(prox, esdKey, sendClassKey, esEmailId, sourceOIDs, exclOIDs);
  if (!esdOk) return {success: false, error: "Falha ao criar EmailSendDefinition"};

  // Schedule
  var schedOk = wsScheduleESD(prox, esdKey, utcDatetime);
  if (!schedOk) return {success: false, error: "Falha ao agendar ESD"};

  // Update DE record
  var obsNote = obs + (obs ? "\n" : "") + "[SFMC] Email ID: " + esEmailId + " | ESD: " + esdKey;
  try {
    Platform.Function.UpsertDE(
      DE_EMAILS, 1, "ID", emailId,
      "Status",       "agendado",
      "Send_Date",    sendDate,
      "Send_Time",    sendTime,
      "DE_Envio",     desEnvio.join(","),
      "DE_Exclusao",  desExclusao.join(","),
      "Obs",          obsNote,
      "Updated_Date", Now()
    );
  } catch(saveErr) { /* não bloquear se o save falhar */ }

  return {success: true, esEmailId: esEmailId, esdKey: esdKey};
}

function wsGetDEObjectID(prox, customerKey) {
  try {
    var result = prox.retrieve("DataExtension", ["ObjectID", "CustomerKey"], {
      Property: "CustomerKey", SimpleOperator: "equals", Value: customerKey
    });
    if (result && result.Results && result.Results.length > 0) {
      return result.Results[0].ObjectID;
    }
  } catch(e) {}
  return null;
}

function wsCreateEmail(prox, name, subject, html, categoryId) {
  try {
    var safeHtml = html.replace(/\]\]>/g, "]] >");
    var emailObj = {
      Name:        name,
      Subject:     subject || name,
      HTMLBody:    safeHtml,
      IsHTMLPaste: true
    };
    if (categoryId) emailObj.CategoryID = parseInt(categoryId, 10);
    var result = prox.createItem("Email", emailObj);
    if (result && result.Results && result.Results.length > 0) {
      return result.Results[0].NewID;
    }
  } catch(e) {}
  return null;
}

function wsCreateESD(prox, esdKey, sendClassKey, esEmailId, sourceOIDs, exclOIDs) {
  try {
    var sendLists = [];
    for (var i = 0; i < sourceOIDs.length; i++) {
      sendLists.push({
        SendDefinitionListType: "SourceList",
        DataSourceTypeID:       "CustomObject",
        CustomObjectID:         sourceOIDs[i]
      });
    }
    for (var j = 0; j < exclOIDs.length; j++) {
      sendLists.push({
        SendDefinitionListType: "ExclusionList",
        DataSourceTypeID:       "CustomObject",
        CustomObjectID:         exclOIDs[j]
      });
    }
    var esdObj = {
      CustomerKey:          esdKey,
      Name:                 esdKey,
      SendClassification:   {CustomerKey: sendClassKey},
      Email:                {ID: esEmailId},
      SendDefinitionList:   sendLists
    };
    var result = prox.createItem("EmailSendDefinition", esdObj);
    return result && result.Status === "OK";
  } catch(e) { return false; }
}

function wsScheduleESD(prox, esdKey, utcDatetime) {
  try {
    var schedDef     = {StartDateTime: utcDatetime};
    var interactions = [{CustomerKey: esdKey}];
    var result = prox.schedule("EmailSendDefinition", "start", schedDef, interactions);
    return result && result.Status === "OK";
  } catch(e) { return false; }
}

// ============================================================
// BRAND CONFIG
// ============================================================
function getBrandConfig(bu) {
  var brands = {};

  brands["finclass"] = {
    name:      "Finclass",
    primary:   "#00e7f9",
    secondary: "#0a0e27",
    cta:       "#00e7f9",
    cta_text:  "#000000",
    logo:      "https://image.mkt.finclass.com/lib/fe2811717d640478721277/m/1/c6b407e1-8e55-4b00-abd8-19f20df026dc.png"
  };
  brands["bruno-perini"] = {
    name:      "Bruno Perini",
    primary:   "#b2ec05",
    secondary: "#0f1014",
    cta:       "#b2ec05",
    cta_text:  "#000000",
    logo:      "https://image.mail.vocemaisrico.com/lib/fe3111717d64047b771775/m/1/813699e2-15be-49d3-943e-705a97294c2c.png"
  };
  brands["faculdade-hub"] = {
    name:      "Faculdade Hub",
    primary:   "#ffffff",
    secondary: "#0f1014",
    cta:       "#000000",
    cta_text:  "#ffffff",
    logo:      "https://image.mba.grupo-primo.com/lib/fe2811717d640478721079/m/1/4127a0f5-8fef-456f-b13e-760099d30ccc.png"
  };
  brands["thiago-nigro"] = {
    name:      "Thiago Nigro",
    primary:   "#ff4900",
    secondary: "#0f172a",
    cta:       "#ff4900",
    cta_text:  "#ffffff",
    logo:      "https://image.mail.oprimorico.com.br/lib/fe3011717d64047b771776/m/1/9475f340-442b-4e35-9f2b-17fa10f7d0e4.png"
  };
  brands["portfel"] = {
    name:      "Portfel",
    primary:   "#F05A28",
    secondary: "#1A1A1A",
    cta:       "#F05A28",
    cta_text:  "#ffffff",
    logo:      "PLACEHOLDER_PORTFEL_LOGO"
  };
  brands["grao"] = {
    name:      "Grão",
    primary:   "#f59e0b",
    secondary: "#2d1b00",
    cta:       "#f59e0b",
    cta_text:  "#000000",
    logo:      "PLACEHOLDER_GRAO_LOGO"
  };

  return brands[bu] || brands["finclass"];
}

// ============================================================
// PROMPT BUILDERS
// ============================================================
function buildSystemPrompt(brand) {
  return "Você é um especialista em email marketing HTML para a marca " + brand.name + ".\n\n" +
    "IDENTIDADE DA MARCA:\n" +
    "- Cor primária: "           + brand.primary   + "\n" +
    "- Cor secundária: "         + brand.secondary  + "\n" +
    "- Cor CTA: "                + brand.cta        + "\n" +
    "- Logo URL: "               + brand.logo       + "\n" +
    "- Tom: profissional, aspiracional, direto\n\n" +
    "REGRAS DE EMAIL HTML (obrigatórias):\n" +
    "- DOCTYPE XHTML 1.0 Transitional\n" +
    "- Layout 100% em <table>, NUNCA <div> para estrutura\n" +
    "- CSS 100% inline, NUNCA externo ou <style>\n" +
    "- Max-width: 600px\n" +
    "- Fonts: Arial, Helvetica, sans-serif\n" +
    "- Imagens com display:block, alt e width/height explícitos\n" +
    "- Preheader oculto logo após <body>\n" +
    "- Footer com link de descadastro: <a href=\"%%unsub_center_url%%\">\n" +
    "- CTA com AMPscript placeholder: <a href=\"%%=v(@link_tag)=%%\">\n\n" +
    "Gere APENAS o HTML completo do email, sem explicações, sem markdown, sem blocos de código.\n" +
    "Comece diretamente com <!DOCTYPE html";
}

function buildUserContent(req, brand) {
  var hints = {};
  hints["full-hero"]    = "Imagem hero full-width no topo, headline grande, CTA único e bem destacado.";
  hints["text-first"]   = "Hierarquia tipográfica forte. Copy longa, mínimo de imagens, CTA no final.";
  hints["side-image"]   = "Imagem à esquerda (ou direita), copy ao lado. Grid 2 colunas no topo.";
  hints["multi-block"]  = "Múltiplos blocos de conteúdo com separadores visuais entre eles.";
  hints["minimal"]      = "Muito espaço em branco, tipografia limpa, uma única mensagem central.";
  hints["announcement"] = "Borda colorida no topo (4px), conteúdo centralizado, tom de urgência/destaque.";

  var tid  = req.templateId || "full-hero";
  var hint = hints[tid] || "";

  var txt = "Crie um email HTML completo com base nas informações abaixo.\n\n" +
    "ASSUNTO: "        + (req.assunto   || "Email marketing") + "\n" +
    "PRÉ-CABEÇALHO: "  + (req.preheader || req.assunto || "") + "\n" +
    "TEMPLATE: "       + tid + " — " + hint + "\n\n" +
    "COPY DO EMAIL:\n" + (req.copyText  || "") + "\n\n";

  if (req.hasReference) {
    txt += "IMPORTANTE: Uma imagem de referência visual foi fornecida.\n" +
      "NÃO insira essa imagem no email.\n" +
      "EXTRAIA dela: paleta de cores dominante, estilo visual, temperatura (fria/quente), nível de contraste, sensação (premium/jovial/sério/energético).\n" +
      "USE esse DNA visual para customizar as cores de fundo das seções, separadores, destaques tipográficos e quaisquer elementos decorativos do email — mantendo compatibilidade com a identidade da marca.\n" +
      "O email deve SENTIR que foi criado para aquela referência, sem copiar literalmente nenhum elemento.\n\n";
  }

  txt += "Gere o HTML completo do email.";

  var content = [];

  if (req.refImage) {
    var imgData   = req.refImage;
    var mediaType = "image/jpeg";
    if (imgData.indexOf("data:") === 0) {
      var comma = imgData.indexOf(",");
      if (comma > -1) {
        var header  = imgData.substring(0, comma);
        imgData     = imgData.substring(comma + 1);
        var mtMatch = header.match(/data:([^;]+)/);
        if (mtMatch) mediaType = mtMatch[1];
      }
    }
    content.push({
      type:   "image",
      source: {type: "base64", media_type: mediaType, data: imgData}
    });
  }

  content.push({type: "text", text: txt});
  return content;
}

// ============================================================
// HELPERS
// ============================================================
function normalizeRows(rows) {
  if (!rows) return [];
  // SSJS sometimes returns a single object instead of array
  if (typeof rows == "object" && rows.constructor !== Array) {
    if (rows.ID || rows.BU) return [rows];
    return [];
  }
  return rows;
}

function getTemplates() {
  return [
    {id: "full-hero",    name: "Hero Completo",  desc: "Imagem hero full-width, headline grande, CTA único"},
    {id: "text-first",   name: "Copy Longa",     desc: "Tipografia forte, mínimo de imagens, CTA no final"},
    {id: "side-image",   name: "Imagem Lateral", desc: "Grid 2 colunas com imagem à esquerda"},
    {id: "multi-block",  name: "Multi-bloco",    desc: "Múltiplos blocos com separadores visuais"},
    {id: "minimal",      name: "Minimal",        desc: "Espaço em branco, tipografia limpa, mensagem única"},
    {id: "announcement", name: "Anúncio",        desc: "Borda colorida no topo, conteúdo centralizado"}
  ];
}

function generateGUID() {
  return rh(8) + "-" + rh(4) + "-4" + rh(3) + "-" +
         (8 + Math.floor(Math.random() * 4)).toString(16) + rh(3) + "-" + rh(12);
}

function rh(n) {
  var s = ""; var c = "0123456789abcdef";
  for (var i = 0; i < n; i++) s += c.charAt(Math.floor(Math.random() * 16));
  return s;
}
</script>
