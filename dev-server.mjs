/**
 * dev-server.mjs
 * ──────────────
 * Local Express server that mirrors the Vercel /api/admin-users function.
 * Run alongside Vite dev server: `node dev-server.mjs`
 * Vite proxies /api → http://localhost:3001
 */
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config(); // load .env

const app  = express();
const PORT = 3001;

app.use(express.json());

// Allow CORS from Vite dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.sendStatus(200); return; }
  next();
});

const rawUrl       = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseUrl  = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceKey) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const adminClient = () =>
  createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

const getBearerToken = req => {
  const header = req.headers.authorization ?? '';
  const [type, token] = header.split(' ');
  return type?.toLowerCase() === 'bearer' ? token ?? null : null;
};

const assertSuperAdmin = async (req, supabase) => {
  const token = getBearerToken(req);
  if (!token) throw new Error('Missing authorization token');
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid token');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (profile?.role !== 'superadmin') throw new Error('SuperAdmin role required');
  return data.user;
};

const findUserByEmail = async (supabase, email) => {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return (data?.users ?? []).find(u => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
};

app.post('/api/admin-users', async (req, res) => {
  try {
    const supabase = adminClient();
    const body     = req.body ?? {};
    const action   = body.action;

    // ── seedSuperAdmin ────────────────────────────────────────────────────────
    if (action === 'seedSuperAdmin') {
      const email    = body.email    ?? 'superadmin@aresto.com';
      const password = body.password ?? 'Admin1234!';

      const { data: existing } = await supabase.from('profiles').select('id').eq('role', 'superadmin').limit(1);
      if (existing?.length > 0) {
        res.json({ uid: existing[0].id, exists: true }); return;
      }

      let user = await findUserByEmail(supabase, email);
      if (!user) {
        const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) throw error;
        user = data.user;
      }

      await supabase.from('profiles').upsert({
        id: user.id, email, role: 'superadmin', branch_id: null, branch_name: null,
      });

      res.json({ uid: user.id, exists: false }); return;
    }

    // All other actions require superadmin auth
    await assertSuperAdmin(req, supabase);

    // ── create ────────────────────────────────────────────────────────────────
    if (action === 'create') {
      const { email, password, role, branchId, branchName } = body;
      if (!email || !password || !role) throw new Error('email, password, role are required');

      const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) throw error;

      const { error: pe } = await supabase.from('profiles').insert({
        id: data.user.id, email, role, branch_id: branchId ?? null, branch_name: branchName ?? null,
      });
      if (pe) throw pe;

      res.json({ uid: data.user.id }); return;
    }

    // ── updateCredentials ─────────────────────────────────────────────────────
    if (action === 'updateCredentials') {
      const { currentEmail, newEmail, newPassword } = body;
      if (!currentEmail || !newEmail || !newPassword) throw new Error('currentEmail, newEmail, newPassword are required');

      const user = await findUserByEmail(supabase, currentEmail);
      if (!user) throw new Error('User not found');

      const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
        email: newEmail, password: newPassword, email_confirm: true,
      });
      if (error) throw error;

      await supabase.from('profiles').update({ email: newEmail }).eq('id', user.id);

      res.json({ uid: data.user?.id ?? user.id }); return;
    }

    res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('API error:', err);
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`✅  Dev API server running at http://localhost:${PORT}`);
  console.log(`    Supabase: ${supabaseUrl}`);
});
