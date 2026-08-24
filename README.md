# 🍻 PKCHOPP - Sistema de Delivery & Radar de Prospecção B2B

Sistema completo para operação e gestão de delivery de Chopp artesanal, integrando vitrine de vendas para clientes e painel administrativo com módulo inteligente de prospecção e enriquecimento de leads via Google Maps.

---

## 🚀 Funcionalidades

### 🛒 Loja & Atendimento Express (`public/index.html`)
- Catálogo dinâmico de chopes e barris com filtros.
- Carrinho de compras em tempo real.
- Agendamento e cálculo de entrega.
- Integração de pagamento via PIX (QR Code & Copia e Cola).
- Envio de pedido diretamente para o WhatsApp com resumo detalhado.

### 📊 Painel Administrativo (`public/admin.html`)
- **Dashboard Operacional:** Acompanhamento de faturamento, pedidos e clientes.
- **Gestão de Produtos:** Cadastro, edição de preços, estoque e fotos de barris.
- **Gestão de Pedidos:** Mudança de status (Pendente, Preparando, Em Rota, Entregue).
- **Radar de Prospecção & Maps Hunter:**
  - Varredura e busca de estabelecimentos comerciais (bares, restaurantes, eventos) em raio geográfico.
  - Enriquecimento inteligente de leads (telefone, site, redes sociais, CNPJ e contato de tomadores de decisão).
  - Gestão de pipeline de contato e exportação de leads.

---

## 🛠️ Tecnologias Utilizadas

- **Backend:** Node.js, Express, Axios, Cheerio, QRCode
- **Frontend:** HTML5, CSS3 moderno, JavaScript (ES6+)
- **Banco de Dados:** Estrutura persistente JSON / Arquivos modulares

---

## 📦 Como Executar o Projeto Localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/leopalmeira/pkchopp.git
   cd pkchopp
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor:**
   ```bash
   npm start
   ```

4. **Acesse no navegador:**
   - Loja / Cliente: `http://localhost:3000`
   - Painel Admin: `http://localhost:3000/admin.html`

---

## 👤 Autor

Desenvolvido por [Léo Palmeira](https://github.com/leopalmeira).
