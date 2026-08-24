/**
 * PKCHOPP ERP - RADAR DE PROSPECÇÃO B2B & INTELIGÊNCIA COMERCIAL
 * - Motor GIS Interativo com Zoom Livre Direto (Sem necessidade de Segurar Ctrl)
 * - Busca Dinâmica por Movimentação/Arraste do Mapa em Tempo Real
 * - Busca Precisa por Nome do Bar, Endereço e CNPJ
 * - Ficha Cadastral 100% Editável (Nome, Telefone, Contato, Endereço, Giro, Classificação)
 * - Classificação HOT / WARM / COLD / CLIENTE PKCHOPP (Ativo apenas quando cliente)
 * - Nome do Contato exibido no Card próximo ao Telefone
 * - Emissão direta de Pedidos de Venda (PV)
 */

let allCurrentLeads = [];
let allDatabaseLeads = [];
let leafletMap = null;
let markersLayer = null;

let activeFilters = {
  search: '',
  neighborhood: 'all',
  radius: '10 km',
  classification: 'all',
  crmStatus: 'all',
  hasWhatsapp: false,
  hasInstagram: false,
  hasChopp: false,
  bestOpportunities: false
};
let selectedLeadForDossier = null;

// Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  initInteractiveMap();
  initRadarEvents();
  loadRadarStats();
  loadAllDatabaseLeads();
});

// ==========================================
// 1. INICIALIZAÇÃO DO MAPA INTERATIVO LEAFLET
// ==========================================
function initInteractiveMap() {
  const mapContainer = document.getElementById('interactiveMap');
  if (!mapContainer || leafletMap) return;

  // Centro padrão: Rio de Janeiro
  leafletMap = L.map('interactiveMap', {
    center: [-22.8730, -43.3380],
    zoom: 13,
    scrollWheelZoom: true, // ZOOM DIRETO COM SCROLL DO MOUSE (SEM PRECISAR DE CTRL)
    zoomControl: true,
    doubleClickZoom: true,
    touchZoom: true
  });

  // Camada oficial de Tiles do Google Maps
  L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: 'Google Maps'
  }).addTo(leafletMap);

  markersLayer = L.layerGroup().addTo(leafletMap);

  // Evento ao movimentar ou dar zoom no mapa: busca dinâmica de choperias e bares na área visível
  leafletMap.on('moveend', () => {
    handleMapMoved();
  });
}

// Quando o mapa é movido ou dado zoom, listar todos os bares dentro do enquadramento atual
function handleMapMoved() {
  if (!leafletMap || allDatabaseLeads.length === 0) return;

  const bounds = leafletMap.getBounds();
  
  // Filtrar apenas estabelecimentos reais dentro da área visível do mapa
  let visibleLeads = allDatabaseLeads.filter(lead => {
    if (lead.lat && lead.lng) {
      return bounds.contains([lead.lat, lead.lng]);
    }
    return false;
  });

  // Aplicar filtros ativos adicionais se existirem
  if (activeFilters.classification && activeFilters.classification !== 'all') {
    visibleLeads = visibleLeads.filter(l => l.classification === activeFilters.classification);
  }
  if (activeFilters.hasWhatsapp) {
    visibleLeads = visibleLeads.filter(l => l.whatsappStatus === 'SIM');
  }

  // Se houver busca de texto ativa, priorizar matches
  if (activeFilters.search) {
    const q = activeFilters.search.toLowerCase();
    const matches = visibleLeads.filter(l => (l.name && l.name.toLowerCase().includes(q)) || (l.address && l.address.toLowerCase().includes(q)));
    if (matches.length > 0) visibleLeads = matches;
  }

  allCurrentLeads = visibleLeads;
  setElementText('leadsCountBadge', `${allCurrentLeads.length} estabelecimentos na área`);
  
  renderMapMarkers(allCurrentLeads);
  renderLeadsCards(allCurrentLeads);
}

