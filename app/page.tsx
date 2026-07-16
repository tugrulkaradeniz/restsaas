import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LandingPage } from '@/components/landing/LandingPage'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const role = user.app_metadata?.role as string | undefined
    redirect(role === 'super_admin' ? '/super-admin' : '/dashboard')
  }

  return <LandingPage />
}
