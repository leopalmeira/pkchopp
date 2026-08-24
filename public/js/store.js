// Estado Global da Loja
let productsState = [];
let cartState = JSON.parse(localStorage.getItem('pkchopp_cart') || '[]');
let currentCategory = 'all';
let selectedPaymentMethod = 'pix';

// Elementos DOM
const productsGrid = document.getElementById('productsGrid');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const openCartBtn = document.getElementById('openCartBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartCountBadge = document.getElementById('cartCountBadge');
const cartItemsList = document.getElementById('cartItemsList');
const cartDrawerFooter = document.getElementById('cartDrawerFooter');
const cartSubtotalValue = document.getElementById('cartSubtotalValue');
const cartTotalValue = document.getElementById('cartTotalValue');
const btnOpenCheckoutModal = document.getElementById('btnOpenCheckoutModal');

const checkoutModal = document.getElementById('checkoutModal');
const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
const checkoutForm = document.getElementById('checkoutForm');
const checkoutFinalTotal = document.getElementById('checkoutFinalTotal');
const cashChangeField = document.getElementById('cashChangeField');

const successModal = document.getElementById('successModal');
const closeSuccessBtn = document.getElementById('closeSuccessBtn');
const btnFinishOrder = document.getElementById('btnFinishOrder');
const btnCopyPix = document.getElementById('btnCopyPix');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  setupEventListeners();
  updateCartUI();

  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('deliveryDate');
  if (dateInput) {
    dateInput.min = today;
    dateInput.value = today;
  }
});

// Event Listeners
function setupEventListeners() {
  if (openCartBtn) openCartBtn.addEventListener('click', openCart);
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  // Tabs de Categoria (Todos, 50L, 30L)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      renderProducts();
    });
  });

  // Busca na Loja
  const searchInput = document.getElementById('storeSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      renderProducts(term);
    });
  }

  // Abertura do Checkout
  if (btnOpenCheckoutModal) {
    btnOpenCheckoutModal.addEventListener('click', () => {
      closeCart();
      openCheckout();
    });
  }

  if (closeCheckoutBtn) closeCheckoutBtn.addEventListener('click', closeCheckout);

  // Seleção de Pagamento
  document.querySelectorAll('.pay-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.pay-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedPaymentMethod = opt.dataset.method;

      if (cashChangeField) {
        if (selectedPaymentMethod === 'cash') {
          cashChangeField.style.display = 'block';
        } else {
          cashChangeField.style.display = 'none';
        }
      }
    });
  });

  // Envio do Pedido
  if (checkoutForm) checkoutForm.addEventListener('submit', handleOrderSubmit);

  // Modal de Sucesso / PIX
  if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', () => successModal.classList.remove('active'));
  if (btnFinishOrder) {
    btnFinishOrder.addEventListener('click', () => {
      successModal.classList.remove('active');
      cartState = [];
      saveCart();
      updateCartUI();
      window.location.reload();
    });
  }

  // Copiar PIX
  if (btnCopyPix) {
    btnCopyPix.addEventListener('click', () => {
      const pixText = document.getElementById('pixPayloadText').innerText;
      navigator.clipboard.writeText(pixText).then(() => {
        btnCopyPix.innerHTML = '<i class="fa-solid fa-check"></i> Código Pix Copiado!';
        setTimeout(() => {
          btnCopyPix.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar Código Pix Copia e Cola';
        }, 3000);
      });
    });
  }
}

// Buscar Produtos da API
async function fetchProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.success) {
      productsState = data.data;
      renderProducts();
    }
  } catch (err) {
    console.error('Erro ao buscar produtos:', err);
  }
}

