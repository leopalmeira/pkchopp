// Script Principal do Painel Administrativo PKCHOPP B2B
// Gerenciamento de Pedidos, Catálogo Simplificado, Cadastro com Auto-Lookup de Bares/CNPJ e Pedidos Rápidos com WhatsApp

let allOrders = [];
let allProducts = [];
let allClients = [];
let appSettings = {};
let selectedClientForQuickOrder = null;

// ==========================================
// AUTENTICAÇÃO DO PAINEL ADMIN COM SENHA
// ==========================================
window.checkAdminAuth = function() {
  const token = sessionStorage.getItem('pkchopp_auth_token');
  const overlay = document.getElementById('adminAuthOverlay');
  if (token === 'pkchopp-auth-session-valid') {
    if (overlay) overlay.style.display = 'none';
    return true;
  } else {
    if (overlay) overlay.style.display = 'flex';
    return false;
  }
};

window.handleAdminLogin = async function(e) {
  e.preventDefault();
  const password = document.getElementById('adminPasswordInput').value;
  const errorMsg = document.getElementById('authErrorMessage');
  const btn = document.getElementById('btnAdminLogin');

  if (errorMsg) errorMsg.style.display = 'none';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Verificando...';
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();

    if (data.success && data.token) {
      sessionStorage.setItem('pkchopp_auth_token', data.token);
      const overlay = document.getElementById('adminAuthOverlay');
      if (overlay) overlay.style.display = 'none';
      loadAllAdminData();
    } else {
      if (errorMsg) errorMsg.style.display = 'block';
    }
  } catch (err) {
    console.error('Erro na autenticação:', err);
    if (errorMsg) errorMsg.style.display = 'block';
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-lock-open"></i> Desbloquear Painel';
    }
  }
};

window.handleAdminLogout = function() {
  sessionStorage.removeItem('pkchopp_auth_token');
  const overlay = document.getElementById('adminAuthOverlay');
  const input = document.getElementById('adminPasswordInput');
  if (input) input.value = '';
  if (overlay) overlay.style.display = 'flex';
};

window.togglePasswordVisibility = function() {
  const input = document.getElementById('adminPasswordInput');
  const icon = document.getElementById('passwordToggleIcon');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    if (icon) icon.className = 'fa-solid fa-eye';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  setupNavigation();
  setupEventListeners();
  loadAllAdminData();

  // Auto-refresh para sincronizar novos pedidos e métricas
  setInterval(fetchOrders, 15000);
});

// Navegação por Abas
function setupNavigation() {
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.dataset.section;
      switchSection(section);
    });
  });
}

window.switchSection = function(sectionId) {
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
  const activeNavItem = document.querySelector(`.sidebar-nav .nav-item[data-section="${sectionId}"]`);
  if (activeNavItem) activeNavItem.classList.add('active');

  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  const activeSection = document.getElementById(`section-${sectionId}`);
  if (activeSection) activeSection.classList.add('active');

  const titles = {
    dashboard: { title: 'Dashboard Geral', subtitle: 'Acompanhe métricas, pedidos e faturamento de barris em tempo real' },
    maps: { title: 'Radar de Prospecção B2B & Inteligência Comercial', subtitle: 'Prospecção territorial de choperias e bares com dados 100% reais do Google Maps' },
    orders: { title: 'Gestão de Pedidos de Chopp', subtitle: 'Acompanhamento em tempo real, dados de entrega, pagamentos e romaneio' },
    products: { title: 'Catálogo de Produtos & Estoque de Barris', subtitle: 'Gerencie descrição, preços e estoque disponível de barris de chopp de forma simples' },
    clients: { title: 'Base Central de Clientes & PDVs', subtitle: 'Cadastre bares rapidamente por CNPJ/Nome com autopreenchimento e emita pedidos imediatos' },
    settings: { title: 'Configurações & PIX', subtitle: 'Chave PIX padrão BACEN, dados da distribuidora e mensagens automáticas' }
  };

  const current = titles[sectionId] || titles.dashboard;
  const titleEl = document.getElementById('currentSectionTitle');
  const subEl = document.getElementById('currentSectionSubtitle');
  if (titleEl) titleEl.innerText = current.title;
  if (subEl) subEl.innerText = current.subtitle;

  // Atualizar dados da seção correspondente
  if (sectionId === 'products') fetchProductsAdmin();
  if (sectionId === 'clients') fetchClients();
  if (sectionId === 'orders') fetchOrders();
  if (sectionId === 'dashboard') fetchDashboardStats();
};

