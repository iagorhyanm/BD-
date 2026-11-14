# 🎶 Bandinha · EJC Marabá

Sistema de gestão da **Bandinha**, a equipe de música do EJC (Encontro de Jovens com Cristo) de Marabá/PA.
Funciona no celular (pode ser "instalado" como app) e no computador.

> **Status:** todas as fases estão concluídas:
> - **Fase 1:** login, perfis, coordenadores e edições.
> - **Fase 2:** inscrições com link público e QR code, seleção Homens/Mulheres, avaliações e "Puxar para a equipe".
> - **Fase 3:** membros, agenda (lista e calendário), escala com aviso de conflitos e presença.
> - **Fase 4:** repertório (biblioteca + setlists), equipamentos, empréstimos e checklist por apresentação.
> - **Fase 5:** avisos com envio pelo WhatsApp, painel inicial, log de atividades e app instalável (PWA).

---

## Sumário

1. [O que você vai precisar](#1-o-que-você-vai-precisar)
2. [Criar o projeto no Supabase](#2-criar-o-projeto-no-supabase-gratuito)
3. [Criar as tabelas (migrations)](#3-criar-as-tabelas-migrations)
4. [Configurar o arquivo `.env.local`](#4-configurar-o-arquivo-envlocal)
5. [Criar o primeiro EDG](#5-criar-o-primeiro-edg)
6. [Publicar na Vercel](#6-publicar-na-vercel)
7. [Primeiros passos no sistema](#7-primeiros-passos-no-sistema)
8. [Trocar cores e logo](#8-trocar-cores-e-logo)
9. [Para desenvolvedores](#9-para-desenvolvedores)

---

## 1. O que você vai precisar

Tudo abaixo é gratuito.

- Uma conta no **GitHub**: <https://github.com>
- Uma conta no **Supabase** (banco de dados e logins): <https://supabase.com>
- Uma conta na **Vercel** (deixa o site no ar): <https://vercel.com>. Entre usando o GitHub.
- O **Node.js** instalado no seu computador, versão 20 ou mais nova: <https://nodejs.org>. Baixe a versão "LTS" e instale clicando em "Próximo" até o fim.
  É usado uma única vez, para criar o primeiro usuário EDG.

---

## 2. Criar o projeto no Supabase (gratuito)

1. Entre em <https://supabase.com/dashboard> e clique em **New project**.
2. Preencha:
   - **Name:** `bandinha`
   - **Database Password:** clique em *Generate a password* e **guarde essa senha** num lugar seguro.
   - **Region:** `South America (São Paulo)`, que é a mais rápida para o Pará.
   - **Plan:** Free.
3. Clique em **Create new project** e espere uns 2 minutos.
4. **Desligue o cadastro aberto**, para que ninguém consiga criar conta sozinho:
   - Menu lateral → **Authentication** → **Sign In / Providers**.
   - Desmarque **Allow new users to sign up** e clique em **Save**.

---

## 3. Criar as tabelas (migrations)

As "migrations" são arquivos que criam as tabelas e as regras de segurança. Ficam na pasta `supabase/migrations` e **precisam rodar em ordem** (o nome de cada arquivo começa com a data).

**Jeito mais fácil: pelo SQL Editor do Supabase**

1. No Supabase, abra o menu lateral → **SQL Editor** → **New query**.
2. Abra o primeiro arquivo da pasta `supabase/migrations` (no GitHub, clique no arquivo e depois em **Raw**). Copie **todo** o conteúdo.
3. Cole no SQL Editor e clique em **Run**. Deve aparecer *Success. No rows returned*.
4. Repita com os arquivos seguintes, **na ordem do nome**.

> Sempre que uma nova fase for entregue, rode só os arquivos novos.

---

## 4. Configurar o arquivo `.env.local`

1. Baixe o projeto: no GitHub, botão verde **Code** → **Download ZIP**. Descompacte numa pasta.
2. Dentro da pasta, copie o arquivo `.env.example` e renomeie a cópia para `.env.local`.
3. Abra o `.env.local` no Bloco de Notas e preencha:

| Campo | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → **Project Settings** → **Data API** → *Project URL* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → **Project Settings** → **API Keys** → chave `anon` / `publishable` |
| `SUPABASE_SERVICE_ROLE_KEY` | Mesma tela → chave `service_role` / `secret` (clique em *Reveal*) |
| `LOGIN_DOMINIO` | Deixe `bandinha.local` |
| `EDG_NOME`, `EDG_EMAIL`, `EDG_SENHA`, `EDG_TELEFONE` | Os dados do primeiro administrador (EDG). A senha precisa ter 8 caracteres ou mais. |

> ⚠️ **A chave `service_role` é secreta.** Ela dá acesso total ao banco. Nunca mande essa chave por WhatsApp e nunca coloque no GitHub. O `.env.local` já está configurado para **não** ir para o GitHub.

---

## 5. Criar o primeiro EDG

1. Abra o terminal **dentro da pasta do projeto**:
   - **Windows:** abra a pasta no Explorador, clique na barra de endereço, digite `cmd` e aperte Enter.
   - **Mac:** clique com o botão direito na pasta → *Novo Terminal na Pasta*.
2. Rode, um de cada vez:

```bash
npm install
npm run seed:edg
```

3. Deve aparecer: `🎉 Pronto! … é EDG.`

Pode rodar o comando de novo sem problema. Se o usuário já existir, ele só confirma que é EDG e atualiza a senha. Isso também serve para recuperar o acesso se o EDG esquecer a senha.

---

## 6. Publicar na Vercel

1. Envie o projeto para um repositório seu no GitHub, se ainda não estiver lá.
2. Entre em <https://vercel.com/new>, escolha o repositório e clique em **Import**.
3. Abra **Environment Variables** e cadastre estas quatro variáveis, com os mesmos valores do `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LOGIN_DOMINIO`

   (As variáveis `EDG_*` **não** precisam ir para a Vercel.)
4. Clique em **Deploy**. Em 1 ou 2 minutos o site fica no ar num endereço como `https://bandinha.vercel.app`.

Cada alteração enviada ao GitHub publica uma versão nova automaticamente.

---

## 7. Primeiros passos no sistema

1. Entre com o e-mail e a senha do EDG.
2. Vá em **Administração → Edições e configurações** → **Nova edição** (ex.: "EJC 2027"). Informe as vagas para homens e mulheres, o limite de faltas e o texto de consentimento LGPD.
3. Vá em **Administração → Coordenadores** → **Novo coordenador**:
   - Informe o nome, o **e-mail ou um usuário** (ex.: `maria.souza`) e o telefone.
   - O sistema gera uma **senha provisória**. Use o botão **Enviar no WhatsApp** para mandar o acesso.
   - No primeiro login, o coordenador é obrigado a criar a própria senha.
4. Pelos três pontinhos (⋮) ao lado de cada coordenador você pode **redefinir a senha**, **desativar/reativar** o acesso ou **promover a EDG**.

**Perfis de acesso**

| Perfil | Pode |
|---|---|
| **EDG** | Tudo, inclusive a Administração. |
| **Coordenador** | Todos os módulos da equipe, menos a Administração. |
| **Membro** | Ainda sem acesso (previsto para o futuro). |
| **Público** | Só o link de inscrição. |

**Seletor de edição:** no topo da tela. Ele mostra os dados da edição escolhida. Isso é uma preferência de cada pessoa e não muda a edição *ativa*, que só o EDG define.

**Inscrições e seleção**

1. Em **Inscrições → Novo formulário**:
   - Monte as perguntas extras. Os campos fixos (nome, nascimento, telefone, sexo, EJC anterior, cidade e LGPD) já vêm prontos.
   - Arraste as perguntas para mudar a ordem e clique em **Salvar perguntas**.
2. Em **Configurações**, defina capa, datas, limite e mensagem de confirmação. Depois ligue **Receber inscrições**.
3. Em **Compartilhar**, copie o link, mande pelo WhatsApp ou baixe o QR code para imprimir.
4. Em **Seleção**:
   - Use as abas Homens/Mulheres, que mostram selecionados × vagas.
   - Abra a ficha de cada inscrito para dar nota e comentário.
   - Use **Puxar para a equipe** para transformar o inscrito em membro.
   - Marque várias pessoas para mudar o status em lote e exporte o CSV quando precisar.

**Equipe, agenda e presença**

- **Membros:**
  - Cadastre manualmente ou use "Puxar para a equipe" na Seleção.
  - Marque as funções (voz, instrumentos). A lista de funções é editada pelo EDG em Administração → Funções e instrumentos.
  - Use "Copiar números" para colar os contatos no WhatsApp e o CSV para planilhas.
- **Agenda:**
  - Crie ensaios e apresentações e abra cada evento para montar a **escala**.
  - O sistema avisa quando a mesma pessoa está em duas funções no mesmo evento ou em eventos no mesmo horário.
  - Dá para copiar a escala de um evento anterior.
- **Presença:**
  - Abra o evento e toque em "Fazer chamada". Marque Presente, Atraso, Falta justificada (com motivo) ou Falta.
  - O relatório destaca quem atingiu ou passou do limite de faltas da edição. Só contam as faltas **não justificadas**.

**Repertório e equipamentos**

- **Repertório:**
  - A biblioteca de músicas é a mesma para todas as edições. Cada música tem tom, BPM, momento do encontro, cifra, YouTube/Spotify e quem canta/toca.
  - Na página do evento, use "Montar repertório do dia" para criar a setlist. Arraste para ordenar e ajuste o tom de cada música.
- **Equipamentos:**
  - Inventário com foto, estado, dono e responsável, e registro de retirada e devolução.
  - Nas apresentações, use o **checklist** do evento para conferir o que precisa ser levado.
- **Duplicar edição** copia vagas, configurações, equipamentos e as setlists "modelo" (sem evento).

**Avisos**

- Publique no mural; os avisos fixados aparecem no topo e no painel inicial.
- Em **Enviar para membros**:
  - Filtre por sexo, função ou escala de um evento.
  - Copie a mensagem pronta ou toque em cada nome para abrir o WhatsApp com o texto já preenchido.
  - Depois, registre o envio no histórico.

**Instalar no celular (PWA)**

- **Android (Chrome):** abra o site → menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial").
- **iPhone (Safari):** abra o site → botão Compartilhar → **Adicionar à Tela de Início**.

---

## 8. Trocar cores e logo

Tudo fica num único arquivo: **`src/theme.config.ts`**.

- **Cores:** troque os valores, por exemplo `primaria: "#1f3a5f"`.
- **Logo:** coloque a imagem em `public/` (ex.: `public/logo.svg`) e ajuste o campo `logo`.
- **Nome do sistema:** campos `nome` e `nomeCurto`.

---

## 9. Para desenvolvedores

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Supabase (Postgres, Auth, RLS) · Vercel. Fuso horário: `America/Belem`.

```bash
npm install
npx supabase start        # Supabase local (precisa de Docker)
npx supabase db reset     # aplica as migrations
cp .env.example .env.local  # preencha com os valores de `npx supabase status`
npm run seed:edg
npm run dev               # http://localhost:3000
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run typecheck` | Checagem de tipos |
| `npm run lint` | ESLint |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:db` | Testes de RLS (pgTAP) no Supabase local |
| `npm run db:types` | Regenera `src/lib/supabase/database.types.ts` |
| `npm run seed:edg` | Cria ou atualiza o primeiro EDG |

**Estrutura**

```
supabase/migrations/   SQL versionado (uma migration por fase)
supabase/tests/        testes de RLS (pgTAP)
scripts/seed-edg.ts    criação do primeiro EDG
src/app/(auth)/        login, troca de senha, sem acesso
src/app/(app)/         área interna (layout com navegação)
src/app/(app)/admin/   coordenadores, edições, logs (só EDG)
src/server/actions/    server actions
src/lib/supabase/      clientes: browser, server, admin (service role, server-only)
src/lib/               auth, edição atual, datas, telefone, senha, logs
src/theme.config.ts    tema (cores, logo, nome)
```

**Segurança**

- RLS ligado em todas as tabelas. Funções `is_staff()` e `is_edg()` nas policies, e o papel `membro` fica sem nenhuma permissão.
- A service role só existe em `src/lib/supabase/admin.ts` (com `import "server-only"`) e só é usada depois de `requireEdg()`.
- Um usuário desativado é bloqueado no Supabase Auth (ban) **e** pelo RLS, porque `is_staff()` exige `ativo = true`.
- O banco impede que o sistema fique sem nenhum EDG ativo.
- O log de atividades é gravado por trigger (ações do usuário) ou explicitamente pelo servidor (ações com service role).
