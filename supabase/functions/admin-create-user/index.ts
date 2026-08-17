// Edge Function : création d'un utilisateur (COMPANY_USER, DRIVER ou AGENT) par un SUPER_ADMIN.
// Nécessaire car la création d'un utilisateur Supabase Auth requiert la service_role key,
// qui ne doit jamais être exposée au frontend.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface CreateUserBody {
  email: string
  password: string
  name: string
  phone?: string
  role: 'COMPANY_USER' | 'DRIVER' | 'AGENT'
  company_id?: string
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Non authentifié' }, 401)

  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser()
  if (callerError || !caller) return json({ error: 'Non authentifié' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', caller.id)
    .single()

  if (!callerProfile || callerProfile.role !== 'SUPER_ADMIN') {
    return json({ error: 'Accès refusé : réservé au SUPER_ADMIN' }, 403)
  }

  let body: CreateUserBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Corps de requête invalide' }, 400)
  }

  const { email, password, name, phone, role, company_id } = body

  if (!email || !password || !name || !role) {
    return json({ error: 'Champs requis manquants (email, password, name, role)' }, 400)
  }
  if (role === 'COMPANY_USER' && !company_id) {
    return json({ error: 'company_id requis pour un COMPANY_USER' }, 400)
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError || !created.user) {
    return json({ error: createError?.message ?? 'Création du compte impossible' }, 400)
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .insert({
      user_id: created.user.id,
      company_id: role === 'COMPANY_USER' ? company_id : null,
      role,
      name,
      phone: phone ?? null,
    })
    .select()
    .single()

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id)
    return json({ error: profileError.message }, 400)
  }

  if (role === 'DRIVER') {
    const { error: driverError } = await admin.from('drivers').insert({ profile_id: profile.id })
    if (driverError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: driverError.message }, 400)
    }
  }

  return json({ user_id: created.user.id, profile_id: profile.id })
})
