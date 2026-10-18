import "./_group.css";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const user = {
  username: "marketmember",
  email: "member@example.com",
  telegramUsername: "@marketmember",
  createdAt: "October 2026",
};

export function Current() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6 pb-20">
        <div>
          <p className="text-xs text-muted-foreground">Your account</p>
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-auto w-full justify-start gap-6 rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger value="dashboard" className="rounded-none border-b-2 border-transparent px-0 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent">Dashboard</TabsTrigger>
            <TabsTrigger value="orders" className="rounded-none border-b-2 border-transparent px-0 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent">Orders</TabsTrigger>
            <TabsTrigger value="balance" className="rounded-none border-b-2 border-transparent px-0 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent">Balance</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent px-0 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="pt-6">
            <Card className="border-border bg-card/40">
              <CardHeader><CardTitle>Account Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Username</p><p className="text-lg font-bold">{user.username}</p></div>
                <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Email</p><p className="text-lg font-bold">{user.email}</p></div>
                <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Telegram</p><p className="text-lg font-bold">{user.telegramUsername}</p></div>
                <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Member Since</p><p className="text-sm">{user.createdAt}</p></div>
                <button className="mt-4 h-10 w-full rounded-lg border border-red-500/30 bg-red-500/10 text-sm font-bold uppercase tracking-wider text-red-400">Logout</button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="orders" className="pt-6"><div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">Orders tab from the current account page</div></TabsContent>
          <TabsContent value="balance" className="pt-6"><div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">Balance tab from the current account page</div></TabsContent>
          <TabsContent value="settings" className="pt-6"><div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">Settings tab from the current account page</div></TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
