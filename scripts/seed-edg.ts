/**
 * Cria (ou atualiza) o primeiro ADMINISTRADOR do BibleRats.
 *
 *   npm run seed:admin   (ou o nome antigo: npm run seed:edg)
 *
 * Lê EDG_NOME, EDG_EMAIL, EDG_SENHA e EDG_TELEFONE do arquivo .env.local (ou .env).
 * Pode rodar mais de uma vez: se o usuário já existir, só garante que ele é administrador ativo.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config({ path: ".env" });

function obrigatoria(nome: string): string {
  const v = process.env[nome]?.trim();
  if (!v) {
    console.error(`\n❌ Faltou preencher ${nome} no arquivo .env.local\n`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const url = obrigatoria("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = obrigatoria("SUPABASE_SERVICE_ROLE_KEY");
  const nome = obrigatoria("EDG_NOME");
  const email = obrigatoria("EDG_EMAIL").toLowerCase();
  const senha = obrigatoria("EDG_SENHA");
  const telefone = (process.env.EDG_TELEFONE ?? "").replace(/\D/g, "") || null;

  if (senha.length < 8) {
    console.error("\n❌ EDG_SENHA precisa ter pelo menos 8 caracteres.\n");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Procura usuário existente com esse e-mail.
  let userId: string | null = null;
  for (let pagina = 1; !userId; pagina++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) throw error;
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (data.users.length < 200) break;
  }

  if (userId) {
    console.log(`ℹ️  Usuário ${email} já existe — garantindo que é administrador ativo e atualizando a senha.`);
    const { error } = await supabase.auth.admin.updateUserById(userId, { password: senha, ban_duration: "none" });
    if (error) throw error;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`✅ Usuário ${email} criado.`);
  }

  const { error: erroPerfil } = await supabase.from("profiles").upsert({
    id: userId,
    nome,
    email,
    telefone,
    papel: "admin",
    ativo: true,
    precisa_trocar_senha: false,
  });
  if (erroPerfil) throw erroPerfil;

  console.log(`\n🎉 Pronto! ${nome} é administrador(a) do BibleRats. Entre com:\n   E-mail: ${email}\n   Senha: (a que está em EDG_SENHA)\n`);
}

main().catch((e) => {
  console.error("\n❌ Erro ao criar o administrador:", e?.message ?? e);
  console.error("   Confira se rodou as migrations e se as chaves do Supabase estão corretas.\n");
  process.exit(1);
});
