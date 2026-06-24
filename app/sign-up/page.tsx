import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AuthForm } from '@/components/auth-form'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Sign Up - Cloudynic AI',
  description: 'Create a new Cloudynic AI account',
}

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  
  if (session?.user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-gray-600 mt-2">Join Cloudynic AI today</p>
        </div>
        <AuthForm mode="sign-up" />
      </div>
    </div>
  )
}
