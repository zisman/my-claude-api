import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'

export function SettingsPage() {
  const { user } = useAuth()

  return (
    <div>
      <Header title="Settings" subtitle="Manage your account and organization settings" />

      <div className="p-8 max-w-2xl space-y-8">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Your personal account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-lg font-semibold text-white">
                {user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <Button variant="outline" size="sm">Change photo</Button>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input defaultValue={user?.full_name ?? ''} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input defaultValue={user?.email ?? ''} disabled />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input defaultValue={user?.role ?? ''} disabled />
            </div>
            <Button size="sm">Save changes</Button>
          </CardContent>
        </Card>

        {/* Notification preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notification Preferences</CardTitle>
            <CardDescription>Choose what alerts and updates you receive</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Notification settings coming soon.</p>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">API & Integrations</CardTitle>
            <CardDescription>Manage API keys and platform credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-slate-600">
              <p>Platform OAuth credentials are configured server-side in Supabase Edge Function environment variables:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li><code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">GOOGLE_CLIENT_ID</code> — Google Ads / GA4</li>
                <li><code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">GOOGLE_CLIENT_SECRET</code> — Google Ads / GA4</li>
                <li><code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">META_APP_SECRET</code> — Meta Ads</li>
                <li><code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">LINKEDIN_CLIENT_SECRET</code> — LinkedIn Ads</li>
                <li><code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">ANTHROPIC_API_KEY</code> — Claude AI insights</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base text-red-600">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions — proceed with caution</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" size="sm">Delete account</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