// Renderizar Catálogo de Barris
function renderProducts(searchTerm = '') {
  if (!productsGrid) return;
  let filtered = productsState.filter(p => p.active !== false);

  if (currentCategory === '50l') {
    filtered = filtered.filter(p => p.liters === 50 || (p.unit && p.unit.includes('50')));
  }

  if (searchTerm) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchTerm) || 
      (p.description && p.description.toLowerCase().includes(searchTerm)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(searchTerm)))
    );
  }

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div style="text-align:center; grid-column: 1/-1; padding: 4rem 1rem; color: var(--text-slate-400);">
        <i class="fa-solid fa-beer-mug-empty fa-3x" style="margin-bottom: 1rem; opacity: 0.4; color: var(--bees-yellow);"></i>
        <h3 style="color:#fff;">Nenhum barril encontrado</h3>
        <p>Tente buscar por outro termo ou selecione Todos os Barris.</p>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = filtered.map(prod => {
    const price = prod.promotionalPrice !== null && prod.promotionalPrice !== undefined ? prod.promotionalPrice : prod.price;
    const hasDiscount = prod.promotionalPrice && prod.promotionalPrice < prod.price;
    
    const litersBadge = prod.liters > 0 ? `<span class="tag-chip liters"><i class="fa-solid fa-beer-mug-empty"></i> ${prod.liters} Litros</span>` : '<span class="tag-chip liters"><i class="fa-solid fa-beer-mug-empty"></i> 50 Litros</span>';

    return `
      <div class="product-card">
        <div class="card-img-wrap">
          <span class="badge-atacado"><i class="fa-solid fa-truck-ramp-box"></i> Direto da Fábrica</span>
          <img src="${prod.image || '/images/barril-brahma.jpg'}" alt="${prod.name}" loading="lazy" onerror="this.src='/images/barril-brahma.jpg'">
        </div>
        <div class="card-body">
          <div class="tags-row">
            ${litersBadge}
            <span class="tag-chip"><i class="fa-solid fa-bolt"></i> Válvula S</span>
            ${(prod.tags || []).filter(t => !t.includes('Litros')).map(tag => `<span class="tag-chip">${tag}</span>`).join('')}
          </div>
          
          <h3 class="card-title">${prod.name}</h3>
          <p class="card-desc">${prod.description || ''}</p>
          
          <div class="card-pricing-box">
            <div>
              <div class="price-label">Preço por Barril</div>
              <div class="price-main">R$ ${price.toFixed(2).replace('.', ',')}</div>
            </div>
            <div style="text-align:right;">
              <span style="font-size:0.78rem; color:var(--text-slate-300); font-weight:700;">${prod.unit || 'Barril 50L'}</span>
              ${hasDiscount ? `<div style="font-size:0.8rem; color:var(--text-slate-500); text-decoration:line-through;">R$ ${prod.price.toFixed(2).replace('.', ',')}</div>` : ''}
            </div>
          </div>

          <div class="card-actions-row">
            <div class="qty-control-bees">
              <button type="button" class="qty-btn" onclick="changeCardQty('${prod.id}', -1)">-</button>
              <input type="text" id="qty-${prod.id}" class="qty-input" value="1" readonly>
              <button type="button" class="qty-btn" onclick="changeCardQty('${prod.id}', 1)">+</button>
            </div>
            <button class="btn-add-bees" onclick="addToCart('${prod.id}')">
              <i class="fa-solid fa-cart-plus"></i> Pedir Barril
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Alterar quantidade no card
window.changeCardQty = function(prodId, delta) {
  const input = document.getElementById(`qty-${prodId}`);
  if (input) {
    let current = parseInt(input.value) || 1;
    current = Math.max(1, current + delta);
    input.value = current;
  }
};

// Adicionar ao Carrinho
window.addToCart = function(prodId) {
  const product = productsState.find(p => p.id === prodId);
  if (!product) return;

  const qtyInput = document.getElementById(`qty-${prodId}`);
  const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

  const existing = cartState.find(item => item.id === prodId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    const finalPrice = product.promotionalPrice !== null && product.promotionalPrice !== undefined ? product.promotionalPrice : product.price;
    cartState.push({
      id: product.id,
      name: product.name,
      category: product.category,
      unit: product.unit,
      liters: product.liters || 0,
      price: finalPrice,
      image: product.image,
      quantity: quantity
    });
  }

  saveCart();
  updateCartUI();
  openCart();

  if (qtyInput) qtyInput.value = 1;
};

function saveCart() {
  localStorage.setItem('pkchopp_cart', JSON.stringify(cartState));
}

// Atualizar UI do Carrinho
function updateCartUI() {
  if (!cartCountBadge) return;
  const totalKegs = cartState.reduce((sum, it) => sum + it.quantity, 0);
  cartCountBadge.innerText = totalKegs;

  if (cartState.length === 0) {
    if (cartItemsList) {
      cartItemsList.innerHTML = `
        <div style="text-align:center; padding: 4rem 1rem; color: var(--text-slate-400);">
          <i class="fa-solid fa-beer-mug-empty fa-3x" style="color: var(--bees-yellow); opacity: 0.5; margin-bottom: 1rem;"></i>
          <h4 style="color:#fff; font-size:1.15rem; font-weight:800;">Nenhum barril adicionado ainda</h4>
          <p style="font-size:0.85rem; margin-top:0.4rem;">Selecione os barris de chopp desejados para fechar o pedido.</p>
        </div>
      `;
    }
    if (cartDrawerFooter) cartDrawerFooter.style.display = 'none';
    return;
  }

  if (cartDrawerFooter) cartDrawerFooter.style.display = 'block';

  let subtotal = 0;
  if (cartItemsList) {
    cartItemsList.innerHTML = cartState.map((item, index) => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;

      return `
        <div class="cart-item-row">
          <img src="${item.image}" class="cart-item-img" alt="${item.name}">
          <div class="cart-item-info">
            <div class="cart-item-title">${item.name}</div>
            <div class="cart-item-unit">${item.unit}</div>
            <div class="cart-item-price">R$ ${item.price.toFixed(2).replace('.', ',')} x ${item.quantity} = R$ ${itemTotal.toFixed(2).replace('.', ',')}</div>
          </div>
          <div class="qty-control-bees" style="transform: scale(0.85);">
            <button type="button" class="qty-btn" onclick="updateCartItemQty(${index}, -1)">-</button>
            <input type="text" class="qty-input" value="${item.quantity}" readonly>
            <button type="button" class="qty-btn" onclick="updateCartItemQty(${index}, 1)">+</button>
          </div>
          <button class="cart-item-remove" onclick="removeCartItem(${index})" title="Remover item">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
    }).join('');
  }

  if (cartSubtotalValue) cartSubtotalValue.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  if (cartTotalValue) cartTotalValue.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
}

