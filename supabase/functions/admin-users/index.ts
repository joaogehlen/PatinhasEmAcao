// =============================================================================
// Edge Function: admin-users
//
// Criar e excluir contas exige a service_role key, que ignora toda a RLS e por
// isso jamais pode estar dentro do app. Esta função roda no servidor, onde a
// chave é segredo, e faz duas coisas antes de qualquer operação:
//
//   1. identifica quem chamou, pelo token do próprio usuário;
//   2. confirma no banco que essa pessoa é administradora.
//
// O app já checa a permissão antes de chamar, mas essa checagem é só para a
// interface — qualquer um pode chamar esta URL com um token válido. A checagem
// que vale é a daqui.
//
// Deploy:
//   npx supabase functions deploy admin-users --project-ref <seu-project-ref>
//
// Ou cole este arquivo em Edge Functions > Deploy a new function, no painel.
// =============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

interface CreatePayload {
  name: string;
  email: string;
  phone: string | null;
  password: string;
  role: 'morador' | 'voluntario' | 'admin';
}

interface DeletePayload {
  id: string;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autenticado.' }, 401);

  // Cliente com o token de quem chamou: sujeito à RLS, serve para identificar.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user: callerUser },
    error: callerError,
  } = await caller.auth.getUser();
  if (callerError || !callerUser) return json({ error: 'Sessão inválida.' }, 401);

  const { data: callerProfile } = await caller.from('profiles').select('role').eq('id', callerUser.id).single();
  if (callerProfile?.role !== 'admin') {
    return json({ error: 'Você não tem permissão para realizar esta ação.' }, 403);
  }

  // A partir daqui, privilégio total. Nada abaixo usa dados não validados.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let body: { action?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corpo da requisição inválido.' }, 400);
  }

  if (body.action === 'create') {
    const payload = body.payload as CreatePayload;
    if (!payload?.email || !payload?.password || !payload?.name || !payload?.role) {
      return json({ error: 'Dados incompletos para criar o usuário.' }, 400);
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      // Conta criada por administrador já nasce confirmada: quem responde pelo
      // e-mail é a ONG, não a pessoa.
      email_confirm: true,
      user_metadata: { name: payload.name, phone: payload.phone },
    });
    if (error) return json({ error: error.message }, 400);

    // O trigger handle_new_user criou o perfil como 'morador' — de propósito,
    // para que metadata forjada num signUp público nunca vire promoção.
    // O perfil real é definido aqui, já com privilégio de servidor.
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .update({ role: payload.role })
      .eq('id', data.user.id)
      .select()
      .single();

    if (profileError) {
      // Não deixa uma conta órfã de perfil correto para trás.
      await admin.auth.admin.deleteUser(data.user.id);
      return json({ error: profileError.message }, 400);
    }

    return json(toUser(profile));
  }

  if (body.action === 'delete') {
    const payload = body.payload as DeletePayload;
    if (!payload?.id) return json({ error: 'Informe o usuário a excluir.' }, 400);

    if (payload.id === callerUser.id) {
      return json({ error: 'Você não pode excluir a própria conta.' }, 400);
    }

    // O trigger guard_profile_delete também barra o último admin, mas ele não
    // enxerga auth.uid() quando a chamada vem daqui — repetimos a regra com a
    // mensagem que a tela já sabe mostrar.
    const { data: target } = await admin.from('profiles').select('role').eq('id', payload.id).single();
    if (target?.role === 'admin') {
      const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
      if ((count ?? 0) <= 1) {
        return json({ error: 'O sistema precisa de pelo menos um administrador.' }, 400);
      }
    }

    // profiles cai junto por ON DELETE CASCADE.
    const { error } = await admin.auth.admin.deleteUser(payload.id);
    if (error) return json({ error: error.message }, 400);

    return json({ ok: true });
  }

  return json({ error: `Ação desconhecida: ${body.action}` }, 400);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toUser(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
