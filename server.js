const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database/db');
const { generatePixQRCode } = require('./services/pixGenerator');
const mapsScraper = require('./services/mapsScraper');
const radarProspector = require('./services/radarProspector');
const googleMapsScraperService = require('./services/googleMapsScraperService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (Frontend da Loja e Painel Admin)
app.use(express.static(path.join(__dirname, 'public')));

// Senha de Acesso do Administrador
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Lps27031981';

// Rotas de Páginas
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Autenticação do Painel Admin
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: 'pkchopp-auth-session-valid' });
  }
  return res.status(401).json({ success: false, message: 'Senha incorreta! Verifique e tente novamente.' });
});

app.post('/api/auth/verify', (req, res) => {
  const { token } = req.body;
  if (token === 'pkchopp-auth-session-valid') {
    return res.json({ success: true, authenticated: true });
  }
  return res.status(401).json({ success: false, authenticated: false });
});

// ==========================================
// ROTAS DO NOVO RADAR DE PROSPECÇÃO B2B (INTELIGÊNCIA COMERCIAL)
// ==========================================

// Executar Prospecção Individual ou em Lote
app.post('/api/radar/search', async (req, res) => {
  try {
    const {
      city = 'Rio de Janeiro',
      state = 'RJ',
      neighborhoods = ['Tijuca'],
      radius = '10 km',
      types = ['Choperia', 'Bar', 'Restaurante'],
      minScore = 0,
      onlyWhatsapp = false,
      onlyInstagram = false,
      onlyChoppConfirmed = false,
      user = 'Operador Comercial B2B'
    } = req.body;

    const result = await radarProspector.runProspecting({
      city,
      state,
      neighborhoods,
      radius,
      types,
      minScore,
      onlyWhatsapp,
      onlyInstagram,
      onlyChoppConfirmed,
      user
    });

    res.json(result);
  } catch (err) {
    console.error('Erro no Radar de Prospecção:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Consultar Leads com Filtros Avançados
app.get('/api/radar/leads', async (req, res) => {
  try {
    const {
      city,
      neighborhood,
      radius,
      classification,
      crmStatus,
      hasWhatsapp,
      hasInstagram,
      hasChopp,
      bestOpportunities,
      search
    } = req.query;

    const leads = await radarProspector.getFilteredLeads({
      city,
      neighborhood,
      radius,
      classification,
      crmStatus,
      hasWhatsapp,
      hasInstagram,
      hasChopp,
      bestOpportunities,
      search
    });

    res.json({
      success: true,
      total: leads.length,
      data: leads
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Scraping ao vivo de estabelecimentos no Google Maps (Inspirado no omkarcloud/google-maps-scraper)
app.post('/api/radar/scrape-live', async (req, res) => {
  try {
    const { query = 'choperias e bares', location = 'Rio de Janeiro RJ', limit = 25 } = req.body;
    const scraped = await googleMapsScraperService.scrapePlaces(query, location, limit);
    res.json({
      success: true,
      message: `${scraped.length} novos bares e choperias foram mapeados no Google Maps com sucesso!`,
      total: scraped.length,
      data: scraped
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Scraping ao vivo por Bounding Box (Área exata do mapa com Bares e Restaurantes)
app.post('/api/radar/scrape-bbox', async (req, res) => {
  try {
    const { bbox, limit = 50 } = req.body;
    const scraped = await googleMapsScraperService.scrapeBoundingBox(bbox, limit);
    res.json({
      success: true,
      message: `${scraped.length} bares e restaurantes foram mapeados na área visível com sucesso!`,
      total: scraped.length,
      data: scraped
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Obter Dossiê Completo de um Lead
app.get('/api/radar/leads/:id', (req, res) => {
  try {
    const lead = db.getLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead não encontrado' });
    }
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Atualizar Lead (Status, Observações, Próximo Contato, Edição Manual)
app.put('/api/radar/leads/:id', (req, res) => {
  try {
    const updated = db.updateLead(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Lead não encontrado' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Excluir Lead / Estabelecimento do Radar
app.delete('/api/radar/leads/:id', (req, res) => {
  try {
    db.deleteLead(req.params.id);
    res.json({ success: true, message: 'Estabelecimento removido do radar com sucesso!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Adicionar Histórico de Contato
app.post('/api/radar/leads/:id/contact-history', (req, res) => {
  try {
    const { type, note, user } = req.body;
    const updated = db.addContactHistory(req.params.id, { type, note, user });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Lead não encontrado' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Converter Lead em Cliente PKChopp Oficial
app.post('/api/radar/leads/:id/convert-client', (req, res) => {
  try {
    const lead = db.getLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead não encontrado' });
    }

    const client = db.addOrUpdateClient({
      id: lead.id,
      name: lead.name,
      owner: lead.commercialResponsible || '',
      phone: lead.phone || lead.whatsapp || '',
      whatsapp: lead.whatsapp || '',
      address: lead.address || '',
      segment: lead.category || lead.establishmentType || 'Bar & Choperia',
      weeklyVolume: lead.weeklyVolumeEstimated || '6 a 8 barris/semana',
      monthlyVolume: lead.monthlyVolumeEstimated || 24,
      source: 'Radar Prospecção B2B',
      notes: lead.observations || 'Convertido diretamente do Radar B2B.'
    });

    res.json({ success: true, message: 'Lead convertido em Cliente PKChopp com sucesso!', data: client });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Estatísticas do Dashboard de Prospecção
app.get('/api/radar/stats', (req, res) => {
  try {
    const leads = db.getLeads();
    const clients = db.getClients();

    const totalLeads = leads.length;
    const hotCount = leads.filter(l => l.classification === 'HOT').length;
    const warmCount = leads.filter(l => l.classification === 'WARM').length;
    const coldCount = leads.filter(l => l.classification === 'COLD').length;
    const whatsappCount = leads.filter(l => l.whatsappStatus === 'SIM').length;
    const instagramCount = leads.filter(l => l.instagram && l.instagram.status === 'ENCONTRADO').length;
    const choppCount = leads.filter(l => l.hasChopp === 'SIM').length;
    const pkchoppClientsCount = clients.length;

    res.json({
      success: true,
      data: {
        totalLeads,
        hotCount,
        warmCount,
        coldCount,
        whatsappCount,
        instagramCount,
        choppCount,
        pkchoppClientsCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Histórico de Prospecções em Lote
app.get('/api/radar/history', (req, res) => {
  try {
    const history = db.getProspectingHistory();
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Exportar Leads em CSV
app.get('/api/radar/export', (req, res) => {
  try {
    const {
      neighborhood,
      classification,
      crmStatus,
      hasWhatsapp,
      hasInstagram,
      hasChopp
    } = req.query;

    const leads = radarProspector.getFilteredLeads({
      neighborhood,
      classification,
      crmStatus,
      hasWhatsapp,
      hasInstagram,
      hasChopp
    });

    const csvContent = radarProspector.generateCSV(leads);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="leads-pkchopp-radar.csv"');
    res.send('\uFEFF' + csvContent); // Adicionar BOM para compatibilidade com Excel
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ROTAS DE PRODUTOS & BARRIS
// ==========================================
app.get('/api/products', (req, res) => {
  try {
    const products = db.getProducts();
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const newProd = db.addProduct(req.body);
    res.status(201).json({ success: true, data: newProd });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const updated = db.updateProduct(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const result = db.deleteProduct(req.params.id);
    if (result === false) {
      return res.status(403).json({ success: false, message: 'Este produto é protegido e não pode ser excluído. O Barril de Chopp Brahma 50L deve estar sempre disponível!' });
    }
    res.json({ success: true, message: 'Produto removido com sucesso' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ROTAS DE PEDIDOS (EXPRESS & ADMIN)
// ==========================================
app.get('/api/orders', (req, res) => {
  try {
    const orders = db.getOrders();
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const {
      customerName,
      customerOwner,
      customerPhone,
      deliveryAddress,
      deliveryDate,
      deliveryTime,
      items,
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod,
      changeFor,
      notes
    } = req.body;

    if (!customerName || !customerPhone || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Por favor, preencha os dados do estabelecimento, telefone e selecione os barris.' });
    }

    const settings = db.getSettings();

    let pixData = null;
    if (paymentMethod === 'pix') {
      const txid = `PK${Date.now().toString().slice(-8)}`;
      pixData = await generatePixQRCode({
        key: settings.pixKey,
        name: settings.pixBeneficiary,
        city: settings.pixCity,
        amount: totalAmount,
        txid: txid
      });
    }

    const newOrder = db.createOrder({
      customerName,
      customerOwner: customerOwner || '',
      customerPhone,
      deliveryAddress,
      deliveryDate: deliveryDate || new Date().toISOString().split('T')[0],
      deliveryTime: deliveryTime || 'Tarde (13h às 18h)',
      items,
      subtotal: Number(subtotal),
      deliveryFee: Number(deliveryFee) || 0,
      totalAmount: Number(totalAmount),
      paymentMethod,
      paymentStatus: paymentMethod === 'pix' ? 'Aguardando Pagamento PIX' : 'A Pagar no Ato da Entrega',
      changeFor: changeFor ? Number(changeFor) : null,
      notes: notes || '',
      pixData: pixData
    });

    res.status(201).json({ success: true, data: newOrder });
  } catch (err) {
    console.error('Erro ao criar pedido:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/orders/:id/status', (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const updated = db.updateOrderStatus(req.params.id, status, paymentStatus);
    if (!updated) return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ROTAS DE CLIENTES & PDVs COM LOOKUP CNPJ / NOME
// ==========================================
app.get('/api/clients', (req, res) => {
  try {
    const clients = db.getClients();
    res.json({ success: true, data: clients });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/clients', (req, res) => {
  try {
    const client = db.addOrUpdateClient(req.body);
    res.status(201).json({ success: true, data: client });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/clients/:id', (req, res) => {
  try {
    let clients = db.getClients();
    clients = clients.filter(c => c.id !== req.params.id);
    db.saveClients(clients);
    res.json({ success: true, message: 'Cliente removido com sucesso' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Consulta Automática por CNPJ (BrasilAPI)
app.get('/api/lookup/cnpj/:cnpj', async (req, res) => {
  try {
    const cleanCnpj = req.params.cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      return res.status(400).json({ success: false, message: 'CNPJ inválido. Digite 14 dígitos.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const apiRes = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!apiRes.ok) {
      return res.status(404).json({ success: false, message: 'CNPJ não encontrado na base pública da Receita Federal.' });
    }

    const d = await apiRes.json();
    const ownerName = (d.qsa && d.qsa[0] && d.qsa[0].nome_socio) ? d.qsa[0].nome_socio : '';
    const phone = d.ddd_telefone_1 || d.ddd_telefone_2 || '';

    res.json({
      success: true,
      data: {
        cnpj: cleanCnpj,
        name: d.nome_fantasia || d.razao_social || '',
        corporateName: d.razao_social || '',
        owner: ownerName,
        phone: phone,
        whatsapp: phone.replace(/\D/g, ''),
        address: `${d.descricao_tipo_de_logradouro || ''} ${d.logradouro || ''}, ${d.numero || 'S/N'}${d.complemento ? ' - ' + d.complemento : ''}`.trim(),
        neighborhood: d.bairro || '',
        city: d.municipio || 'Rio de Janeiro',
        state: d.uf || 'RJ',
        cep: d.cep || '',
        segment: d.cnae_fiscal_descricao || 'Bar / Restaurante'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao consultar CNPJ: ' + err.message });
  }
});

// Consulta Automática por Nome de Bar / Estabelecimento (Google Maps & Leads)
app.get('/api/lookup/bar', (req, res) => {
  try {
    const q = (req.query.q || '').toLowerCase().trim();
    if (!q) return res.json({ success: true, data: [] });

    const leads = db.getLeads();
    const clients = db.getClients();

    const pool = [...leads, ...clients];
    const matched = pool.filter(item => 
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.address && item.address.toLowerCase().includes(q)) ||
      (item.neighborhood && item.neighborhood.toLowerCase().includes(q))
    );

    const uniqueMap = new Map();
    matched.forEach(m => {
      const key = (m.name || '').toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          name: m.name,
          owner: m.owner || m.commercialResponsible || '',
          phone: m.phone || m.whatsapp || '',
          whatsapp: m.whatsapp || m.phone || '',
          address: m.address || '',
          neighborhood: m.neighborhood || '',
          city: m.city || 'Rio de Janeiro',
          state: m.state || 'RJ',
          segment: m.category || m.segment || 'Bar & Choperia'
        });
      }
    });

    res.json({ success: true, data: Array.from(uniqueMap.values()).slice(0, 10) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ROTAS DO CRM DE LEADS (LEGADO)
// ==========================================
app.get('/api/leads/status', (req, res) => {
  try {
    const statusMap = db.getLeadsStatus();
    res.json({ success: true, data: statusMap });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/leads/status', (req, res) => {
  try {
    const { leadIdentifier, crmStatus, notes } = req.body;
    if (!leadIdentifier || !crmStatus) {
      return res.status(400).json({ success: false, message: 'leadIdentifier e crmStatus são obrigatórios.' });
    }
    const result = db.updateLeadStatus(leadIdentifier, crmStatus, notes);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ROTAS DE LOOKUP: AUTOPREENCHIMENTO POR CNPJ OU NOME DO BAR
// ==========================================

// Consultar CNPJ na Receita Federal (com fallback entre APIs gratuitas)
app.get('/api/lookup/cnpj/:cnpj', async (req, res) => {
  try {
    const cnpjClean = req.params.cnpj.replace(/\D/g, '');
    if (cnpjClean.length !== 14) {
      return res.status(400).json({ success: false, message: 'CNPJ inválido. Deve conter 14 dígitos.' });
    }

    console.log('[CNPJ] Consultando:', cnpjClean);
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

    let data = null;

    // Tentativa 1: ReceitaWS (limite: 3/min)
    try {
      const r1 = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpjClean}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': ua }
      });
      console.log('[CNPJ] ReceitaWS status:', r1.status);
      if (r1.ok) {
        const j1 = await r1.json();
        if (j1.status === 'OK') {
          console.log('[CNPJ] ReceitaWS OK:', j1.nome);
          data = j1;
        } else {
          console.log('[CNPJ] ReceitaWS retornou:', j1.status, j1.message || '');
        }
      }
    } catch (e1) {
      console.log('[CNPJ] ReceitaWS erro:', e1.message);
    }

    // Tentativa 2: publica.cnpj.ws
    if (!data) {
      try {
        const r2 = await fetch(`https://publica.cnpj.ws/cnpj/${cnpjClean}`, {
          headers: { 'Accept': 'application/json', 'User-Agent': ua }
        });
        console.log('[CNPJ] publica.cnpj.ws status:', r2.status);
        if (r2.ok) {
          const j2 = await r2.json();
          const est = j2.estabelecimento || {};
          console.log('[CNPJ] publica.cnpj.ws OK:', j2.razao_social);
          data = {
            status: 'OK',
            nome: j2.razao_social || '',
            fantasia: est.nome_fantasia || '',
            telefone: est.ddd1 ? `(${est.ddd1}) ${est.telefone1}` : '',
            email: est.email || '',
            logradouro: est.logradouro || '',
            numero: est.numero || '',
            complemento: est.complemento || '',
            bairro: est.bairro || '',
            municipio: (est.cidade && est.cidade.nome) || '',
            uf: (est.estado && est.estado.sigla) || '',
            cep: est.cep || '',
            situacao: est.situacao_cadastral || '',
            abertura: est.data_inicio_atividade || '',
            cnpj: cnpjClean,
            qsa: (j2.socios || []).map(s => ({ nome: s.nome || '', qual: s.tipo || '' })),
            atividade_principal: est.atividade_principal ? [{ text: est.atividade_principal.descricao || '' }] : []
          };
        }
      } catch (e2) {
        console.log('[CNPJ] publica.cnpj.ws erro:', e2.message);
      }
    }

    // Tentativa 3: BrasilAPI
    if (!data) {
      try {
        const r3 = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`, {
          headers: { 'User-Agent': ua }
        });
        console.log('[CNPJ] BrasilAPI status:', r3.status);
        if (r3.ok) {
          const j3 = await r3.json();
          console.log('[CNPJ] BrasilAPI OK:', j3.razao_social);
          data = {
            status: 'OK',
            nome: j3.razao_social || '',
            fantasia: j3.nome_fantasia || '',
            telefone: j3.ddd_telefone_1 || '',
            email: '',
            logradouro: j3.logradouro || '',
            numero: j3.numero || '',
            complemento: j3.complemento || '',
            bairro: j3.bairro || '',
            municipio: j3.municipio || '',
            uf: j3.uf || '',
            cep: j3.cep || '',
            situacao: j3.descricao_situacao_cadastral || '',
            abertura: j3.data_inicio_atividade || '',
            cnpj: cnpjClean,
            qsa: (j3.qsa || []).map(s => ({ nome: s.nome_socio || '', qual: s.qualificacao_socio || '' })),
            atividade_principal: j3.cnae_fiscal_descricao ? [{ text: j3.cnae_fiscal_descricao }] : []
          };
        }
      } catch (e3) {
        console.log('[CNPJ] BrasilAPI erro:', e3.message);
      }
    }

    if (!data) {
      return res.status(404).json({ success: false, message: 'CNPJ não encontrado. As APIs da Receita Federal podem estar com limite de consultas. Tente novamente em 30 segundos.' });
    }

    // Extrair QSA (sócios) como responsável
    const owner = (data.qsa && data.qsa.length > 0) ? data.qsa[0].nome : '';

    // Montar endereço completo
    const addressParts = [data.logradouro, data.numero, data.complemento].filter(Boolean);
    const fullAddress = addressParts.join(', ') + (data.bairro ? ` - ${data.bairro}` : '') + (data.municipio ? `, ${data.municipio}` : '') + (data.uf ? ` - ${data.uf}` : '');

    // Limpar telefone
    let phone = (data.telefone || '').split('/')[0].trim();

    const result = {
      cnpj: data.cnpj || cnpjClean,
      name: data.fantasia || data.nome || '',
      corporateName: data.nome || '',
      tradeName: data.fantasia || '',
      owner: owner,
      phone: phone,
      email: data.email || '',
      address: fullAddress,
      neighborhood: data.bairro || '',
      city: data.municipio || '',
      state: data.uf || '',
      cep: data.cep || '',
      status: data.situacao || '',
      openedAt: data.abertura || '',
      activity: (data.atividade_principal && data.atividade_principal[0]) ? data.atividade_principal[0].text : ''
    };

    console.log(`✅ [Lookup CNPJ] Dados encontrados para: ${result.name || result.corporateName}`);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('❌ [Lookup CNPJ] Erro:', err.message);
    res.status(500).json({ success: false, message: 'Erro ao consultar CNPJ: ' + err.message });
  }
});

// Buscar Bar / Estabelecimento por Nome (Overpass + leads locais)
app.get('/api/lookup/bar', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query) {
      return res.status(400).json({ success: false, message: 'Parâmetro "q" é obrigatório.' });
    }

    console.log(`🔎 [Lookup Bar] Buscando: "${query}"...`);

    // 1. Buscar nos leads locais primeiro
    const leads = db.getLeads();
    const localResults = leads.filter(l =>
      (l.name || '').toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5).map(l => ({
      name: l.name,
      owner: l.contactPerson || l.owner || '',
      phone: l.whatsapp || l.phone || '',
      whatsapp: l.whatsapp || '',
      address: l.address || '',
      neighborhood: l.neighborhood || '',
      source: 'local'
    }));

    if (localResults.length > 0) {
      console.log(`✅ [Lookup Bar] ${localResults.length} resultados encontrados na base local.`);
      return res.json({ success: true, data: localResults });
    }

    // 2. Buscar via Overpass API
    const overpassQuery = `[out:json][timeout:10];
      node["amenity"~"bar|pub|restaurant"]["name"~"${query}",i](-23.1, -43.8, -22.7, -43.1);
      out 5;`;

    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(overpassQuery)
    });

    if (overpassRes.ok) {
      const json = await overpassRes.json();
      const results = (json.elements || []).filter(e => e.tags && e.tags.name).map(e => ({
        name: e.tags.name || e.tags['name:pt'] || '',
        owner: '',
        phone: e.tags.phone || e.tags['contact:phone'] || '',
        whatsapp: e.tags['contact:whatsapp'] || '',
        address: [e.tags['addr:street'], e.tags['addr:housenumber']].filter(Boolean).join(', ') || '',
        neighborhood: e.tags['addr:suburb'] || e.tags['addr:neighbourhood'] || '',
        source: 'overpass'
      }));

      if (results.length > 0) {
        console.log(`✅ [Lookup Bar] ${results.length} resultados encontrados via Overpass.`);
        return res.json({ success: true, data: results });
      }
    }

    res.json({ success: true, data: [], message: `Nenhum estabelecimento encontrado com o termo "${query}".` });
  } catch (err) {
    console.error('❌ [Lookup Bar] Erro:', err.message);
    res.status(500).json({ success: false, message: 'Erro ao buscar bar: ' + err.message });
  }
});

// ==========================================
// ROTA MAPS LEGADA COM RETROCOMPATIBILIDADE
// ==========================================
app.get('/api/maps/search', async (req, res) => {
  try {
    const { segment = 'distribuidor de barril de chopp brahma', location = 'Rio de Janeiro, RJ' } = req.query;
    const leads = await mapsScraper.searchPlaces({ segment, location });
    const embedUrl = mapsScraper.getEmbedUrl({ query: `${segment} ${location}` });

    res.json({
      success: true,
      query: { segment, location },
      embedUrl,
      totalFound: leads.length,
      data: leads
    });
  } catch (err) {
    console.error('Erro na busca do Maps:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ROTAS DE PIX & CONFIGURAÇÕES
// ==========================================
app.post('/api/pix/generate', async (req, res) => {
  try {
    const { amount, txid } = req.body;
    const settings = db.getSettings();
    const pix = await generatePixQRCode({
      key: settings.pixKey,
      name: settings.pixBeneficiary,
      city: settings.pixCity,
      amount: amount || 10.00,
      txid: txid || `PK${Date.now().toString().slice(-8)}`
    });

    res.json({ success: true, data: pix });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/settings', (req, res) => {
  try {
    const settings = db.getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    db.saveSettings(req.body);
    res.json({ success: true, message: 'Configurações salvas com sucesso', data: req.body });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ESTATÍSTICAS PARA DASHBOARD GERAL
// ==========================================
app.get('/api/stats', (req, res) => {
  try {
    const orders = db.getOrders();
    const clients = db.getClients();
    const products = db.getProducts();

    const totalRevenue = orders.reduce((sum, o) => {
      if (o.status !== 'Cancelado') {
        return sum + (Number(o.totalAmount) || 0);
      }
      return sum;
    }, 0);

    const totalKegsSold = orders.reduce((kegs, o) => {
      if (o.status !== 'Cancelado') {
        return kegs + (o.totalKegs || 0);
      }
      return kegs;
    }, 0);

    const pendingOrdersCount = orders.filter(o => o.status === 'Pendente' || o.status === 'Aguardando Pagamento' || o.status === 'Aguardando Pagamento PIX').length;

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders: orders.length,
        pendingOrders: pendingOrdersCount,
        totalClients: clients.length,
        totalKegsSold,
        activeProducts: products.filter(p => p.active).length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Inicialização do Servidor
app.listen(PORT, () => {
  console.log(`🚀 [PKCHOPP ERP] Servidor rodando na porta ${PORT}`);
  console.log(`🍺 Loja Express B2B: http://localhost:${PORT}`);
  console.log(`🛡️ Radar & ERP TOTVS: http://localhost:${PORT}/admin`);
});
