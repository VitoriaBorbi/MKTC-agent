/*
  ================================================================
  MKTC Logic — CR JS
  Code Resource tipo JavaScript no CloudPages SFMC
  Referência: <script src="CR_JS_URL"><\/script>

  Espera window.MKTC injetado pelo LP shell:
  {
    apiUrl:       "https://...mktc-api...",  // LP API AMPScript
    bu:           "finclass",                // BU da URL param
    initialData:  { emails: [], stats: {}, dataviews: {} }
  }
  // Geração de HTML via AMPScript (template pré-pronto + copy do Google Docs)
  ================================================================
*/
function mktcApp() {
  return {

    // ── State ──────────────────────────────────────────────────
    view:            'dashboard',
    bu:              (window.MKTC && window.MKTC.bu) || 'finclass',
    emails:          [],
    stats:           {total:0,rascunho:0,em_aprovacao:0,aprovado:0,agendado:0,enviado:0},
    dataviewStats:   {sends:0,opens:0,openRate:0,clicks:0,ctr:0,bounces:0},
    dataviewDays:    30,
    dataviewLoading: false,
    selectedEmail:   null,
    loading:         false,
    loadError:       null,
    filaSearch:      '',
    filaFilter:      'all',
    deleteConfirmId:     null,
    deleteConfirmDetail: false,
    prompts:             [],
    savePromptModal:     false,
    savePromptNome:      '',
    toast:               {show:false,message:'',type:'success'},
    sendClassificationsList: [],

    detail: {
      html:'', assunto:'', preheader:'',
      viewport:'desktop', saving:false,
      showAgendar:false, tab:'preview',
      desEnvio:[], desExclusao:[],
      deEnvioInput:'', deExclusaoInput:'',
      sendDate:'', sendTime:'', sendClassKey:'',
    },

    schedule: {
      sendDate:'', sendTime:'', sendClassKey:'',
      desEnvio:[], desExclusao:[],
      deEnvioInput:'', deExclusaoInput:'',
      categoryId:'', obs:'',
      submitting:false, log:'',
    },

    wizard: {
      step:1, tipo:'avulso', gdocUrl:'', assunto:'', preheader:'',
      emailNome:'', templateId:'', campanhaNome:'',
      templates:[], templatesLoading:false,
      generating:false, genError:null,
      desEnvio:[], desExclusao:[], deEnvioInput:'', deExclusaoInput:'',
      sendDate:'', sendTime:'',
    },

    journey: {
      view:'upload', name:'', briefing:'', entryDE:'',
      imageB64:null, imagePreview:null, imageUrl:null,
      analyzing:false, analyzeError:null,
      structure:null,
      creating:false, creatingStep:-1, creatingError:null,
      result:null,
      previewOpen:false, previewLoading:false,
      previewHtml:null, previewStepName:'',
      imagesUploading:false,
    },

    // ── Init ──────────────────────────────────────────────────
    init() {
      // BU persistido no localStorage (mudança manual pelo user)
      const savedBU = localStorage.getItem('mktc_bu');
      if (savedBU) this.bu = savedBU;

      this.loadPromptsFromStorage();

      // Dados pré-carregados pelo AMPScript (page load instantâneo)
      if (window.MKTC && window.MKTC.initialData) {
        const d = window.MKTC.initialData;
        if (d.emails)    this.emails      = (d.emails || []).filter(e => e.Status !== 'deletado');
        if (d.stats)     this.stats       = d.stats;
        if (d.dataviews) this.dataviewStats= d.dataviews;
      } else {
        // Fallback: carregar via API
        this.loadDashboard();
        this.loadDataviews();
      }
    },

    // ── API URL ──────────────────────────────────────────────
    get API_URL() {
      return window.MKTC && window.MKTC.apiUrl ? window.MKTC.apiUrl : '';
    },

    // ── Navigation ────────────────────────────────────────────
    async navigateTo(newView) {
      this.view = newView;
      if      (newView === 'dashboard')       await this.loadDashboard();
      else if (newView === 'fila')            await this.loadEmails();
      else if (newView === 'nova-solicitacao') this.resetWizard();
      else if (newView === 'jornada')          this.resetJourney();
    },

    async changeBU(newBU) {
      this.bu = newBU;
      localStorage.setItem('mktc_bu', newBU);
      this.emails = [];
      this.stats  = {total:0,rascunho:0,em_aprovacao:0,aprovado:0,agendado:0,enviado:0};
      this.dataviewStats = {sends:0,opens:0,openRate:0,clicks:0,ctr:0,bounces:0};
      this.sendClassificationsList = [];
      if (this.view === 'dashboard' || this.view === 'fila') await this.loadDashboard();
      this.loadDataviews();
    },

    retryLoad() {
      this.loadError = null;
      if (this.view === 'dashboard') this.loadDashboard();
      else this.loadEmails();
    },

    // ── Core API call ─────────────────────────────────────────
    // Ações de leitura usam GET (query params na URL).
    // Ações de escrita usam POST (form-encoded body).
    // GET confirmado funcional no SFMC (ping test OK); POST falhava com "Failed to fetch".
    _WRITE_ACTIONS: new Set(['save_email','delete_email','schedule_email','upload_image','generate_from_gdoc']),

    async apiCall(action, data = {}) {
      if (!this.API_URL) throw new Error('API URL não configurada (window.MKTC.apiUrl)');

      const flat = { action, bu: this.bu };
      for (const [k, v] of Object.entries(data)) {
        if (k === 'email' && v && typeof v === 'object') Object.assign(flat, v);
        else flat[k] = v ?? '';
      }
      // Nunca enviar HTML_Content pelo apiCall (grande demais para form params)
      delete flat.HTML_Content;

      let response;
      if (this._WRITE_ACTIONS.has(action)) {
        response = await fetch(this.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(flat).toString(),
        });
      } else {
        response = await fetch(this.API_URL + '?' + new URLSearchParams(flat).toString());
      }

      if (!response.ok) throw new Error('HTTP ' + response.status);
      const text = await response.text();
      let json;
      try {
        // Tentar extrair via marcadores MKTCSTART/MKTCEND (LP AMPScript wraps JSON in HTML)
        const marker = text.match(/MKTCSTART([\s\S]*?)MKTCEND/);
        const raw = marker ? marker[1].trim() : text.trim();
        json = JSON.parse(raw);
      } catch {
        // Fallback: greedy match do primeiro { ao último }
        const m = text.match(/\{[\s\S]*\}/);
        try { json = m ? JSON.parse(m[0]) : null; } catch { json = null; }
      }
      if (!json) throw new Error('Resposta inválida da API');
      if (json.error || json.success === false) throw new Error(json.error || 'Erro na API');
      return json;
    },

    // ── Templates (carregados da API) ─────────────────────────
    async loadTemplates() {
      this.wizard.templatesLoading = true;
      try {
        const res = await this.apiCall('list_templates');
        this.wizard.templates = res.data || [];
      } catch(_) {
        this.wizard.templates = [];
      } finally {
        this.wizard.templatesLoading = false;
      }
    },

    async saveHtml(id, html) {
      try {
        await this.apiCall('save_html', {id, html});
      } catch(_) { /* non-fatal */ }
    },

    // Parser de resposta SFMC — extrai JSON do wrapper MKTCSTART...MKTCEND
    _parseResp(text) {
      const m = text.match(/MKTCSTART([\s\S]*?)MKTCEND/);
      return JSON.parse(m ? m[1].trim() : text.trim());
    },

    // ── Data ──────────────────────────────────────────────────
    async loadDashboard() {
      this.loading = true; this.loadError = null;
      try {
        const [sRes, eRes] = await Promise.allSettled([
          this.apiCall('get_stats'),
          this.apiCall('list_emails'),
        ]);
        if (sRes.status === 'fulfilled') this.stats  = sRes.value.data || this.stats;
        if (eRes.status === 'fulfilled') this.emails = (eRes.value.data || []).filter(e => e.Status !== 'deletado');
        const errs = [sRes, eRes].filter(r => r.status === 'rejected').map(r => r.reason?.message);
        if (errs.length) this.loadError = errs.join(' | ');
      } catch(e) { this.loadError = e.message; }
      finally    { this.loading = false; }
    },

    async loadEmails() {
      this.loading = true; this.loadError = null;
      try {
        const res = await this.apiCall('list_emails');
        this.emails = (res.data || []).filter(e => e.Status !== 'deletado');
      } catch(e) { this.loadError = e.message; }
      finally    { this.loading = false; }
    },

    // ── Dataviews ─────────────────────────────────────────────
    async loadDataviews() {
      if (!this.API_URL) return;
      this.dataviewLoading = true;
      try {
        const json = await this.apiCall('get_dataviews', {days: this.dataviewDays});
        const d = json.data || {};
        const sends = d.sends || 0, delivd = d.delivered || 0;
        const opens = d.opens || 0, clicks = d.clicks || 0;
        this.dataviewStats = {
          sends,
          opens,
          openRate: sends  > 0 ? Math.round((opens  / sends)  * 1000) / 10 : 0,
          clicks,
          ctr:      delivd > 0 ? Math.round((clicks / delivd) * 1000) / 10 : 0,
          bounces:  d.bounces || 0,
        };
      } catch(e) { /* non-fatal */ }
      finally    { this.dataviewLoading = false; }
    },

    setDataviewDays(days) { this.dataviewDays = days; this.loadDataviews(); },

    // ── Email Detail ──────────────────────────────────────────
    async openEmail(email) {
      this.selectedEmail      = email;
      this.detail.html        = '';
      this.detail.assunto     = email.Assunto   || '';
      this.detail.preheader   = email.Preheader || '';
      this.detail.tab         = 'preview';
      this.detail.showAgendar = false;
      this.detail.desEnvio    = email.DE_Envio    ? email.DE_Envio.split(',').map(s=>s.trim()).filter(Boolean) : [];
      this.detail.desExclusao = email.DE_Exclusao ? email.DE_Exclusao.split(',').map(s=>s.trim()).filter(Boolean) : [];
      this.detail.sendDate     = email.Send_Date     || '';
      this.detail.sendTime     = email.Send_Time     || '';
      this.detail.sendClassKey = email.Send_Class_Key || '';
      this.view = 'email-detail';

      try {
        const res = await this.apiCall('get_email', {id: email.ID});
        if (res.data) this.selectedEmail = {...this.selectedEmail, ...res.data};
      } catch(_) {}

      // HTML vive no localStorage (geração client-side)
      const localHtml = localStorage.getItem('mktc_html_' + email.ID);
      if (localHtml) this.detail.html = localHtml;
    },

    async saveDetail() {
      this.detail.saving = true;
      try {
        await this.apiCall('save_email', {
          email: {
            ...this.selectedEmail,
            Assunto:   this.detail.assunto,
            Preheader: this.detail.preheader,
          }
        });
        // Persiste HTML no localStorage e na DE
        if (this.detail.html) {
          try { localStorage.setItem('mktc_html_' + this.selectedEmail.ID, this.detail.html); } catch(_) {}
          await this.saveHtml(this.selectedEmail.ID, this.detail.html);
        }
        this.selectedEmail.Assunto    = this.detail.assunto;
        this.selectedEmail.Preheader  = this.detail.preheader;
        this.showToast('Salvo com sucesso!');
      } catch(e) { this.showToast('Erro: ' + e.message, 'error'); }
      finally    { this.detail.saving = false; }
    },

    async approveEmail() {
      try {
        await this.saveDetail();
        await this.apiCall('save_email', {email: {...this.selectedEmail, Status:'em_aprovacao'}});
        this.selectedEmail.Status = 'em_aprovacao';
        this.openScheduleModal();
      } catch(e) { this.showToast('Erro: ' + e.message, 'error'); }
    },

    openScheduleModal() {
      this.schedule = {
        sendDate:     this.detail.sendDate    || '',
        sendTime:     this.detail.sendTime    || '',
        sendClassKey: this.detail.sendClassKey || '',
        desEnvio:     [...this.detail.desEnvio],
        desExclusao:  [...this.detail.desExclusao],
        deEnvioInput:'', deExclusaoInput:'',
        categoryId:'', obs:'', submitting:false, log:'',
      };
      this.detail.showAgendar = true;
    },

    async confirmSchedule() {
      this.schedule.submitting = true;
      this.schedule.log = 'Enviando para SFMC…';

      const html = this.detail.html
        || localStorage.getItem('mktc_html_' + (this.selectedEmail && this.selectedEmail.ID))
        || '';
      if (!html) {
        this.showToast('HTML não encontrado. Salve o email antes de agendar.', 'error');
        this.schedule.submitting = false; this.schedule.log = '';
        return;
      }

      try {
        // Monta params — DEs separadas por campo individual (AMPScript não tem array)
        const envios  = this.schedule.desEnvio;
        const exclus  = this.schedule.desExclusao;
        const params  = new URLSearchParams({
          action:               'schedule_email',
          bu:                   this.bu,
          nome:                 this.selectedEmail.Nome || '',
          assunto:              this.detail.assunto || this.selectedEmail.Assunto || '',
          sendClassificationId: this.schedule.sendClassKey,
          sendDate:             this.schedule.sendDate,
          sendTime:             this.schedule.sendTime,
          html,
        });
        if (envios[0]) params.set('deEnvio1', envios[0]);
        if (envios[1]) params.set('deEnvio2', envios[1]);
        if (exclus[0]) params.set('deExcl1', exclus[0]);
        if (exclus[1]) params.set('deExcl2', exclus[1]);
        if (exclus[2]) params.set('deExcl3', exclus[2]);

        const resp   = await fetch(this.API_URL, {method:'POST', body: params});
        const result = this._parseResp(await resp.text());
        if (!resp.ok || result.error || result.success === false)
          throw new Error(result.error || 'HTTP ' + resp.status);

        await this.apiCall('save_email', {
          email: {
            ...this.selectedEmail,
            Status:         'agendado',
            Send_Date:      this.schedule.sendDate,
            Send_Time:      this.schedule.sendTime,
            Send_Class_Key: this.schedule.sendClassKey,
            DE_Envio:       envios.join(','),
            DE_Exclusao:    exclus.join(','),
            Obs: (this.schedule.obs ? this.schedule.obs + '\n' : '') +
                 '[SFMC] Email:' + (result.emailId||'') + ' ESD:' + (result.esdId||''),
          }
        });

        this.selectedEmail.Status = 'agendado';
        this.detail.showAgendar   = false;
        this.schedule = {sendDate:'',sendTime:'',sendClassKey:'',desEnvio:[],desExclusao:[],
                         deEnvioInput:'',deExclusaoInput:'',categoryId:'',obs:'',submitting:false,log:''};
        this.showToast('Agendado! Email Studio ID: ' + (result.emailId || '?'));
        await this.navigateTo('fila');
      } catch(e) {
        this.schedule.log = '';
        this.showToast('Erro: ' + e.message, 'error');
      } finally {
        this.schedule.submitting = false;
      }
    },

    copyHTML() {
      navigator.clipboard.writeText(this.detail.html)
        .then(()  => this.showToast('HTML copiado!'))
        .catch(()  => this.showToast('Erro ao copiar', 'error'));
    },

    async deleteEmail(id) {
      const email = this.emails.find(e => e.ID === id);
      if (!email) { this.deleteConfirmId = null; return; }
      try {
        await this.apiCall('save_email', {email: {...email, Status:'deletado'}});
        localStorage.removeItem('mktc_html_' + id);
        this.emails = this.emails.filter(e => e.ID !== id);
        this.deleteConfirmId = null;
        this.showToast('Email removido.');
      } catch(e) {
        this.deleteConfirmId = null;
        this.showToast('Erro: ' + e.message, 'error');
      }
    },

    async deleteFromDetail() {
      if (!this.selectedEmail) return;
      try {
        await this.apiCall('save_email', {email: {...this.selectedEmail, Status:'deletado'}});
        localStorage.removeItem('mktc_html_' + this.selectedEmail.ID);
        this.emails = this.emails.filter(e => e.ID !== this.selectedEmail.ID);
        this.deleteConfirmDetail = false;
        this.showToast('Email removido.');
        await this.navigateTo('fila');
      } catch(e) {
        this.deleteConfirmDetail = false;
        this.showToast('Erro: ' + e.message, 'error');
      }
    },

    async saveConfig() {
      try {
        await this.apiCall('save_email', {
          email: {
            ...this.selectedEmail,
            Send_Date:   this.detail.sendDate,
            Send_Time:   this.detail.sendTime,
            DE_Envio:    this.detail.desEnvio.join(','),
            DE_Exclusao: this.detail.desExclusao.join(','),
          }
        });
        this.selectedEmail.Send_Date   = this.detail.sendDate;
        this.selectedEmail.Send_Time   = this.detail.sendTime;
        this.selectedEmail.DE_Envio    = this.detail.desEnvio.join(',');
        this.selectedEmail.DE_Exclusao = this.detail.desExclusao.join(',');
        this.showToast('Configuração salva!');
      } catch(e) { this.showToast('Erro: ' + e.message, 'error'); }
    },

    // ── DE tag inputs ─────────────────────────────────────────
    addDeEnvio()        { const v=this.schedule.deEnvioInput.trim();    if(v&&!this.schedule.desEnvio.includes(v))    this.schedule.desEnvio.push(v);    this.schedule.deEnvioInput=''; },
    addDeExclusao()     { const v=this.schedule.deExclusaoInput.trim(); if(v&&!this.schedule.desExclusao.includes(v)) this.schedule.desExclusao.push(v); this.schedule.deExclusaoInput=''; },
    addWizardDeEnvio()  { const v=this.wizard.deEnvioInput.trim();      if(v&&!this.wizard.desEnvio.includes(v))      this.wizard.desEnvio.push(v);      this.wizard.deEnvioInput=''; },
    addWizardDeExclusao(){ const v=this.wizard.deExclusaoInput.trim();  if(v&&!this.wizard.desExclusao.includes(v))  this.wizard.desExclusao.push(v);  this.wizard.deExclusaoInput=''; },
    addDetailDeEnvio()  { const v=this.detail.deEnvioInput.trim();      if(v&&!this.detail.desEnvio.includes(v))      this.detail.desEnvio.push(v);      this.detail.deEnvioInput=''; },
    addDetailDeExclusao(){ const v=this.detail.deExclusaoInput.trim();  if(v&&!this.detail.desExclusao.includes(v))  this.detail.desExclusao.push(v);  this.detail.deExclusaoInput=''; },

    // ── Wizard ────────────────────────────────────────────────
    resetWizard() {
      this.wizard = {
        step:1, tipo:'avulso', gdocUrl:'', assunto:'', preheader:'',
        emailNome:'', templateId:'', campanhaNome:'',
        templates:[], templatesLoading:false,
        generating:false, genError:null,
        desEnvio:[], desExclusao:[], deEnvioInput:'', deExclusaoInput:'',
        sendDate:'', sendTime:'',
      };
      this.loadTemplates();
    },

    wizardNext() { if (this.wizard.step < 4) this.wizard.step++; },
    wizardBack() { if (this.wizard.step > 1) this.wizard.step--; },

    // ── Geração de HTML via Google Docs + template pré-pronto ─
    // Extrai o ID do Google Docs a partir de vários formatos de URL
    _gdocIdFromUrl(url) {
      const m = url.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
      return m ? m[1] : null;
    },

    async generateFromGdoc() {
      if (!this.wizard.gdocUrl || !this.wizard.templateId) {
        this.wizard.genError = 'Selecione um template e informe o link do Google Docs.';
        return;
      }
      this.wizard.generating = true;
      this.wizard.genError   = null;

      try {
        // Buscar o texto do Google Docs no browser (evita restrição HTTPGet do SFMC)
        const docId = this._gdocIdFromUrl(this.wizard.gdocUrl);
        if (!docId) throw new Error('URL do Google Docs inválida');
        const exportUrl = 'https://docs.google.com/document/d/' + docId + '/export?format=txt';
        let docText = '';
        try {
          const docResp = await fetch(exportUrl);
          if (!docResp.ok) throw new Error('status ' + docResp.status);
          const raw = await docResp.text();
          // Limita a 20.000 chars (mais que suficiente para copy de email)
          docText = raw.slice(0, 20000);
        } catch(fetchErr) {
          throw new Error('Não foi possível acessar o Google Docs. Verifique se o documento está público (Qualquer pessoa com o link). Detalhe: ' + fetchErr.message);
        }

        const emailName = this.wizard.emailNome
          || this.wizard.assunto
          || 'Email ' + new Date().toLocaleDateString('pt-BR');

        const res = await this.apiCall('generate_from_gdoc', {
          docText:    docText,
          templateId: this.wizard.templateId,
          nome:       emailName,
          tipo:       this.wizard.tipo,
          campanha:   this.wizard.campanhaNome || '',
          sendDate:   this.wizard.sendDate  || '',
          sendTime:   this.wizard.sendTime  || '',
          deEnvio:    this.wizard.desEnvio.join(','),
          deExclusao: this.wizard.desExclusao.join(','),
        });

        const newId = res.id;
        if (!newId) throw new Error('ID não retornado pela API');

        // Persiste HTML gerado no localStorage antes de abrir o email
        if (res.html) {
          try { localStorage.setItem('mktc_html_' + newId, res.html); } catch(_) {}
        }

        await this.loadEmails();
        this.wizard.generating = false;

        const emailObj = this.emails.find(e => e.ID === newId)
          || {ID:newId, Nome:emailName, Status:'rascunho',
              Assunto:res.assunto||this.wizard.assunto, Preheader:res.preheader||this.wizard.preheader,
              Template_ID:this.wizard.templateId,
              DE_Envio:this.wizard.desEnvio.join(','),
              DE_Exclusao:this.wizard.desExclusao.join(','),
              Send_Date:this.wizard.sendDate, Send_Time:this.wizard.sendTime};

        await this.openEmail(emailObj);

      } catch(e) {
        this.wizard.generating = false;
        this.wizard.genError   = e.message;
      }
    },

    // ── Journey ───────────────────────────────────────────────
    resetJourney() {
      this.journey = {
        view:'upload', name:'', briefing:'', entryDE:'',
        imageB64:null, imagePreview:null, imageUrl:null,
        analyzing:false, analyzeError:null, structure:null,
        creating:false, creatingStep:-1, creatingError:null, result:null,
        previewOpen:false, previewLoading:false, previewHtml:null, previewStepName:'',
        imagesUploading:false,
      };
    },

    onJourneyImage(event) {
      const file = event.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 640, scale = Math.min(MAX/img.width, MAX/img.height, 1);
          const c = document.createElement('canvas');
          c.width  = Math.round(img.width  * scale);
          c.height = Math.round(img.height * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          const dataUrl = c.toDataURL('image/jpeg', 0.65);
          this.journey.imagePreview = dataUrl;
          this.journey.imageB64     = dataUrl.split(',')[1] || '';
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    async uploadStepImages(idx, event) {
      const files = [...event.target.files]; if (!files.length) return;
      this.journey.imagesUploading = true;
      try {
        for (const file of files) {
          const b64 = await new Promise(res => {
            const r = new FileReader();
            r.onload = e => res(e.target.result.split(',')[1]);
            r.readAsDataURL(file);
          });
          const params = new URLSearchParams({action:'upload_image',bu:this.bu,imageB64:b64,filename:file.name});
          const resp = await fetch(this.API_URL, {method:'POST', body: params});
          const json = this._parseResp(await resp.text());
          if (json.url) {
            if (!this.journey.structure.steps[idx].imageUrls) this.journey.structure.steps[idx].imageUrls = [];
            this.journey.structure.steps[idx].imageUrls.push(json.url);
          } else { this.showToast('Erro upload: ' + (json.error || 'falhou'), 'error'); }
        }
      } catch(e) { this.showToast('Erro upload: ' + e.message, 'error'); }
      finally    { this.journey.imagesUploading = false; event.target.value = ''; }
    },

    async analyzeJourney() {
      this.journey.analyzeError = 'Análise de jornada por IA não está disponível nesta versão.';
    },

    addJourneyStep() {
      this.journey.structure.steps.push({
        id:Date.now().toString(), name:'Novo email', delay:3, delayUnit:'days',
        subject:'', preheader:'', customHeader:'', copyText:'', template:'full-hero', imageUrls:[],
      });
    },
    removeJourneyStep(idx) { this.journey.structure.steps.splice(idx,1); },

    async previewStepHtml(_idx) {
      this.showToast('Preview de jornada não disponível nesta versão.', 'error');
    },

    async createJourney() {
      this.showToast('Criação de jornada não disponível nesta versão.', 'error');
    },

    // ── Prompts ───────────────────────────────────────────────
    loadPromptsFromStorage() {
      try { this.prompts = JSON.parse(localStorage.getItem('mktc_prompts') || '[]'); }
      catch(_) { this.prompts = []; }
    },
    savePromptsToStorage() {
      try { localStorage.setItem('mktc_prompts', JSON.stringify(this.prompts)); } catch(_) {}
    },
    openSavePromptModal() {
      if (!this.selectedEmail) return;
      this.savePromptNome = this.selectedEmail.Nome || '';
      this.savePromptModal = true;
    },
    confirmSavePrompt() {
      if (!this.savePromptNome.trim() || !this.selectedEmail) return;
      const p = {
        id: Date.now().toString(), bu: this.bu,
        nome: this.savePromptNome.trim(),
        conteudo: this.detail.assunto || this.selectedEmail.Nome || '',
        template_id: this.selectedEmail.Template_ID || '',
        tags: [this.selectedEmail.Status || ''].filter(Boolean),
        created_at: new Date().toISOString(),
      };
      this.prompts = [p, ...this.prompts];
      this.savePromptsToStorage();
      this.savePromptModal = false; this.savePromptNome = '';
      this.showToast('Prompt salvo!');
    },
    deletePrompt(id) {
      this.prompts = this.prompts.filter(p => p.id !== id);
      this.savePromptsToStorage();
      this.showToast('Prompt removido.');
    },

    // ── Computed ──────────────────────────────────────────────
    get filteredEmails() {
      return this.emails.filter(e => {
        const ok = this.filaFilter === 'all' || e.Status === this.filaFilter;
        const q  = this.filaSearch.toLowerCase();
        return ok && (!q || (e.Nome||'').toLowerCase().includes(q) || (e.Assunto||'').toLowerCase().includes(q));
      });
    },

    get kpiCards() {
      return [
        {label:'Envios',           value:this.dataviewStats.sends,                             sub:'últimos '+this.dataviewDays+'d'},
        {label:'Aberturas',        value:this.dataviewStats.opens,                             sub:'únicas'},
        {label:'Taxa de abertura', value:(this.dataviewStats.openRate||0).toFixed(1)+'%',      sub:''},
        {label:'Cliques',          value:this.dataviewStats.clicks,                            sub:'únicos'},
        {label:'CTR',              value:(this.dataviewStats.ctr||0).toFixed(2)+'%',           sub:''},
        {label:'Bounces',          value:this.dataviewStats.bounces,                           sub:''},
      ];
    },

    get todayStr()      { return new Date().toISOString().split('T')[0]; },
    get wizardSteps()   { return ['Tipo','Template','Copy (G.Docs)','Config']; },
    get filaFilters()   {
      return [
        {value:'all',label:'Todos'},{value:'rascunho',label:'Rascunho'},
        {value:'em_aprovacao',label:'Em Aprovação'},{value:'aprovado',label:'Aprovado'},
        {value:'agendado',label:'Agendado'},{value:'enviado',label:'Enviado'},
      ];
    },

    get templateList() {
      const buName = this.currentBU.name;
      const types = [
        {tipo:'newsletter',  nome:'Newsletter',  descricao:'Cabeçalho da marca + badge de edição + corpo + CTA. Para envios recorrentes.'},
        {tipo:'campanha',    nome:'Campanha',    descricao:'Hero opcional + headline + corpo + CTA destacado. Para promoções e lançamentos.'},
        {tipo:'simples',     nome:'Simples',     descricao:'Corpo direto + CTA. Para conteúdos curtos, relatórios e comunicados.'},
        {tipo:'hero-full',   nome:'Hero Full',   descricao:'Imagem hero full-width com mensagem em sobreposição e CTA único. Máximo impacto visual.'},
        {tipo:'multibloco',  nome:'Multi-Bloco', descricao:'Múltiplas seções de conteúdo com separadores. Ideal para digests e resumos semanais.'},
        {tipo:'anuncio',     nome:'Anúncio',     descricao:'Borda colorida no topo, conteúdo centralizado, tom de urgência. Para avisos e alertas.'},
        {tipo:'boas-vindas', nome:'Boas-vindas', descricao:'Logo grande + saudação personalizada + etapas de onboarding. Para entrada de leads.'},
        {tipo:'produto',     nome:'Produto',     descricao:'Imagem lateral + descrição + benefícios em lista + CTA. Para apresentar produto ou curso.'},
        {tipo:'texto-longo', nome:'Texto Longo', descricao:'Hierarquia tipográfica forte, copy extensa, sem imagens. Para cartas e comunicados formais.'},
      ];
      return types.map(t => ({
        id:        this.bu + '-' + t.tipo,
        tipo:      t.tipo,
        bu:        this.bu,
        nome:      buName + ' — ' + t.nome,
        descricao: t.descricao,
      }));
    },

    get buList() {
      return [
        {id:'finclass',      name:'Finclass',      color:'#00e7f9', dark:'#0a0e27'},
        {id:'bruno-perini',  name:'Bruno Perini',  color:'#b2ec05', dark:'#0f1014'},
        {id:'faculdade-hub', name:'Faculdade Hub', color:'#6366f1', dark:'#0f1014'},
        {id:'thiago-nigro',  name:'Thiago Nigro',  color:'#ff4900', dark:'#0f172a'},
        {id:'portfel',       name:'Portfel',       color:'#003087', dark:'#001F5A'},
        {id:'grao',          name:'Grão',          color:'#f59e0b', dark:'#2d1b00'},
      ];
    },

    get currentBU() { return this.buList.find(b => b.id === this.bu) || this.buList[0]; },

    get buBrandConfig() {
      const cfg = {
        'finclass':      {name:'Finclass',      primary:'#00e7f9',secondary:'#0a0e27',cta:'#00e7f9',cta_text:'#000000',logo:'https://image.mkt.finclass.com/lib/fe2811717d640478721277/m/1/c6b407e1-8e55-4b00-abd8-19f20df026dc.png',footer_text:'Finclass — Grupo Primo · São Paulo, SP'},
        'bruno-perini':  {name:'Bruno Perini',  primary:'#b2ec05',secondary:'#0f1014',cta:'#b2ec05',cta_text:'#000000',logo:'https://image.mail.vocemaisrico.com/lib/fe3111717d64047b771775/m/1/813699e2-15be-49d3-943e-705a97294c2c.png',footer_text:'Bruno Perini — Você Mais Rico · São Paulo, SP'},
        'faculdade-hub': {name:'Faculdade Hub', primary:'#6366f1',secondary:'#0f1014',cta:'#6366f1',cta_text:'#ffffff',logo:'https://image.mba.grupo-primo.com/lib/fe2811717d640478721079/m/1/4127a0f5-8fef-456f-b13e-760099d30ccc.png',footer_text:'Faculdade Hub — Grupo Primo · São Paulo, SP'},
        'thiago-nigro':  {name:'Thiago Nigro',  primary:'#ff4900',secondary:'#0f172a',cta:'#ff4900',cta_text:'#ffffff',logo:'https://image.mail.oprimorico.com.br/lib/fe3011717d64047b771776/m/1/9475f340-442b-4e35-9f2b-17fa10f7d0e4.png',footer_text:'Thiago Nigro — O Primo Rico · São Paulo, SP'},
        'portfel':       {name:'Portfel',       primary:'#0176d3',secondary:'#111111',cta:'#0176d3',cta_text:'#ffffff',logo:'https://image.mail.portfel.com.br/lib/fe2f11717d64047b771777/m/1/9c22d171-2ea0-4f6d-81a6-acced45aff9f.png',footer_text:'Portfel Consultoria · São Paulo, SP'},
        'grao':          {name:'Grão',          primary:'#f59e0b',secondary:'#2d1b00',cta:'#f59e0b',cta_text:'#000000',logo:'',footer_text:'Grão · São Paulo, SP'},
      };
      return cfg[this.bu] || cfg['finclass'];
    },

    get buScheduleConfig() {
      const s = {
        'finclass': {
          sendClassifications: [{name:'Equipe Finclass', key:'84'}],
          trackingFolders:     [{name:'Email Avulso',id:'275176'},{name:'Campanha',id:'275626'},{name:'Outros',id:'275234'}],
        },
      };
      const base = s[this.bu] || {sendClassifications:[],trackingFolders:[]};
      return {
        sendClassifications: this.sendClassificationsList.length > 0 ? this.sendClassificationsList : base.sendClassifications,
        trackingFolders: base.trackingFolders,
      };
    },

    // ── Helpers ───────────────────────────────────────────────
    statusLabel(s) {
      return {rascunho:'Rascunho',em_aprovacao:'Em Aprovação',aprovado:'Aprovado',agendado:'Agendado',enviado:'Enviado'}[s] || s || '—';
    },
    statusClass(s) {
      return {
        rascunho:     'bg-zinc-800 text-zinc-400',
        em_aprovacao: 'bg-yellow-950 text-yellow-400 border border-yellow-800',
        aprovado:     'bg-blue-950 text-blue-400 border border-blue-800',
        agendado:     'bg-emerald-950 text-emerald-400 border border-emerald-800',
        enviado:      'bg-zinc-800 text-zinc-500',
      }[s] || 'bg-zinc-800 text-zinc-400';
    },
    formatDate(d) {
      if (!d) return '—';
      try { return new Date(d).toLocaleDateString('pt-BR'); } catch(_) { return d; }
    },
    showToast(message, type = 'success') {
      this.toast = {show:true, message, type};
      setTimeout(() => { this.toast.show = false; }, 3000);
    },

  }; // end return
} // end mktcApp
