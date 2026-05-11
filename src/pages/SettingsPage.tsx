import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Shield, Bell, CreditCard, Users, Key, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { updateUserProfile } from '@/lib/supabase/auth'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Schema ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
})
type ProfileForm = z.infer<typeof profileSchema>

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'team' | 'billing' | 'notifications' | 'security' | 'api'

const TABS: { id: Tab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'team', label: 'Team', icon: Users, adminOnly: true },
  { id: 'billing', label: 'Billing', icon: CreditCard, adminOnly: true },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'api', label: 'API Keys', icon: Key, adminOnly: true },
]

// ─── Tab panels ───────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, refreshUser } = useAuth()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: user?.full_name ?? '' },
  })

  const onSubmit = async (data: ProfileForm) => {
    try {
      setError(null)
      await updateUserProfile(data)
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal information</CardTitle>
          <CardDescription>Update your name and profile picture</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-xl font-semibold text-white">
                {user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div>
                <Button type="button" variant="outline" size="sm">Change photo</Button>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG or GIF. Max 2MB.</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" {...register('full_name')} />
                {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Email address</Label>
                <Input value={user?.email ?? ''} disabled />
                <p className="text-xs text-slate-400">Email can't be changed here.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="flex items-center gap-2">
                <Input value={user?.role ?? ''} disabled className="max-w-[200px]" />
                <Badge variant="secondary" className="capitalize">{user?.role}</Badge>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}
                Save changes
              </Button>
              {saved && <span className="text-sm text-emerald-600">Saved!</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base text-red-600">Danger zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm">Delete account</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function TeamTab() {
  const { organization } = useOrg()
  const { canAccess } = useAuth()

  if (!canAccess('admin')) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-400 text-sm">
          Only admins and owners can manage team members.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Team members</CardTitle>
            <CardDescription>Manage who has access to {organization?.name}</CardDescription>
          </div>
          <Button size="sm">Invite member</Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">Team member management coming soon.</p>
        </CardContent>
      </Card>
    </div>
  )
}

function BillingTab() {
  const { organization } = useOrg()
  const { planLimits } = useOrg()

  const planColors: Record<string, string> = {
    starter: 'bg-slate-100 text-slate-700',
    growth: 'bg-blue-100 text-blue-700',
    enterprise: 'bg-purple-100 text-purple-700',
    custom: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className={cn(
              'px-3 py-1 rounded-full text-sm font-semibold capitalize',
              planColors[organization?.plan ?? 'starter']
            )}>
              {organization?.plan ?? 'starter'}
            </span>
            {organization?.billing_status && (
              <Badge variant={organization.billing_status === 'active' ? 'default' : 'destructive'} className="capitalize">
                {organization.billing_status}
              </Badge>
            )}
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Max users</p>
              <p className="font-medium">{planLimits.maxUsers === 999 ? 'Unlimited' : planLimits.maxUsers}</p>
            </div>
            <div>
              <p className="text-slate-500">Max clients</p>
              <p className="font-medium">{planLimits.maxClients === 999 ? 'Unlimited' : planLimits.maxClients}</p>
            </div>
          </div>
          <Button variant="outline" size="sm">Manage billing</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function NotificationsTab() {
  const items = [
    { label: 'Critical alerts', description: 'Budget exhausted, campaigns down', enabled: true },
    { label: 'High-severity alerts', description: 'Significant performance drops', enabled: true },
    { label: 'Weekly digest', description: 'Weekly performance summary email', enabled: false },
    { label: 'Task assignments', description: 'When a task is assigned to you', enabled: true },
    { label: 'Sync failures', description: 'When a platform sync fails', enabled: true },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notification preferences</CardTitle>
        <CardDescription>Choose what you want to be notified about</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-slate-400">{item.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={item.enabled} className="sr-only peer" />
              <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
            </label>
          </div>
        ))}
        <Button size="sm" className="mt-2">Save preferences</Button>
      </CardContent>
    </Card>
  )
}

function SecurityTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Current password</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <Label>New password</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm new password</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <Button size="sm">Update password</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active sessions</CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">Session management coming soon.</p>
        </CardContent>
      </Card>
    </div>
  )
}

function ApiKeysTab() {
  const secrets = [
    { name: 'GOOGLE_CLIENT_ID', desc: 'Google Ads / GA4 OAuth' },
    { name: 'GOOGLE_CLIENT_SECRET', desc: 'Google Ads / GA4 OAuth' },
    { name: 'META_APP_SECRET', desc: 'Meta Ads OAuth' },
    { name: 'LINKEDIN_CLIENT_SECRET', desc: 'LinkedIn Ads OAuth' },
    { name: 'ANTHROPIC_API_KEY', desc: 'Claude AI insights engine' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Platform credentials</CardTitle>
        <CardDescription>
          These secrets are stored as Supabase Edge Function environment variables.
          Never expose them client-side.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {secrets.map(s => (
            <div key={s.name} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div>
                <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{s.name}</code>
                <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
              </div>
              <Badge variant="secondary">Server-side</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { canAccess } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  const visibleTabs = TABS.filter(t => !t.adminOnly || canAccess('admin'))

  const panels: Record<Tab, React.ReactNode> = {
    profile: <ProfileTab />,
    team: <TeamTab />,
    billing: <BillingTab />,
    notifications: <NotificationsTab />,
    security: <SecurityTab />,
    api: <ApiKeysTab />,
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 pt-6 pb-2">
          <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your account and organization preferences</p>
        </div>

        <div className="flex gap-8 px-8 pt-6 pb-8">
          {/* Tab list */}
          <nav className="w-48 flex-shrink-0 space-y-0.5">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Panel */}
          <div className="flex-1 max-w-2xl">
            {panels[activeTab]}
          </div>
        </div>
      </div>
    </div>
  )
}
