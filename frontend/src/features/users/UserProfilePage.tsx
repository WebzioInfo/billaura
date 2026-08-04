import React from 'react';
import { User, Shield, Key, Bell, Clock } from 'lucide-react';
import { useSessionStore } from '../auth/stores/sessionStore';

export const UserProfilePage = () => {
  const { user } = useSessionStore();

  return (
    <div className="space-y-6 text-left p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <User className="w-7 h-7 text-accent" />
            Personal Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Manage your personal information, security settings, and notification preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="p-6 bg-card border border-border rounded-xl flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-accent/20 text-accent flex items-center justify-center text-3xl font-bold mb-4">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <h2 className="text-xl font-bold text-foreground">{user?.name || 'User'}</h2>
            <p className="text-sm text-muted-foreground mb-4">{user?.email || 'user@example.com'}</p>
            <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full uppercase tracking-wider">
              {user?.role || 'User'}
            </span>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="p-6 bg-card border border-border rounded-xl">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-muted-foreground" /> Personal Information
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Basic details about your profile. Update them as needed.
            </p>
            {/* Placeholder for form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name</label>
                <div className="p-2 bg-muted/50 border border-border rounded-lg text-sm">{user?.name || 'User Name'}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email Address</label>
                <div className="p-2 bg-muted/50 border border-border rounded-lg text-sm">{user?.email || 'user@example.com'}</div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-card border border-border rounded-xl">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-muted-foreground" /> Security & Authentication
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-accent" />
                  <div>
                    <h4 className="text-sm font-medium">Change Password</h4>
                    <p className="text-xs text-muted-foreground">Update your account password</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors">
                  Update
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-green-500" />
                  <div>
                    <h4 className="text-sm font-medium">Two-Factor Authentication</h4>
                    <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  Enable 2FA
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 bg-card border border-border rounded-xl">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-muted-foreground" /> Notification Preferences
            </h3>
            <p className="text-sm text-muted-foreground">Manage how you receive alerts and updates.</p>
            {/* Placeholder for notification toggles */}
            <div className="mt-4 p-4 border border-border rounded-lg flex items-center justify-between bg-muted/30">
              <span className="text-sm">Email Notifications</span>
              <div className="w-10 h-5 bg-accent/20 rounded-full relative cursor-pointer">
                <div className="w-4 h-4 bg-accent rounded-full absolute top-0.5 right-0.5"></div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-card border border-border rounded-xl">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-muted-foreground" /> Active Sessions
            </h3>
            <p className="text-sm text-muted-foreground">Devices currently logged into your account.</p>
            <div className="mt-4 p-4 border border-border rounded-lg bg-muted/30">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">Current Session (Windows, Chrome)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Last active: Just now</p>
                </div>
                <span className="text-xs text-green-500 font-semibold px-2 py-1 bg-green-500/10 rounded">Active</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