function setupEventListeners() {
  const btnRefresh = document.getElementById('btnRefreshData');
  if (btnRefresh) btnRefresh.addEventListener('click', loadAllAdminData);
  
  // Filtro de Status de Pedidos
  const filterSelect = document.getElementById('filterOrderStatus');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      renderOrdersTable(filterSelect.value);
    });
  }

  // Modal de Produto
  const btnNewProd = document.getElementById('btnOpenNewProductModal');
  if (btnNewProd) btnNewProd.addEventListener('click', () => openProductModal());

  const prodForm = document.getElementById('productForm');
  if (prodForm) prodForm.addEventListener('submit', handleSaveProduct);

  // Modal de Cliente / Bar
  const btnNewClient = document.getElementById('btnOpenNewClientModal');
  if (btnNewClient) btnNewClient.addEventListener('click', () => openClientModal());

  const clientForm = document.getElementById('clientForm');
  if (clientForm) clientForm.addEventListener('submit', handleSaveClient);

  const btnLookup = document.getElementById('btnTriggerClientLookup');
  if (btnLookup) btnLookup.addEventListener('click', handleClientAutoLookup);

  const lookupInput = document.getElementById('clientLookupInput');
  if (lookupInput) {
    lookupInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleClientAutoLookup();
      }
    });
    lookupInput.addEventListener('input', debounce(handleClientAutocomplete, 350));
  }

  const btnSaveAndOrder = document.getElementById('btnSaveClientAndOrder');
  if (btnSaveAndOrder) {
    btnSaveAndOrder.addEventListener('click', async () => {
      const savedClient = await handleSaveClientInternal();
      if (savedClient) {
        closeClientModal();
        openQuickClientOrderModal(savedClient);
      }
    });
  }

  // Modal de Pedido Rápido & Confirmação no WhatsApp
  const quickOrderForm = document.getElementById('quickClientOrderForm');
  if (quickOrderForm) quickOrderForm.addEventListener('submit', handleSaveQuickOrder);

  const btnSendWhatsApp = document.getElementById('btnSendWhatsAppOrderConfirmation');
  if (btnSendWhatsApp) btnSendWhatsApp.addEventListener('click', handleSendWhatsAppOrderConfirmation);

  const qoProdSelect = document.getElementById('qoProductSelect');
  const qoQty = document.getElementById('qoQuantity');
  if (qoProdSelect) qoProdSelect.addEventListener('change', recalculateQuickOrderTotal);
  if (qoQty) qoQty.addEventListener('input', recalculateQuickOrderTotal);

  // Configurações
  const settingsForm = document.getElementById('settingsForm');
  if (settingsForm) settingsForm.addEventListener('submit', handleSaveSettings);

  const btnQuick = document.getElementById('btnQuickOrder');
  if (btnQuick) btnQuick.addEventListener('click', () => window.open('/', '_blank'));
}

async function loadAllAdminData() {
  await Promise.all([
    fetchDashboardStats(),
    fetchOrders(),
    fetchProductsAdmin(),
    fetchClients(),
    fetchSettings()
  ]);
}

// ==========================================
// 1. DASHBOARD & ESTATÍSTICAS
// ==========================================
async function fetchDashboardStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data.success) {
      const s = data.data;
      const revEl = document.getElementById('statRevenue');
      const ordEl = document.getElementById('statOrders');
      const kegEl = document.getElementById('statKegs');
      const cliEl = document.getElementById('statClients');
      const badge = document.getElementById('pendingOrdersBadge');

      if (revEl) revEl.innerText = `R$ ${Number(s.totalRevenue).toFixed(2).replace('.', ',')}`;
      if (ordEl) ordEl.innerText = s.totalOrders;
      if (kegEl) kegEl.innerText = `${s.totalKegsSold} barris`;
      if (cliEl) cliEl.innerText = `${s.totalClients} PDVs`;

      if (badge) {
        if (s.pendingOrders > 0) {
          badge.style.display = 'inline-block';
          badge.innerText = s.pendingOrders;
        } else {
          badge.style.display = 'none';
        }
      }
    }
  } catch (err) {
    console.error('Erro nas estatísticas:', err);
  }
}

// ==========================================
// 2. GESTÃO DE PEDIDOS
// ==========================================
async function fetchOrders() {
  try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (data.success) {
      allOrders = data.data;
      renderOrdersTable();
      renderRecentDashboardOrders();
    }
  } catch (err) {
    console.error('Erro ao buscar pedidos:', err);
  }
}

function getStatusBadgeHtml(status) {
  let badgeClass = 'status-pending';
  let icon = 'fa-clock';

  switch (status) {
    case 'Aguardando Pagamento':
    case 'Aguardando Pagamento PIX':
    case 'Pendente':
      badgeClass = 'status-pending';
      icon = 'fa-clock';
      break;
    case 'Pago':
    case 'Confirmado':
      badgeClass = 'status-paid';
      icon = 'fa-circle-check';
      break;
    case 'Em Separação':
      badgeClass = 'status-pending';
      icon = 'fa-boxes-packing';
      break;
    case 'Em Rota de Entrega':
      badgeClass = 'status-transit';
      icon = 'fa-truck-fast';
      break;
    case 'Entregue':
      badgeClass = 'status-delivered';
      icon = 'fa-check-double';
      break;
    case 'Cancelado':
      badgeClass = 'status-cancelled';
      icon = 'fa-ban';
      break;
  }

  return `<span class="order-status-badge ${badgeClass}"><i class="fa-solid ${icon}"></i> ${status}</span>`;
}