window.updateCartItemQty = function(index, delta) {
  if (cartState[index]) {
    cartState[index].quantity += delta;
    if (cartState[index].quantity <= 0) {
      cartState.splice(index, 1);
    }
    saveCart();
    updateCartUI();
  }
};

window.removeCartItem = function(index) {
  if (cartState[index]) {
    cartState.splice(index, 1);
    saveCart();
    updateCartUI();
  }
};

function openCart() {
  if (cartDrawer) cartDrawer.classList.add('active');
  if (cartOverlay) cartOverlay.classList.add('active');
}

function closeCart() {
  if (cartDrawer) cartDrawer.classList.remove('active');
  if (cartOverlay) cartOverlay.classList.remove('active');
}

function openCheckout() {
  if (cartState.length === 0) return;
  const subtotal = cartState.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  if (checkoutFinalTotal) checkoutFinalTotal.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  if (checkoutModal) checkoutModal.classList.add('active');
}

function closeCheckout() {
  if (checkoutModal) checkoutModal.classList.remove('active');
}

// Submissão e Gravação do Pedido
async function handleOrderSubmit(e) {
  e.preventDefault();

  if (cartState.length === 0) {
    alert('Selecione pelo menos um barril de chopp antes de fechar o pedido.');
    return;
  }

  const customerName = document.getElementById('customerName').value.trim();
  const customerOwner = document.getElementById('customerOwner').value.trim();
  const customerPhone = document.getElementById('customerPhone').value.trim();
  const deliveryAddress = document.getElementById('deliveryAddress').value.trim();
  const deliveryDate = document.getElementById('deliveryDate').value;
  const deliveryTime = document.getElementById('deliveryTime').value;
  const orderNotes = document.getElementById('orderNotes').value.trim();
  const changeFor = document.getElementById('changeFor') ? document.getElementById('changeFor').value : null;

  const subtotal = cartState.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  const totalAmount = subtotal;

  const orderPayload = {
    customerName,
    customerOwner,
    customerPhone,
    deliveryAddress,
    deliveryDate,
    deliveryTime,
    items: cartState,
    subtotal,
    deliveryFee: 0,
    totalAmount,
    paymentMethod: selectedPaymentMethod,
    changeFor: selectedPaymentMethod === 'cash' && changeFor ? parseFloat(changeFor) : null,
    notes: orderNotes
  };

  const submitBtn = document.getElementById('btnSubmitOrder');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gravando Pedido...';
  }

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    const data = await res.json();
    if (data.success) {
      closeCheckout();
      showSuccessModal(data.data);
    } else {
      alert('Erro ao gravar pedido: ' + (data.message || 'Erro no servidor'));
    }
  } catch (err) {
    console.error('Erro:', err);
    alert('Erro de conexão ao gravar pedido.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Confirmar e Gravar Pedido de Barris';
    }
  }
}