// Renderizar Pins de Chopp Interativos no Mapa
function renderMapMarkers(leads) {
  if (!markersLayer) return;
  markersLayer.clearLayers();

  leads.forEach(lead => {
    if (!lead.lat || !lead.lng) return;

    const isClient = lead.classification === 'CLIENTE_PKCHOPP' || lead.isClient === true;
    const isHot = lead.classification === 'HOT';
    const pinBg = isClient ? '#22C55E' : (isHot ? '#DC2626' : '#0284C7');

    const customIcon = L.divIcon({
      className: 'custom-beer-map-pin',
      html: `
        <div style="background: ${pinBg}; color: #fff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.7); font-size: 1rem; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'">
          🍺
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const marker = L.marker([lead.lat, lead.lng], { icon: customIcon });

    marker.on('click', () => {
      focusOnMapInsidePanel(lead.id);
    });

    markersLayer.addLayer(marker);
  });
}

// ==========================================
// 2. BUSCA POR NOME DO BAR, CNPJ E EVENTOS
// ==========================================
function initRadarEvents() {
  const searchInput = document.getElementById('radarSearchQuery');
  const neighborhoodSelect = document.getElementById('radarFilterNeighborhood');
  const classSelect = document.getElementById('radarFilterClassification');
  const btnFilter = document.getElementById('btnTriggerQuickSearch');

  const executeSearch = async (queryVal) => {
    const q = (queryVal || '').trim();
    activeFilters.search = q;

    const cleanCnpj = q.replace(/\D/g, '');

    if (cleanCnpj.length === 14) {
      // BUSCA POR CNPJ
      await searchByCnpj(cleanCnpj);
    } else if (q.length > 0) {
      // BUSCA POR NOME DO BAR OU ENDEREÇO
      await searchByBarNameOrAddress(q);
    } else {
      // RESET
      if (neighborhoodSelect) neighborhoodSelect.value = 'all';
      activeFilters.neighborhood = 'all';
      if (leafletMap) {
        leafletMap.setView([-22.8730, -43.3380], 12);
      }
      fetchRadarLeads();
    }
  };

  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      const val = searchInput.value.trim();
      if (val.length >= 3 || val.replace(/\D/g, '').length === 14) {
        executeSearch(val);
      } else if (val.length === 0) {
        executeSearch('');
      }
    }, 450));

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeSearch(searchInput.value);
      }
    });
  }

  if (btnFilter) {
    btnFilter.addEventListener('click', () => {
      const searchVal = searchInput ? searchInput.value.trim() : '';
      if (searchVal.length > 0 && searchVal.replace(/\D/g, '').length !== 14) {
        executeSearch(searchVal);
      } else {
        filterAreaAllBarsAndRestaurants();
      }
    });
  }

  if (neighborhoodSelect) {
    neighborhoodSelect.addEventListener('change', () => {
      activeFilters.neighborhood = neighborhoodSelect.value;
      flyToNeighborhood(neighborhoodSelect.value);
    });
  }

  if (classSelect) {
    classSelect.addEventListener('change', () => {
      activeFilters.classification = classSelect.value;
      handleMapMoved();
    });
  }

  // Botão Rastrear Novos Locais no Google Maps (Motor OmkarCloud Scraper)
  const btnRastrear = document.getElementById('btnOpenProspectingModal2');
  if (btnRastrear) {
    btnRastrear.addEventListener('click', triggerLiveScraping);
  }

  // Submit da Ficha 100% Editável
  const formDossier = document.getElementById('formLeadDossier');
  if (formDossier) {
    formDossier.addEventListener('submit', saveDossierChanges);
  }

  const btnConvertClient = document.getElementById('btnDossierConvertClient');
  if (btnConvertClient) btnConvertClient.addEventListener('click', convertCurrentLeadToClient);

  const btnEmitOrder = document.getElementById('btnDossierEmitOrder');
  if (btnEmitOrder) btnEmitOrder.addEventListener('click', emitOrderFromDossier);

  // Exportar CSV
  const btnExport = document.getElementById('btnExportLeadsCSV');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const url = `/api/radar/export?neighborhood=${encodeURIComponent(activeFilters.neighborhood)}&classification=${encodeURIComponent(activeFilters.classification)}&crmStatus=${encodeURIComponent(activeFilters.crmStatus)}&hasWhatsapp=${activeFilters.hasWhatsapp}&hasChopp=${activeFilters.hasChopp}`;
      window.open(url, '_blank');
    });
  }
}

// Filtra e Mapeia 100% dos Bares e Restaurantes na área visível da tela
async function filterAreaAllBarsAndRestaurants() {
  if (!leafletMap) return;

  const btn = document.getElementById('btnTriggerQuickSearch');
  if (btn) {
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Filtrando Área...`;
    btn.disabled = true;
  }

  // 1. Filtrar de imediato os locais existentes na área visível
  handleMapMoved();

  const bounds = leafletMap.getBounds();
  const bbox = {
    s: bounds.getSouth(),
    w: bounds.getWest(),
    n: bounds.getNorth(),
    e: bounds.getEast()
  };

  try {
    const res = await fetch('/api/radar/scrape-bbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bbox, limit: 60 })
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      await loadAllDatabaseLeads();
      handleMapMoved();
    }
  } catch (err) {
    console.error('Erro ao mapear estabelecimentos na área:', err);
  } finally {
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Filtrar`;
      btn.disabled = false;
    }
  }
}

// Rastreamento ao vivo de novos estabelecimentos no Google Maps
async function triggerLiveScraping() {
  const searchInput = document.getElementById('radarSearchQuery');
  const neighborhoodSelect = document.getElementById('radarFilterNeighborhood');
  const q = searchInput ? searchInput.value.trim() : '';
  const neighborhood = (neighborhoodSelect && neighborhoodSelect.value !== 'all') ? neighborhoodSelect.value : 'Rio de Janeiro RJ';

  const btn = document.getElementById('btnOpenProspectingModal2');
  if (btn) {
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Rastreando...`;
    btn.disabled = true;
  }

  try {
    const res = await fetch('/api/radar/scrape-live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: q || 'choperias e bares',
        location: neighborhood,
        limit: 25
      })
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      alert(`🛰️ [Radar Hunter Google Maps]: ${json.data.length} novos bares e choperias foram mapeados com sucesso!`);
      await loadAllDatabaseLeads();
      if (json.data[0].lat && json.data[0].lng && leafletMap) {
        leafletMap.flyTo([json.data[0].lat, json.data[0].lng], 15, { duration: 1.2 });
      }
    } else {
      alert('Varredura concluída. Exibindo os locais mapeados na região.');
    }
  } catch (err) {
    console.error(err);
    alert('Erro ao conectar com o motor de rastreamento.');
  } finally {
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-satellite-dish"></i> Rastrear`;
      btn.disabled = false;
    }
  }
}

