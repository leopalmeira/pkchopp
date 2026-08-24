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

  // Botão da Barra Flutuante Mobile
  const btnFloating = document.getElementById('btnOpenCartFloating');
  if (btnFloating) btnFloating.addEventListener('click', openCart);

  // Filtros de Categoria (Todos, 50L)
  document.querySelectorAll('.filter-btn, .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn, .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category || 'all';
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

  // Máscara de Telefone / WhatsApp Comercial
  const phoneInput = document.getElementById('customerPhone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.length > 11) v = v.substring(0, 11);
      if (v.length > 6) {
        e.target.value = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
      } else if (v.length > 2) {
        e.target.value = `(${v.substring(0, 2)}) ${v.substring(2)}`;
      } else if (v.length > 0) {
        e.target.value = `(${v}`;
      } else {
        e.target.value = '';
      }
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
          btnCopyPix.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar Código Pix';
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
    const litersVal = prod.liters || 50;

    return `
      <div class="product-showcase-card">
        <div class="product-gallery-side">
          <span class="badge-top-left"><i class="fa-solid fa-truck-fast"></i> Pronta Entrega RJ</span>
          <img src="${prod.image || '/images/barril-brahma.jpg'}" alt="${prod.name}" loading="lazy" onerror="this.src='/images/barril-brahma.jpg'">
        </div>

        <div class="product-info-side">
          <div>
            <div class="product-specs-chips">
              <span class="spec-chip liters"><i class="fa-solid fa-beer-mug-empty"></i> ${litersVal} Litros</span>
              <span class="spec-chip"><i class="fa-solid fa-shield-halved"></i> Válvula Tipo S</span>
              <span class="spec-chip"><i class="fa-solid fa-circle-check"></i> Inox Pressurizado</span>
              ${(prod.tags || []).filter(t => !t.includes('Litros') && !t.includes('Pronta Entrega')).map(tag => `<span class="spec-chip">${tag}</span>`).join('')}
            </div>

            <h2 class="product-title">${prod.name}</h2>
            <p class="product-description-text">${prod.description || 'Chopp Brahma é uma bebida leve e não pasteurizada, do estilo American Lager, com teor alcoólico de 4,8%. Ele destaca-se pelo frescor, coloração amarelo-palha, colarinho denso e cremoso, além de notas suaves de malte e lúpulo no paladar'}</p>
          </div>

          <div>
            <div class="price-showcase-box">
              <div class="price-meta">
                <span>Preço por Barril</span>
                <strong>R$ ${price.toFixed(2).replace('.', ',')}</strong>
              </div>
              <div class="price-sub-info">
                <span><i class="fa-brands fa-pix"></i> PIX na Tela ou Cartão</span>
                <small>Pagamento Seguro na Entrega</small>
              </div>
            </div>

            <div class="purchase-controls-row">
              <div class="qty-selection-group">
                <span class="qty-label-text">Quantidade:</span>
                <div class="qty-stepper-touch">
                  <button type="button" class="qty-btn-touch" onclick="changeCardQty('${prod.id}', -1)">-</button>
                  <input type="text" id="qty-${prod.id}" class="qty-number-input" value="1" readonly>
                  <button type="button" class="qty-btn-touch" onclick="changeCardQty('${prod.id}', 1)">+</button>
                </div>
              </div>

              <div class="action-buttons-group">
                <button type="button" class="btn-buy-now" onclick="buyNow('${prod.id}')">
                  <i class="fa-solid fa-bolt"></i> Comprar Agora
                </button>
                <button type="button" class="btn-add-cart-secondary" onclick="addToCart('${prod.id}')">
                  <i class="fa-solid fa-cart-plus"></i> Adicionar ao Carrinho
                </button>
              </div>
            </div>
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
window.addToCart = function(prodId, shouldOpenDrawer = true) {
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
      liters: product.liters || 50,
      price: finalPrice,
      image: product.image,
      quantity: quantity
    });
  }

  saveCart();
  updateCartUI();
  if (shouldOpenDrawer) openCart();

  if (qtyInput) qtyInput.value = 1;
};

// Compra Direta (Comprar Agora)
window.buyNow = function(prodId) {
  addToCart(prodId, false);
  openCheckout();
};

function saveCart() {
  localStorage.setItem('pkchopp_cart', JSON.stringify(cartState));
}

// Atualizar UI do Carrinho & Barra Flutuante Mobile
function updateCartUI() {
  const totalKegs = cartState.reduce((sum, it) => sum + it.quantity, 0);
  const subtotal = cartState.reduce((sum, it) => sum + (it.price * it.quantity), 0);

  if (cartCountBadge) cartCountBadge.innerText = totalKegs;

  const floatingBar = document.getElementById('mobileFloatingBar');
  const floatingCountText = document.getElementById('floatingCountText');
  const floatingTotalText = document.getElementById('floatingTotalText');

  if (cartState.length === 0) {
    if (floatingBar) floatingBar.classList.remove('visible');

    if (cartItemsList) {
      cartItemsList.innerHTML = `
        <div style="text-align:center; padding: 3rem 1rem; color: var(--text-muted);">
          <i class="fa-solid fa-beer-mug-empty fa-3x" style="color: var(--gold-primary); opacity: 0.4; margin-bottom: 0.85rem;"></i>
          <h4 style="color:#fff; font-size:1.05rem; font-weight:800;">Nenhum barril adicionado</h4>
          <p style="font-size:0.8rem; margin-top:0.35rem;">Selecione os barris de chopp desejados para continuar.</p>
        </div>
      `;
    }
    if (cartDrawerFooter) cartDrawerFooter.style.display = 'none';
    return;
  }

  if (floatingBar) {
    floatingBar.classList.add('visible');
    if (floatingCountText) {
      floatingCountText.innerText = `${totalKegs} ${totalKegs === 1 ? 'barril no pedido' : 'barris no pedido'}`;
    }
    if (floatingTotalText) {
      floatingTotalText.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    }
  }

  if (cartDrawerFooter) cartDrawerFooter.style.display = 'block';

  if (cartItemsList) {
    cartItemsList.innerHTML = cartState.map((item, index) => {
      const itemTotal = item.price * item.quantity;

      return `
        <div class="cart-item-card">
          <img src="${item.image || '/images/barril-brahma.jpg'}" class="cart-item-img" alt="${item.name}" onerror="this.src='/images/barril-brahma.jpg'">
          <div class="cart-item-details">
            <div class="cart-item-title">${item.name}</div>
            <div class="cart-item-unit">${item.unit || 'Barril 50L'}</div>
            <div class="cart-item-bottom">
              <span style="font-weight:900; color:#fff; font-size:0.88rem;">R$ ${itemTotal.toFixed(2).replace('.', ',')}</span>
              <div class="stepper-control" style="transform: scale(0.85); transform-origin: right center;">
                <button type="button" class="stepper-btn" onclick="updateCartItemQty(${index}, -1)">-</button>
                <input type="text" class="stepper-input" value="${item.quantity}" readonly>
                <button type="button" class="stepper-btn" onclick="updateCartItemQty(${index}, 1)">+</button>
              </div>
              <button class="btn-remove-item" onclick="removeCartItem(${index})" title="Remover barril">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
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
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Confirmar e Enviar Pedido';
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
  if (waBtn) waBtn.href = `https://api.whatsapp.com/send?phone=5521970563826&text=${message}`;

  if (successModal) successModal.classList.add('active');
}