// Exibir Modal de Confirmação
function showSuccessModal(order) {
  document.getElementById('successOrderNumber').innerText = order.orderNumber;
  document.getElementById('successCustomerName').innerText = order.customerName;
  document.getElementById('successCustomerOwner').innerText = order.customerOwner || 'Responsável';
  document.getElementById('successDeliveryAddress').innerText = order.deliveryAddress;
  document.getElementById('successDeliveryDate').innerText = `${order.deliveryDate} (${order.deliveryTime})`;

  const methodNames = {
    pix: 'PIX (Aguardando Pagamento Imediato)',
    credit_card: 'Cartão na Entrega',
    cash: 'Dinheiro no Ato da Entrega'
  };
  document.getElementById('successPaymentStatus').innerText = `${methodNames[order.paymentMethod] || order.paymentMethod} - Total: R$ ${Number(order.totalAmount).toFixed(2).replace('.', ',')}`;

  const pixArea = document.getElementById('pixPaymentArea');

  if (order.paymentMethod === 'pix' && order.pixData) {
    pixArea.style.display = 'block';
    document.getElementById('pixQrCodeImg').src = order.pixData.qrCodeBase64;
    document.getElementById('pixModalAmount').innerText = `R$ ${order.totalAmount.toFixed(2).replace('.', ',')}`;
    document.getElementById('pixPayloadText').innerText = order.pixData.payload;
  } else {
    pixArea.style.display = 'none';
  }

  const itemsText = order.items.map(it => `• ${it.quantity}x ${it.name} (R$ ${(it.price * it.quantity).toFixed(2)})`).join('%0A');
  const message = `🍺 *NOVO PEDIDO DE BARRIS PKCHOPP - ${order.orderNumber}*%0A%0A` +
                  `🏢 *Estabelecimento:* ${encodeURIComponent(order.customerName)}%0A` +
                  `👤 *Responsável:* ${encodeURIComponent(order.customerOwner || 'Não informado')}%0A` +
                  `📱 *WhatsApp:* ${encodeURIComponent(order.customerPhone)}%0A` +
                  `📍 *Endereço:* ${encodeURIComponent(order.deliveryAddress)}%0A` +
                  `📅 *Data de Entrega:* ${order.deliveryDate} - ${encodeURIComponent(order.deliveryTime)}%0A` +
                  `💳 *Forma de Pagamento:* ${encodeURIComponent(methodNames[order.paymentMethod])}%0A` +
                  `💰 *Valor Total:* R$ ${Number(order.totalAmount).toFixed(2)}%0A%0A` +
                  `📦 *Barris:*%0A${itemsText}%0A%0A` +
                  (order.notes ? `📝 *Observações:* ${encodeURIComponent(order.notes)}%0A%0A` : '') +
                  `_Pedido gravado via Plataforma PKCHOPP_`;

  const waBtn = document.getElementById('btnWhatsAppNotify');
  if (waBtn) waBtn.href = `https://api.whatsapp.com/send?phone=5521999998888&text=${message}`;

  if (successModal) successModal.classList.add('active');
}