// Busca por CNPJ
async function searchByCnpj(cleanCnpj) {
  try {
    const res = await fetch(`/api/radar/leads?search=${cleanCnpj}`);
    const json = await res.json();

    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      const lead = json.data[0];
      allCurrentLeads = [lead];
      renderLeadsCards(allCurrentLeads);
      renderMapMarkers(allCurrentLeads);

      if (lead.lat && lead.lng && leafletMap) {
        leafletMap.flyTo([lead.lat, lead.lng], 16, { duration: 1.2 });
      }
      setTimeout(() => focusOnMapInsidePanel(lead.id), 250);
    } else {
      alert('CNPJ não localizado na base pública.');
    }
  } catch (err) {
    console.error('Erro ao consultar CNPJ:', err);
  }
}

// Busca por Nome de Bar ou Endereço
async function searchByBarNameOrAddress(query) {
  const normQ = query.toLowerCase().trim();

  // 1. Procurar na base local
  const matched = allDatabaseLeads.filter(l => 
    (l.name && l.name.toLowerCase().includes(normQ)) ||
    (l.tradingName && l.tradingName.toLowerCase().includes(normQ)) ||
    (l.address && l.address.toLowerCase().includes(normQ)) ||
    (l.neighborhood && l.neighborhood.toLowerCase().includes(normQ))
  );

  if (matched.length > 0) {
    allCurrentLeads = matched;
    renderLeadsCards(allCurrentLeads);
    renderMapMarkers(allCurrentLeads);

    const first = matched[0];
    if (first.lat && first.lng && leafletMap) {
      leafletMap.flyTo([first.lat, first.lng], 16, { duration: 1.2 });
    }
    setTimeout(() => focusOnMapInsidePanel(first.id), 200);
  } else {
    // Buscar via API
    try {
      const res = await fetch(`/api/radar/leads?search=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        allCurrentLeads = json.data;
        renderLeadsCards(allCurrentLeads);
        renderMapMarkers(allCurrentLeads);

        const first = allCurrentLeads[0];
        if (first.lat && first.lng && leafletMap) {
          leafletMap.flyTo([first.lat, first.lng], 16, { duration: 1.2 });
        }
        setTimeout(() => focusOnMapInsidePanel(first.id), 200);
      }
    } catch (err) {
      console.error(err);
    }
  }
}

function flyToNeighborhood(neighborhood) {
  const coordsMap = {
    'all': [-22.8730, -43.3380, 12],
    'Freguesia': [-22.9356, -43.3334, 14],
    'Tijuca': [-22.9248, -43.2325, 14],
    'Barra da Tijuca': [-23.0003, -43.3658, 14],
    'Recreio dos Bandeirantes': [-23.0180, -43.4650, 14],
    'Ilha do Governador': [-22.8055, -43.2088, 14],
    'Madureira': [-22.8730, -43.3380, 14],
    'Bangu': [-22.8750, -43.4650, 14],
    'Campo Grande': [-22.9030, -43.5580, 14],
    'Lapa': [-22.9133, -43.1818, 15]
  };

  const target = coordsMap[neighborhood] || coordsMap['all'];
  if (leafletMap) {
    leafletMap.flyTo([target[0], target[1]], target[2], { duration: 1.2 });
  }
}

// ==========================================
// 3. CONSULTA E CARREGAMENTO DE LEADS
// ==========================================
async function loadAllDatabaseLeads() {
  try {
    const res = await fetch('/api/radar/leads?radius=50km');
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      allDatabaseLeads = json.data;
      allCurrentLeads = json.data;
      setElementText('leadsCountBadge', `${allCurrentLeads.length} estabelecimentos`);
      renderMapMarkers(allCurrentLeads);
      renderLeadsCards(allCurrentLeads);
    }
  } catch (err) {
    console.error('Erro ao carregar banco de dados de leads:', err);
  }
}

async function fetchRadarLeads() {
  await loadAllDatabaseLeads();
}

async function loadRadarStats() {
  try {
    const res = await fetch('/api/radar/stats');
    const json = await res.json();
    if (json.success && json.data) {
      const d = json.data;
      setElementText('radarTotalLeads', d.totalLeads || 0);
      setElementText('radarHotLeads', d.hotCount || 0);
      setElementText('radarWarmLeads', d.warmCount || 0);
      setElementText('radarColdLeads', d.coldCount || 0);
      setElementText('radarWhatsappLeads', d.whatsappCount || 0);
      setElementText('radarChoppLeads', d.choppCount || 0);
      setElementText('radarClientLeads', d.pkchoppClientsCount || 0);
    }
  } catch (err) {
    console.error('Erro ao carregar estatísticas do radar:', err);
  }
}

// ==========================================
// 4. RENDERIZAÇÃO DOS CARDS COMPACTOS B2B
// ==========================================
function renderLeadsCards(leads) {
  const container = document.getElementById('leadsListContainer');
  if (!container) return;

  if (leads.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 2.5rem 1rem; color: var(--text-secondary);">
        <i class="fa-solid fa-map-location-dot" style="font-size:2rem; color:#64748B; margin-bottom:0.75rem;"></i>
        <h4 style="color:#fff; font-size:0.95rem; font-weight:800; margin-bottom:0.3rem;">Nenhum bar nesta área do mapa</h4>
        <p style="font-size:0.78rem;">Mova o mapa para outra região ou digite o nome do bar / CNPJ na barra de busca acima.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = leads.map(lead => {
    const isClient = lead.classification === 'CLIENTE_PKCHOPP' || lead.isClient === true || lead.crmStatus === 'cliente';

    // Badge de Classificação no Topo do Card
    let classBadge = `<span class="lead-class-badge-mini badge-cold">COLD</span>`;
    if (isClient) {
      classBadge = `<span class="lead-class-badge-mini badge-client">🟢 CLIENTE</span>`;
    } else if (lead.classification === 'HOT') {
      classBadge = `<span class="lead-class-badge-mini badge-hot">🔥 HOT</span>`;
    } else if (lead.classification === 'WARM') {
      classBadge = `<span class="lead-class-badge-mini badge-warm">🟠 WARM</span>`;
    }

    const brandChip = (lead.choppBrand && lead.choppBrand !== 'Não identificada') ? `<span class="lead-brand-chip-mini">${lead.choppBrand}</span>` : '';
    const photoUrl = lead.photo || (lead.photos && lead.photos[0]) || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80';

    const rawPhone = (lead.whatsapp || lead.phone || '').replace(/\D/g, '');
    const phoneText = lead.phone || lead.whatsapp || 'Sem telefone';
    const waMsg = encodeURIComponent(lead.whatsappProposalMsg || `Olá! Somos da PKCHOPP Distribuidora de Chopp no atacado. Gostaria de receber nossa tabela de barris?`);
    const waLink = rawPhone ? `https://wa.me/55${rawPhone.replace(/^55/, '')}?text=${waMsg}` : '#';

    // Nome do Contato / Responsável
    const contactName = lead.commercialResponsible || 'Dono / Responsável';

    const weeklyVol = lead.weeklyVolumeEstimated || '6 a 8 barris 50L/sem';
    const monthlyRev = lead.monthlyRevenuePotential ? `R$ ${Math.round(Number(lead.monthlyRevenuePotential) / 1000)}k/mês` : 'R$ 15k/mês';

    return `
      <div class="lead-prospect-card" id="lead-card-${lead.id}">
        
        <!-- CABEÇALHO COMPACTO -->
        <div class="lead-card-header-compact">
          <div class="lead-thumb-wrap">
            <img src="${photoUrl}" alt="${lead.name}" class="lead-main-photo-compact" onclick="focusOnMapInsidePanel('${lead.id}')" title="Clique para focar no mapa">
          </div>

          <div class="lead-info-col">
            <div class="lead-title-row">
              <span class="lead-card-title-compact" title="${lead.name}">${lead.name}</span>
              <div class="lead-badges-inline">
                ${classBadge}
                ${brandChip}
              </div>
            </div>
            
            <div class="lead-meta-line">
              <span class="lead-rating-gold"><i class="fa-solid fa-star"></i> ${lead.rating || '4.8'}</span>
              <span class="lead-address-text" title="${lead.address || ''}">📍 ${lead.address || 'Rio de Janeiro - RJ'}</span>
            </div>
          </div>
        </div>

        <!-- GRID DE DADOS: NOME DO CONTATO + TELEFONE + POTENCIAL -->
        <div class="lead-data-grid-compact">
          <div class="lead-contact-info">
            <div class="lead-contact-person" title="Contato do Estabelecimento">
              <i class="fa-solid fa-user-tie" style="color:#38BDF8;"></i> <strong>${contactName}</strong>
            </div>

            ${rawPhone ? `
              <a href="${waLink}" target="_blank" class="lead-contact-link-wa" title="Enviar mensagem no WhatsApp">
                <i class="fa-brands fa-whatsapp"></i> ${phoneText}
              </a>
            ` : `
              <span style="color:var(--text-secondary);"><i class="fa-solid fa-phone"></i> ${phoneText}</span>
            `}
          </div>

          <div class="lead-potential-info">
            <span style="color:var(--text-secondary); font-size:0.68rem;">Giro: <strong class="lead-vol-tag">${weeklyVol}</strong></span>
            <span style="color:var(--text-secondary); font-size:0.68rem;">Potencial: <strong class="lead-revenue-tag">${monthlyRev}</strong></span>
          </div>
        </div>

        <!-- TOOLBAR DE AÇÕES: SEM INSTAGRAM -->
        <div class="lead-actions-toolbar">
          ${rawPhone ? `
            <a href="${waLink}" target="_blank" class="btn-mini-action btn-mini-wa" title="Abrir WhatsApp Comercial">
              <i class="fa-brands fa-whatsapp"></i> WhatsApp
            </a>
          ` : ''}

          <button type="button" class="btn-mini-action btn-mini-map" onclick="focusOnMapInsidePanel('${lead.id}')" title="Ver no Mapa">
            <i class="fa-solid fa-location-crosshairs"></i> Mapa
          </button>

          <button type="button" class="btn-mini-action btn-mini-dossier" onclick="openLeadDossier('${lead.id}')" title="Editar Ficha Completa">
            <i class="fa-solid fa-file-pen"></i> Ficha
          </button>

          <button type="button" class="btn-mini-action btn-mini-order" onclick="openDirectOrderModalForLead('${lead.id}')" title="Emitir Pedido de Venda">
            <i class="fa-solid fa-file-circle-plus"></i> + Pedido
          </button>

          ${isClient ? `
            <span class="badge-active-client"><i class="fa-solid fa-circle-check"></i> Ativo</span>
          ` : `
            <button type="button" class="btn-mini-action btn-mini-client" onclick="convertLeadDirectly('${lead.id}')" title="Classificar como Cliente">
              <i class="fa-solid fa-user-plus"></i> + Cliente
            </button>
          `}
        </div>

      </div>
    `;
  }).join('');
}

// ==========================================
// 5. CENTRALIZAÇÃO NO MAPA E CARD FLUTUANTE
// ==========================================
function focusOnMapInsidePanel(leadId) {
  const lead = allDatabaseLeads.find(l => l.id === leadId || l.placeId === leadId) || allCurrentLeads.find(l => l.id === leadId || l.placeId === leadId);
  if (!lead) return;

  if (lead.lat && lead.lng && leafletMap) {
    leafletMap.flyTo([lead.lat, lead.lng], 16, { duration: 1 });
  }

  // Exibir inspector flutuante com dados e fotos
  const floatingCard = document.getElementById('mapPlaceFloatingCard');
  if (floatingCard) {
    const thumbEl = document.getElementById('floatingPlaceThumb');
    if (thumbEl) thumbEl.src = lead.photo || (lead.photos && lead.photos[0]) || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80';

    setElementText('floatingPlaceName', lead.name);
    setElementText('floatingPlaceAddress', lead.address || 'Rio de Janeiro - RJ');
    setElementText('floatingPhoneFixo', lead.phone || 'Não informado');
    setElementText('floatingPhoneWa', lead.formattedWhatsapp || lead.whatsapp || 'Não informado');

    const badgeEl = document.getElementById('floatingPlaceVolumeBadge');
    if (badgeEl) {
      badgeEl.textContent = `${lead.classification || 'HOT'} • Score ${lead.score || 90}`;
    }

    // Preencher Galeria
    const galleryEl = document.getElementById('floatingPhotosGallery');
    if (galleryEl) {
      const photos = (lead.photos && lead.photos.length > 0) ? lead.photos : [lead.photo || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80'];
      galleryEl.innerHTML = photos.map(p => `<img src="${p}" class="mini-gallery-photo" onclick="openLeadDossier('${lead.id}')" title="Clique para editar na Ficha">`).join('');
    }

    floatingCard.style.display = 'block';
  }

  // Scroll suave no card lateral
  const cardEl = document.getElementById(`lead-card-${lead.id}`);
  if (cardEl) {
    cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    cardEl.style.borderColor = '#38BDF8';
    setTimeout(() => { cardEl.style.borderColor = ''; }, 2500);
  }
}

function closeFloatingPlaceCard() {
  const floatingCard = document.getElementById('mapPlaceFloatingCard');
  if (floatingCard) floatingCard.style.display = 'none';
}

// ==========================================
// 6. FICHA 100% EDITÁVEL & SALVAR ALTERAÇÕES
// ==========================================
function openLeadDossier(leadId) {
  const lead = allDatabaseLeads.find(l => l.id === leadId || l.placeId === leadId) || allCurrentLeads.find(l => l.id === leadId || l.placeId === leadId);
  if (!lead) return;

  selectedLeadForDossier = lead;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('dossierEditId', lead.id);
  setVal('dossierEditName', lead.name);
  setVal('dossierEditClassification', (lead.classification === 'CLIENTE_PKCHOPP' || lead.isClient) ? 'CLIENTE_PKCHOPP' : (lead.classification || 'HOT'));
  setVal('dossierEditResponsible', lead.commercialResponsible || '');
  setVal('dossierEditPhone', lead.phone || lead.whatsapp || '');
  setVal('dossierEditAddress', lead.address || '');
  setVal('dossierEditNeighborhood', lead.neighborhood || '');
  setVal('dossierEditWeeklyVol', lead.weeklyVolumeEstimated || '');
  setVal('dossierEditMonthlyRev', lead.monthlyRevenuePotential || '');
  setVal('dossierEditBrand', lead.choppBrand || '');
  setVal('dossierEditNotes', lead.observations || '');

  const modal = document.getElementById('modalLeadDossier');
  if (modal) modal.classList.add('active');
}

function closeLeadDossierModal() {
  const modal = document.getElementById('modalLeadDossier');
  if (modal) modal.classList.remove('active');
}

// Salvar todas as alterações da Ficha
async function saveDossierChanges(e) {
  if (e && e.preventDefault) e.preventDefault();

  const id = document.getElementById('dossierEditId').value;
  if (!id) return;

  const classificationVal = document.getElementById('dossierEditClassification').value;
  const isClient = classificationVal === 'CLIENTE_PKCHOPP';

  const updatedData = {
    name: document.getElementById('dossierEditName').value.trim(),
    classification: classificationVal,
    isClient: isClient,
    crmStatus: isClient ? 'cliente' : 'novo',
    commercialResponsible: document.getElementById('dossierEditResponsible').value.trim(),
    phone: document.getElementById('dossierEditPhone').value.trim(),
    whatsapp: document.getElementById('dossierEditPhone').value.trim().replace(/\D/g, ''),
    formattedWhatsapp: document.getElementById('dossierEditPhone').value.trim(),
    address: document.getElementById('dossierEditAddress').value.trim(),
    neighborhood: document.getElementById('dossierEditNeighborhood').value.trim(),
    weeklyVolumeEstimated: document.getElementById('dossierEditWeeklyVol').value.trim(),
    monthlyRevenuePotential: parseFloat(document.getElementById('dossierEditMonthlyRev').value) || 0,
    choppBrand: document.getElementById('dossierEditBrand').value.trim(),
    observations: document.getElementById('dossierEditNotes').value.trim()
  };

  try {
    const res = await fetch(`/api/radar/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });
    const json = await res.json();

    if (json.success) {
      // Atualizar no cache em memória
      const targetIndex = allDatabaseLeads.findIndex(l => l.id === id || l.placeId === id);
      if (targetIndex !== -1) {
        allDatabaseLeads[targetIndex] = { ...allDatabaseLeads[targetIndex], ...updatedData };
      }
      const currentIndex = allCurrentLeads.findIndex(l => l.id === id || l.placeId === id);
      if (currentIndex !== -1) {
        allCurrentLeads[currentIndex] = { ...allCurrentLeads[currentIndex], ...updatedData };
      }

      closeLeadDossierModal();
      handleMapMoved();
      alert('✅ Ficha do estabelecimento atualizada com sucesso!');
    } else {
      alert('Erro ao salvar ficha: ' + (json.message || 'Erro desconhecido'));
    }
  } catch (err) {
    console.error('Erro ao salvar ficha:', err);
    alert('Erro de conexão ao salvar ficha.');
  }
}

async function convertLeadDirectly(leadId) {
  const lead = allDatabaseLeads.find(l => l.id === leadId || l.placeId === leadId) || allCurrentLeads.find(l => l.id === leadId || l.placeId === leadId);
  if (!lead) return;

  try {
    const res = await fetch(`/api/radar/leads/${lead.id}/convert-client`, { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      alert(`🎉 ${lead.name} foi classificado como Cliente Oficial com sucesso!`);
      lead.isClient = true;
      lead.classification = 'CLIENTE_PKCHOPP';
      handleMapMoved();
    }
  } catch (err) {
    console.error(err);
  }
}

function convertCurrentLeadToClient() {
  if (selectedLeadForDossier) {
    const classSelect = document.getElementById('dossierEditClassification');
    if (classSelect) classSelect.value = 'CLIENTE_PKCHOPP';
    saveDossierChanges();
  }
}

function emitOrderFromDossier() {
  if (selectedLeadForDossier) {
    const leadId = selectedLeadForDossier.id;
    closeLeadDossierModal();
    openDirectOrderModalForLead(leadId);
  }
}

function openDirectOrderModalForLead(leadId) {
  const lead = allDatabaseLeads.find(l => l.id === leadId || l.placeId === leadId) || allCurrentLeads.find(l => l.id === leadId || l.placeId === leadId);
  if (!lead) return;

  if (typeof window.openQuickClientOrderModal === 'function') {
    window.openQuickClientOrderModal({
      id: lead.id,
      name: lead.name,
      owner: lead.commercialResponsible || 'Responsável',
      phone: lead.phone || lead.whatsapp || '',
      whatsapp: lead.whatsapp || lead.phone || '',
      address: lead.address || 'Rio de Janeiro - RJ'
    });
  }
}

function setElementText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
