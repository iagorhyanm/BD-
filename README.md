# 📖🐀 BibleRats

App para **ler a Bíblia todo dia com os amigos**. Funciona assim:

- **Desafios em grupo:** por exemplo, "Novo Testamento em 90 dias". Você convida a galera por link ou por código.
- **Check-in de leitura:** você registra o livro e os capítulos lidos. Tempo, versículo que marcou, reflexão e foto são opcionais.
- **Feed do grupo:** mostra as leituras de todos, com reações (🙏 🔥 ❤️ 📖 🙌) e comentários.
- **Placar:** cada **dia com leitura vale 1 ponto**. Há também a **sequência** de dias seguidos 🔥.
- **Perfil:** dias lidos, capítulos, recorde de sequência e um mapa de quanto da Bíblia você já leu.

Funciona no celular e no computador e pode ser **instalado na tela inicial**:
- **Android:** menu ⋮ → **Instalar app**.
- **iPhone:** **Compartilhar** → **Adicionar à Tela de Início**.

---

## Sumário

1. [O que você vai precisar](#1-o-que-você-vai-precisar)
2. [Criar o projeto no Supabase](#2-criar-o-projeto-no-supabase-gratuito)
3. [Criar as tabelas (migrations)](#3-criar-as-tabelas-migrations)
4. [Configurar o login](#4-configurar-o-login)
5. [Configurar o arquivo `.env.local`](#5-configurar-o-arquivo-envlocal)
6. [Criar o primeiro administrador](#6-criar-o-primeiro-administrador)
7. [Publicar na Vercel](#7-publicar-na-vercel)
8. [Usando o app](#8-usando-o-app)
9. [Trocar logo e cores](#9-trocar-logo-e-cores)
10. [Para desenvolvedores](#10-para-desenvolvedores)

---

## 1. O que você vai precisar

Tudo abaixo é gratuito:

- Conta no **GitHub**: <https://github.com>
- Conta no **Supabase** (banco de dados e logins): <https://supabase.com>
- Conta na **Vercel** (deixa o site no ar). Entre usando o GitHub: <https://vercel.com>
- **Node.js** 20 ou mais novo: <https://nodejs.org> (versão "LTS"). É usado só para criar o primeiro administrador.

---

## 2. Criar o projeto no Supabase (gratuito)

1. Acesse <https://supabase.com/dashboard> → **New project**.
2. Escolha a **Region** **South America (São Paulo)**, a mais rápida para o Brasil, e gere e guarde a senha do banco.
3. Clique em **Create new project** e espere uns 2 minutos.

> **Atenção:** no plano gratuito, um projeto que fica **7 dias sem uso é pausado** e o app sai do ar. Para reativar, abra o projeto no painel do Supabase e clique em **Restore**.

---

## 3. Criar as tabelas (migrations)

Os arquivos ficam em `supabase/migrations` e precisam rodar **na ordem do nome**.

1. No Supabase, abra **SQL Editor** → **New query**.
2. Abra o primeiro arquivo da pasta (no GitHub: clique no arquivo → **Raw**), copie tudo, cole e clique em **Run**.
3. Repita com os seguintes, um por um, em ordem.

---

## 4. Configurar o login

No Supabase, abra **Authentication** → **Sign In / Providers** e deixe assim:

- **Allow new users to sign up:** **ligado**. As pessoas criam a própria conta.
- **Confirm email:** **desligado**. O e-mail gratuito do Supabase só envia uns 2 e-mails por hora.

Por enquanto, quem esquece a senha pede a um administrador para redefinir (em **Admin → Usuários**). Para ter recuperação de senha por e-mail, configure um serviço de e-mail no Supabase, como o Resend, gratuito até 3 mil e-mails por mês.

---

## 5. Configurar o arquivo `.env.local`

1. Baixe o projeto: no GitHub, **Code** → **Download ZIP**, e descompacte.
2. Copie `.env.example` para `.env.local` e preencha:

| Campo | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → **Project Settings** → **Data API** → *Project URL* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Project Settings** → **API Keys** → chave `anon` / `publishable` |
| `SUPABASE_SERVICE_ROLE_KEY` | Mesma tela → chave `service_role` / `secret` (**secreta!**) |
| `EDG_NOME`, `EDG_EMAIL`, `EDG_SENHA` | Os dados do primeiro administrador (senha com 8 caracteres ou mais) |

> ⚠️ **A chave `service_role` é secreta.** Nunca a compartilhe nem a coloque no GitHub.

---

## 6. Criar o primeiro administrador

No terminal, dentro da pasta do projeto, rode:

```bash
npm install
npm run seed:admin
```

O administrador acessa **Admin**, onde pode redefinir senhas, desativar contas, escolher outros administradores e ver o log de atividades. As outras pessoas simplesmente **criam a conta** pelo app.

---

## 7. Publicar na Vercel

1. Acesse <https://vercel.com/new>, escolha o repositório e clique em **Import**.
2. Em **Environment Variables**, cadastre `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
3. Clique em **Deploy**.

O arquivo `vercel.json` já coloca o servidor em São Paulo (`gru1`), perto do banco. Se o seu banco estiver em outra região, ajuste esse arquivo.

---

## 8. Usando o app

1. **Crie a conta** em "Criar conta".
2. Em **Desafios** → **Novo desafio**:
   - Dê um nome e escolha a duração (30, 60 ou 90 dias, ou sem fim).
   - Toque em **Convidar** para mandar o link pelo WhatsApp, ou passe o **código**.
3. Todo dia, toque no botão **Leitura** (no centro da barra de baixo):
   - Escolha o livro e os capítulos.
   - Se quiser, acrescente o versículo que marcou, uma reflexão e uma foto.
   - Dá para registrar leituras de até **3 dias atrás**.
4. Acompanhe o **placar** e as leituras dos amigos na página do desafio, e reaja e comente.

**Regras do placar:**
- Cada dia com pelo menos uma leitura, dentro do período do desafio, vale **1 ponto**.
- A **sequência 🔥** conta os dias seguidos com leitura. Ela não zera se você ainda não leu hoje, mas leu ontem.

**Privacidade:**
- Você só vê as leituras e o perfil de quem está em algum desafio com você.
- As fotos ficam privadas e só os colegas de desafio veem.

---

## 9. Trocar logo e cores

Tudo fica em **`src/theme.config.ts`**:
- **Nome e frase:** `nome`, `slogan`.
- **Logo:** `public/logo.png`.
- **Cores:** `cores`.

Os ícones do app instalado ficam em `public/icons`.

---

## 10. Para desenvolvedores

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Supabase (Postgres, Auth, Storage, RLS) · Vercel. As datas usam o fuso `America/Belem`.

```bash
npm install
npx supabase start            # Supabase local (precisa de Docker)
npx supabase db reset         # aplica as migrations
cp .env.example .env.local    # preencha com os valores de `npx supabase status`
npm run seed:admin
npm run dev                   # http://localhost:3000
```

| Comando | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | Desenvolvimento, build e produção |
| `npm run typecheck` / `lint` | Tipos e ESLint |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:db` | Testes de RLS e regras (pgTAP) no Supabase local |
| `npm run db:types` | Regenera `src/lib/supabase/database.types.ts` |
| `npm run seed:admin` | Cria ou atualiza o primeiro administrador |

**Modelo de dados** (`supabase/migrations/20261122000001_biblerats.sql`):

| Tabela/função | O que é |
|---|---|
| `livros_biblia` | 66 livros, 1189 capítulos |
| `grupos`, `grupo_membros` | Desafios e participantes (dono/admin/membro), com entrada por `entrar_no_grupo(codigo)` |
| `checkins` | Leituras (livro, capítulos, data, minutos, versículo, reflexão, foto). Um gatilho valida capítulos, impede datas futuras e limita a até 3 dias atrás |
| `reacoes`, `comentarios` | Interações nas leituras |
| `placar_grupo()`, `sequencia_atual()`, `estatisticas_usuario()` | Placar e estatísticas |
| Bucket privado `checkins` | Fotos, em pastas com o id de cada usuário |

**Segurança:**
- RLS em todas as tabelas. Só colegas de grupo enxergam leituras, perfis e fotos uns dos outros (`compartilha_grupo`).
- No cadastro, o perfil é criado por gatilho, sempre como `usuario`.
- A service role só é usada no servidor, para as ações de administrador.

**Histórico:** este repositório começou como o sistema de gestão da "Bandinha" do EJC Marabá. As migrations antigas continuam na pasta, e a do BibleRats remove as tabelas daquele sistema.
