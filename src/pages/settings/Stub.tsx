import { SettingsSubPage } from "@/components/SettingsSubPage";

export function StubPage({ title, message }: { title: string; message?: string }) {
  return (
    <SettingsSubPage title={title}>
      <div className="bg-card rounded-2xl p-6 text-center shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
        <p className="text-foreground font-medium">Coming soon</p>
        <p className="text-sm text-muted-foreground mt-1">
          {message ?? "This section is being built. Check back shortly."}
        </p>
      </div>
    </SettingsSubPage>
  );
}

export function AIPage() {
  return <StubPage title="AI Controls" message="Reasoning, memory, safety, and presets are on the way." />;
}
export function NotificationsPage() {
  return <StubPage title="Notifications" message="Push and in-app alerts are on the way." />;
}
export function AboutPage() {
  return <StubPage title="About & Legal" message="Terms, privacy, and licenses are on the way." />;
}
export function SupportPage() {
  return <StubPage title="Support" message="Report a problem and ticket tracking are on the way." />;
}