import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Bu endpoint yalnızca bir kez çalıştırılır, super admin oluşturulunca silinecek.
export async function GET() {
  const supabase = await createServiceClient()

  // Zaten super admin var mı?
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'super_admin')
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Super admin zaten mevcut.' }, { status: 409 })
  }

  const { error } = await supabase.auth.admin.createUser({
    email: 'tkaradeniz@semetu.com',
    password: 'test123456',
    email_confirm: true,
    app_metadata: { role: 'super_admin' },
    user_metadata: { full_name: 'Tuğrul Karadeniz' },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'Super admin oluşturuldu.' })
}
