import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const getBearerToken = (req: any): string | null => {
  const header = req.headers.authorization ?? req.headers.Authorization;
  if (!header || typeof header !== 'string') return null;
  const [type, token] = header.split(' ');
  return type?.toLowerCase() === 'bearer' ? token ?? null : null;
};

const assertSuperAdmin = async (req: any, supabase: ReturnType<typeof adminClient>) => {
  const token = getBearerToken(req);
  if (!token) throw new Error('Missing authorization token');

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) throw new Error('Invalid authorization token');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (profile?.role !== 'superadmin') throw new Error('SuperAdmin role required');

  return userData.user;
};

const findUserByEmail = async (supabase: ReturnType<typeof adminClient>, email: string) => {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find(user => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
};

const seedSuperAdmin = async (supabase: ReturnType<typeof adminClient>, email: string, password: string) => {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'superadmin')
    .limit(1);

  if (existing && existing.length > 0) {
    return { uid: existing[0].id, exists: true };
  }

  const existingAuthUser = await findUserByEmail(supabase, email);
  const user = existingAuthUser
    ? existingAuthUser
    : (await supabase.auth.admin.createUser({ email, password, email_confirm: true })).data.user;

  if (!user) throw new Error('Could not create SuperAdmin user');

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email,
      role: 'superadmin',
      branch_id: null,
      branch_name: null,
    });

  if (profileError) throw profileError;
  return { uid: user.id, exists: false };
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const supabase = adminClient();
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const action = body?.action;

    if (action === 'seedSuperAdmin') {
      const result = await seedSuperAdmin(
        supabase,
        body?.email ?? 'superadmin@aresto.com',
        body?.password ?? 'Admin1234!',
      );
      res.status(200).json(result);
      return;
    }

    await assertSuperAdmin(req, supabase);

    if (action === 'create') {
      const { email, password, role, branchId, branchName } = body;
      if (!email || !password || !role) throw new Error('email, password, and role are required');

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw error;
      if (!data.user) throw new Error('Could not create user');

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          role,
          branch_id: branchId ?? null,
          branch_name: branchName ?? null,
        });

      if (profileError) throw profileError;
      res.status(200).json({ uid: data.user.id });
      return;
    }

    if (action === 'updateCredentials') {
      const { currentEmail, newEmail, newPassword } = body;
      if (!currentEmail || !newEmail || !newPassword) {
        throw new Error('currentEmail, newEmail, and newPassword are required');
      }

      const user = await findUserByEmail(supabase, currentEmail);
      if (!user) throw new Error('User not found');

      const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
        email: newEmail,
        password: newPassword,
        email_confirm: true,
      });
      if (error) throw error;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ email: newEmail })
        .eq('id', user.id);
      if (profileError) throw profileError;

      res.status(200).json({ uid: data.user?.id ?? user.id });
      return;
    }

    res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
