import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { motion } from 'framer-motion';
import { Settings, User, Palette, LogOut, Moon, Sun, Monitor, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme, Theme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [autoEnhance, setAutoEnhance] = useState(false);
  const [highQuality, setHighQuality] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName || null,
          bio: bio || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
    { value: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <MainLayout>
      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <Settings className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your preferences</p>
          </div>
        </motion.div>
      </div>

      {/* Settings Content */}
      <div className="px-6 pb-12 max-w-3xl">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 rounded-2xl bg-card border border-border"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              {user ? (
                <>
                  <h3 className="text-lg font-semibold">{user.email?.split('@')[0]}</h3>
                  <p className="text-muted-foreground">{user.email}</p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold">Guest User</h3>
                  <p className="text-muted-foreground">Sign in to sync your data</p>
                </>
              )}
            </div>
          </div>
          {!user ? (
            <Link to="/auth">
              <Button variant="gradient" className="w-full">
                Sign In or Create Account
              </Button>
            </Link>
          ) : (
            <Button variant="outline" className="w-full gap-2" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          )}
        </motion.div>

        {/* Account Settings */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <User className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Account</h2>
                <p className="text-sm text-muted-foreground">Manage your account details and preferences</p>
              </div>
            </div>
            
            <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <Button 
                variant="gradient" 
                onClick={handleSaveProfile} 
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </Button>
            </div>
          </motion.div>
        )}

        {/* Appearance Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Palette className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Appearance</h2>
              <p className="text-sm text-muted-foreground">Customize the look and feel of the app</p>
            </div>
          </div>
          
          <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
            {/* Theme Selection */}
            <div className="space-y-3">
              <Label>Theme</Label>
              <div className="flex gap-2">
                {themeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={theme === option.value ? 'default' : 'outline'}
                    onClick={() => setTheme(option.value)}
                    className="flex-1 gap-2"
                  >
                    {option.icon}
                    {option.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {theme === 'system' 
                  ? 'Theme will match your system preference' 
                  : `Using ${theme} theme`}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Quick Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold mb-4">Quick Settings</h2>
          <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-enhance" className="flex flex-col">
                <span>Auto-enhance uploads</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Automatically improve image quality on upload
                </span>
              </Label>
              <Switch 
                id="auto-enhance" 
                checked={autoEnhance}
                onCheckedChange={setAutoEnhance}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="high-quality" className="flex flex-col">
                <span>High quality previews</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Use higher quality thumbnails (uses more data)
                </span>
              </Label>
              <Switch 
                id="high-quality" 
                checked={highQuality}
                onCheckedChange={setHighQuality}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
}
