const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname);

function ensureDirectoryExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

function readJSON(filename, defaultData = []) {
  ensureDirectoryExists();
  const filePath = path.join(DB_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Erro ao ler ${filename}:`, err);
    return defaultData;
  }
}

function writeJSON(filename, data) {
  ensureDirectoryExists();
  const filePath = path.join(DB_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Catálogo Exclusivo do Líquido: Barris de Chopp 30L e 50L
const DEFAULT_PRODUCTS = [
  {
    id: "prod-pilsen-50",
    name: "Barril de Chopp Pilsen Puro Malte 50 Litros",
    category: "chopp",
    description: "Chopp Puro Malte dourado, colarinho cremoso e refrescante. O mais vendido para abastecimento de bares e depósitos de alto giro.",
    liters: 50,
    unit: "Barril 50L (Rende ~165 copos de 300ml)",
    price: 499.00,
    promotionalPrice: 479.00,
    valveType: "Padrão S (Micromatic)",
    alcoholContent: "4.8% ABV",
    ibu: "12 IBU",
    image: "https://images.unsplash.com/photo-1538488881522-4326c36763ce?auto=format&fit=crop&w=600&q=80",
    active: true,
    featured: true,
    tags: ["Líder de Vendas", "50 Litros", "Puro Malte", "Alto Giro"]
  },
  {
    id: "prod-pilsen-30",
    name: "Barril de Chopp Pilsen Puro Malte 30 Litros",
    category: "chopp",
    description: "Chopp Puro Malte em barril de 30 litros para reposição rápida e estabelecimentos de médio giro.",
    liters: 30,
    unit: "Barril 30L (Rende ~100 copos de 300ml)",
    price: 339.00,
    promotionalPrice: 319.00,
    valveType: "Padrão S (Micromatic)",
    alcoholContent: "4.8% ABV",
    ibu: "12 IBU",
    image: "https://images.unsplash.com/photo-1608270199047-b5baea143a5c?auto=format&fit=crop&w=600&q=80",
    active: true,
    featured: true,
    tags: ["Puro Malte", "30 Litros", "Pronta Entrega"]
  },
  {
    id: "prod-vinho-50",
    name: "Barril de Chopp de Vinho Tinto 50 Litros",
    category: "chopp",
    description: "Blend suave de chopp puro malte com vinho tinto de mesa. Excelente aceitação e altíssima margem de lucro por copo.",
    liters: 50,
    unit: "Barril 50L (Rende ~165 copos de 300ml)",
    price: 580.00,
    promotionalPrice: 549.00,
    valveType: "Padrão S (Micromatic)",
    alcoholContent: "5.5% ABV",
    ibu: "10 IBU",
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80",
    active: true,
    featured: false,
    tags: ["Chopp de Vinho", "Alta Margem", "50L"]
  },
  {
    id: "prod-vinho-30",
    name: "Barril de Chopp de Vinho Tinto 30 Litros",
    category: "chopp",
    description: "Versão de 30 Litros de Chopp de Vinho Tinto suave e refrescante para atender demanda de fim de semana.",
    liters: 30,
    unit: "Barril 30L (Rende ~100 copos de 300ml)",
    price: 380.00,
    promotionalPrice: 359.00,
    valveType: "Padrão S (Micromatic)",
    alcoholContent: "5.5% ABV",
    ibu: "10 IBU",
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80",
    active: true,
    featured: false,
    tags: ["Chopp de Vinho", "30L"]
  },
  {
    id: "prod-ipa-50",
    name: "Barril de Chopp IPA Artesanal 50 Litros",
    category: "chopp",
    description: "India Pale Ale com lúpulos nobres americanos (Dry Hopping). Amargor marcante e aroma cítrico e floral.",
    liters: 50,
    unit: "Barril 50L (Rende ~165 copos de 300ml)",
    price: 650.00,
    promotionalPrice: 620.00,
    valveType: "Padrão S (Micromatic)",
    alcoholContent: "6.2% ABV",
    ibu: "45 IBU",
    image: "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?auto=format&fit=crop&w=600&q=80",
    active: true,
    featured: false,
    tags: ["IPA", "Artesanal", "50 Litros"]
  },
  {
    id: "prod-ipa-30",
    name: "Barril de Chopp IPA Artesanal 30 Litros",
    category: "chopp",
    description: "Chopp IPA lupulado e aromático em barril de 30 litros para pubs e bares com torneiras artesanais.",
    liters: 30,
    unit: "Barril 30L (Rende ~100 copos de 300ml)",
    price: 420.00,
    promotionalPrice: 399.00,
    valveType: "Padrão S (Micromatic)",
    alcoholContent: "6.2% ABV",
    ibu: "45 IBU",
    image: "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?auto=format&fit=crop&w=600&q=80",
    active: true,
    featured: false,
    tags: ["IPA", "30 Litros", "Premium"]
  },
  {
    id: "prod-black-30",
    name: "Barril de Chopp Black / Stout 30 Litros",
    category: "chopp",
    description: "Chopp escuro encorpado com maltes torrados especiais, notas de café e chocolate com espuma densa.",
    liters: 30,
    unit: "Barril 30L (Rende ~100 copos de 300ml)",
    price: 399.00,
    promotionalPrice: null,
    valveType: "Padrão S (Micromatic)",
    alcoholContent: "5.0% ABV",
    ibu: "20 IBU",
    image: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=600&q=80",
    active: true,
    featured: false,
    tags: ["Chopp Escuro", "Notas de Café", "30L"]
  },
  {
    id: "prod-trigo-30",
    name: "Barril de Chopp de Trigo (Weiss) 30 Litros",
    category: "chopp",
    description: "Cerveja de trigo não filtrada estilo alemão, turva, com aromas naturais de cravo e banana.",
    liters: 30,
    unit: "Barril 30L (Rende ~100 copos de 300ml)",
    price: 390.00,
    promotionalPrice: null,
    valveType: "Padrão S (Micromatic)",
    alcoholContent: "5.2% ABV",
    ibu: "14 IBU",
    image: "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?auto=format&fit=crop&w=600&q=80",
    active: true,
    featured: false,
    tags: ["Weiss", "Trigo", "30L"]
  }
];

const DEFAULT_SETTINGS = {
  companyName: "PKCHOPP DISTRIBUIDORA DE BARRIS",
  pixKey: "pkchopp.financeiro@gmail.com",
  pixKeyType: "E-mail",
  pixBeneficiary: "PKCHOPP DISTRIBUIDORA LTDA",
  pixCity: "RIO DE JANEIRO",
  whatsappNumber: "5521999998888",
  deliveryFeeDefault: 0.00,
  minOrderValue: 200.00,
  address: "Av. Brasil, Rio de Janeiro - RJ",
  notificationSound: true,
  leadWelcomeMsg: "Olá {nome}! Tudo bem? Somos da PKCHOPP Distribuidora de Chopp no atacado. Temos condições e valores altamente competitivos para bares e choperias que compram a partir de 5 barris por semana. Gostaria de receber nossa tabela expressa de reposição?",
  googleMapsApiKey: "",
  cacheTtlDays: 15
};

const DEFAULT_CLIENTS = [
  {
    id: "cli-1",
    name: "Bar e Restaurante Boca Cheia",
    owner: "Marcos Aurélio de Souza",
    phone: "(21) 2471-8890",
    whatsapp: "5521988771122",
    address: "Av. Monsenhor Félix, 540 - Irajá, Rio de Janeiro - RJ",
    segment: "Bar & Choperia de Alto Giro",
    openingHours: "Terça a Domingo das 11h às 02h",
    source: "Prospecção Maps",
    brahmaStatus: "🔴 Vende Chopp Brahma (Alvo de Conversão)",
    crmStatus: "cliente",
    weeklyVolume: "6 a 8 barris 50L / semana",
    monthlyVolume: 28,
    totalOrders: 4,
    totalKegs: 18,
    totalSpent: 8980.00,
    lastOrderDate: "2026-08-20",
    notes: "Consome 6 barris de 50L por semana. Prefere reposição rápida nas quintas de manhã."
  },
  {
    id: "cli-2",
    name: "Choperia Jacques",
    owner: "Jacques Rodrigues",
    phone: "(21) 3452-9910",
    whatsapp: "5521976543322",
    address: "Rua Guaporé, 412 - Brás de Pina, Rio de Janeiro - RJ",
    segment: "Pub & Choperia",
    openingHours: "Quarta a Domingo das 17h às 03h",
    source: "Prospecção Maps",
    brahmaStatus: "🔴 Vende Chopp Brahma & Amstel",
    crmStatus: "cliente",
    weeklyVolume: "4 a 5 barris 50L / semana",
    monthlyVolume: 20,
    totalOrders: 3,
    totalKegs: 12,
    totalSpent: 5988.00,
    lastOrderDate: "2026-08-22",
    notes: "Giro forte no fim de semana. Compra Chopp IPA 50L e Chopp Puro Malte 50L."
  }
];

class Database {
  constructor() {
    this.init();
  }

  init() {
    writeJSON('products.json', DEFAULT_PRODUCTS);
    this.getOrders();
    this.getClients();
    this.getSettings();
    this.getLeads();
    this.getProspectingHistory();
  }

  // ==========================================
  // PROSPECTING LEADS (RADAR COMERCIAL B2B)
  // ==========================================
  getLeads() {
    return readJSON('leads.json', []);
  }

  saveLeads(leads) {
    writeJSON('leads.json', leads);
  }

  getLeadById(id) {
    const leads = this.getLeads();
    return leads.find(l => l.id === id || l.placeId === id) || null;
  }

  upsertLead(leadData) {
    const leads = this.getLeads();
    const cleanPhone = (leadData.phone || leadData.whatsapp || '').replace(/\D/g, '');
    const placeId = leadData.placeId;

    const existingIndex = leads.findIndex(l => 
      (placeId && l.placeId && l.placeId === placeId) ||
      (cleanPhone && cleanPhone.length >= 8 && (l.phone || '').replace(/\D/g, '').includes(cleanPhone.slice(-8))) ||
      (l.name && leadData.name && l.name.toLowerCase() === leadData.name.toLowerCase() && l.address && leadData.address && l.address.toLowerCase().includes((leadData.neighborhood || '').toLowerCase()))
    );

    if (existingIndex !== -1) {
      const existing = leads[existingIndex];
      // Preservar alterações manuais
      if (existing.isManualEdit) {
        leads[existingIndex] = {
          ...leadData,
          ...existing, // campos manuais prevalecem
          lastScrapedAt: new Date().toISOString()
        };
      } else {
        leads[existingIndex] = {
          ...existing,
          ...leadData,
          id: existing.id,
          updatedAt: new Date().toISOString()
        };
      }
      this.saveLeads(leads);
      return { lead: leads[existingIndex], isNew: false };
    } else {
      const newLead = {
        id: leadData.id || `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...leadData
      };
      leads.unshift(newLead);
      this.saveLeads(leads);
      return { lead: newLead, isNew: true };
    }
  }

  updateLead(id, updatedFields) {
    const leads = this.getLeads();
    const index = leads.findIndex(l => l.id === id || l.placeId === id);
    if (index !== -1) {
      leads[index] = {
        ...leads[index],
        ...updatedFields,
        isManualEdit: true,
        updatedAt: new Date().toISOString()
      };
      this.saveLeads(leads);
      return leads[index];
    }
    return null;
  }

  deleteLead(id) {
    let leads = this.getLeads();
    leads = leads.filter(l => l.id !== id && l.placeId !== id);
    this.saveLeads(leads);
    return true;
  }

  addContactHistory(id, contactEntry) {
    const leads = this.getLeads();
    const index = leads.findIndex(l => l.id === id || l.placeId === id);
    if (index !== -1) {
      if (!Array.isArray(leads[index].contactHistory)) {
        leads[index].contactHistory = [];
      }
      const entry = {
        id: `cnt-${Date.now()}`,
        date: new Date().toISOString(),
        type: contactEntry.type || 'WhatsApp',
        note: contactEntry.note || '',
        user: contactEntry.user || 'Administrador B2B'
      };
      leads[index].contactHistory.unshift(entry);
      leads[index].lastContact = entry.date;
      leads[index].updatedAt = new Date().toISOString();
      this.saveLeads(leads);
      return leads[index];
    }
    return null;
  }

  // ==========================================
  // HISTÓRICO DE PROSPECÇÃO EM LOTE
  // ==========================================
  getProspectingHistory() {
    return readJSON('prospecting_history.json', []);
  }

  saveProspectingHistory(history) {
    writeJSON('prospecting_history.json', history);
  }

  addProspectingHistoryEntry(entry) {
    const history = this.getProspectingHistory();
    const newEntry = {
      id: `hist-${Date.now()}`,
      date: new Date().toLocaleDateString('pt-BR'),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString(),
      user: entry.user || 'Administrador B2B',
      city: entry.city || 'Rio de Janeiro',
      neighborhood: entry.neighborhood || 'Diversos Bairros',
      radius: entry.radius || '10 km',
      terms: entry.terms || [],
      totalFound: entry.totalFound || 0,
      totalNew: entry.totalNew || 0,
      totalDuplicates: entry.totalDuplicates || 0,
      hotCount: entry.hotCount || 0,
      warmCount: entry.warmCount || 0,
      coldCount: entry.coldCount || 0
    };
    history.unshift(newEntry);
    this.saveProspectingHistory(history);
    return newEntry;
  }

  // PRODUCTS
  getProducts() {
    return readJSON('products.json', DEFAULT_PRODUCTS);
  }

  saveProducts(products) {
    writeJSON('products.json', products);
  }

  addProduct(product) {
    const products = this.getProducts();
    const newProduct = {
      id: `prod-${Date.now()}`,
      active: true,
      featured: false,
      category: 'chopp',
      ...product
    };
    products.unshift(newProduct);
    this.saveProducts(products);
    return newProduct;
  }

  updateProduct(id, updatedFields) {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = { ...products[index], ...updatedFields };
      this.saveProducts(products);
      return products[index];
    }
    return null;
  }

  deleteProduct(id) {
    let products = this.getProducts();
    const target = products.find(p => p.id === id);
    if (target && target.protected) {
      return false; // Produto protegido não pode ser excluído
    }
    products = products.filter(p => p.id !== id);
    this.saveProducts(products);
    return true;
  }

  // ORDERS
  getOrders() {
    return readJSON('orders.json', []);
  }

  saveOrders(orders) {
    writeJSON('orders.json', orders);
  }

  createOrder(orderData) {
    const orders = this.getOrders();
    const orderNumber = `PK-${Math.floor(100000 + Math.random() * 900000)}`;

    const totalKegs = (orderData.items || []).reduce((acc, it) => acc + Number(it.quantity), 0);
    const totalLiters = (orderData.items || []).reduce((acc, it) => {
      const liters = it.liters ? Number(it.liters) : (it.name.includes('50') ? 50 : (it.name.includes('30') ? 30 : 0));
      return acc + (liters * Number(it.quantity));
    }, 0);

    const newOrder = {
      id: `order-${Date.now()}`,
      orderNumber,
      createdAt: new Date().toISOString(),
      status: orderData.paymentMethod === 'pix' ? 'Aguardando Pagamento' : 'Confirmado',
      totalKegs,
      totalLiters,
      ...orderData
    };
    orders.unshift(newOrder);
    this.saveOrders(orders);

    this.updateClientOrderHistory(newOrder);
    return newOrder;
  }

  updateOrderStatus(id, newStatus, paymentStatus) {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
      orders[index].status = newStatus;
      if (paymentStatus) {
        orders[index].paymentStatus = paymentStatus;
      }
      orders[index].updatedAt = new Date().toISOString();
      this.saveOrders(orders);
      return orders[index];
    }
    return null;
  }

  // CRM LEADS STATUS (LEGACY COMPATIBILITY)
  getLeadsStatus() {
    return readJSON('leads_status.json', {});
  }

  saveLeadsStatus(statusMap) {
    writeJSON('leads_status.json', statusMap);
  }

  updateLeadStatus(leadIdentifier, crmStatus, notes = '') {
    const statusMap = this.getLeadsStatus();
    statusMap[leadIdentifier] = {
      status: crmStatus,
      notes: notes || (statusMap[leadIdentifier] ? statusMap[leadIdentifier].notes : ''),
      updatedAt: new Date().toISOString()
    };
    this.saveLeadsStatus(statusMap);

    // Também sincronizar no leads.json se existir
    const leads = this.getLeads();
    const lead = leads.find(l => l.name === leadIdentifier || l.id === leadIdentifier);
    if (lead) {
      lead.crmStatus = crmStatus;
      if (notes) lead.observations = notes;
      this.saveLeads(leads);
    }

    const clients = this.getClients();
    const client = clients.find(c => c.name === leadIdentifier || (c.phone && c.phone.replace(/\D/g, '') === leadIdentifier.replace(/\D/g, '')));
    if (client) {
      client.crmStatus = crmStatus;
      this.saveClients(clients);
    }

    return statusMap[leadIdentifier];
  }

  // CLIENTS & PDVs
  getClients() {
    return readJSON('clients.json', DEFAULT_CLIENTS);
  }

  saveClients(clients) {
    writeJSON('clients.json', clients);
  }

  addOrUpdateClient(clientData) {
    const clients = this.getClients();
    const cleanPhone = (clientData.phone || clientData.whatsapp || '').replace(/\D/g, '');
    const existingIndex = clients.findIndex(c => 
      (cleanPhone && c.phone && c.phone.replace(/\D/g, '').includes(cleanPhone.slice(-8))) ||
      (c.name && clientData.name && c.name.toLowerCase() === clientData.name.toLowerCase())
    );

    if (existingIndex !== -1) {
      clients[existingIndex] = {
        ...clients[existingIndex],
        ...clientData,
        updatedAt: new Date().toISOString()
      };
      this.saveClients(clients);
      return clients[existingIndex];
    } else {
      const newClient = {
        id: `cli-${Date.now()}`,
        name: clientData.name,
        owner: clientData.owner || clientData.commercialResponsible || '',
        phone: clientData.phone || '',
        whatsapp: clientData.whatsapp || '',
        address: clientData.address || '',
        segment: clientData.segment || clientData.category || 'Bar & Ponto de Venda',
        openingHours: clientData.openingHours || '',
        source: clientData.source || 'Radar B2B',
        rating: clientData.rating || '',
        brahmaStatus: clientData.brahmaStatus || '🟢 Cliente PKChopp Ativo',
        crmStatus: 'cliente',
        weeklyVolume: clientData.weeklyVolume || clientData.weeklyVolumeEstimated || '4 a 6 barris/semana',
        monthlyVolume: clientData.monthlyVolume || clientData.monthlyVolumeEstimated || 20,
        totalOrders: clientData.totalOrders || 0,
        totalKegs: clientData.totalKegs || 0,
        totalSpent: clientData.totalSpent || 0,
        notes: clientData.notes || clientData.observations || '',
        createdAt: new Date().toISOString()
      };
      clients.unshift(newClient);
      this.saveClients(clients);

      // Atualizar no leads.json
      if (clientData.id) {
        this.updateLead(clientData.id, { crmStatus: 'cliente', classification: 'CLIENTE_PKCHOPP' });
      }

      return newClient;
    }
  }

  updateClientOrderHistory(order) {
    const clients = this.getClients();
    const phone = (order.customerPhone || '').replace(/\D/g, '');
    const client = clients.find(c => 
      (c.phone && (c.phone || '').replace(/\D/g, '').includes(phone.slice(-8))) || 
      (c.name && order.customerName && c.name.toLowerCase() === order.customerName.toLowerCase())
    );
    
    const kegs = order.totalKegs || 0;
    const amount = Number(order.totalAmount) || 0;

    if (client) {
      client.totalOrders = (client.totalOrders || 0) + 1;
      client.totalKegs = (client.totalKegs || 0) + kegs;
      client.totalSpent = (client.totalSpent || 0) + amount;
      client.owner = order.customerOwner || client.owner || '';
      client.address = order.deliveryAddress || client.address || '';
      client.crmStatus = 'cliente';
      client.lastOrderDate = new Date().toISOString().split('T')[0];
      this.saveClients(clients);
    } else if (order.customerName) {
      this.addOrUpdateClient({
        name: order.customerName,
        owner: order.customerOwner || '',
        phone: order.customerPhone,
        address: order.deliveryAddress,
        source: "Pedido Loja Express",
        brahmaStatus: "🟢 Cliente PKChopp Ativo",
        crmStatus: "cliente",
        weeklyVolume: `${kegs} barris/pedido`,
        monthlyVolume: kegs * 4,
        totalOrders: 1,
        totalKegs: kegs,
        totalSpent: amount,
        lastOrderDate: new Date().toISOString().split('T')[0]
      });
    }

    if (order.customerName) {
      this.updateLeadStatus(order.customerName, 'cliente', `Pedido ${order.orderNumber} realizado. Total: R$ ${amount.toFixed(2)}`);
    }
  }

  // SETTINGS
  getSettings() {
    return readJSON('settings.json', DEFAULT_SETTINGS);
  }

  saveSettings(settings) {
    writeJSON('settings.json', settings);
  }
}

module.exports = new Database();