function renderOrdersTable(filterStatus = 'all') {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  let filtered = allOrders;
  if (filterStatus !== 'all') {
    filtered = allOrders.filter(o => o.status === filterStatus);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          Nenhum pedido de chopp encontrado com o status selecionado.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(order => {
    const itemsSummary = (order.items || []).map(it => `${it.quantity}x ${it.name}`).join('<br>');
    const waNumber = (order.customerPhone || '').replace(/\D/g, '');
    const waLink = waNumber ? `https://wa.me/55${waNumber}` : '#';

    return `
      <tr>
        <td>
          <strong style="color: #38BDF8; font-size: 0.95rem;">${order.orderNumber}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">${new Date(order.createdAt).toLocaleDateString('pt-BR')} ${new Date(order.createdAt).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</div>
        </td>
        <td>
          <strong style="color:#fff;">${order.customerName}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">Resp: ${order.customerOwner || 'Dono'}</div>
          <div style="font-size:0.75rem; color:#22C55E;">
            <a href="${waLink}" target="_blank" style="color:#22C55E; text-decoration:none;">
              <i class="fa-brands fa-whatsapp"></i> ${order.customerPhone}
            </a>
          </div>
        </td>
        <td>
          <div style="font-size:0.8rem; color:#fff; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${order.deliveryAddress || 'Retirada'}</div>
          <div style="font-size:0.75rem; color:#f59e0b;"><i class="fa-solid fa-calendar-day"></i> ${order.deliveryDate || 'Hoje'} (${order.deliveryTime || 'Tarde'})</div>
        </td>
        <td style="font-size:0.8rem; color:#fff;">${itemsSummary}</td>
        <td><strong style="color: #22C55E; font-size: 1rem;">R$ ${Number(order.totalAmount).toFixed(2).replace('.', ',')}</strong></td>
        <td><span style="font-size:0.8rem; background:rgba(255,255,255,0.06); padding:0.2rem 0.5rem; border-radius:4px;">${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'PIX'}</span></td>
        <td>${getStatusBadgeHtml(order.status)}</td>
        <td>
          <select style="background: #0B1120; color:#fff; border: 1px solid var(--erp-border-light); padding: 0.35rem 0.6rem; border-radius: var(--radius-xs); font-size: 0.75rem; font-weight:700;" onchange="updateOrderStatus('${order.id}', this.value)">
            <option value="" disabled selected>Alterar Status...</option>
            <option value="Aguardando Pagamento">Aguardando Pagamento</option>
            <option value="Confirmado">Confirmado</option>
            <option value="Em Separação">Em Separação</option>
            <option value="Em Rota de Entrega">Em Rota de Entrega</option>
            <option value="Entregue">Entregue</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

function renderRecentDashboardOrders() {
  const tbody = document.getElementById('recentOrdersTableBody');
  if (!tbody) return;

  const recent = allOrders.slice(0, 5);
  if (recent.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          Nenhum pedido registrado ainda.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = recent.map(order => {
    const itemsSummary = (order.items || []).map(it => `${it.quantity}x ${it.name}`).join(', ');
    return `
      <tr>
        <td><strong style="color: #38BDF8;">${order.orderNumber}</strong></td>
        <td>
          <strong>${order.customerName}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">Resp: ${order.customerOwner || 'Dono'}</div>
        </td>
        <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${itemsSummary}</td>
        <td><strong>R$ ${Number(order.totalAmount).toFixed(2).replace('.', ',')}</strong></td>
        <td>${(order.paymentMethod || 'PIX').toUpperCase()}</td>
        <td>${getStatusBadgeHtml(order.status)}</td>
        <td>
          <button class="btn-admin-secondary" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;" onclick="switchSection('orders')">
            Ver Detalhes
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.updateOrderStatus = async function(orderId, newStatus) {
  if (!newStatus) return;

  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (data.success) {
      await fetchOrders();
      await fetchDashboardStats();
    }
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
  }
};

// ==========================================
// 3. CATÁLOGO DE PRODUTOS SIMPLES (DESCRIÇÃO, PREÇO, ESTOQUE)
// ==========================================
async function fetchProductsAdmin() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.success) {
      allProducts = data.data;
      renderProductsTable();
    }
  } catch (err) {
    console.error('Erro ao buscar produtos:', err);
  }
}

