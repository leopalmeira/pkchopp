# 🍻 PKCHOPP - Sistema de Delivery & Radar de Prospecção B2B

Sistema completo para operação e gestão de delivery de Chopp artesanal, integrando vitrine de vendas para clientes e painel administrativo com módulo inteligente de prospecção e enriquecimento de leads via Google Maps.

---

## 🌐 Links do Projeto no Ar

- 🛒 **Página de Vendas / Loja do Cliente:** [https://pkchopp.onrender.com](https://pkchopp.onrender.com)
- 🛡️ **Painel Administrativo & Radar:** [https://pkchopp.onrender.com/admin](https://pkchopp.onrender.com/admin)
  - 🔑 **Senha de Acesso:** `Lps27031981`

---

## 🚀 Funcionalidades

### 🛒 Loja & Atendimento Express (`public/index.html`)
- Catálogo de barris de chopp 50L com foto real e preços competitivos de atacado.
- Carrinho de compras em tempo real.
- Agendamento e cálculo de entrega.
- Integração de pagamento via PIX (QR Code & Copia e Cola) e no ato da entrega.
- Envio de pedido diretamente para o WhatsApp com resumo detalhado.
- Interface 100% limpa para o cliente (sem links para o painel administrativo).

### 📊 Painel Administrativo (`public/admin.html`)
- **Autenticação Segura:** Bloqueio com senha de acesso (`Lps27031981`).
- **Dashboard Operacional:** Acompanhamento de faturamento, pedidos e clientes.
- **Gestão de Produtos:** Cadastro e edição completa de nome, descrição personalizada, litragem (50L), preço, estoque e imagem.
- **Gestão de Pedidos:** Mudança de status (Pendente, Preparando, Em Rota, Entregue).
- **Radar de Prospecção & Maps Hunter:**
  - Varredura e busca de estabelecimentos comerciais (bares, restaurantes, eventos) em raio geográfico com mapa interativo.
  - Enriquecimento inteligente de leads (telefone, site, redes sociais, CNPJ e contato de tomadores de decisão).
  - Gestão de pipeline de contato e exportação de leads em CSV/Excel.

---

## 🛠️ Tecnologias Utilizadas

- **Backend:** Node.js, Express, Axios, Cheerio, QRCode
- **Frontend:** HTML5, CSS3 moderno, JavaScript (ES6+), Leaflet Maps
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
   - Painel Admin: `http://localhost:3000/admin` (Senha: `Lps27031981`)

---

## 👤 Autor

Desenvolvido por [Léo Palmeira](https://github.com/leopalmeira).
