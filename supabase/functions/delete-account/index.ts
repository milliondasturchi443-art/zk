// ZK — delete-account edge function
//
// Called from the Profile screen with the user's own access token and their
// current password. Deleting an account is a privileged operation: it removes
// the auth.users row, which cascades to every ZK table that references it
// (profiles, test_sessions, question_attempts, lesson_progress, bookmarks,
// audit_logs.actor_id, ...). That is deliberately not reachable from the
// client, so it lives here behind the service role.
//
// Flow:
//   1. Resolve the caller from the incoming Authorization header.
//   2. Re-verify their password (an authenticated token alone is not enough —
//      a stolen/long-lived session should not be able to self-destruct an
//      account without the password).
//   3. Delete the user via the Auth admin API.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** JSON error with a stable shape; `callEdgeFunction` reads `error`/`message`. */
function fail(status: number, error: string, message = error): Response {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail(405, "method_not_allowed");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return fail(500, "server_misconfigured");
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return fail(401, "not_authenticated");
  }

  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    return fail(400, "invalid_body", "Expected a JSON body with a password.");
  }
  if (typeof password !== "string" || password.length === 0) {
    return fail(400, "password_required", "Enter your password to confirm.");
  }

  // Resolves the caller from the *incoming* token, so we never trust a user id
  // supplied by the client.
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await caller.auth.getUser(token);
  if (userError || !userData.user) {
    return fail(401, "not_authenticated");
  }
  const user = userData.user;
  if (!user.email) {
    return fail(400, "no_email", "This account has no email address.");
  }

  // Password check. signInWithPassword mints a throwaway session which we
  // ignore; persistSession is off so nothing leaks into any shared storage.
  const { error: passwordError } = await caller.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (passwordError) {
    const wrongPassword =
      passwordError.status === 400 || passwordError.message.toLowerCase().includes("invalid");
    return wrongPassword
      ? fail(403, "invalid_password", "Incorrect password.")
      : fail(500, "password_check_failed", "Could not verify the password.");
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("[delete-account] admin.deleteUser failed", deleteError);
    return fail(500, "delete_failed", "Could not delete the account.");
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
