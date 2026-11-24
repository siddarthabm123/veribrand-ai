'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ShieldCheck, Check, ArrowLeft } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { brandName } from '@/lib/brand-profile';
import { saveSession } from '@/lib/session';

type Mode = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'callback';
const headings: Record<Mode, string> = { login: 'Good to have you back.', signup: 'Make your brand’s word count.', 'forgot-password': 'Let’s get you back in.', 'reset-password': 'A fresh start.', callback: 'Opening your workspace.' };

export default function AuthScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recoveryReady, setRecoveryReady] = useState(false);
  const configured = Boolean(getSupabaseBrowser());

  useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client || !['callback', 'reset-password'].includes(mode)) return;
    let active = true;
    const sync = async () => {
      const { data, error: sessionError } = await client.auth.getSession();
      if (!active) return;
      if (sessionError || !data.session) { setError('This link has expired or is invalid. Request a new email and open the latest link.'); return; }
      if (mode === 'reset-password') { setRecoveryReady(true); return; }
      const { data: verified, error: verifyError } = await client.auth.getUser();
      if (!active) return;
      if (verifyError || !verified.user) { setError('We could not verify this session. Please sign in again.'); return; }
      saveSession({ name: String(verified.user.user_metadata?.full_name || verified.user.email?.split('@')[0] || 'Member'), email: verified.user.email, workspace: brandName(verified.user.user_metadata?.brand_name) || 'Your brand', role: 'Content Creator', entered: true });
      router.replace('/');
    };
    void sync();
    const { data: listener } = client.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY' && active) setRecoveryReady(true); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [mode, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(''); setMessage('');
    const client = getSupabaseBrowser();
    if (!client) { setError('Account access is not configured on this deployment yet. You can explore the demo below.'); return; }
    const values = new FormData(event.currentTarget);
    const email = String(values.get('email') || '').trim();
    const password = String(values.get('password') || '');
    if (mode === 'signup' && brandName(values.get('brand')).length < 2) { setError('Enter a brand name with at least two characters.'); return; }
    if (['signup', 'reset-password'].includes(mode) && password !== values.get('confirm')) { setError('Your passwords do not match.'); return; }
    setBusy(true);
    try {
      if (mode === 'forgot-password') {
        const result = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (result.error) throw result.error;
        setMessage('If an account matches that email, a reset link will arrive shortly. Check your spam folder too.');
      } else if (mode === 'reset-password') {
        if (!recoveryReady) throw new Error('Open a valid password-reset email before setting your password.');
        const result = await client.auth.updateUser({ password });
        if (result.error) throw result.error;
        await client.auth.signOut();
        setRecoveryReady(false);
        setMessage('Your password has been updated. Sign in with your new password.');
      } else if (mode === 'signup') {
        const result = await client.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { full_name: String(values.get('name') || '').trim(), brand_name: brandName(values.get('brand')) } } });
        if (result.error) throw result.error;
        if (!result.data.session || !result.data.user) {
          throw new Error('Direct signup is not enabled for this project yet. The project owner must turn off Confirm email in Supabase Authentication → Sign In / Providers → Email.');
        }
        saveSession({ name: String(result.data.user.user_metadata?.full_name || email.split('@')[0]), email: result.data.user.email, workspace: brandName(result.data.user.user_metadata?.brand_name) || 'Your brand', role: 'Content Creator', entered: true });
        router.replace('/');
      } else {
        const result = await client.auth.signInWithPassword({ email, password });
        if (result.error) throw new Error('Unable to sign in. Check your email and password, or reset your password.');
        router.replace('/auth/callback');
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not complete your request. Please try again.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><aside className="auth-story"><Link className="auth-brand" href="/welcome"><ShieldCheck size={25}/>veribrand<span>ai</span></Link><div className="auth-story-copy"><h2>Trust is built.<br/>{' '}Word by word.</h2><p>A shared place for your claims, your evidence, and the people who stand behind them.</p><div className="auth-proof" aria-label="VeriBrand review workflow"><span>Claim</span><i/><span>Evidence</span><i/><span>Approval</span></div></div><p className="auth-story-foot">Your voice. Your rules. Your final word.</p></aside><section className="auth-panel"><Link className="auth-back" href="/welcome"><ArrowLeft size={16}/>Back to VeriBrand</Link><div className="auth-form-wrap">{['login', 'signup'].includes(mode) && <nav className="auth-tabs" aria-label="Account access"><Link href="/login" aria-current={mode === 'login' ? 'page' : undefined}>Sign in</Link><Link href="/signup" aria-current={mode === 'signup' ? 'page' : undefined}>Create account</Link></nav>}<h1>{headings[mode]}</h1><p className="auth-subtitle">{mode === 'login' ? 'Sign in to continue your work.' : mode === 'signup' ? 'Start with your name and email.' : mode === 'forgot-password' ? 'We’ll send a secure password-reset link.' : mode === 'reset-password' ? 'Choose a new password for your account.' : 'Please wait while we verify your session.'}</p>{!configured && <p className="auth-notice">Account access is awaiting setup. The demo is available below.</p>}{mode !== 'callback' && <form onSubmit={submit}>{mode === 'signup' && <label>Full name<input name="name" autoComplete="name" maxLength={80} required pattern=".*\S.*" placeholder="Your name"/></label>}{mode === 'signup' && <label>Brand name<input name="brand" autoComplete="organization" minLength={2} maxLength={80} required pattern=".*\S.*" placeholder="Your company or brand"/></label>}{mode !== 'reset-password' && <label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@company.com"/></label>}{mode !== 'forgot-password' && <><label>Password<div className="auth-password"><input name="password" type={visible ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'login' ? 1 : 12} maxLength={128} required aria-describedby={mode !== 'login' ? 'password-help' : undefined}/><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div></label>{mode !== 'login' && <><p className="auth-help" id="password-help">Use at least 12 characters. Spaces and password managers are welcome.</p><label>Confirm password<input name="confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={128} required/></label></>}{mode === 'login' && <Link className="auth-forgot" href="/forgot-password">Forgot password?</Link>}</>}{error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-success" role="status"><Check size={18}/>{message}</p>}<button className="auth-submit" disabled={busy || !configured || (mode === 'reset-password' && !recoveryReady)} type="submit">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'forgot-password' ? 'Send reset link' : 'Update password'}</button></form>}{mode === 'callback' && error && <p className="auth-error" role="alert">{error}</p>}{!['login', 'signup'].includes(mode) && <Link className="auth-return" href="/login">Return to sign in</Link>}<div className="auth-demo"><span>Just looking around?</span><Link href="/judge">Try judge demo</Link></div></div><footer className="auth-footer">Account sign-in identifies you. Workspace permissions are configured separately.</footer></section></main>;
}