function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  if (allProducts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          Nenhum produto cadastrado no catálogo. Clique em <strong>+ Cadastrar Novo Produto</strong> acima.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = allProducts.map(prod => {
    const stockVal = (prod.stock !== undefined && prod.stock !== null) ? prod.stock : 50;
    const stockColor = stockVal > 15 ? '#22C55E' : (stockVal > 0 ? '#f59e0b' : '#ef4444');
    const isProtected = prod.protected === true;
    const protectedBadge = isProtected ? '<span style="display:inline-block; background:rgba(245,158,11,0.15); color:#f59e0b; font-size:0.65rem; font-weight:800; padding:0.1rem 0.4rem; border-radius:3px; border:1px solid rgba(245,158,11,0.3); margin-left:0.4rem; vertical-align:middle;">⭐ SEMPRE DISPONÍVEL</span>' : '';
    const deleteBtn = isProtected ? '' : `<button class="btn-admin-secondary" style="padding:0.35rem 0.65rem; font-size:0.75rem; color:#ef4444;" onclick="deleteProduct('${prod.id}')" title="Excluir Produto"><i class="fa-solid fa-trash"></i></button>`;

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <img src="${prod.image || '/images/barril-brahma.jpg'}" alt="${prod.name}" style="width:42px; height:42px; object-fit:contain; background:#0B1120; border-radius:4px; padding:2px; border:1px solid var(--erp-border-light);" onerror="this.src='/images/barril-brahma.jpg'">
            <div>
              <div style="font-weight: 800; color: #fff; font-size: 0.92rem;">
                ${prod.name}
                <span style="font-size:0.72rem; color:#f59e0b; font-weight:700; margin-left:0.35rem;">(${prod.liters || 50}L)</span>
                ${protectedBadge}
              </div>
              <div style="font-size:0.75rem; color:var(--text-muted); max-width:320px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${prod.description || 'Sem descrição'}
              </div>
            </div>
          </div>
        </td>
        <td>
          <strong style="color: #38BDF8; font-size: 1.05rem;">
            R$ ${Number(prod.price).toFixed(2).replace('.', ',')}
          </strong>
        </td>
        <td>
          <span style="display:inline-flex; align-items:center; gap:0.4rem; font-weight: 800; font-size: 0.95rem; color: ${stockColor};">
            <i class="fa-solid fa-boxes-stacked"></i> ${stockVal} unidades
          </span>
        </td>
        <td>
          <div style="display:flex; gap:0.4rem;">
            <button class="btn-admin-action" style="padding:0.35rem 0.75rem; font-size:0.75rem; background:#0284C7;" onclick="editProduct('${prod.id}')" title="Editar Produto">
              <i class="fa-solid fa-pen"></i> Editar
            </button>
            ${deleteBtn}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.openProductModal = function(product = null) {
  const modal = document.getElementById('modalProduct');
  const title = document.getElementById('modalProductTitle');
  const form = document.getElementById('productForm');
  const btnDelete = document.getElementById('btnDeleteProductInModal');
  if (!modal || !form) return;

  form.reset();

  if (product) {
    if (title) title.innerHTML = '<i class="fa-solid fa-pen-to-square" style="color:#38BDF8;"></i> Editar Produto';
    document.getElementById('editProductId').value = product.id;
    document.getElementById('prodName').value = product.name || '';
    document.getElementById('prodDescription').value = product.description || '';
    document.getElementById('prodLiters').value = product.liters || 50;
    document.getElementById('prodPrice').value = product.price || '';
    document.getElementById('prodStock').value = (product.stock !== undefined && product.stock !== null) ? product.stock : 50;
    document.getElementById('prodImage').value = product.image || '/images/barril-brahma.jpg';
    if (btnDelete) btnDelete.style.display = product.protected ? 'none' : 'inline-flex';
  } else {
    if (title) title.innerHTML = '<i class="fa-solid fa-cube" style="color:#38BDF8;"></i> Cadastrar Produto';
    document.getElementById('editProductId').value = '';
    document.getElementById('prodName').value = 'Barril de Chopp 50 Litros';
    document.getElementById('prodDescription').value = '';
    document.getElementById('prodLiters').value = '50';
    document.getElementById('prodStock').value = '50';
    document.getElementById('prodImage').value = '/images/barril-brahma.jpg';
    if (btnDelete) btnDelete.style.display = 'none';
  }

  modal.classList.add('active');
};

window.closeProductModal = function() {
  const modal = document.getElementById('modalProduct');
  if (modal) modal.classList.remove('active');
};

window.editProduct = function(id) {
  const prod = allProducts.find(p => p.id === id);
  if (prod) openProductModal(prod);
};

window.handleDeleteProductFromModal = async function() {
  const id = document.getElementById('editProductId').value;
  if (!id) return;
  if (!confirm('Deseja realmente remover este produto do catálogo?')) return;

  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      closeProductModal();
      await fetchProductsAdmin();
    } else {
      alert(data.message || 'Não foi possível excluir este produto.');
    }
  } catch (err) {
    console.error('Erro ao deletar produto:', err);
    alert('Erro ao excluir produto.');
  }
};

window.deleteProduct = async function(id) {
  if (!confirm('Deseja realmente remover este produto do catálogo?')) return;
  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await fetchProductsAdmin();
    } else {
      alert(data.message || 'Não foi possível excluir este produto.');
    }
  } catch (err) {
    console.error('Erro ao deletar produto:', err);
  }
};

async function handleSaveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('editProductId').value;
  const name = document.getElementById('prodName').value.trim() || 'Barril de Chopp 50 Litros';
  const description = document.getElementById('prodDescription').value.trim();
  const liters = parseInt(document.getElementById('prodLiters').value, 10) || 50;
  const price = parseFloat(document.getElementById('prodPrice').value);
  const stock = parseInt(document.getElementById('prodStock').value, 10) || 0;
  const image = document.getElementById('prodImage').value.trim() || '/images/barril-brahma.jpg';

  const payload = {
    name: name,
    description: description,
    liters: liters,
    price: price,
    stock: stock,
    unit: `Barril ${liters}L`,
    category: 'chopp',
    image: image,
    active: true,
    tags: [`${liters} Litros`, "Pronta Entrega"]
  };

  try {
    const url = id ? `/api/products/${id}` : '/api/products';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      closeProductModal();
      await fetchProductsAdmin();
    }
  } catch (err) {
    console.error('Erro ao salvar produto:', err);
  }
}

