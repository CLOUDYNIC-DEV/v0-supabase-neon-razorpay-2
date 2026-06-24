import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getUserProfile, getUser, getApiUsageStats, signOutUser } from '@/app/actions/auth-actions'
import Link from 'next/link'

export const metadata = {
  title: 'Dashboard - Cloudynic AI',
  description: 'Your Cloudynic AI dashboard',
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  
  if (!session?.user) {
    redirect('/sign-in')
  }

  const [userRecord, profile, stats] = await Promise.all([
    getUser(),
    getUserProfile(),
    getApiUsageStats(),
  ])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600">Welcome, {userRecord?.name || userRecord?.email}</p>
          </div>
          <div className="flex gap-4">
            <Link href="/api-test" className="text-blue-600 hover:underline">
              Test API
            </Link>
            <form action={async () => {
              'use server'
              await signOutUser()
              redirect('/sign-in')
            }}>
              <button type="submit" className="text-red-600 hover:underline">
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm">Plan</div>
            <div className="text-2xl font-bold capitalize">{profile?.plan || 'free'}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm">Credits</div>
            <div className="text-2xl font-bold">{profile?.credits || 0}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm">API Calls</div>
            <div className="text-2xl font-bold">{stats.totalCalls}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm">Success Rate</div>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
          </div>
        </div>

        {/* Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Profile Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Profile</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Email</div>
                <div className="font-medium">{userRecord?.email}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Name</div>
                <div className="font-medium">{userRecord?.name || 'Not set'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Member Since</div>
                <div className="font-medium">
                  {userRecord?.createdAt?.toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* API Stats Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">API Performance</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Total Calls</div>
                <div className="font-medium">{stats.totalCalls}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Avg Response Time</div>
                <div className="font-medium">{stats.averageResponseTime}ms</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Success Rate</div>
                <div className="font-medium">{stats.successRate}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Upgrade Plan</h2>
          <p className="text-gray-600 mb-4">
            Current plan: <span className="font-bold capitalize">{profile?.plan || 'free'}</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="font-bold mb-2">Free</div>
              <div className="text-2xl font-bold mb-4">$0</div>
              <button className="w-full bg-gray-200 py-2 rounded" disabled>
                Current
              </button>
            </div>
            <div className="border rounded-lg p-4 border-blue-500">
              <div className="font-bold mb-2">Pro</div>
              <div className="text-2xl font-bold mb-4">$9.99</div>
              <Link href="/checkout?plan=pro" className="block w-full bg-blue-600 text-white py-2 rounded text-center hover:bg-blue-700">
                Upgrade
              </Link>
            </div>
            <div className="border rounded-lg p-4">
              <div className="font-bold mb-2">Enterprise</div>
              <div className="text-2xl font-bold mb-4">Custom</div>
              <Link href="/contact" className="block w-full bg-blue-600 text-white py-2 rounded text-center hover:bg-blue-700">
                Contact
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {stats.recentCalls.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Recent API Calls</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2">Endpoint</th>
                    <th className="text-left py-2">Method</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentCalls.map((call: any) => (
                    <tr key={call.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 text-sm">{call.endpoint}</td>
                      <td className="py-2 text-sm">{call.method}</td>
                      <td className="py-2 text-sm">
                        <span className={call.statusCode === 200 ? 'text-green-600' : 'text-red-600'}>
                          {call.statusCode}
                        </span>
                      </td>
                      <td className="py-2 text-sm">{call.responseTime}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
