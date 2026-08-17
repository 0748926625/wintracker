// Crée le scénario de test obligatoire (voir PROMPT.txt, section 30) :
// UTB Transport / Jean Kouassi (COMPANY_USER) / Koffi Yao (DRIVER) / colis WT-....-000001.
//
// Nécessite les variables d'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
// (jamais VITE_..., cette clé ne doit jamais atteindre le frontend).
//
// Usage :
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxxx node scripts/seed-test-scenario.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey)

async function main() {
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({ name: 'UTB Transport', phone: '0700000000', email: 'contact@utb.example' })
    .select()
    .single()
  if (companyError) throw companyError
  console.log('Compagnie créée:', company.name)

  const { data: jeanAuth, error: jeanAuthError } = await supabase.auth.admin.createUser({
    email: 'jean@example.com',
    password: 'Passw0rd!',
    email_confirm: true,
  })
  if (jeanAuthError) throw jeanAuthError

  const { error: jeanProfileError } = await supabase.from('profiles').insert({
    user_id: jeanAuth.user.id,
    company_id: company.id,
    role: 'COMPANY_USER',
    name: 'Jean Kouassi',
    phone: '0700000001',
  })
  if (jeanProfileError) throw jeanProfileError
  console.log('Utilisateur créé: jean@example.com / Passw0rd!')

  const { data: koffiAuth, error: koffiAuthError } = await supabase.auth.admin.createUser({
    email: 'koffi@example.com',
    password: 'Passw0rd!',
    email_confirm: true,
  })
  if (koffiAuthError) throw koffiAuthError

  const { data: koffiProfile, error: koffiProfileError } = await supabase
    .from('profiles')
    .insert({
      user_id: koffiAuth.user.id,
      company_id: null,
      role: 'DRIVER',
      name: 'Koffi Yao',
      phone: '0700000002',
    })
    .select()
    .single()
  if (koffiProfileError) throw koffiProfileError

  const { error: driverError } = await supabase
    .from('drivers')
    .insert({ profile_id: koffiProfile.id, status: 'ACTIVE' })
  if (driverError) throw driverError
  console.log('Livreur créé: koffi@example.com / Passw0rd!')

  const { data: pkg, error: pkgError } = await supabase
    .from('packages')
    .insert({
      company_id: company.id,
      sender_name: 'Moussa Traoré',
      sender_phone: '0700000003',
      recipient_name: 'Jean Kouassi',
      recipient_phone: '0700000001',
      delivery_address: 'Cocody Angré',
      description: 'Colis de test',
    })
    .select()
    .single()
  if (pkgError) throw pkgError
  console.log('Colis créé:', pkg.tracking_number)

  console.log('\nScénario de test prêt. Connectez-vous avec jean@example.com ou koffi@example.com.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
