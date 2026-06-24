import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AuthForm } from '@/components/auth-form'

export const metadata = {
  title: 'Sign In - Cloudynic AI',
  description: 'Sign in to your Cloudynic AI account',
}

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  
  if (session?.user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Sign In</h1>
          <p className="text-gray-600 mt-2">Welcome back to Cloudynic AI</p>
        </div>
        <AuthForm mode="sign-in" />
      </div>
    </div>
  )
}
