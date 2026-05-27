# Bolso · Bittencourt

App pessoal de finanças da família Bittencourt. Funciona como Progressive Web App (PWA).

## Stack
- **Frontend:** HTML + CSS + JS puro (sem build)
- **Banco de dados:** Firebase Firestore
- **Hospedagem:** GitHub Pages

## Deploy (passo a passo)

### 1. Criar o repositório no GitHub

1. Abrir https://github.com/new
2. Nome do repositório: **`financas-bittencourt`**
3. Marcar **público** (necessário pro GitHub Pages grátis)
4. Marcar "Add a README file" → criar

### 2. Subir os arquivos

Pela interface web do GitHub (igual ao treino-hibrido):

1. No repositório, clicar em **"Add file" → "Upload files"**
2. Arrastar TODOS os arquivos desta pasta:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `manifest.json`
   - `icon-192.png`
   - `icon-512.png`
3. Commit changes

### 3. Ativar o GitHub Pages

1. No repositório: **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** · Folder: **/ (root)**
4. Save
5. Aguardar ~1 minuto

### 4. Abrir o app

URL: **`https://filipebiten.github.io/financas-bittencourt/`**

### 5. Salvar como app no celular

- **Android (Chrome):** menu (⋮) → "Adicionar à tela inicial" → "Instalar"
- **iPhone (Safari):** botão compartilhar → "Adicionar à Tela de Início"

### 6. Compartilhar com a Mari

Só mandar o link. Ela faz o mesmo passo 5 no celular dela. Os dois veem o mesmo painel em tempo real.

## Atualizando o app

Igual ao treino-hibrido: edita o arquivo pela interface web do GitHub, faz commit. Em segundos o app atualiza no celular.

## Segurança das regras do Firestore

Por enquanto o banco está em **modo de teste** (qualquer um com a config pode ler/escrever). Como a config está no código público, qualquer pessoa que clone esse repo pode acessar seus dados.

**Quando estiver tudo testado, vamos trocar pra modo restrito.** Por enquanto, pra começar, está OK — o link é obscuro e ninguém vai cloná-lo.
