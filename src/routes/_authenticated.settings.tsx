import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, LogOut } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Nexus AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { data } = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profile = data?.profile;
  const roles = data?.roles ?? [];

  const [fullName, setFullName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile?.full_name]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!profile?.avatar_url) {
        setAvatarPreview(null);
        return;
      }
      const { data: signed } = await supabase.storage
        .from("avatars")
        .createSignedUrl(profile.avatar_url, 3600);
      if (!cancelled) setAvatarPreview(signed?.signedUrl ?? null);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [profile?.avatar_url]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() || null })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user!.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("user_id", user!.id);
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      toast.success("Avatar updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPw.length < 8) throw new Error("Password must be at least 8 characters");
      // Re-auth check
      const { error: reErr } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPw,
      });
      if (reErr) throw new Error("Current password is incorrect");
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password changed");
      setCurrentPw("");
      setNewPw("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const initials = (profile?.full_name || user?.email || "U")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your profile and workspace preferences." />

      <Card className="border-border/60 shadow-[var(--shadow-soft)]">
        <CardHeader>
          <CardTitle className="font-display text-base tracking-tight">Profile</CardTitle>
          <CardDescription>Update your name and avatar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 ring-1 ring-border">
              {avatarPreview && <AvatarImage src={avatarPreview} alt="" />}
              <AvatarFallback className="bg-primary text-base text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar.mutate(f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploadAvatar.isPending}
                className="rounded-full"
              >
                {uploadAvatar.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-3.5 w-3.5" />
                )}
                Upload new
              </Button>
              <p className="text-xs text-muted-foreground">PNG, JPG or WEBP. Max 2 MB.</p>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} readOnly className="bg-muted/40" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Roles:</span>
            {roles.length === 0 ? (
              <Badge variant="secondary">none</Badge>
            ) : (
              roles.map((r) => (
                <Badge key={r} variant="secondary" className="capitalize">
                  {r.replace("_", " ")}
                </Badge>
              ))
            )}
            <Badge variant="outline" className="ml-auto capitalize">
              {profile?.status ?? "—"}
            </Badge>
          </div>

          <Button
            className="rounded-full"
            onClick={() => saveProfile.mutate()}
            disabled={saveProfile.isPending}
          >
            {saveProfile.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Save changes
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-[var(--shadow-soft)]">
        <CardHeader>
          <CardTitle className="font-display text-base tracking-tight">Security</CardTitle>
          <CardDescription>Change your password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="current">Current password</Label>
            <Input
              id="current"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new">New password</Label>
            <Input
              id="new"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => changePassword.mutate()}
            disabled={changePassword.isPending || !currentPw || !newPw}
          >
            {changePassword.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Update password
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-[var(--shadow-soft)]">
        <CardHeader>
          <CardTitle className="font-display text-base tracking-tight">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Dark mode</Label>
              <p className="text-xs text-muted-foreground">Switch between light and dark theme.</p>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggle} />
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Email notifications</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when documents finish processing.
              </p>
            </div>
            <Switch disabled />
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40 shadow-[var(--shadow-soft)]">
        <CardHeader>
          <CardTitle className="font-display text-base tracking-tight">Sign out</CardTitle>
          <CardDescription>End your session on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            className="rounded-full"
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
