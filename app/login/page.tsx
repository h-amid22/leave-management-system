import { LoginForm } from "@/components/auth/login-form";
import { Icon } from "@/components/ui/icon";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="brand brand-light"><span className="brand-mark"><Icon name="calendar" /></span><span>LeaveFlow</span></div>
        <div className="login-brand-copy"><span className="eyebrow eyebrow-light">Time away, made simple</span><h1>Plan leave.<br />Stay in sync.</h1><p>A clear, calm place to manage your leave and keep your team informed.</p></div>
        <small>Employee Leave Management</small>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-heading"><span className="mobile-login-logo"><Icon name="calendar" /></span><h2>Welcome back</h2><p>Sign in to manage your leave requests.</p></div>
          <LoginForm nextPath={next} />
        </div>
      </section>
    </main>
  );
}