// ==========================================
// 4. CADASTRO DE BARES COM AUTOPREENCHIMENTO RÁPIDO
// ==========================================
async function fetchClients() {
  try {
    const res = await fetch('/api/clients');
    const data = await res.json();
    if (data.success) {
      allClients = data.data;
      renderClientsTable();
    }
  } catch (err) {
    console.error('Erro ao buscar clientes:', err);
  }
}

function renderClientsTable() {
  const tbody = document.getElementById('clientsTableBody');
  if (!tbody) return;

  if (allClients.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          Nenhum bar ou PDV cadastrado na base oficial. Clique em <strong>+ Cadastrar Novo Bar / PDV</strong> acima.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = allClients.map(cli => {
    const waNumber = (cli.whatsapp || cli.phone || '').replace(/\D/g, '');
    const waLink = waNumber ? `https://wa.me/55${waNumber}` : '#';

    return `
      <tr>
        <td>
          <div style="font-weight: 800; color: #fff; font-size: 0.95rem;">
            <i class="fa-solid fa-store" style="color:#38BDF8; margin-right:0.4rem;"></i>
            ${cli.name}
          </div>
          ${cli.cnpj ? `<div style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">CNPJ: ${cli.cnpj}</div>` : ''}
        </td>
        <td>
          <strong style="color:#fff;">${cli.owner || 'Não informado'}</strong>
        </td>
        <td>
          <a href="${waLink}" target="_blank" style="color:#22C55E; font-weight:700; text-decoration:none;">
            <i class="fa-brands fa-whatsapp"></i> ${cli.phone || cli.whatsapp || 'Não informado'}
          </a>
        </td>
        <td style="max-width:240px; font-size:0.82rem; color:#fff;">
          ${cli.address || 'Rio de Janeiro, RJ'}
          ${cli.neighborhood ? `<div style="font-size:0.75rem; color:var(--text-muted);">${cli.neighborhood}</div>` : ''}
        </td>
        <td>
          <span style="font-size:0.8rem; background:rgba(2,132,199,0.1); color:#38BDF8; border:1px solid rgba(2,132,199,0.3); padding:0.2rem 0.5rem; border-radius:4px; font-weight:700;">
            ${cli.weeklyVolume || '6 a 8 barris/semana'}
          </span>
        </td>
        <td>
          <strong style="color:#22C55E;">R$ ${Number(cli.totalSpent || 0).toFixed(2).replace('.', ',')}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">${cli.totalOrders || 0} pedidos</div>
        </td>
        <td>
          <div style="display:flex; gap:0.4rem;">
            <button class="btn-admin-action" style="padding:0.35rem 0.75rem; font-size:0.75rem; background:#22C55E; font-weight:900;" onclick="openQuickClientOrderModalById('${cli.id}')" title="Emitir Pedido de Chopp para este bar">
              <i class="fa-solid fa-truck-fast"></i> + PEDIDO
            </button>
            <button class="btn-admin-secondary" style="padding:0.35rem 0.65rem; font-size:0.75rem;" onclick="editClient('${cli.id}')" title="Editar Cadastro">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-admin-secondary" style="padding:0.35rem 0.65rem; font-size:0.75rem; color:#ef4444;" onclick="deleteClient('${cli.id}')" title="Excluir Bar">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.openClientModal = function(client = null) {
  const modal = document.getElementById('modalClient');
  const title = document.getElementById('modalClientTitle');
  const form = document.getElementById('clientForm');
  const suggestions = document.getElementById('clientLookupSuggestions');
  if (!modal || !form) return;

  form.reset();
  if (suggestions) suggestions.style.display = 'none';

  if (client) {
    if (title) title.innerHTML = '<i class="fa-solid fa-pen-to-square" style="color:#38BDF8;"></i> Editar Bar / Ponto de Venda';
    document.getElementById('editClientId').value = client.id;
    document.getElementById('clientName').value = client.name || '';
    document.getElementById('clientOwner').value = client.owner || '';
    document.getElementById('clientPhone').value = client.phone || client.whatsapp || '';
    document.getElementById('clientAddress').value = client.address || '';
    document.getElementById('clientNeighborhood').value = client.neighborhood || '';
    document.getElementById('clientCnpj').value = client.cnpj || '';
  } else {
    if (title) title.innerHTML = '<i class="fa-solid fa-store" style="color:#38BDF8;"></i> Cadastrar Bar / Ponto de Venda';
    document.getElementById('editClientId').value = '';
    const lookupInput = document.getElementById('clientLookupInput');
    if (lookupInput) lookupInput.value = '';
  }

  modal.classList.add('active');
};

window.closeClientModal = function() {
  const modal = document.getElementById('modalClient');
  if (modal) modal.classList.remove('active');
};

window.editClient = function(id) {
  const cli = allClients.find(c => c.id === id);
  if (cli) openClientModal(cli);
};

window.deleteClient = async function(id) {
  if (!confirm('Deseja realmente remover este bar da base de clientes?')) return;
  try {
    const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await fetchClients();
    }
  } catch (err) {
    console.error('Erro ao deletar cliente:', err);
  }
};

// Autopreenchimento Inteligente por CNPJ ou Nome do Bar
async function handleClientAutoLookup() {
  const input = document.getElementById('clientLookupInput');
  if (!input || !input.value.trim()) return;

  const query = input.value.trim();
  const cleanNumbers = query.replace(/\D/g, '');

  if (cleanNumbers.length === 14) {
    // Busca por CNPJ
    try {
      input.disabled = true;
      const res = await fetch(`/api/lookup/cnpj/${cleanNumbers}`);
      const json = await res.json();
      input.disabled = false;

      if (json.success && json.data) {
        const d = json.data;
        document.getElementById('clientName').value = d.name || d.corporateName || '';
        document.getElementById('clientOwner').value = d.owner || 'Responsável Comercial';
        document.getElementById('clientPhone').value = d.phone || '';
        document.getElementById('clientAddress').value = d.address || '';
        document.getElementById('clientNeighborhood').value = d.neighborhood || '';
        document.getElementById('clientCnpj').value = d.cnpj || cleanNumbers;
        
        // Efeito visual de preenchimento
        highlightFilledFields();
      } else {
        alert(json.message || 'CNPJ não encontrado.');
      }
    } catch (err) {
      input.disabled = false;
      console.error(err);
      alert('Erro ao consultar CNPJ.');
    }
  } else {
    // Busca por Nome do Bar
    try {
      input.disabled = true;
      const res = await fetch(`/api/lookup/bar?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      input.disabled = false;

      if (json.success && json.data && json.data.length > 0) {
        const d = json.data[0];
        document.getElementById('clientName').value = d.name || '';
        document.getElementById('clientOwner').value = d.owner || 'Proprietário';
        document.getElementById('clientPhone').value = d.phone || d.whatsapp || '';
        document.getElementById('clientAddress').value = d.address || '';
        document.getElementById('clientNeighborhood').value = d.neighborhood || '';
        
        highlightFilledFields();
      } else {
        alert(`Nenhum estabelecimento encontrado com o termo "${query}".`);
      }
    } catch (err) {
      input.disabled = false;
      console.error(err);
    }
  }
}

async function handleClientAutocomplete() {
  const input = document.getElementById('clientLookupInput');
  const suggestionsBox = document.getElementById('clientLookupSuggestions');
  if (!input || !suggestionsBox) return;

  const query = input.value.trim();
  if (query.length < 2) {
    suggestionsBox.style.display = 'none';
    return;
  }

  const cleanNumbers = query.replace(/\D/g, '');
  if (cleanNumbers.length === 14) {
    suggestionsBox.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`/api/lookup/bar?q=${encodeURIComponent(query)}`);
    const json = await res.json();

    if (json.success && json.data && json.data.length > 0) {
      suggestionsBox.innerHTML = json.data.map((item, idx) => `
        <div style="padding:0.5rem 0.85rem; border-bottom:1px solid var(--erp-border-light); cursor:pointer; font-size:0.8rem; color:#fff; display:flex; justify-content:space-between; align-items:center;" onmouseover="this.style.background='#0B1120'" onmouseout="this.style.background='transparent'" onclick="selectClientSuggestion(${idx})">
          <div>
            <strong style="color:#38BDF8;">${item.name}</strong>
            <div style="font-size:0.72rem; color:var(--text-muted);">${item.address || ''} (${item.neighborhood || ''})</div>
          </div>
          <span style="font-size:0.75rem; color:#22C55E;">${item.phone || ''}</span>
        </div>
      `).join('');
      suggestionsBox.style.display = 'block';
      window.cachedClientSuggestions = json.data;
    } else {
      suggestionsBox.style.display = 'none';
    }
  } catch (err) {
    suggestionsBox.style.display = 'none';
  }
}

window.selectClientSuggestion = function(idx) {
  const suggestionsBox = document.getElementById('clientLookupSuggestions');
  if (window.cachedClientSuggestions && window.cachedClientSuggestions[idx]) {
    const d = window.cachedClientSuggestions[idx];
    document.getElementById('clientName').value = d.name || '';
    document.getElementById('clientOwner').value = d.owner || 'Proprietário';
    document.getElementById('clientPhone').value = d.phone || d.whatsapp || '';
    document.getElementById('clientAddress').value = d.address || '';
    document.getElementById('clientNeighborhood').value = d.neighborhood || '';
    highlightFilledFields();
  }
  if (suggestionsBox) suggestionsBox.style.display = 'none';
};

function highlightFilledFields() {
  ['clientName', 'clientOwner', 'clientPhone', 'clientAddress', 'clientNeighborhood'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.borderColor = '#22C55E';
      setTimeout(() => { el.style.borderColor = ''; }, 2000);
    }
  });
}

async function handleSaveClientInternal() {
  const id = document.getElementById('editClientId').value;
  const name = document.getElementById('clientName').value.trim();
  const owner = document.getElementById('clientOwner').value.trim();
  const phone = document.getElementById('clientPhone').value.trim();
  const address = document.getElementById('clientAddress').value.trim();
  const neighborhood = document.getElementById('clientNeighborhood').value.trim();
  const cnpj = document.getElementById('clientCnpj').value.trim();

  if (!name || !owner || !phone || !address) {
    alert('Por favor, preencha os campos obrigatórios (Nome, Responsável, Telefone e Endereço).');
    return null;
  }

  const payload = {
    id: id || undefined,
    name,
    owner,
    phone,
    whatsapp: phone.replace(/\D/g, ''),
    address,
    neighborhood,
    cnpj,
    segment: 'Bar & Choperia',
    source: 'Cadastro Direto ERP',
    crmStatus: 'cliente'
  };

  try {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      await fetchClients();
      await fetchDashboardStats();
      return data.data;
    }
  } catch (err) {
    console.error('Erro ao salvar cliente:', err);
  }
  return null;
}

async function handleSaveClient(e) {
  e.preventDefault();
  const saved = await handleSaveClientInternal();
  if (saved) {
    closeClientModal();
  }
}

// ==========================================
// 5. MODAL DE PEDIDO RÁPIDO & CONFIRMAÇÃO WHATSAPP
// ==========================================
window.openQuickClientOrderModalById = function(clientId) {
  const client = allClients.find(c => c.id === clientId);
  if (client) openQuickClientOrderModal(client);
};

window.openQuickClientOrderModal = function(client) {
  selectedClientForQuickOrder = client;

  const modal = document.getElementById('modalQuickClientOrder');
  if (!modal) return;

  // Preencher dados do cabeçalho do cliente
  const nameEl = document.getElementById('qoClientName');
  const phoneEl = document.getElementById('qoClientPhone');
  const ownerEl = document.getElementById('qoClientOwner');
  const addrEl = document.getElementById('qoClientAddress');

  if (nameEl) nameEl.innerText = client.name || 'Bar / Ponto de Venda';
  if (phoneEl) phoneEl.innerText = client.phone || client.whatsapp || 'Telefone não informado';
  if (ownerEl) ownerEl.innerText = client.owner || 'Responsável';
  if (addrEl) addrEl.innerText = client.address || 'Rio de Janeiro - RJ';

  // Data de entrega padrão: amanhã
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const deliveryDateInput = document.getElementById('qoDeliveryDate');
  if (deliveryDateInput) {
    deliveryDateInput.value = tomorrow.toISOString().split('T')[0];
  }

  // Preencher seletor de produtos com os barris do catálogo
  const prodSelect = document.getElementById('qoProductSelect');
  if (prodSelect) {
    prodSelect.innerHTML = allProducts.map(p => `
      <option value="${p.id}" data-price="${p.price}" data-name="${p.description || p.name}">
        ${p.description || p.name} — R$ ${Number(p.price).toFixed(2).replace('.', ',')} (Estoque: ${p.stock || 50})
      </option>
    `).join('');
  }

  recalculateQuickOrderTotal();
  modal.classList.add('active');
};

window.closeQuickClientOrderModal = function() {
  const modal = document.getElementById('modalQuickClientOrder');
  if (modal) modal.classList.remove('active');
};

function recalculateQuickOrderTotal() {
  const prodSelect = document.getElementById('qoProductSelect');
  const qtyInput = document.getElementById('qoQuantity');
  const totalDisplay = document.getElementById('doCalculatedTotal') || document.getElementById('qoTotalDisplay');
  const summaryDisplay = document.getElementById('qoUnitSummary');

  if (!prodSelect || !qtyInput) return;

  const selectedOpt = prodSelect.options[prodSelect.selectedIndex];
  const price = selectedOpt ? parseFloat(selectedOpt.getAttribute('data-price') || '479') : 479;
  const qty = parseInt(qtyInput.value, 10) || 1;
  const total = price * qty;

  if (totalDisplay) {
    totalDisplay.innerText = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (summaryDisplay) {
    summaryDisplay.innerText = `${qty} barris de 50L selecionados`;
  }
}

async function handleSaveQuickOrder(e) {
  if (e) e.preventDefault();
  if (!selectedClientForQuickOrder) return;

  const prodSelect = document.getElementById('qoProductSelect');
  const qtyInput = document.getElementById('qoQuantity');
  const deliveryDateInput = document.getElementById('qoDeliveryDate');
  const paymentMethodSelect = document.getElementById('qoPaymentMethod');

  const selectedOpt = prodSelect.options[prodSelect.selectedIndex];
  const prodId = prodSelect.value;
  const prodName = selectedOpt ? selectedOpt.getAttribute('data-name') : 'Barril de Chopp Puro Malte 50L';
  const prodPrice = selectedOpt ? parseFloat(selectedOpt.getAttribute('data-price')) : 479;
  const qty = parseInt(qtyInput.value, 10) || 1;
  const total = prodPrice * qty;
  const deliveryDate = deliveryDateInput.value;
  const paymentMethod = paymentMethodSelect.value;

  const orderPayload = {
    customerName: selectedClientForQuickOrder.name,
    customerOwner: selectedClientForQuickOrder.owner || '',
    customerPhone: selectedClientForQuickOrder.phone || selectedClientForQuickOrder.whatsapp || '',
    deliveryAddress: selectedClientForQuickOrder.address || '',
    deliveryDate: deliveryDate,
    deliveryTime: 'Manhã (09h às 12h)',
    items: [
      {
        id: prodId,
        name: prodName,
        price: prodPrice,
        quantity: qty
      }
    ],
    subtotal: total,
    deliveryFee: 0,
    totalAmount: total,
    paymentMethod: paymentMethod.includes('PIX') ? 'pix' : (paymentMethod.includes('Boleto') ? 'boleto' : 'credit_card'),
    notes: `Pedido lançado via ERP. Condição: ${paymentMethod}`
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    const data = await res.json();
    if (data.success) {
      alert(`✅ Pedido ${data.data.orderNumber} gravado com sucesso no ERP!`);
      await fetchOrders();
      await fetchClients();
      await fetchDashboardStats();
      closeQuickClientOrderModal();
    } else {
      alert(data.message || 'Erro ao gravar pedido.');
    }
  } catch (err) {
    console.error('Erro ao gravar pedido:', err);
  }
}

function handleSendWhatsAppOrderConfirmation() {
  if (!selectedClientForQuickOrder) return;

  const prodSelect = document.getElementById('qoProductSelect');
  const qtyInput = document.getElementById('qoQuantity');
  const deliveryDateInput = document.getElementById('qoDeliveryDate');
  const paymentMethodSelect = document.getElementById('qoPaymentMethod');

  const selectedOpt = prodSelect.options[prodSelect.selectedIndex];
  const prodName = selectedOpt ? selectedOpt.getAttribute('data-name') : 'Barril de Chopp Puro Malte 50 Litros';
  const prodPrice = selectedOpt ? parseFloat(selectedOpt.getAttribute('data-price')) : 479;
  const qty = parseInt(qtyInput.value, 10) || 1;
  const total = (prodPrice * qty).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const deliveryDate = deliveryDateInput.value ? deliveryDateInput.value.split('-').reverse().join('/') : 'Amanhã';
  const paymentMethod = paymentMethodSelect.value;

  const rawPhone = (selectedClientForQuickOrder.whatsapp || selectedClientForQuickOrder.phone || '').replace(/\D/g, '');
  if (!rawPhone) {
    alert('Telefone/WhatsApp do cliente não informado.');
    return;
  }

  const message = 
`🍺 *PEDIDO DE VENDA CONFIRMADO — PKCHOPP DISTRIBUIDORA* 🍺

📍 *Cliente:* ${selectedClientForQuickOrder.name}
👤 *Responsável:* ${selectedClientForQuickOrder.owner || 'Responsável'}
📅 *Data de Entrega Prevista:* ${deliveryDate}
🚚 *Endereço de Entrega:* ${selectedClientForQuickOrder.address}

📦 *Itens do Pedido:*
• ${qty}x ${prodName} — R$ ${prodPrice.toFixed(2).replace('.', ',')} un.

💰 *VALOR TOTAL DO PEDIDO:* R$ ${total}
💳 *Condição de Pagamento:* ${paymentMethod}

✅ *Status:* Pedido gravado em nosso Centro de Distribuição e rota programada com prioridade de entrega expressa!

Qualquer ajuste, estamos à disposição no WhatsApp.`;

  const waUrl = `https://wa.me/55${rawPhone}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
}

// ==========================================
// 6. PARÂMETROS & GATEWAY PIX
// ==========================================
async function fetchSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success) {
      appSettings = data.data;
      const compEl = document.getElementById('setCompanyName');
      const waEl = document.getElementById('setWhatsappNumber');
      const pixKeyEl = document.getElementById('setPixKey');
      const pixBenEl = document.getElementById('setPixBeneficiary');
      const pixCityEl = document.getElementById('setPixCity');
      const addrEl = document.getElementById('setAddress');
      const msgEl = document.getElementById('setLeadWelcomeMsg');

      if (compEl) compEl.value = appSettings.companyName || '';
      if (waEl) waEl.value = appSettings.whatsappNumber || '';
      if (pixKeyEl) pixKeyEl.value = appSettings.pixKey || '';
      if (pixBenEl) pixBenEl.value = appSettings.pixBeneficiary || '';
      if (pixCityEl) pixCityEl.value = appSettings.pixCity || '';
      if (addrEl) addrEl.value = appSettings.address || '';
      if (msgEl) msgEl.value = appSettings.leadWelcomeMsg || '';
    }
  } catch (err) {
    console.error('Erro ao buscar configurações:', err);
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const payload = {
    companyName: document.getElementById('setCompanyName').value,
    whatsappNumber: document.getElementById('setWhatsappNumber').value,
    pixKey: document.getElementById('setPixKey').value,
    pixBeneficiary: document.getElementById('setPixBeneficiary').value,
    pixCity: document.getElementById('setPixCity').value,
    address: document.getElementById('setAddress').value,
    leadWelcomeMsg: document.getElementById('setLeadWelcomeMsg').value
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('Configurações e Parâmetros PIX salvos com sucesso!');
    }
  } catch (err) {
    console.error('Erro ao salvar settings:', err);
  }
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
