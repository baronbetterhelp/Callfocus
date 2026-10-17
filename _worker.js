const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' };
const enc = new TextEncoder();
const dec = new TextDecoder();

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/')) {
        return await handleApi(request, env, ctx, url);
      }
      if (url.pathname.startsWith('/media/')) {
        return await serveMedia(request, env, url.pathname.slice('/media/'.length));
      }
      if (url.pathname === '/admin' || url.pathname === '/admin/') {
        const assetUrl = new URL(request.url);
        assetUrl.pathname = '/admin.html';
        assetUrl.search = `?v=2.5.0`;
        return adminAsset(env,new Request(assetUrl.toString(),{method:'GET',headers:request.headers}));
      }
      if(['/admin.html','/admin.js','/admin.css'].includes(url.pathname)) return adminAsset(env,request);
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error('Unhandled worker error', err);
      return apiError('Service temporarily unavailable.', 503);
    }
  },
};

async function adminAsset(env,request){
  const res=await env.ASSETS.fetch(request);
  const headers=new Headers(res.headers);
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('pragma','no-cache');
  headers.set('expires','0');
  headers.set('x-toolcart-admin-build','2.5.0');
  return new Response(res.body,{status:res.status,statusText:res.statusText,headers});
}

async function handleApi(request, env, ctx, url) {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') return new Response(null, { status: 204 });
  if (pathname === '/api/health') return apiOk({ ok: true, service: 'ToolCart', version: '2.5.0' });

  if (pathname === '/api/public/bootstrap' && method === 'GET') return publicBootstrap(env);
  if (pathname === '/api/auth/register' && method === 'POST') return register(request, env);
  if (pathname === '/api/auth/login' && method === 'POST') return login(request, env);
  if (pathname === '/api/auth/logout' && method === 'POST') return logout(request, env);
  if (pathname === '/api/auth/verify-email' && method === 'POST') return verifyEmail(request, env);
  if (pathname === '/api/auth/resend-verification' && method === 'POST') return resendVerification(request, env);
  if (pathname === '/api/auth/forgot-password' && method === 'POST') return forgotPassword(request, env);
  if (pathname === '/api/auth/reset-password' && method === 'POST') return resetPassword(request, env);

  if (pathname === '/api/admin/bootstrap' && method === 'POST') return bootstrapAdmin(request, env);
  if (pathname === '/api/admin/login' && method === 'POST') return adminLogin(request, env);
  if (pathname === '/api/admin/logout' && method === 'POST') return adminLogout(request, env);

  if (pathname === '/api/payments/paystack/webhook' && method === 'POST') return paystackWebhook(request, env);

  if (pathname.startsWith('/api/admin/')) {
    const admin = await requireAdmin(request, env);
    if (admin.response) return admin.response;
    if (!['GET', 'HEAD'].includes(method)) {
      const csrf = verifyCsrf(request, admin.session.csrf_token);
      if (csrf) return csrf;
    }
    return handleAdminApi(request, env, ctx, url, admin);
  }

  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  if (!['GET', 'HEAD'].includes(method)) {
    const csrf = verifyCsrf(request, auth.session.csrf_token);
    if (csrf) return csrf;
  }
  return handleUserApi(request, env, ctx, url, auth);
}

async function handleUserApi(request, env, ctx, url, auth) {
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const user = auth.user;

  if (path === '/api/bootstrap' && method === 'GET') return userBootstrap(env, user);
  if (path === '/api/session' && method === 'GET') return apiOk({ user: sanitizeUser(user), csrfToken: auth.session.csrf_token });
  if (path === '/api/profile' && method === 'GET') return getProfile(env, user.id);
  if (path === '/api/profile' && method === 'PATCH') return updateProfile(request, env, user.id);
  if (path === '/api/profile/avatar' && method === 'POST') return uploadProfileAvatar(request, env, user.id);
  if (path === '/api/account/change-password' && method === 'POST') return changePassword(request, env, user.id);
  if (path === '/api/account/delete-request' && method === 'POST') return requestDeletion(env, user.id);
  if (path === '/api/sessions' && method === 'GET') return listSessions(env, user.id, auth.session.id);
  if (path.match(/^\/api\/sessions\/\d+\/revoke$/) && method === 'POST') return revokeSession(env, user.id, Number(path.split('/')[3]), auth.session.id);

  if (path === '/api/apps' && method === 'GET') return listApps(env, user.id);
  if (path.match(/^\/api\/apps\/\d+\/favorite$/) && method === 'POST') return toggleFavorite(env, user.id, Number(path.split('/')[3]));
  if (path.match(/^\/api\/apps\/\d+\/open$/) && method === 'POST') return openApp(env, user.id, Number(path.split('/')[3]));

  if (path === '/api/products' && method === 'GET') return listProducts(env, user.id);
  if (path.match(/^\/api\/products\/\d+$/) && method === 'GET') return getProductDetail(env, user.id, Number(path.split('/')[3]));
  if (path.match(/^\/api\/products\/\d+\/file$/) && method === 'GET') return serveProductFile(request, env, user.id, Number(path.split('/')[3]));
  if (path.match(/^\/api\/products\/\d+\/assets\/\d+\/file$/) && method === 'GET') return serveProductAssetFile(request, env, user.id, Number(path.split('/')[3]), Number(path.split('/')[5]));
  if (path.match(/^\/api\/products\/\d+\/buy$/) && method === 'POST') return buyProductNow(request, env, user, Number(path.split('/')[3]));
  if (path === '/api/cart' && method === 'GET') return getCart(env, user.id);
  if (path === '/api/cart/items' && method === 'POST') return addCartItem(request, env, user.id);
  if (path.match(/^\/api\/cart\/items\/\d+$/) && method === 'PATCH') return updateCartItem(request, env, user.id, Number(path.split('/')[4]));
  if (path.match(/^\/api\/cart\/items\/\d+$/) && method === 'DELETE') return deleteCartItem(env, user.id, Number(path.split('/')[4]));
  if (path === '/api/cart/checkout' && method === 'POST') return checkoutCart(request, env, user);

  if (path === '/api/updates' && method === 'GET') return listUpdates(env, user.id);
  if (path.match(/^\/api\/updates\/\d+\/read$/) && method === 'POST') return readUpdate(env, user.id, Number(path.split('/')[3]));

  if (path === '/api/requests' && method === 'GET') return listRequests(env, user.id);
  if (path === '/api/requests' && method === 'POST') return createRequest(request, env, user.id);
  if (path.match(/^\/api\/requests\/\d+$/) && method === 'GET') return getRequest(env, user.id, Number(path.split('/')[3]));
  if (path.match(/^\/api\/requests\/\d+\/messages$/) && method === 'POST') return addRequestMessage(request, env, user.id, Number(path.split('/')[3]));

  if (path === '/api/notifications' && method === 'GET') return listNotifications(env, user.id, url.searchParams);
  if (path.match(/^\/api\/notifications\/\d+\/read$/) && method === 'POST') return setNotificationRead(env, user.id, Number(path.split('/')[3]), true);
  if (path.match(/^\/api\/notifications\/\d+\/unread$/) && method === 'POST') return setNotificationRead(env, user.id, Number(path.split('/')[3]), false);
  if (path.match(/^\/api\/notifications\/\d+\/dismiss$/) && method === 'POST') return dismissNotification(env, user.id, Number(path.split('/')[3]));

  if (path === '/api/subscriptions/plans' && method === 'GET') return listPlans(env);
  if (path === '/api/payments' && method === 'GET') return listPayments(env, user.id);
  if (path === '/api/payments/paystack/initialize' && method === 'POST') return initializePaystack(request, env, user);
  if (path === '/api/payments/paystack/verify' && method === 'GET') return verifyPaystackForUser(env, user.id, url.searchParams.get('reference'));
  if (path === '/api/search' && method === 'GET') return searchEcosystem(env, user.id, url.searchParams.get('q') || '');

  return apiError('Not found.', 404);
}

async function handleAdminApi(request, env, ctx, url, admin) {
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (path === '/api/admin/session' && method === 'GET') return apiOk({ admin: sanitizeAdmin(admin.user), csrfToken: admin.session.csrf_token });
  if (path === '/api/admin/dashboard' && method === 'GET') return adminDashboard(env);
  if (path === '/api/admin/customers' && method === 'GET') return adminCustomers(env, url.searchParams);
  if (path.match(/^\/api\/admin\/customers\/\d+$/) && method === 'GET') return adminCustomerDetail(env, Number(path.split('/')[4]));
  if (path.match(/^\/api\/admin\/customers\/\d+\/action$/) && method === 'POST') return adminCustomerAction(request, env, admin, Number(path.split('/')[4]));

  if (path === '/api/admin/apps' && method === 'GET') return adminApps(env);
  if (path === '/api/admin/apps' && method === 'POST') return adminCreateApp(request, env, admin);
  if (path.match(/^\/api\/admin\/apps\/\d+$/) && method === 'PATCH') return adminUpdateApp(request, env, admin, Number(path.split('/')[4]));
  if (path.match(/^\/api\/admin\/apps\/\d+$/) && method === 'DELETE') return adminDeleteApp(env, admin, Number(path.split('/')[4]));
  if (path === '/api/admin/uploads/icon' && method === 'POST') return adminUploadIcon(request, env, admin);

  if (path === '/api/admin/products' && method === 'GET') return adminProducts(env);
  if (path === '/api/admin/products' && method === 'POST') return adminCreateProduct(request, env, admin);
  if (path.match(/^\/api\/admin\/products\/\d+$/) && method === 'PATCH') return adminUpdateProduct(request, env, admin, Number(path.split('/')[4]));
  if (path.match(/^\/api\/admin\/products\/\d+$/) && method === 'DELETE') return adminDeleteProduct(env, admin, Number(path.split('/')[4]));
  if (path === '/api/admin/uploads/product-cover' && method === 'POST') return adminUploadProductCover(request, env, admin);
  if (path === '/api/admin/uploads/product-file' && method === 'POST') return adminUploadProductFile(request, env, admin);

  if (path === '/api/admin/updates' && method === 'GET') return adminUpdates(env);
  if (path === '/api/admin/updates' && method === 'POST') return adminCreateUpdate(request, env, admin);
  if (path.match(/^\/api\/admin\/updates\/\d+$/) && method === 'DELETE') return adminDeleteUpdate(env, admin, Number(path.split('/')[4]));

  if (path === '/api/admin/requests' && method === 'GET') return adminRequests(env, url.searchParams);
  if (path.match(/^\/api\/admin\/requests\/\d+\/respond$/) && method === 'POST') return adminRespondRequest(request, env, admin, Number(path.split('/')[4]));

  if (path === '/api/admin/notifications' && method === 'GET') return adminNotifications(env);
  if (path === '/api/admin/notifications' && method === 'POST') return adminCreateNotification(request, env, admin);

  if (path === '/api/admin/subscriptions/plans' && method === 'GET') return adminPlans(env);
  if (path === '/api/admin/subscriptions/plans' && method === 'POST') return adminCreatePlan(request, env, admin);
  if (path.match(/^\/api\/admin\/subscriptions\/plans\/\d+$/) && method === 'PATCH') return adminUpdatePlan(request, env, admin, Number(path.split('/')[5]));

  if (path === '/api/admin/payments' && method === 'GET') return adminPayments(env, url.searchParams);
  if (path === '/api/admin/analytics' && method === 'GET') return adminAnalytics(env);
  if (path === '/api/admin/settings' && method === 'GET') return adminGetSettings(env);
  if (path === '/api/admin/settings' && method === 'PATCH') return adminUpdateSettings(request, env, admin);
  if (path === '/api/admin/promos' && method === 'GET') return adminPromos(env);
  if (path === '/api/admin/promos' && method === 'POST') return adminCreatePromo(request, env, admin);
  if (path === '/api/admin/audit' && method === 'GET') return adminAudit(env, url.searchParams);
  if (path === '/api/admin/diagnostics' && method === 'GET') return adminDiagnostics(env);

  return apiError('Not found.', 404);
}

// ---------- Authentication ----------

async function register(request, env) {
  const temporarySignupMode = allowUnverifiedSignup(env);
  if (!mailConfigured(env) && !temporarySignupMode) return apiError('Email delivery is not configured yet. Add Resend secrets before registration.', 503);
  const limit = await enforceRateLimit(request, env, 'register', 6, 600);
  if (limit) return limit;
  const body = await readJson(request);
  if (!body) return apiError('Invalid request.', 400);
  const email = normalizeEmail(body.email);
  const fullName = cleanText(body.fullName, 120);
  const password = String(body.password || '');
  if (!isEmail(email) || fullName.length < 2 || password.length < 10) return apiError('Enter a valid name, email and a password of at least 10 characters.', 400);

  const exists = await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();
  if (exists) return apiError('An account already exists for this email.', 409);

  const { hash, salt } = await hashPassword(password);
  const firstName = fullName.trim().split(/\s+/)[0].slice(0, 60);
  const customerId = await uniqueCustomerId(env);
  const verifiedAt = temporarySignupMode ? new Date().toISOString() : null;
  const result = await env.DB.prepare(`INSERT INTO users(customer_id,email,password_hash,password_salt,full_name,first_name,email_verified_at) VALUES(?,?,?,?,?,?,?)`)
    .bind(customerId, email, hash, salt, fullName, firstName, verifiedAt).run();
  const userId = result.meta.last_row_id;

  if (temporarySignupMode) {
    const session = await createSession(env, request, userId, false);
    await env.DB.prepare('UPDATE users SET last_active_at=CURRENT_TIMESTAMP WHERE id=?').bind(userId).run();
    const user = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(userId).first();
    return new Response(JSON.stringify({
      ok: true,
      message: 'Account created. Temporary email-verification bypass is enabled for development.',
      user: sanitizeUser(user),
      csrfToken: session.csrf,
      emailVerificationRequired: false,
      temporarySignupMode: true,
    }), {
      status: 201,
      headers: { ...jsonHeaders, 'set-cookie': session.cookie },
    });
  }

  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expires = isoInHours(24);
  await env.DB.prepare(`INSERT INTO email_tokens(user_id,purpose,token_hash,expires_at) VALUES(?,?,?,?)`)
    .bind(userId, 'verify_email', tokenHash, expires).run();
  const origin = appOrigin(env, request);
  const verifyUrl = `${origin}/?verify=${encodeURIComponent(token)}`;
  const sent = await sendEmail(env, {
    to: email,
    subject: 'Verify your ToolCart account',
    html: emailShell('Verify your ToolCart account', `<p>Hello ${escapeHtml(firstName)},</p><p>Confirm your email to activate your ToolCart ecosystem account.</p><p><a href="${escapeHtml(verifyUrl)}" style="display:inline-block;padding:13px 18px;border-radius:12px;background:#725cff;color:#fff;text-decoration:none;font-weight:700">Verify email</a></p><p>This link expires in 24 hours.</p>`),
  });
  if (!sent.ok) {
    console.error('Registration email failed', sent.error);
    await env.DB.prepare('DELETE FROM users WHERE id=?').bind(userId).run();
    return apiError('We could not send the verification email. Please try again.', 503);
  }
  return apiOk({ message: 'Account created. Check your email to verify your account.' }, 201);
}

async function verifyEmail(request, env) {
  const body = await readJson(request);
  const token = String(body?.token || '');
  if (!token) return apiError('Verification token is missing.', 400);
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(`SELECT id,user_id,expires_at,used_at FROM email_tokens WHERE token_hash=? AND purpose='verify_email'`).bind(tokenHash).first();
  if (!row || row.used_at || new Date(row.expires_at) < new Date()) return apiError('This verification link is invalid or expired.', 400);
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET email_verified_at=?, updated_at=? WHERE id=?').bind(now, now, row.user_id),
    env.DB.prepare('UPDATE email_tokens SET used_at=? WHERE id=?').bind(now, row.id),
  ]);
  return apiOk({ message: 'Email verified. You can sign in now.' });
}

async function resendVerification(request, env) {
  if (!mailConfigured(env)) return apiError('Email delivery is not configured.', 503);
  const limit = await enforceRateLimit(request, env, 'resend_verify', 5, 600);
  if (limit) return limit;
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  if (!isEmail(email)) return apiOk({ message: 'If that account exists, a verification email will be sent.' });
  const user = await env.DB.prepare('SELECT id,first_name,email_verified_at FROM users WHERE email=?').bind(email).first();
  if (!user || user.email_verified_at) return apiOk({ message: 'If that account exists, a verification email will be sent.' });
  await env.DB.prepare(`UPDATE email_tokens SET used_at=CURRENT_TIMESTAMP WHERE user_id=? AND purpose='verify_email' AND used_at IS NULL`).bind(user.id).run();
  const token = randomToken(32);
  const hash = await sha256Hex(token);
  await env.DB.prepare(`INSERT INTO email_tokens(user_id,purpose,token_hash,expires_at) VALUES(?,?,?,?)`).bind(user.id, 'verify_email', hash, isoInHours(24)).run();
  const verifyUrl = `${appOrigin(env, request)}/?verify=${encodeURIComponent(token)}`;
  await sendEmail(env, { to: email, subject: 'Verify your ToolCart account', html: emailShell('Verify your email', `<p><a href="${escapeHtml(verifyUrl)}">Verify your ToolCart account</a></p>`) });
  return apiOk({ message: 'If that account exists, a verification email will be sent.' });
}

async function login(request, env) {
  const limit = await enforceRateLimit(request, env, 'login', 10, 600);
  if (limit) return limit;
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  const password = String(body?.password || '');
  const user = await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
  if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) return apiError('Email or password is incorrect.', 401);
  if (!user.email_verified_at) return apiError('Verify your email before signing in.', 403, { code: 'EMAIL_NOT_VERIFIED' });
  if (user.status !== 'active') return apiError('This account is not currently active.', 403);
  const session = await createSession(env, request, user.id, false);
  await env.DB.prepare('UPDATE users SET last_active_at=CURRENT_TIMESTAMP WHERE id=?').bind(user.id).run();
  return new Response(JSON.stringify({ ok: true, user: sanitizeUser(user), csrfToken: session.csrf }), {
    status: 200,
    headers: { ...jsonHeaders, 'set-cookie': session.cookie },
  });
}

async function logout(request, env) {
  const token = getCookie(request, 'tc_session');
  if (token) await revokeToken(env, 'sessions', token);
  return new Response(JSON.stringify({ ok: true }), { headers: { ...jsonHeaders, 'set-cookie': clearCookie('tc_session') } });
}

async function forgotPassword(request, env) {
  if (!mailConfigured(env)) return apiError('Email delivery is not configured.', 503);
  const limit = await enforceRateLimit(request, env, 'forgot', 5, 900);
  if (limit) return limit;
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  const user = isEmail(email) ? await env.DB.prepare('SELECT id,first_name FROM users WHERE email=?').bind(email).first() : null;
  if (user) {
    await env.DB.prepare(`UPDATE email_tokens SET used_at=CURRENT_TIMESTAMP WHERE user_id=? AND purpose='reset_password' AND used_at IS NULL`).bind(user.id).run();
    const token = randomToken(32);
    const hash = await sha256Hex(token);
    await env.DB.prepare(`INSERT INTO email_tokens(user_id,purpose,token_hash,expires_at) VALUES(?,?,?,?)`).bind(user.id, 'reset_password', hash, isoInHours(1)).run();
    const resetUrl = `${appOrigin(env, request)}/?reset=${encodeURIComponent(token)}`;
    await sendEmail(env, { to: email, subject: 'Reset your ToolCart password', html: emailShell('Reset your password', `<p>Hello ${escapeHtml(user.first_name)},</p><p><a href="${escapeHtml(resetUrl)}">Reset your ToolCart password</a></p><p>This link expires in 1 hour.</p>`) });
  }
  return apiOk({ message: 'If an account exists for that email, a reset link will be sent.' });
}

async function resetPassword(request, env) {
  const body = await readJson(request);
  const token = String(body?.token || '');
  const password = String(body?.password || '');
  if (!token || password.length < 10) return apiError('Provide a valid reset token and a password of at least 10 characters.', 400);
  const hashToken = await sha256Hex(token);
  const row = await env.DB.prepare(`SELECT id,user_id,expires_at,used_at FROM email_tokens WHERE token_hash=? AND purpose='reset_password'`).bind(hashToken).first();
  if (!row || row.used_at || new Date(row.expires_at) < new Date()) return apiError('This reset link is invalid or expired.', 400);
  const pw = await hashPassword(password);
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,updated_at=? WHERE id=?').bind(pw.hash, pw.salt, now, row.user_id),
    env.DB.prepare('UPDATE email_tokens SET used_at=? WHERE id=?').bind(now, row.id),
    env.DB.prepare('UPDATE sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').bind(now, row.user_id),
  ]);
  return apiOk({ message: 'Password updated. Sign in with your new password.' });
}

async function changePassword(request, env, userId) {
  const body = await readJson(request);
  const current = String(body?.currentPassword || '');
  const next = String(body?.newPassword || '');
  if (next.length < 10) return apiError('New password must be at least 10 characters.', 400);
  const user = await env.DB.prepare('SELECT password_hash,password_salt FROM users WHERE id=?').bind(userId).first();
  if (!(await verifyPassword(current, user.password_salt, user.password_hash))) return apiError('Current password is incorrect.', 400);
  const pw = await hashPassword(next);
  await env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(pw.hash, pw.salt, userId).run();
  return apiOk({ message: 'Password changed.' });
}

async function createSession(env, request, id, isAdmin) {
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const csrf = randomToken(20);
  const days = Number(env.SESSION_TTL_DAYS || 30);
  const secureCookie = new URL(request.url).protocol === 'https:';
  const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
  const ua = cleanText(request.headers.get('user-agent') || '', 220);
  const ipHint = await hashIpHint(request.headers.get('cf-connecting-ip') || 'unknown');
  const device = deviceLabel(ua);
  const table = isAdmin ? 'admin_sessions' : 'sessions';
  const fk = isAdmin ? 'admin_user_id' : 'user_id';
  const columns = isAdmin ? `${fk},token_hash,csrf_token,user_agent,expires_at` : `${fk},token_hash,csrf_token,user_agent,ip_hint,device_label,expires_at`;
  const stmt = isAdmin
    ? env.DB.prepare(`INSERT INTO ${table}(${columns}) VALUES(?,?,?,?,?)`).bind(id, tokenHash, csrf, ua, expiresAt)
    : env.DB.prepare(`INSERT INTO ${table}(${columns}) VALUES(?,?,?,?,?,?,?)`).bind(id, tokenHash, csrf, ua, ipHint, device, expiresAt);
  await stmt.run();
  return { token, csrf, cookie: sessionCookie(isAdmin ? 'tc_admin_session' : 'tc_session', token, days, secureCookie) };
}

async function requireUser(request, env) {
  const token = getCookie(request, 'tc_session');
  if (!token) return { response: apiError('Sign in required.', 401) };
  const hash = await sha256Hex(token);
  const row = await env.DB.prepare(`SELECT s.*,u.*,
      s.id AS session_id,u.id AS user_id,s.csrf_token AS session_csrf,s.expires_at AS session_expires
    FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL`).bind(hash).first();
  if (!row || new Date(row.session_expires) < new Date() || row.status !== 'active') return { response: apiError('Session expired. Sign in again.', 401) };
  await maybeTouchSession(env, 'sessions', row.session_id, row.user_id);
  return {
    user: { ...row, id: row.user_id },
    session: { id: row.session_id, csrf_token: row.session_csrf, expires_at: row.session_expires },
  };
}

async function requireAdmin(request, env) {
  const token = getCookie(request, 'tc_admin_session');
  if (!token) return { response: apiError('Administrator sign in required.', 401) };
  const hash = await sha256Hex(token);
  const row = await env.DB.prepare(`SELECT s.*,a.*,s.id AS session_id,a.id AS admin_id,s.csrf_token AS session_csrf,s.expires_at AS session_expires
    FROM admin_sessions s JOIN admin_users a ON a.id=s.admin_user_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL`).bind(hash).first();
  if (!row || new Date(row.session_expires) < new Date() || !row.enabled) return { response: apiError('Administrator session expired.', 401) };
  await maybeTouchAdminSession(env, row.session_id);
  return { user: { ...row, id: row.admin_id }, session: { id: row.session_id, csrf_token: row.session_csrf } };
}

async function maybeTouchSession(env, table, sessionId, userId) {
  const key = `touch:${sessionId}`;
  if (!touchCache.has(key) || Date.now() - touchCache.get(key) > 300000) {
    touchCache.set(key, Date.now());
    await env.DB.batch([
      env.DB.prepare(`UPDATE ${table} SET last_seen_at=CURRENT_TIMESTAMP WHERE id=?`).bind(sessionId),
      env.DB.prepare('UPDATE users SET last_active_at=CURRENT_TIMESTAMP WHERE id=?').bind(userId),
    ]);
  }
}

async function maybeTouchAdminSession(env, sessionId) {
  const key = `atouch:${sessionId}`;
  if (!touchCache.has(key) || Date.now() - touchCache.get(key) > 300000) {
    touchCache.set(key, Date.now());
    await env.DB.prepare('UPDATE admin_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE id=?').bind(sessionId).run();
  }
}
const touchCache = new Map();

async function revokeToken(env, table, token) {
  const hash = await sha256Hex(token);
  await env.DB.prepare(`UPDATE ${table} SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=? AND revoked_at IS NULL`).bind(hash).run();
}

// ---------- Customer data ----------

async function publicBootstrap(env) {
  const apps = await env.DB.prepare(`SELECT a.id,a.name,a.slug,a.short_description,a.status,a.accent_color,a.badge_new,a.badge_beta,a.badge_popular,a.badge_featured,a.icon_key,c.name AS category
    FROM apps a LEFT JOIN app_categories c ON c.id=a.category_id
    WHERE a.enabled=1 AND a.visibility='public' AND a.status!='disabled'
    ORDER BY a.badge_featured DESC,a.display_order,a.name LIMIT 12`).all();
  const settings = await getPublicSettings(env);
  return apiOk({ apps: apps.results.map(mapAppMedia), settings });
}

async function userBootstrap(env, user) {
  const [apps, products, updates, notifs, plan, recents, promos, settings, wallet, cartCount] = await Promise.all([
    listAppsData(env, user.id),
    listProductsData(env, user.id),
    listUpdatesData(env, user.id, 8),
    listNotificationsData(env, user.id, 'unread', 8),
    currentPlan(env, user.id),
    recentApps(env, user.id),
    activePromos(env, user.id),
    getPublicSettings(env),
    getWallet(env, user.id),
    getCartCount(env, user.id),
  ]);
  return apiOk({ user: sanitizeUser(user), apps, products, wallet, cartCount, updates, notifications: notifs, currentPlan: plan, recentApps: recents, promos, settings });
}

async function getProfile(env, userId) {
  const user = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(userId).first();
  const plan = await currentPlan(env, userId);
  const payments = await env.DB.prepare(`SELECT id,amount_minor,currency,purpose,status,payment_method,provider_reference,created_at,paid_at FROM payments WHERE user_id=? ORDER BY created_at DESC LIMIT 5`).bind(userId).all();
  const favorites = await env.DB.prepare(`SELECT a.id,a.name,a.icon_key,a.accent_color FROM app_favorites f JOIN apps a ON a.id=f.app_id WHERE f.user_id=? ORDER BY f.created_at DESC LIMIT 12`).bind(userId).all();
  return apiOk({ user: sanitizeUser(user), currentPlan: plan, recentPayments: payments.results, favorites: favorites.results.map(mapAppMedia) });
}

async function updateProfile(request, env, userId) {
  const b = await readJson(request);
  if (!b) return apiError('Invalid request.', 400);
  const fullName = cleanText(b.fullName, 120);
  const firstName = fullName ? fullName.split(/\s+/)[0] : '';
  const phone = cleanText(b.phone, 40) || null;
  const country = cleanText(b.country, 80) || null;
  const language = cleanText(b.preferredLanguage, 12) || 'en';
  const timezone = cleanText(b.timezone, 80) || 'America/Los_Angeles';
  let theme = ['midnight', 'pearl'].includes(b.preferredTheme) ? b.preferredTheme : null;
  const allowThemeRow = await env.DB.prepare("SELECT value_json FROM settings WHERE key='allow_user_theme'").first();
  const allowTheme = allowThemeRow ? safeJson(allowThemeRow.value_json, true) !== false : true;
  if (!allowTheme) theme = (await env.DB.prepare('SELECT preferred_theme FROM users WHERE id=?').bind(userId).first())?.preferred_theme || null;
  if (fullName.length < 2) return apiError('Full name is required.', 400);
  await env.DB.prepare(`UPDATE users SET full_name=?,first_name=?,phone=?,country=?,preferred_language=?,timezone=?,preferred_theme=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(fullName, firstName, phone, country, language, timezone, theme, userId).run();
  return apiOk({ message: 'Profile updated.' });
}

async function uploadProfileAvatar(request, env, userId) {
  const uploaded = await readImageUpload(request, env, `avatars/${userId}`);
  if (uploaded.response) return uploaded.response;
  const old = await env.DB.prepare('SELECT profile_image_key FROM users WHERE id=?').bind(userId).first();
  await env.DB.prepare('UPDATE users SET profile_image_key=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(uploaded.key, userId).run();
  if (old?.profile_image_key && old.profile_image_key !== uploaded.key) env.MEDIA.delete(old.profile_image_key).catch(console.error);
  return apiOk({ imageUrl: `/media/${uploaded.key}` });
}

async function requestDeletion(env, userId) {
  await env.DB.prepare(`UPDATE users SET status='deletion_requested',deletion_requested_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(userId).run();
  await env.DB.prepare('UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=?').bind(userId).run();
  return apiOk({ message: 'Account deletion request recorded.' });
}

async function listSessions(env, userId, currentSessionId) {
  const rows = await env.DB.prepare(`SELECT id,device_label,user_agent,ip_hint,created_at,last_seen_at,expires_at,revoked_at FROM sessions WHERE user_id=? ORDER BY last_seen_at DESC LIMIT 30`).bind(userId).all();
  return apiOk({ sessions: rows.results.map(r => ({ ...r, current: r.id === currentSessionId })) });
}

async function revokeSession(env, userId, sessionId, currentSessionId) {
  if (sessionId === currentSessionId) return apiError('Use Sign out to end your current session.', 400);
  await env.DB.prepare('UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?').bind(sessionId, userId).run();
  return apiOk({ message: 'Device session revoked.' });
}

async function listApps(env, userId) { return apiOk({ apps: await listAppsData(env, userId), recentApps: await recentApps(env, userId) }); }

async function listAppsData(env, userId) {
  const current = await currentPlan(env, userId);
  const rows = await env.DB.prepare(`SELECT a.*,c.name AS category,
      CASE WHEN f.user_id IS NULL THEN 0 ELSE 1 END AS favorite,
      p.name AS required_plan_name,p.display_order AS required_plan_order
    FROM apps a
    LEFT JOIN app_categories c ON c.id=a.category_id
    LEFT JOIN app_favorites f ON f.app_id=a.id AND f.user_id=?
    LEFT JOIN subscription_plans p ON p.id=a.required_plan_id
    WHERE a.enabled=1 AND a.visibility='public' AND a.status!='disabled'
    ORDER BY a.badge_featured DESC,a.display_order,a.name`).bind(userId).all();
  return rows.results.map(r => ({ ...mapAppMedia(r), can_access: canAccessApp(r, current) }));
}

async function recentApps(env, userId) {
  const rows = await env.DB.prepare(`SELECT a.id,a.name,a.slug,a.short_description,a.icon_key,a.accent_color,a.status,MAX(x.created_at) AS last_opened
    FROM app_activity x JOIN apps a ON a.id=x.app_id
    WHERE x.user_id=? AND x.event_type='open'
    GROUP BY a.id ORDER BY last_opened DESC LIMIT 6`).bind(userId).all();
  return rows.results.map(mapAppMedia);
}

async function toggleFavorite(env, userId, appId) {
  const existing = await env.DB.prepare('SELECT 1 FROM app_favorites WHERE user_id=? AND app_id=?').bind(userId, appId).first();
  if (existing) await env.DB.prepare('DELETE FROM app_favorites WHERE user_id=? AND app_id=?').bind(userId, appId).run();
  else await env.DB.prepare('INSERT INTO app_favorites(user_id,app_id) SELECT ?,id FROM apps WHERE id=? AND enabled=1').bind(userId, appId).run();
  return apiOk({ favorite: !existing });
}

async function openApp(env, userId, appId) {
  const app = await env.DB.prepare(`SELECT a.*,p.display_order AS required_plan_order,p.name AS required_plan_name FROM apps a LEFT JOIN subscription_plans p ON p.id=a.required_plan_id WHERE a.id=? AND a.enabled=1`).bind(appId).first();
  if (!app || app.visibility !== 'public' || app.status === 'disabled') return apiError('This app is not available.', 404);
  if (app.status === 'maintenance') return apiOk({ action: 'maintenance', message: app.maintenance_message || 'This app is temporarily under maintenance.' });
  if (app.status === 'coming_soon') return apiOk({ action: 'coming_soon', message: app.maintenance_message || 'This app is coming soon.' });
  const plan = await currentPlan(env, userId);
  if (!canAccessApp(app, plan)) return apiOk({ action: 'upgrade', requiredPlan: app.required_plan_name || 'a higher plan' });
  if (!safeHttpUrl(app.url)) return apiOk({ action: 'unavailable', message: 'This app does not have a launch URL configured yet.' });
  await env.DB.prepare(`INSERT INTO app_activity(user_id,app_id,event_type) VALUES(?,?,'open')`).bind(userId, appId).run();
  return apiOk({ action: 'open', url: app.url });
}

async function listUpdates(env, userId) { return apiOk({ updates: await listUpdatesData(env, userId, 100) }); }
async function listUpdatesData(env, userId, limit = 50) {
  const rows = await env.DB.prepare(`SELECT u.*,CASE WHEN r.user_id IS NULL THEN 0 ELSE 1 END AS is_read
    FROM updates u LEFT JOIN update_reads r ON r.update_id=u.id AND r.user_id=?
    WHERE u.status='published' AND datetime(u.publish_at)<=datetime('now') AND (u.expires_at IS NULL OR datetime(u.expires_at)>datetime('now'))
    ORDER BY u.pinned DESC,u.publish_at DESC LIMIT ?`).bind(userId, limit).all();
  return rows.results.map(mapUpdateMedia);
}
async function readUpdate(env, userId, updateId) {
  await env.DB.prepare(`INSERT INTO update_reads(user_id,update_id) SELECT ?,id FROM updates WHERE id=? ON CONFLICT(user_id,update_id) DO UPDATE SET read_at=CURRENT_TIMESTAMP`).bind(userId, updateId).run();
  return apiOk({ read: true });
}

async function listRequests(env, userId) {
  const rows = await env.DB.prepare(`SELECT r.*,a.name AS app_name FROM requests r LEFT JOIN apps a ON a.id=r.app_id WHERE r.user_id=? ORDER BY r.updated_at DESC LIMIT 100`).bind(userId).all();
  return apiOk({ requests: rows.results });
}

async function createRequest(request, env, userId) {
  const b = await readJson(request);
  const subject = cleanText(b?.subject, 160);
  const message = cleanText(b?.message, 5000);
  const category = cleanText(b?.category, 60) || 'other';
  const appId = Number(b?.appId) || null;
  if (subject.length < 3 || message.length < 5) return apiError('Add a subject and a little more detail.', 400);
  const ref = await uniqueRequestRef(env);
  const result = await env.DB.prepare(`INSERT INTO requests(reference_number,user_id,category,app_id,subject,initial_message) VALUES(?,?,?,?,?,?)`).bind(ref, userId, category, appId, subject, message).run();
  const id = result.meta.last_row_id;
  await env.DB.prepare(`INSERT INTO request_messages(request_id,sender_type,sender_user_id,message) VALUES(?,'user',?,?)`).bind(id, userId, message).run();
  return apiOk({ id, referenceNumber: ref, message: 'Request submitted.' }, 201);
}

async function getRequest(env, userId, requestId) {
  const item = await env.DB.prepare(`SELECT r.*,a.name AS app_name FROM requests r LEFT JOIN apps a ON a.id=r.app_id WHERE r.id=? AND r.user_id=?`).bind(requestId, userId).first();
  if (!item) return apiError('Request not found.', 404);
  const messages = await env.DB.prepare('SELECT * FROM request_messages WHERE request_id=? ORDER BY created_at ASC').bind(requestId).all();
  return apiOk({ request: item, messages: messages.results });
}

async function addRequestMessage(request, env, userId, requestId) {
  const owned = await env.DB.prepare('SELECT id,status FROM requests WHERE id=? AND user_id=?').bind(requestId, userId).first();
  if (!owned) return apiError('Request not found.', 404);
  if (owned.status === 'closed') return apiError('This request is closed.', 400);
  const b = await readJson(request);
  const message = cleanText(b?.message, 5000);
  if (!message) return apiError('Message is required.', 400);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO request_messages(request_id,sender_type,sender_user_id,message) VALUES(?,'user',?,?)`).bind(requestId, userId, message),
    env.DB.prepare('UPDATE requests SET updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(requestId),
  ]);
  return apiOk({ message: 'Reply added.' });
}

async function listNotifications(env, userId, params) {
  const filter = ['unread','important','all'].includes(params.get('filter')) ? params.get('filter') : 'all';
  return apiOk({ notifications: await listNotificationsData(env, userId, filter, 100) });
}
async function listNotificationsData(env, userId, filter='all', limit=50) {
  let extra = '';
  if (filter === 'unread') extra = 'AND r.read_at IS NULL';
  if (filter === 'important') extra = `AND n.importance IN ('important','urgent')`;
  const rows = await env.DB.prepare(`SELECT n.*,r.read_at,r.dismissed_at FROM notification_receipts r JOIN notifications n ON n.id=r.notification_id
    WHERE r.user_id=? AND r.dismissed_at IS NULL ${extra} AND (n.expires_at IS NULL OR datetime(n.expires_at)>datetime('now'))
    ORDER BY n.created_at DESC LIMIT ?`).bind(userId, limit).all();
  return rows.results;
}
async function setNotificationRead(env, userId, notificationId, read) {
  await env.DB.prepare(`UPDATE notification_receipts SET read_at=${read ? 'CURRENT_TIMESTAMP' : 'NULL'} WHERE user_id=? AND notification_id=?`).bind(userId, notificationId).run();
  return apiOk({ read });
}
async function dismissNotification(env, userId, notificationId) {
  await env.DB.prepare(`UPDATE notification_receipts SET dismissed_at=CURRENT_TIMESTAMP WHERE user_id=? AND notification_id=?`).bind(userId, notificationId).run();
  return apiOk({ dismissed: true });
}

async function listPlans(env) {
  const rows = await env.DB.prepare(`SELECT * FROM subscription_plans WHERE enabled=1 ORDER BY display_order,price_minor`).all();
  return apiOk({ plans: rows.results.map(parsePlan) });
}
async function listPayments(env, userId) {
  const rows = await env.DB.prepare(`SELECT p.*,sp.name AS plan_name FROM payments p LEFT JOIN subscription_plans sp ON sp.id=p.plan_id WHERE p.user_id=? ORDER BY p.created_at DESC LIMIT 100`).bind(userId).all();
  return apiOk({ payments: rows.results });
}

async function searchEcosystem(env, userId, query) {
  const q = cleanText(query, 80).trim();
  if (q.length < 2) return apiOk({ apps: [], products: [], updates: [], requests: [], settings: [] });
  const like = `%${q.replace(/[%_]/g, '')}%`;
  const [apps, products, updates, requests] = await Promise.all([
    env.DB.prepare(`SELECT id,name,slug,short_description,icon_key,accent_color,status FROM apps WHERE enabled=1 AND visibility='public' AND (name LIKE ? OR short_description LIKE ?) ORDER BY display_order LIMIT 12`).bind(like, like).all(),
    env.DB.prepare(`SELECT id,name,short_description,display_image_key,price_minor,currency,access_type,stock_mode,stock_quantity,premium FROM products WHERE active=1 AND (name LIKE ? OR short_description LIKE ? OR description LIKE ?) ORDER BY featured DESC,display_order LIMIT 12`).bind(like,like,like).all(),
    env.DB.prepare(`SELECT id,title,summary,update_type,publish_at FROM updates WHERE status='published' AND (title LIKE ? OR summary LIKE ?) ORDER BY publish_at DESC LIMIT 12`).bind(like, like).all(),
    env.DB.prepare(`SELECT id,reference_number,subject,status,updated_at FROM requests WHERE user_id=? AND (subject LIKE ? OR reference_number LIKE ?) ORDER BY updated_at DESC LIMIT 12`).bind(userId, like, like).all(),
  ]);
  const settings = ['Account','Security','Notifications','Appearance','Language','Subscription','Payments','Devices','Privacy','Support'].filter(x => x.toLowerCase().includes(q.toLowerCase())).map(name => ({ name }));
  return apiOk({ apps: apps.results.map(mapAppMedia), products: products.results.map(mapProductMedia), updates: updates.results, requests: requests.results, settings });
}

// ---------- Digital products marketplace ----------

async function ensureWallet(env,userId,currency='NGN'){
  currency=(currency||'NGN').toUpperCase().slice(0,3);
  await env.DB.prepare(`INSERT OR IGNORE INTO wallet_accounts(user_id,balance_minor,currency) VALUES(?,0,?)`).bind(userId,currency).run();
}
async function getWallet(env,userId){
  await ensureWallet(env,userId,'NGN');
  const w=await env.DB.prepare('SELECT balance_minor,currency,updated_at FROM wallet_accounts WHERE user_id=?').bind(userId).first();
  return {balanceMinor:Number(w?.balance_minor||0),currency:w?.currency||'NGN',updatedAt:w?.updated_at||null};
}
async function getCartCount(env,userId){const r=await env.DB.prepare('SELECT COALESCE(SUM(quantity),0) AS c FROM cart_items WHERE user_id=?').bind(userId).first();return Number(r?.c||0)}
function productStockLabel(p){if(p.stock_mode==='unlimited')return'Unlimited stock';const n=Math.max(0,Number(p.stock_quantity||0));return n===0?'Out of stock':`${n} in stock`}
function mapProductMedia(p){return{...p,display_image_url:p.display_image_key?`/media/${p.display_image_key}`:null,stock_label:productStockLabel(p),in_stock:p.stock_mode==='unlimited'||Number(p.stock_quantity)>0,price_minor:Number(p.price_minor||0)}}
async function listProductsData(env,userId){
  await releaseExpiredProductOrders(env);
  const rows=await env.DB.prepare(`SELECT p.*,CASE WHEN EXISTS(SELECT 1 FROM product_entitlements e WHERE e.user_id=? AND e.product_id=p.id) THEN 1 ELSE 0 END AS owned FROM products p WHERE p.active=1 ORDER BY p.featured DESC,p.display_order,p.name`).bind(userId).all();
  return rows.results.map(mapProductMedia);
}
async function listProducts(env,userId){return apiOk({products:await listProductsData(env,userId),wallet:await getWallet(env,userId),cartCount:await getCartCount(env,userId)})}
async function getProductDetail(env,userId,productId){
  const p=await env.DB.prepare(`SELECT p.*,COALESCE((SELECT SUM(quantity) FROM product_entitlements e WHERE e.user_id=? AND e.product_id=p.id),0) AS owned_quantity FROM products p WHERE p.id=?`).bind(userId,productId).first();
  if(!p||!p.active)return apiError('Product not found.',404);
  const hasAccess=Number(p.owned_quantity)>0;
  const assetRows=await env.DB.prepare('SELECT id,file_name,file_type,mime_type,display_order FROM product_assets WHERE product_id=? ORDER BY display_order,id').bind(productId).all();
  let assets=assetRows.results;
  if(!assets.length&&p.file_key)assets=[{id:null,file_name:p.file_name,file_type:p.file_type,mime_type:p.mime_type,display_order:0}];
  const visibleAssets=hasAccess?assets.map((a,i)=>({id:a.id,file_name:a.file_name,file_type:a.file_type,mime_type:a.mime_type,display_order:Number(a.display_order||i),open_url:a.id?`/api/products/${productId}/assets/${a.id}/file`:`/api/products/${productId}/file`})):[];
  return apiOk({product:{...mapProductMedia(p),has_access:hasAccess,owned_quantity:Number(p.owned_quantity||0),asset_count:assets.length,assets:visibleAssets},wallet:await getWallet(env,userId),cartCount:await getCartCount(env,userId)});
}
async function addCartItem(request,env,userId){
  const b=await readJson(request);const productId=Number(b?.productId),quantity=Math.max(1,Math.min(99,Math.trunc(Number(b?.quantity||1))));
  const p=await env.DB.prepare('SELECT id,active,stock_mode,stock_quantity FROM products WHERE id=?').bind(productId).first();
  if(!p||!p.active)return apiError('Product is not available.',404);if(p.stock_mode!=='unlimited'&&Number(p.stock_quantity)<quantity)return apiError('Not enough stock is available.',409);
  await env.DB.prepare(`INSERT INTO cart_items(user_id,product_id,quantity,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=excluded.quantity,updated_at=CURRENT_TIMESTAMP`).bind(userId,productId,quantity).run();
  return apiOk({message:'Added to cart.',cartCount:await getCartCount(env,userId)});
}
async function updateCartItem(request,env,userId,productId){
  const b=await readJson(request);const quantity=Math.max(1,Math.min(99,Math.trunc(Number(b?.quantity||1))));
  const p=await env.DB.prepare('SELECT id,active,stock_mode,stock_quantity FROM products WHERE id=?').bind(productId).first();if(!p||!p.active)return apiError('Product is not available.',404);if(p.stock_mode!=='unlimited'&&Number(p.stock_quantity)<quantity)return apiError('Not enough stock is available.',409);
  await env.DB.prepare('UPDATE cart_items SET quantity=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND product_id=?').bind(quantity,userId,productId).run();return getCart(env,userId)
}
async function deleteCartItem(env,userId,productId){await env.DB.prepare('DELETE FROM cart_items WHERE user_id=? AND product_id=?').bind(userId,productId).run();return apiOk({message:'Removed from cart.',cartCount:await getCartCount(env,userId)})}
async function getCart(env,userId){
  const rows=await env.DB.prepare(`SELECT c.quantity,p.* FROM cart_items c JOIN products p ON p.id=c.product_id WHERE c.user_id=? ORDER BY c.updated_at DESC`).bind(userId).all();const items=rows.results.map(mapProductMedia);let total=0,currency='NGN';for(const x of items){if(x.access_type!=='free')total+=Number(x.price_minor)*Number(x.quantity);currency=x.currency||currency}return apiOk({items,totalMinor:total,currency,wallet:await getWallet(env,userId),cartCount:items.reduce((a,x)=>a+Number(x.quantity),0)})
}
async function buyProductNow(request,env,user,productId){const b=await readJson(request);const quantity=Math.max(1,Math.min(99,Math.trunc(Number(b?.quantity||1))));const p=await env.DB.prepare('SELECT * FROM products WHERE id=? AND active=1').bind(productId).first();if(!p)return apiError('Product not found.',404);return createProductCheckout(request,env,user,[{product:p,quantity}],false)}
async function checkoutCart(request,env,user){
  const rows=await env.DB.prepare(`SELECT c.quantity,p.* FROM cart_items c JOIN products p ON p.id=c.product_id WHERE c.user_id=? AND p.active=1 ORDER BY c.updated_at`).bind(user.id).all();if(!rows.results.length)return apiError('Your cart is empty.',400);return createProductCheckout(request,env,user,rows.results.map(x=>({product:x,quantity:Number(x.quantity)})),true)
}
async function createProductCheckout(request,env,user,items,fromCart){
  await releaseExpiredProductOrders(env);if(!items.length)return apiError('No products selected.',400);const currency=String(items[0].product.currency||'NGN').toUpperCase();let total=0;
  for(const item of items){const p=item.product,q=item.quantity;if(String(p.currency||'NGN').toUpperCase()!==currency)return apiError('Products in one checkout must use the same currency.',400);if(p.stock_mode!=='unlimited'&&Number(p.stock_quantity)<q)return apiError(`${p.name} does not have enough stock.`,409);if(p.access_type!=='free')total+=Number(p.price_minor||0)*q}
  const orderNumber=`TCP-${Date.now()}-${randomToken(6).replace(/[^a-zA-Z0-9]/g,'').slice(0,6)}`;const expiresAt=new Date(Date.now()+30*60*1000).toISOString();const order=await env.DB.prepare(`INSERT INTO product_orders(order_number,user_id,status,total_minor,currency,expires_at) VALUES(?,?,'pending',?,?,?)`).bind(orderNumber,user.id,total,currency,expiresAt).run();const orderId=Number(order.meta.last_row_id);
  await env.DB.batch(items.map(x=>env.DB.prepare(`INSERT INTO product_order_items(order_id,product_id,quantity,unit_price_minor,total_minor) VALUES(?,?,?,?,?)`).bind(orderId,x.product.id,x.quantity,x.product.access_type==='free'?0:Number(x.product.price_minor||0),x.product.access_type==='free'?0:Number(x.product.price_minor||0)*x.quantity)));
  const reserved=[];for(const x of items){if(x.product.stock_mode==='unlimited')continue;const r=await env.DB.prepare('UPDATE products SET stock_quantity=stock_quantity-?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND stock_quantity>=?').bind(x.quantity,x.product.id,x.quantity).run();if(Number(r.meta.changes||0)!==1){for(const prev of reserved)await env.DB.prepare('UPDATE products SET stock_quantity=stock_quantity+?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(prev.quantity,prev.productId).run();await env.DB.prepare(`UPDATE product_orders SET status='failed',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(orderId).run();return apiError(`${x.product.name} no longer has enough stock.`,409)}reserved.push({productId:x.product.id,quantity:x.quantity})}
  await env.DB.prepare('UPDATE product_orders SET inventory_reserved=1,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(orderId).run();
  if(total===0){const done=await fulfillProductOrder(env,orderId,'free');if(!done.ok){await releaseProductOrderStock(env,orderId,'failed');return apiError(done.error||'Could not fulfill this order.',409)}if(fromCart)await env.DB.prepare('DELETE FROM cart_items WHERE user_id=?').bind(user.id).run();return apiOk({method:'free',orderId,message:'Product unlocked.',cartCount:await getCartCount(env,user.id)})}
  const wallet=await getWallet(env,user.id);if(wallet.currency===currency&&wallet.balanceMinor>=total){
    const debit=await env.DB.prepare('UPDATE wallet_accounts SET balance_minor=balance_minor-?,updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND balance_minor>=?').bind(total,user.id,total).run();if(Number(debit.meta.changes||0)!==1){await releaseProductOrderStock(env,orderId,'cancelled');return apiError('Your balance changed. Please try again.',409)}
    await env.DB.prepare(`INSERT INTO wallet_transactions(user_id,amount_minor,currency,transaction_type,reference,note) VALUES(?,?,?,'product_purchase',?,?)`).bind(user.id,-total,currency,orderNumber,`Product order ${orderNumber}`).run();const done=await fulfillProductOrder(env,orderId,'wallet');if(!done.ok){await env.DB.batch([env.DB.prepare('UPDATE wallet_accounts SET balance_minor=balance_minor+?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?').bind(total,user.id),env.DB.prepare(`INSERT INTO wallet_transactions(user_id,amount_minor,currency,transaction_type,reference,note) VALUES(?,?,?,'refund',?,?)`).bind(user.id,total,currency,`${orderNumber}-REFUND`,done.error||'Automatic order refund')]);await releaseProductOrderStock(env,orderId,'failed');return apiError(done.error||'Could not fulfill this order.',409)}if(fromCart)await env.DB.prepare('DELETE FROM cart_items WHERE user_id=?').bind(user.id).run();return apiOk({method:'wallet',orderId,message:'Purchase complete.',wallet:await getWallet(env,user.id),cartCount:await getCartCount(env,user.id)})
  }
  if(!env.PAYSTACK_SECRET_KEY){await releaseProductOrderStock(env,orderId,'cancelled');return apiError('Your ToolCart balance is not enough and Paystack is not configured yet.',503)}
  const ref=`TC-PROD-${Date.now()}-${randomToken(8).replace(/[^a-zA-Z0-9]/g,'').slice(0,8)}`;const origin=appOrigin(env,request);const callback=`${origin}/?payment=complete&order=${orderId}`;
  await env.DB.prepare(`INSERT INTO payments(user_id,provider,provider_reference,amount_minor,currency,purpose,status,product_order_id) VALUES(?,'paystack',?,?,?,?, 'pending',?)`).bind(user.id,ref,total,currency,`ToolCart product order ${orderNumber}`,orderId).run();
  const res=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{authorization:`Bearer ${env.PAYSTACK_SECRET_KEY}`,'content-type':'application/json'},body:JSON.stringify({email:user.email,amount:total,currency,reference:ref,callback_url:callback,metadata:{toolcart_user_id:user.id,product_order_id:orderId,order_number:orderNumber}})});const data=await res.json().catch(()=>null);if(!res.ok||!data?.status||!safeHttpUrl(data?.data?.authorization_url)){await env.DB.prepare(`UPDATE payments SET status='failed',updated_at=CURRENT_TIMESTAMP WHERE provider_reference=?`).bind(ref).run();await releaseProductOrderStock(env,orderId,'failed');return apiError('Payment could not be initialized.',502)}return apiOk({method:'paystack',authorizationUrl:data.data.authorization_url,reference:ref,orderId})
}
async function releaseProductOrderStock(env,orderId,status='cancelled'){const order=await env.DB.prepare('SELECT * FROM product_orders WHERE id=?').bind(orderId).first();if(!order||!order.inventory_reserved)return;const items=(await env.DB.prepare(`SELECT i.product_id,i.quantity,p.stock_mode FROM product_order_items i JOIN products p ON p.id=i.product_id WHERE i.order_id=?`).bind(orderId).all()).results;const stmts=[];for(const x of items)if(x.stock_mode!=='unlimited')stmts.push(env.DB.prepare('UPDATE products SET stock_quantity=stock_quantity+?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(x.quantity,x.product_id));stmts.push(env.DB.prepare('UPDATE product_orders SET inventory_reserved=0,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(status,orderId));await env.DB.batch(stmts)}
async function releaseExpiredProductOrders(env){const rows=(await env.DB.prepare(`SELECT id FROM product_orders WHERE status='pending' AND inventory_reserved=1 AND expires_at IS NOT NULL AND datetime(expires_at)<datetime('now') LIMIT 50`).all()).results;for(const r of rows)await releaseProductOrderStock(env,r.id,'cancelled')}
async function fulfillProductOrder(env,orderId,source){
  const order=await env.DB.prepare('SELECT * FROM product_orders WHERE id=?').bind(orderId).first();if(!order)return{ok:false,error:'Order not found.'};if(order.status==='fulfilled')return{ok:true};if(order.status!=='pending'&&order.status!=='paid')return{ok:false,error:'This order is no longer available for fulfillment.'};
  const items=(await env.DB.prepare(`SELECT i.*,p.name,p.stock_mode FROM product_order_items i JOIN products p ON p.id=i.product_id WHERE i.order_id=?`).bind(orderId).all()).results;if(!items.length)return{ok:false,error:'Order has no products.'};
  const stmts=[];for(const x of items){stmts.push(env.DB.prepare(`INSERT INTO product_entitlements(user_id,product_id,order_id,quantity) VALUES(?,?,?,?)`).bind(order.user_id,x.product_id,orderId,x.quantity));stmts.push(env.DB.prepare('DELETE FROM cart_items WHERE user_id=? AND product_id=?').bind(order.user_id,x.product_id))}stmts.push(env.DB.prepare(`UPDATE product_orders SET status='fulfilled',payment_source=?,inventory_reserved=0,paid_at=COALESCE(paid_at,CURRENT_TIMESTAMP),fulfilled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(source,orderId));await env.DB.batch(stmts);return{ok:true}
}
async function serveProductStoredFile(request,env,asset){
  if(!env.MEDIA)return new Response('Media unavailable',{status:503});if(!asset?.file_key)return new Response('Not found',{status:404});const obj=await env.MEDIA.get(asset.file_key);if(!obj)return new Response('Not found',{status:404});const h=new Headers();obj.writeHttpMetadata(h);h.set('cache-control','private, no-store');h.set('content-disposition',`${asset.file_type==='pdf'?'inline':'attachment'}; filename="${String(asset.file_name||'product').replace(/["\\]/g,'')}"`);return new Response(request.method==='HEAD'?null:obj.body,{headers:h})
}
async function serveProductFile(request,env,userId,productId){
  const owned=!!(await env.DB.prepare('SELECT 1 FROM product_entitlements WHERE user_id=? AND product_id=? LIMIT 1').bind(userId,productId).first());if(!owned)return new Response('Purchase required',{status:403});
  let asset=await env.DB.prepare('SELECT * FROM product_assets WHERE product_id=? ORDER BY display_order,id LIMIT 1').bind(productId).first();if(!asset){asset=await env.DB.prepare('SELECT file_key,file_name,file_type,mime_type FROM products WHERE id=?').bind(productId).first()}
  return serveProductStoredFile(request,env,asset);
}
async function serveProductAssetFile(request,env,userId,productId,assetId){
  const owned=!!(await env.DB.prepare('SELECT 1 FROM product_entitlements WHERE user_id=? AND product_id=? LIMIT 1').bind(userId,productId).first());if(!owned)return new Response('Purchase required',{status:403});
  const asset=await env.DB.prepare('SELECT * FROM product_assets WHERE id=? AND product_id=?').bind(assetId,productId).first();if(!asset)return new Response('Not found',{status:404});return serveProductStoredFile(request,env,asset);
}

// ---------- Payments ----------

async function initializePaystack(request, env, user) {
  if (!env.PAYSTACK_SECRET_KEY) return apiError('Paystack is not configured yet.', 503);
  const b = await readJson(request);
  const planId = Number(b?.planId);
  const plan = await env.DB.prepare('SELECT * FROM subscription_plans WHERE id=? AND enabled=1').bind(planId).first();
  if (!plan || plan.price_minor <= 0) return apiError('Select a paid subscription plan.', 400);
  const ref = `TC-${Date.now()}-${randomToken(8).replace(/[^a-zA-Z0-9]/g,'').slice(0,8)}`;
  const origin = appOrigin(env, request);
  const callback = safeHttpUrl(b?.callbackUrl) ? b.callbackUrl : `${origin}/?payment=complete`;
  await env.DB.prepare(`INSERT INTO payments(user_id,plan_id,provider,provider_reference,amount_minor,currency,purpose,status) VALUES(?,?,?,?,?,?,?,'pending')`)
    .bind(user.id, plan.id, 'paystack', ref, plan.price_minor, plan.currency, `ToolCart ${plan.name} subscription`).run();
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ email: user.email, amount: plan.price_minor, currency: plan.currency, reference: ref, callback_url: callback, metadata: { toolcart_user_id: user.id, plan_id: plan.id } }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.status || !safeHttpUrl(data?.data?.authorization_url)) {
    await env.DB.prepare(`UPDATE payments SET status='failed',updated_at=CURRENT_TIMESTAMP WHERE provider_reference=?`).bind(ref).run();
    console.error('Paystack initialize failed', data);
    return apiError('Payment could not be initialized.', 502);
  }
  return apiOk({ authorizationUrl: data.data.authorization_url, reference: ref });
}

async function verifyPaystackForUser(env, userId, reference) {
  reference = cleanText(reference, 120);
  if (!reference) return apiError('Payment reference is required.', 400);
  const payment = await env.DB.prepare('SELECT * FROM payments WHERE provider_reference=? AND user_id=?').bind(reference, userId).first();
  if (!payment) return apiError('Payment not found.', 404);
  if (payment.status === 'success') return apiOk({ status: 'success' });
  if (!env.PAYSTACK_SECRET_KEY) return apiError('Paystack is not configured.', 503);
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` } });
  const data = await res.json().catch(() => null);
  if (res.ok && data?.status && data.data?.status === 'success') await finalizeSuccessfulPayment(env, reference, data.data);
  const updated = await env.DB.prepare('SELECT status FROM payments WHERE provider_reference=? AND user_id=?').bind(reference, userId).first();
  return apiOk({ status: updated?.status || 'pending' });
}

async function paystackWebhook(request, env) {
  if (!env.PAYSTACK_SECRET_KEY) return new Response('Not configured', { status: 503 });
  const raw = await request.arrayBuffer();
  const signature = request.headers.get('x-paystack-signature') || '';
  if (!(await verifyHmacHex(env.PAYSTACK_SECRET_KEY, raw, signature))) return new Response('Invalid signature', { status: 401 });
  const payload = JSON.parse(dec.decode(raw));
  if (payload?.event === 'charge.success' && payload?.data?.reference) await finalizeSuccessfulPayment(env, payload.data.reference, payload.data);
  return new Response('ok', { status: 200 });
}

async function finalizeSuccessfulPayment(env, reference, providerData) {
  const payment = await env.DB.prepare('SELECT * FROM payments WHERE provider_reference=?').bind(reference).first();
  if (!payment || payment.status === 'success') return;
  if (Number(providerData.amount) !== Number(payment.amount_minor) || String(providerData.currency).toUpperCase() !== String(payment.currency).toUpperCase()) {
    console.error('Payment verification mismatch', reference);
    return;
  }
  const plan = payment.plan_id ? await env.DB.prepare('SELECT * FROM subscription_plans WHERE id=?').bind(payment.plan_id).first() : null;
  let subscriptionId = null;
  if (plan) {
    const end = subscriptionEnd(plan);
    const sub = await env.DB.prepare(`INSERT INTO subscriptions(user_id,plan_id,status,starts_at,current_period_start,current_period_end,provider,provider_subscription_id)
      VALUES(?,?,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?,'paystack',?)`).bind(payment.user_id, plan.id, end, providerData?.authorization?.authorization_code || null).run();
    subscriptionId = sub.meta.last_row_id;
  }
  await env.DB.prepare(`UPDATE payments SET status='success',subscription_id=?,payment_method=?,provider_payload_json=?,paid_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(subscriptionId, cleanText(providerData?.channel || '', 40) || null, JSON.stringify(redactProviderPayload(providerData)), payment.id).run();
  if (payment.product_order_id) {
    const fulfilled = await fulfillProductOrder(env, Number(payment.product_order_id), 'paystack');
    if (!fulfilled.ok) console.error('Product fulfillment failed after payment', reference, fulfilled.error);
    await createSystemNotification(env, payment.user_id, 'Product purchase confirmed', fulfilled.ok ? 'Your ToolCart product is ready to open or download.' : 'Your payment was confirmed and your order is being reviewed.', 'product_purchase', 'important', 'product_order', String(payment.product_order_id));
    return;
  }
  await createSystemNotification(env, payment.user_id, 'Payment received', plan ? `${plan.name} is now active on your ToolCart account.` : 'Your payment was confirmed.', 'payment_received', 'important');
}

function subscriptionEnd(plan) {
  const now = new Date();
  const days = Number(plan.billing_interval_days || (plan.billing_frequency === 'yearly' ? 365 : plan.billing_frequency === 'quarterly' ? 90 : plan.billing_frequency === 'one_time' ? 36500 : 30));
  return new Date(now.getTime() + days * 86400000).toISOString();
}

// ---------- Admin auth ----------

async function bootstrapAdmin(request, env) {
  const provided = request.headers.get('x-toolcart-bootstrap-token') || '';
  if (!env.ADMIN_BOOTSTRAP_TOKEN) {
    return apiError('ADMIN_BOOTSTRAP_TOKEN is not configured in Cloudflare. Add the Worker secret, redeploy ToolCart, then try again.', 503, { code: 'bootstrap_secret_missing' });
  }
  if (!provided) {
    return apiError('Enter the bootstrap token you configured in Cloudflare.', 400, { code: 'bootstrap_token_required' });
  }
  if (!constantTimeStringEqual(provided, env.ADMIN_BOOTSTRAP_TOKEN)) {
    return apiError('The bootstrap token is incorrect. It must exactly match the ADMIN_BOOTSTRAP_TOKEN Worker secret in Cloudflare.', 403, { code: 'bootstrap_token_incorrect' });
  }
  if (!env.DB) {
    return apiError('The ToolCart D1 database binding is not available. Confirm the DB binding in Cloudflare and redeploy.', 503, { code: 'database_binding_missing' });
  }

  let exists;
  try {
    exists = await env.DB.prepare('SELECT id,email FROM admin_users LIMIT 1').first();
  } catch (err) {
    console.error('Admin bootstrap database check failed', err);
    return apiError('ToolCart could not access the administrator database. Confirm the D1 database and migrations are deployed, then try again.', 503, { code: 'database_unavailable' });
  }
  if (exists) {
    return apiError('An administrator already exists. First-time setup is disabled. Use the normal administrator sign-in instead.', 409, { code: 'administrator_exists' });
  }

  const b = await readJson(request);
  if (!b) return apiError('The setup request could not be read. Refresh the page and try again.', 400, { code: 'invalid_request' });
  const email = normalizeEmail(b.email);
  const password = String(b.password || '');
  const fullName = cleanText(b.fullName, 120);
  if (!isEmail(email) || password.length < 12 || fullName.length < 2) {
    return apiError('Use a valid name, email and a password of at least 12 characters.', 400, { code: 'invalid_admin_details' });
  }

  let adminId;
  try {
    const pw = await hashPassword(password);
    const result = await env.DB.prepare(`INSERT INTO admin_users(email,password_hash,password_salt,full_name,role) VALUES(?,?,?,?,'owner')`).bind(email, pw.hash, pw.salt, fullName).run();
    adminId = Number(result?.meta?.last_row_id || 0);
    if (!adminId) {
      const created = await env.DB.prepare('SELECT id FROM admin_users WHERE email=?').bind(email).first();
      adminId = Number(created?.id || 0);
    }
    if (!adminId) throw new Error('Administrator insert completed without an id.');
  } catch (err) {
    console.error('Admin bootstrap create failed', err);
    return apiError('ToolCart could not create the owner administrator in D1. Confirm the database migrations are deployed, then try again.', 503, { code: 'administrator_create_failed' });
  }

  let admin;
  try {
    admin = await env.DB.prepare('SELECT * FROM admin_users WHERE id=?').bind(adminId).first();
    const session = await createSession(env, request, adminId, true);
    await env.DB.prepare('UPDATE admin_users SET last_login_at=CURRENT_TIMESTAMP WHERE id=?').bind(adminId).run();
    if (admin) admin.last_login_at = new Date().toISOString();
    return new Response(JSON.stringify({
      ok: true,
      created: true,
      message: 'Owner administrator created. Remove or rotate ADMIN_BOOTSTRAP_TOKEN now.',
      admin: sanitizeAdmin(admin || { id: adminId, email, full_name: fullName, role: 'owner', last_login_at: null }),
      csrfToken: session.csrf,
    }), {
      status: 201,
      headers: { ...jsonHeaders, 'set-cookie': session.cookie },
    });
  } catch (err) {
    console.error('Admin bootstrap automatic sign-in failed', err);
    return apiOk({
      created: true,
      requiresLogin: true,
      message: 'Owner administrator was created, but automatic sign-in could not start. Return to sign in with the email and password you just chose.',
    }, 201);
  }
}

async function adminLogin(request, env) {
  const limit = await enforceRateLimit(request, env, 'admin_login', 8, 600);
  if (limit) return limit;
  const b = await readJson(request);
  const email = normalizeEmail(b?.email);
  const password = String(b?.password || '');
  const admin = await env.DB.prepare('SELECT * FROM admin_users WHERE email=?').bind(email).first();
  if (!admin || !admin.enabled || !(await verifyPassword(password, admin.password_salt, admin.password_hash))) return apiError('Administrator credentials are incorrect.', 401);
  const s = await createSession(env, request, admin.id, true);
  await env.DB.prepare('UPDATE admin_users SET last_login_at=CURRENT_TIMESTAMP WHERE id=?').bind(admin.id).run();
  return new Response(JSON.stringify({ ok: true, admin: sanitizeAdmin(admin), csrfToken: s.csrf }), { headers: { ...jsonHeaders, 'set-cookie': s.cookie } });
}

async function adminLogout(request, env) {
  const token = getCookie(request, 'tc_admin_session');
  if (token) await revokeToken(env, 'admin_sessions', token);
  return new Response(JSON.stringify({ ok: true }), { headers: { ...jsonHeaders, 'set-cookie': clearCookie('tc_admin_session') } });
}

// ---------- Admin dashboard / customers ----------

async function adminDashboard(env) {
  const q = async sql => Number((await env.DB.prepare(sql).first())?.value || 0);
  const [totalCustomers, activeCustomers, newSignups, paidSubscribers, revenue, appsOnline, appsMaintenance, openRequests, unreadRequests, notifSent] = await Promise.all([
    q(`SELECT COUNT(*) value FROM users`),
    q(`SELECT COUNT(*) value FROM users WHERE status='active' AND datetime(COALESCE(last_active_at,created_at))>=datetime('now','-30 days')`),
    q(`SELECT COUNT(*) value FROM users WHERE datetime(created_at)>=datetime('now','-30 days')`),
    q(`SELECT COUNT(DISTINCT user_id) value FROM subscriptions WHERE status IN ('active','trialing','gifted') AND (current_period_end IS NULL OR datetime(current_period_end)>datetime('now'))`),
    q(`SELECT COALESCE(SUM(amount_minor),0) value FROM payments WHERE status='success' AND datetime(paid_at)>=datetime('now','start of month')`),
    q(`SELECT COUNT(*) value FROM apps WHERE enabled=1 AND status='online'`),
    q(`SELECT COUNT(*) value FROM apps WHERE enabled=1 AND status='maintenance'`),
    q(`SELECT COUNT(*) value FROM requests WHERE status NOT IN ('resolved','closed')`),
    q(`SELECT COUNT(*) value FROM requests WHERE status='received'`),
    q(`SELECT COUNT(*) value FROM notifications WHERE datetime(created_at)>=datetime('now','-30 days')`),
  ]);
  const recentPayments = await env.DB.prepare(`SELECT p.id,p.amount_minor,p.currency,p.status,p.purpose,p.created_at,u.full_name,u.email FROM payments p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 8`).all();
  const recentActivity = await env.DB.prepare(`SELECT x.created_at,a.name AS app_name,u.full_name FROM app_activity x JOIN apps a ON a.id=x.app_id JOIN users u ON u.id=x.user_id ORDER BY x.created_at DESC LIMIT 8`).all();
  return apiOk({ metrics: { totalCustomers,activeCustomers,newSignups,paidSubscribers,monthlyRevenueMinor: revenue,appsOnline,appsMaintenance,openRequests,unreadRequests,notificationsSent: notifSent }, recentPayments: recentPayments.results, recentActivity: recentActivity.results });
}

async function adminCustomers(env, params) {
  const q = cleanText(params.get('q') || '', 80);
  const page = Math.max(1, Number(params.get('page') || 1));
  const limit = 30; const offset = (page - 1) * limit;
  const like = `%${q.replace(/[%_]/g,'')}%`;
  const where = q ? `WHERE u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.customer_id LIKE ?` : '';
  const binds = q ? [like,like,like,like] : [];
  const rows = await env.DB.prepare(`SELECT u.id,u.customer_id,u.full_name,u.email,u.phone,u.status,u.created_at,u.last_active_at,
    (SELECT sp.name FROM subscriptions s JOIN subscription_plans sp ON sp.id=s.plan_id WHERE s.user_id=u.id AND s.status IN ('active','trialing','gifted') ORDER BY sp.display_order DESC LIMIT 1) AS plan_name
    FROM users u ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`).bind(...binds, limit, offset).all();
  return apiOk({ customers: rows.results, page, hasMore: rows.results.length === limit });
}

async function adminCustomerDetail(env, userId) {
  const user = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(userId).first();
  if (!user) return apiError('Customer not found.', 404);
  const [payments, requests, notifications, recents, plan, wallet] = await Promise.all([
    env.DB.prepare('SELECT * FROM payments WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(userId).all(),
    env.DB.prepare('SELECT * FROM requests WHERE user_id=? ORDER BY updated_at DESC LIMIT 50').bind(userId).all(),
    env.DB.prepare(`SELECT n.*,r.read_at,r.dismissed_at FROM notification_receipts r JOIN notifications n ON n.id=r.notification_id WHERE r.user_id=? ORDER BY n.created_at DESC LIMIT 50`).bind(userId).all(),
    recentApps(env, userId), currentPlan(env, userId), getWallet(env, userId),
  ]);
  return apiOk({ user: sanitizeUser(user), payments: payments.results, requests: requests.results, notifications: notifications.results, recentApps: recents, currentPlan: plan, wallet });
}

async function adminCustomerAction(request, env, admin, userId) {
  const b = await readJson(request);
  const action = b?.action;
  const user = await env.DB.prepare('SELECT id,email,status FROM users WHERE id=?').bind(userId).first();
  if (!user) return apiError('Customer not found.', 404);
  if (action === 'disable') {
    await env.DB.batch([
      env.DB.prepare(`UPDATE users SET status='disabled',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(userId),
      env.DB.prepare(`UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL`).bind(userId),
    ]);
  } else if (action === 'restore') {
    await env.DB.prepare(`UPDATE users SET status='active',deletion_requested_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(userId).run();
  } else if (action === 'delete') {
    if (b?.confirm !== user.email) return apiError('Type the customer email exactly to confirm deletion.', 400);
    await env.DB.prepare('DELETE FROM users WHERE id=?').bind(userId).run();
  } else if (action === 'gift_subscription' || action === 'change_subscription') {
    const planId = Number(b?.planId);
    const plan = await env.DB.prepare('SELECT * FROM subscription_plans WHERE id=? AND enabled=1').bind(planId).first();
    if (!plan) return apiError('Plan not found.', 404);
    const days = Math.max(1, Math.min(Number(b?.days || plan.trial_days || 30), 3650));
    const end = new Date(Date.now() + days * 86400000).toISOString();
    if (action === 'change_subscription') await env.DB.prepare(`UPDATE subscriptions SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND status IN ('active','trialing','gifted')`).bind(userId).run();
    await env.DB.prepare(`INSERT INTO subscriptions(user_id,plan_id,status,starts_at,current_period_start,current_period_end,provider) VALUES(?,?,'gifted',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?,'admin')`).bind(userId, planId, end).run();
  } else if (action === 'extend_subscription') {
    const days = Math.max(1, Math.min(Number(b?.days || 30), 3650));
    const sub = await env.DB.prepare(`SELECT id,current_period_end FROM subscriptions WHERE user_id=? AND status IN ('active','trialing','gifted') ORDER BY current_period_end DESC LIMIT 1`).bind(userId).first();
    if (!sub) return apiError('No active subscription to extend.', 400);
    const base = sub.current_period_end && new Date(sub.current_period_end) > new Date() ? new Date(sub.current_period_end) : new Date();
    const end = new Date(base.getTime() + days * 86400000).toISOString();
    await env.DB.prepare('UPDATE subscriptions SET current_period_end=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(end, sub.id).run();
  } else if (action === 'send_notification') {
    const title = cleanText(b?.title, 120), message = cleanText(b?.message, 600);
    if (!title || !message) return apiError('Notification title and message are required.', 400);
    await createAdminNotification(env, admin.id, { title, message, type: 'admin_announcement', importance: b?.importance || 'normal', audienceType: 'single_user', audienceValues: [userId] });
  } else if (action === 'wallet_adjust') {
    const amountMinor = Math.trunc(Number(b?.amountMinor || 0));
    const note = cleanText(b?.note, 240) || 'Administrator balance adjustment';
    if (!amountMinor || Math.abs(amountMinor) > 100000000000) return apiError('Enter a valid non-zero balance adjustment.', 400);
    await ensureWallet(env, userId, cleanText(b?.currency, 3).toUpperCase() || 'NGN');
    const current = await getWallet(env, userId);
    if (current.balanceMinor + amountMinor < 0) return apiError('This adjustment would make the customer balance negative.', 400);
    await env.DB.batch([
      env.DB.prepare('UPDATE wallet_accounts SET balance_minor=balance_minor+?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?').bind(amountMinor,userId),
      env.DB.prepare(`INSERT INTO wallet_transactions(user_id,amount_minor,currency,transaction_type,reference,note,admin_id) VALUES(?,?,?,'admin_adjustment',?,?,?)`).bind(userId,amountMinor,current.currency,`ADMIN-${Date.now()}`,note,admin.id),
    ]);
  } else return apiError('Unsupported customer action.', 400);
  await audit(env, admin.id, `customer_${action}`, 'user', String(userId), b, request);
  return apiOk({ message: 'Customer updated.' });
}

// ---------- Admin apps ----------

async function adminApps(env) {
  const [apps, categories, plans] = await Promise.all([
    env.DB.prepare(`SELECT a.*,c.name AS category,p.name AS required_plan_name FROM apps a LEFT JOIN app_categories c ON c.id=a.category_id LEFT JOIN subscription_plans p ON p.id=a.required_plan_id ORDER BY a.display_order,a.name`).all(),
    env.DB.prepare('SELECT * FROM app_categories ORDER BY display_order,name').all(),
    env.DB.prepare('SELECT id,name,display_order,enabled FROM subscription_plans ORDER BY display_order').all(),
  ]);
  return apiOk({ apps: apps.results.map(mapAppMedia), categories: categories.results, plans: plans.results });
}

async function adminCreateApp(request, env, admin) {
  const b = await readJson(request);
  const parsed = parseAppInput(b);
  if (parsed.error) return apiError(parsed.error, 400);
  const exists = await env.DB.prepare('SELECT id FROM apps WHERE slug=?').bind(parsed.slug).first();
  if (exists) return apiError('An app already uses that name/slug.', 409);
  const result = await env.DB.prepare(`INSERT INTO apps(name,slug,icon_key,url,short_description,long_description,category_id,display_order,enabled,visibility,subscription_required,required_plan_id,status,maintenance_message,badge_new,badge_beta,badge_popular,badge_featured,accent_color,version_label,updated_note)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(...parsed.values).run();
  await audit(env, admin.id, 'app_created', 'app', String(result.meta.last_row_id), { name: parsed.name }, request);
  return apiOk({ id: result.meta.last_row_id, message: 'App created.' }, 201);
}

async function adminUpdateApp(request, env, admin, appId) {
  const existing = await env.DB.prepare('SELECT * FROM apps WHERE id=?').bind(appId).first();
  if (!existing) return apiError('App not found.', 404);
  const b = await readJson(request);
  const merged = { ...existing, ...b, slug: b?.slug || existing.slug };
  const parsed = parseAppInput(merged);
  if (parsed.error) return apiError(parsed.error, 400);
  await env.DB.prepare(`UPDATE apps SET name=?,slug=?,icon_key=?,url=?,short_description=?,long_description=?,category_id=?,display_order=?,enabled=?,visibility=?,subscription_required=?,required_plan_id=?,status=?,maintenance_message=?,badge_new=?,badge_beta=?,badge_popular=?,badge_featured=?,accent_color=?,version_label=?,updated_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...parsed.values, appId).run();
  await audit(env, admin.id, 'app_modified', 'app', String(appId), { name: parsed.name }, request);
  return apiOk({ message: 'App updated.' });
}

async function adminDeleteApp(env, admin, appId) {
  const app = await env.DB.prepare('SELECT name FROM apps WHERE id=?').bind(appId).first();
  if (!app) return apiError('App not found.', 404);
  await env.DB.prepare('DELETE FROM apps WHERE id=?').bind(appId).run();
  await audit(env, admin.id, 'app_deleted', 'app', String(appId), { name: app.name });
  return apiOk({ message: 'App deleted.' });
}

function parseAppInput(b={}) {
  const name = cleanText(b.name, 90);
  const slug = slugify(b.slug || name);
  const url = cleanText(b.url, 500) || null;
  if (!name || !slug) return { error: 'App name is required.' };
  if (url && !safeHttpUrl(url)) return { error: 'App URL must use http or https.' };
  const accent = /^#[0-9a-fA-F]{6}$/.test(b.accentColor || b.accent_color || '') ? (b.accentColor || b.accent_color) : '#7C5CFF';
  const status = ['online','maintenance','coming_soon','private','disabled'].includes(b.status) ? b.status : 'online';
  const visibility = (b.visibility === 'private' || status === 'private') ? 'private' : 'public';
  const iconKey = cleanText(b.iconKey ?? b.icon_key, 500) || null;
  const categoryId = Number(b.categoryId ?? b.category_id) || null;
  const planId = Number(b.requiredPlanId ?? b.required_plan_id) || null;
  const values = [
    name, slug, iconKey, url, cleanText(b.shortDescription ?? b.short_description, 240), cleanText(b.longDescription ?? b.long_description, 3000), categoryId,
    Number((b.displayOrder ?? b.display_order) || 0), boolInt(b.enabled ?? 1), visibility, boolInt(b.subscriptionRequired ?? b.subscription_required), planId, status,
    cleanText(b.maintenanceMessage ?? b.maintenance_message, 500) || null, boolInt(b.badgeNew ?? b.badge_new), boolInt(b.badgeBeta ?? b.badge_beta), boolInt(b.badgePopular ?? b.badge_popular), boolInt(b.badgeFeatured ?? b.badge_featured), accent,
    cleanText(b.versionLabel ?? b.version_label, 40) || null, cleanText(b.updatedNote ?? b.updated_note, 240) || null,
  ];
  return { name, slug, values };
}

async function adminUploadIcon(request, env, admin) {
  const uploaded = await readImageUpload(request, env, `app-icons/${new Date().getUTCFullYear()}`);
  if (uploaded.response) return uploaded.response;
  await audit(env, admin.id, 'media_uploaded', 'r2', uploaded.key, { contentType: uploaded.contentType, size: uploaded.size }, request);
  return apiOk({ key: uploaded.key, url: `/media/${uploaded.key}` });
}

// ---------- Admin products ----------

async function adminProducts(env){
  await releaseExpiredProductOrders(env);
  const rows=await env.DB.prepare(`SELECT p.*,(SELECT COUNT(DISTINCT e.user_id) FROM product_entitlements e WHERE e.product_id=p.id) AS buyers,(SELECT COALESCE(SUM(i.quantity),0) FROM product_order_items i JOIN product_orders o ON o.id=i.order_id WHERE i.product_id=p.id AND o.status='fulfilled') AS sold_quantity FROM products p ORDER BY p.display_order,p.name`).all();
  const products=rows.results.map(mapProductMedia);
  if(products.length){
    const ids=products.map(p=>Number(p.id));
    const marks=ids.map(()=>'?').join(',');
    const assetRows=await env.DB.prepare(`SELECT * FROM product_assets WHERE product_id IN (${marks}) ORDER BY product_id,display_order,id`).bind(...ids).all();
    const byProduct=new Map();
    for(const asset of assetRows.results){if(!byProduct.has(Number(asset.product_id)))byProduct.set(Number(asset.product_id),[]);byProduct.get(Number(asset.product_id)).push(asset)}
    for(const product of products){product.assets=byProduct.get(Number(product.id))||legacyProductAssets(product);product.asset_count=product.assets.length}
  }
  return apiOk({products});
}
function legacyProductAssets(p){
  if(!p?.file_key)return[];
  return[{id:null,product_id:Number(p.id||0),file_key:p.file_key,file_name:p.file_name,file_type:p.file_type,mime_type:p.mime_type,display_order:0}];
}
function normalizeProductAssets(input){
  if(!Array.isArray(input))return[];
  const seen=new Set(),out=[];
  for(let i=0;i<input.length;i++){
    const a=input[i]||{};
    const key=cleanText(a.fileKey??a.file_key,500),name=cleanText(a.fileName??a.file_name,180),type=['pdf','image'].includes(a.fileType??a.file_type)?(a.fileType??a.file_type):null,mime=cleanText(a.mimeType??a.mime_type,100);
    if(!key||!name||!type||!mime||seen.has(key))continue;
    seen.add(key);out.push({fileKey:key,fileName:name,fileType:type,mimeType:mime,displayOrder:Number(a.displayOrder??a.display_order??i)||0});
  }
  return out;
}
function parseProductInput(b={}){
  const name=cleanText(b.name,120),slug=slugify(b.slug||name);if(!name||!slug)return{error:'Product name is required.'};
  const displayImageKey=cleanText(b.displayImageKey??b.display_image_key,500);if(!displayImageKey)return{error:'Upload a display image for this product.'};
  let assets=normalizeProductAssets(b.assets);
  if(!assets.length){const fallback=normalizeProductAssets([{fileKey:b.fileKey??b.file_key,fileName:b.fileName??b.file_name,fileType:b.fileType??b.file_type,mimeType:b.mimeType??b.mime_type,displayOrder:0}]);assets=fallback}
  if(!assets.length)return{error:'Upload at least one PDF or image product file first.'};
  const primary=assets[0],accessType=b.accessType==='free'||b.access_type==='free'?'free':'paid';let priceMinor=Math.max(0,Math.trunc(Number(b.priceMinor??b.price_minor??0)));if(accessType==='free')priceMinor=0;
  const stockMode=b.stockMode==='unlimited'||b.stock_mode==='unlimited'?'unlimited':'finite';const stockQuantity=stockMode==='unlimited'?0:Math.max(0,Math.trunc(Number(b.stockQuantity??b.stock_quantity??0)));const currency=(cleanText(b.currency,3)||'NGN').toUpperCase();
  return{name,slug,assets,values:[name,slug,displayImageKey,primary.fileKey,primary.fileName,primary.fileType,primary.mimeType,cleanText(b.shortDescription??b.short_description,280),cleanText(b.description,12000),priceMinor,currency,accessType,boolInt(b.premium),stockMode,stockQuantity,boolInt(b.active??1),boolInt(b.featured),Number((b.displayOrder??b.display_order)||0)]};
}
async function replaceProductAssets(env,productId,assets){
  const stmts=[env.DB.prepare('DELETE FROM product_assets WHERE product_id=?').bind(productId)];
  assets.forEach((a,i)=>stmts.push(env.DB.prepare(`INSERT INTO product_assets(product_id,file_key,file_name,file_type,mime_type,display_order) VALUES(?,?,?,?,?,?)`).bind(productId,a.fileKey,a.fileName,a.fileType,a.mimeType,Number(a.displayOrder??i)||0)));
  await env.DB.batch(stmts);
}
async function adminCreateProduct(request,env,admin){
  const b=await readJson(request),x=parseProductInput(b);if(x.error)return apiError(x.error,400);if(await env.DB.prepare('SELECT id FROM products WHERE slug=?').bind(x.slug).first())return apiError('A product already uses that name/slug.',409);
  const r=await env.DB.prepare(`INSERT INTO products(name,slug,display_image_key,file_key,file_name,file_type,mime_type,short_description,description,price_minor,currency,access_type,premium,stock_mode,stock_quantity,active,featured,display_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(...x.values).run();
  const productId=Number(r.meta.last_row_id);await replaceProductAssets(env,productId,x.assets);await audit(env,admin.id,'product_created','product',String(productId),{name:x.name,assetCount:x.assets.length},request);return apiOk({id:productId,message:'Product created.'},201);
}
async function adminUpdateProduct(request,env,admin,id){
  const old=await env.DB.prepare('SELECT * FROM products WHERE id=?').bind(id).first();if(!old)return apiError('Product not found.',404);
  const oldAssetRows=await env.DB.prepare('SELECT * FROM product_assets WHERE product_id=? ORDER BY display_order,id').bind(id).all();const oldAssets=oldAssetRows.results.length?oldAssetRows.results:legacyProductAssets(old);
  const b=await readJson(request),x=parseProductInput({...old,...b});if(x.error)return apiError(x.error,400);
  await env.DB.prepare(`UPDATE products SET name=?,slug=?,display_image_key=?,file_key=?,file_name=?,file_type=?,mime_type=?,short_description=?,description=?,price_minor=?,currency=?,access_type=?,premium=?,stock_mode=?,stock_quantity=?,active=?,featured=?,display_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...x.values,id).run();
  if(Array.isArray(b.assets))await replaceProductAssets(env,id,x.assets);
  if(Array.isArray(b.assets)&&env.MEDIA){const keep=new Set(x.assets.map(a=>a.fileKey));for(const a of oldAssets){if(a.file_key&&!keep.has(a.file_key))env.MEDIA.delete(a.file_key).catch(console.error)}}
  if(old.display_image_key&&old.display_image_key!==x.values[2])env.MEDIA?.delete(old.display_image_key).catch(console.error);
  await audit(env,admin.id,'product_modified','product',String(id),{name:x.name,assetCount:x.assets.length},request);return apiOk({message:'Product updated.'});
}
async function adminDeleteProduct(env,admin,id){
  const p=await env.DB.prepare('SELECT * FROM products WHERE id=?').bind(id).first();if(!p)return apiError('Product not found.',404);const used=await env.DB.prepare('SELECT 1 FROM product_order_items WHERE product_id=? LIMIT 1').bind(id).first();if(used)return apiError('This product has purchase history. Mark it inactive instead of deleting it.',409);
  const rows=await env.DB.prepare('SELECT file_key FROM product_assets WHERE product_id=?').bind(id).all();const keys=new Set(rows.results.map(x=>x.file_key).filter(Boolean));if(p.file_key)keys.add(p.file_key);
  await env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run();if(env.MEDIA)for(const key of keys)env.MEDIA.delete(key).catch(console.error);if(p.display_image_key)env.MEDIA?.delete(p.display_image_key).catch(console.error);await audit(env,admin.id,'product_deleted','product',String(id),{name:p.name});return apiOk({message:'Product deleted.'});
}
async function adminUploadProductCover(request,env,admin){const u=await readImageUpload(request,env,`product-covers/${new Date().getUTCFullYear()}`);if(u.response)return u.response;await audit(env,admin.id,'product_cover_uploaded','r2',u.key,{size:u.size},request);return apiOk({key:u.key,url:`/media/${u.key}`})}
async function adminUploadProductFile(request,env,admin){if(!env.MEDIA)return apiError('R2 media storage is not configured.',503);let form;try{form=await request.formData()}catch{return apiError('Invalid upload.',400)}const file=form.get('file');if(!(file instanceof File))return apiError('Product file is required.',400);const allowed={'application/pdf':'pdf','image/webp':'image','image/png':'image','image/jpeg':'image'};const type=allowed[file.type];if(!type)return apiError('Upload a PDF, WebP, PNG or JPEG file.',400);if(file.size>25*1024*1024)return apiError('Product file is too large. Maximum size is 25 MB per file.',400);const ext=file.type==='application/pdf'?'pdf':file.type==='image/webp'?'webp':file.type==='image/png'?'png':'jpg';const safe=(file.name||`product.${ext}`).replace(/[^a-zA-Z0-9._-]/g,'-').slice(-160);const key=`product-files/${new Date().getUTCFullYear()}/${Date.now()}-${randomToken(8).replace(/[^a-zA-Z0-9]/g,'').slice(0,8)}.${ext}`;await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type,cacheControl:'private, no-store'}});await audit(env,admin.id,'product_file_uploaded','r2',key,{contentType:file.type,size:file.size},request);return apiOk({key,fileName:safe,fileType:type,mimeType:file.type,size:file.size})}

// ---------- Admin updates / requests / notifications ----------

async function adminUpdates(env) {
  const rows = await env.DB.prepare(`SELECT * FROM updates ORDER BY publish_at DESC LIMIT 200`).all();
  return apiOk({ updates: rows.results.map(mapUpdateMedia) });
}

async function adminCreateUpdate(request, env, admin) {
  const b = await readJson(request);
  const title = cleanText(b?.title, 160), summary = cleanText(b?.summary, 400), content = cleanText(b?.content, 12000);
  if (!title || !content) return apiError('Title and content are required.', 400);
  const appIds = Array.isArray(b?.appIds) ? b.appIds.map(Number).filter(Boolean).slice(0,100) : [];
  const scope = ['ecosystem','single_app','multiple_apps'].includes(b?.scope) ? b.scope : (appIds.length ? 'multiple_apps' : 'ecosystem');
  const priority = ['normal','important','urgent'].includes(b?.priority) ? b.priority : 'normal';
  const type = ['new','important','maintenance','feature','security','announcement'].includes(b?.updateType) ? b.updateType : 'announcement';
  const result = await env.DB.prepare(`INSERT INTO updates(title,summary,content,image_key,scope,app_ids_json,priority,update_type,external_url,cta_label,pinned,publish_at,expires_at,send_notification,status,created_by_admin_id)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(title,summary,content,cleanText(b?.imageKey,500)||null,scope,JSON.stringify(appIds),priority,type,safeHttpUrl(b?.externalUrl)?b.externalUrl:null,cleanText(b?.ctaLabel,80)||null,boolInt(b?.pinned),dateOrNow(b?.publishAt),dateOrNull(b?.expiresAt),boolInt(b?.sendNotification),b?.status==='draft'?'draft':'published',admin.id).run();
  if (b?.sendNotification && b?.status !== 'draft') await createAdminNotification(env, admin.id, { title, message: summary || content.slice(0,220), type: `update_${type}`, importance: priority === 'urgent' ? 'urgent' : priority === 'important' ? 'important' : 'normal', audienceType: 'all', audienceValues: [] });
  await audit(env, admin.id, 'update_created', 'update', String(result.meta.last_row_id), { title }, request);
  return apiOk({ id: result.meta.last_row_id, message: 'Update published.' }, 201);
}

async function adminDeleteUpdate(env, admin, id) {
  await env.DB.prepare('DELETE FROM updates WHERE id=?').bind(id).run();
  await audit(env, admin.id, 'update_deleted', 'update', String(id), {});
  return apiOk({ message: 'Update deleted.' });
}

async function adminRequests(env, params) {
  const status = cleanText(params.get('status') || '', 30);
  const q = cleanText(params.get('q') || '', 80);
  let sql = `SELECT r.*,u.full_name,u.email,a.name AS app_name FROM requests r JOIN users u ON u.id=r.user_id LEFT JOIN apps a ON a.id=r.app_id WHERE 1=1`;
  const binds = [];
  if (status) { sql += ' AND r.status=?'; binds.push(status); }
  if (q) { sql += ' AND (r.subject LIKE ? OR r.reference_number LIKE ? OR u.email LIKE ?)'; const like=`%${q.replace(/[%_]/g,'')}%`; binds.push(like,like,like); }
  sql += ' ORDER BY r.updated_at DESC LIMIT 200';
  const rows = await env.DB.prepare(sql).bind(...binds).all();
  return apiOk({ requests: rows.results });
}

async function adminRespondRequest(request, env, admin, requestId) {
  const b = await readJson(request);
  const message = cleanText(b?.message, 5000);
  const status = ['received','under_review','in_progress','resolved','closed'].includes(b?.status) ? b.status : 'under_review';
  const item = await env.DB.prepare('SELECT * FROM requests WHERE id=?').bind(requestId).first();
  if (!item) return apiError('Request not found.', 404);
  const stmts = [env.DB.prepare(`UPDATE requests SET status=?,updated_at=CURRENT_TIMESTAMP,resolved_at=CASE WHEN ?='resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END WHERE id=?`).bind(status,status,requestId)];
  if (message) stmts.push(env.DB.prepare(`INSERT INTO request_messages(request_id,sender_type,sender_admin_id,message) VALUES(?,'admin',?,?)`).bind(requestId,admin.id,message));
  await env.DB.batch(stmts);
  if (message) await createSystemNotification(env, item.user_id, `Update on request ${item.reference_number}`, message.slice(0,300), 'request_response', 'important', 'request', String(requestId));
  await audit(env, admin.id, 'request_responded', 'request', String(requestId), { status }, request);
  return apiOk({ message: 'Request updated.' });
}

async function adminNotifications(env) {
  const rows = await env.DB.prepare(`SELECT n.*,(SELECT COUNT(*) FROM notification_receipts r WHERE r.notification_id=n.id) AS recipients,(SELECT COUNT(*) FROM notification_receipts r WHERE r.notification_id=n.id AND r.read_at IS NOT NULL) AS opened FROM notifications n ORDER BY n.created_at DESC LIMIT 200`).all();
  return apiOk({ notifications: rows.results });
}

async function adminCreateNotification(request, env, admin) {
  const b = await readJson(request);
  const title = cleanText(b?.title,120), message = cleanText(b?.message,600);
  if (!title || !message) return apiError('Title and message are required.',400);
  const audienceType = ['all','single_user','selected_users','plan','app_users'].includes(b?.audienceType) ? b.audienceType : 'all';
  const audienceValues = Array.isArray(b?.audienceValues) ? b.audienceValues.slice(0,500).map(Number).filter(Boolean) : [];
  const id = await createAdminNotification(env, admin.id, { title, message, type: cleanText(b?.notificationType,60)||'announcement', importance: ['normal','important','urgent'].includes(b?.importance)?b.importance:'normal', destinationType: cleanText(b?.destinationType,40)||null, destinationValue: cleanText(b?.destinationValue,500)||null, audienceType, audienceValues, expiresAt: dateOrNull(b?.expiresAt) });
  await audit(env, admin.id, 'notification_sent', 'notification', String(id), { audienceType }, request);
  return apiOk({ id, message: 'Notification sent.' },201);
}

async function createAdminNotification(env, adminId, n) {
  const result = await env.DB.prepare(`INSERT INTO notifications(title,message,notification_type,importance,destination_type,destination_value,audience_type,audience_value_json,created_by_admin_id,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
    .bind(n.title,n.message,n.type||'announcement',n.importance||'normal',n.destinationType||null,n.destinationValue||null,n.audienceType||'all',JSON.stringify(n.audienceValues||[]),adminId,n.expiresAt||null).run();
  const id = result.meta.last_row_id;
  await materializeNotificationReceipts(env, id, n.audienceType||'all', n.audienceValues||[]);
  return id;
}

async function createSystemNotification(env, userId, title, message, type='announcement', importance='normal', destinationType=null, destinationValue=null) {
  const result = await env.DB.prepare(`INSERT INTO notifications(title,message,notification_type,importance,destination_type,destination_value,audience_type,audience_value_json) VALUES(?,?,?,?,?,?,'single_user',?)`)
    .bind(title,message,type,importance,destinationType,destinationValue,JSON.stringify([userId])).run();
  await env.DB.prepare(`INSERT OR IGNORE INTO notification_receipts(notification_id,user_id) VALUES(?,?)`).bind(result.meta.last_row_id,userId).run();
}

async function materializeNotificationReceipts(env, notificationId, type, values) {
  if (type === 'all') {
    await env.DB.prepare(`INSERT OR IGNORE INTO notification_receipts(notification_id,user_id) SELECT ?,id FROM users WHERE status='active'`).bind(notificationId).run();
  } else if (type === 'single_user' || type === 'selected_users') {
    for (const id of values.slice(0,500)) await env.DB.prepare(`INSERT OR IGNORE INTO notification_receipts(notification_id,user_id) SELECT ?,id FROM users WHERE id=? AND status='active'`).bind(notificationId,id).run();
  } else if (type === 'plan') {
    const planId = Number(values[0]);
    if (planId) await env.DB.prepare(`INSERT OR IGNORE INTO notification_receipts(notification_id,user_id) SELECT ?,u.id FROM users u JOIN subscriptions s ON s.user_id=u.id WHERE u.status='active' AND s.plan_id=? AND s.status IN ('active','trialing','gifted')`).bind(notificationId,planId).run();
  } else if (type === 'app_users') {
    const appId = Number(values[0]);
    if (appId) await env.DB.prepare(`INSERT OR IGNORE INTO notification_receipts(notification_id,user_id) SELECT ?,DISTINCT user_id FROM app_activity WHERE app_id=?`).bind(notificationId,appId).run();
  }
}

// ---------- Admin plans/payments/analytics/settings ----------

async function adminPlans(env) { const rows=await env.DB.prepare('SELECT * FROM subscription_plans ORDER BY display_order,price_minor').all(); return apiOk({plans:rows.results.map(parsePlan)}); }
async function adminCreatePlan(request, env, admin) {
  const b=await readJson(request); const p=parsePlanInput(b); if(p.error)return apiError(p.error,400);
  const r=await env.DB.prepare(`INSERT INTO subscription_plans(name,slug,price_minor,currency,billing_frequency,billing_interval_days,description,features_json,enabled_apps_json,support_level,trial_days,enabled,display_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(...p.values).run();
  await audit(env,admin.id,'subscription_plan_created','subscription_plan',String(r.meta.last_row_id),{name:p.name},request); return apiOk({id:r.meta.last_row_id,message:'Plan created.'},201);
}
async function adminUpdatePlan(request, env, admin, id) {
  const old=await env.DB.prepare('SELECT * FROM subscription_plans WHERE id=?').bind(id).first(); if(!old)return apiError('Plan not found.',404);
  const b=await readJson(request); const p=parsePlanInput({...old,...b,features:b?.features??safeJson(old.features_json,[]),enabledApps:b?.enabledApps??safeJson(old.enabled_apps_json,[])}); if(p.error)return apiError(p.error,400);
  await env.DB.prepare(`UPDATE subscription_plans SET name=?,slug=?,price_minor=?,currency=?,billing_frequency=?,billing_interval_days=?,description=?,features_json=?,enabled_apps_json=?,support_level=?,trial_days=?,enabled=?,display_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...p.values,id).run();
  await audit(env,admin.id,'subscription_plan_modified','subscription_plan',String(id),{name:p.name},request); return apiOk({message:'Plan updated.'});
}
function parsePlanInput(b={}){const name=cleanText(b.name,80),slug=slugify(b.slug||name);if(!name||!slug)return{error:'Plan name is required.'};const freq=['one_time','monthly','quarterly','yearly','custom'].includes(b.billingFrequency||b.billing_frequency)?(b.billingFrequency||b.billing_frequency):'monthly';const currency=(cleanText(b.currency,3)||'NGN').toUpperCase();const features=Array.isArray(b.features)?b.features:safeJson(b.features_json,[]);const apps=Array.isArray(b.enabledApps)?b.enabledApps:safeJson(b.enabled_apps_json,[]);return{name,values:[name,slug,Math.max(0,Number((b.priceMinor??b.price_minor)||0)),currency,freq,Number(b.billingIntervalDays??b.billing_interval_days)||null,cleanText(b.description,1000),JSON.stringify(features.slice(0,50).map(x=>cleanText(x,160))),JSON.stringify(apps.slice(0,500).map(Number).filter(Boolean)),cleanText(b.supportLevel??b.support_level,40)||'standard',Math.max(0,Number((b.trialDays??b.trial_days)||0)),boolInt(b.enabled??1),Number((b.displayOrder??b.display_order)||0)]};}

async function adminPayments(env, params){const status=cleanText(params.get('status')||'',30);let sql=`SELECT p.*,u.full_name,u.email,sp.name AS plan_name FROM payments p JOIN users u ON u.id=p.user_id LEFT JOIN subscription_plans sp ON sp.id=p.plan_id`;const binds=[];if(status){sql+=' WHERE p.status=?';binds.push(status)}sql+=' ORDER BY p.created_at DESC LIMIT 250';const rows=await env.DB.prepare(sql).bind(...binds).all();return apiOk({payments:rows.results});}

async function adminAnalytics(env){const appOpens=await env.DB.prepare(`SELECT a.id,a.name,COUNT(x.id) AS opens,COUNT(DISTINCT x.user_id) AS unique_users FROM apps a LEFT JOIN app_activity x ON x.app_id=a.id AND x.event_type='open' GROUP BY a.id ORDER BY opens DESC LIMIT 50`).all();const signups=await env.DB.prepare(`SELECT substr(created_at,1,10) AS day,COUNT(*) AS count FROM users WHERE datetime(created_at)>=datetime('now','-30 days') GROUP BY day ORDER BY day`).all();const revenue=await env.DB.prepare(`SELECT substr(paid_at,1,10) AS day,SUM(amount_minor) AS amount_minor,currency FROM payments WHERE status='success' AND datetime(paid_at)>=datetime('now','-30 days') GROUP BY day,currency ORDER BY day`).all();const notif=await env.DB.prepare(`SELECT COUNT(*) AS delivered,SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) AS opened FROM notification_receipts`).first();return apiOk({appOpens:appOpens.results,signups:signups.results,revenue:revenue.results,notifications:notif});}

async function adminGetSettings(env){const rows=await env.DB.prepare('SELECT key,value_json,updated_at FROM settings ORDER BY key').all();const settings={};for(const r of rows.results)settings[r.key]=safeJson(r.value_json,r.value_json);return apiOk({settings});}
async function adminUpdateSettings(request,env,admin){const b=await readJson(request);if(!b||typeof b.settings!=='object')return apiError('Settings payload is required.',400);const allowed=['default_theme','allow_user_theme','dock_apps_enabled','dock_updates_enabled','dock_requests_enabled','dock_settings_enabled','support_email','request_attachments_enabled','floating_promo_enabled'];const stmts=[];for(const [k,v] of Object.entries(b.settings)){if(!allowed.includes(k))continue;stmts.push(env.DB.prepare(`INSERT INTO settings(key,value_json,updated_by_admin_id,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_by_admin_id=excluded.updated_by_admin_id,updated_at=CURRENT_TIMESTAMP`).bind(k,JSON.stringify(v),admin.id));}if(stmts.length)await env.DB.batch(stmts);await audit(env,admin.id,'configuration_changed','settings','global',{keys:Object.keys(b.settings)},request);return apiOk({message:'Settings saved.'});}

async function adminPromos(env){const rows=await env.DB.prepare('SELECT * FROM promo_campaigns ORDER BY display_order,created_at DESC').all();return apiOk({promos:rows.results.map(mapPromoMedia)});}
async function adminCreatePromo(request,env,admin){const b=await readJson(request);const title=cleanText(b?.title,120),message=cleanText(b?.message,500);if(!title||!message)return apiError('Title and message are required.',400);const mode=['card','popup','floating'].includes(b?.displayMode)?b.displayMode:'card';const r=await env.DB.prepare(`INSERT INTO promo_campaigns(title,message,image_key,icon_key,destination_url,enabled,target_audience,target_value_json,opening_delay_ms,closing_delay_ms,start_at,expires_at,display_mode,display_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(title,message,cleanText(b?.imageKey,500)||null,cleanText(b?.iconKey,500)||null,safeHttpUrl(b?.destinationUrl)?b.destinationUrl:null,boolInt(b?.enabled??1),cleanText(b?.targetAudience,40)||'all',JSON.stringify(Array.isArray(b?.targetValues)?b.targetValues:[]),Math.max(0,Number(b?.openingDelayMs||2500)),Number(b?.closingDelayMs)||null,dateOrNull(b?.startAt),dateOrNull(b?.expiresAt),mode,Number(b?.displayOrder||0)).run();await audit(env,admin.id,'promo_created','promo',String(r.meta.last_row_id),{title},request);return apiOk({id:r.meta.last_row_id,message:'Promotion created.'},201);}

async function adminAudit(env,params){const page=Math.max(1,Number(params.get('page')||1));const rows=await env.DB.prepare(`SELECT l.*,a.full_name AS admin_name,a.email AS admin_email FROM audit_logs l LEFT JOIN admin_users a ON a.id=l.admin_user_id ORDER BY l.created_at DESC LIMIT 100 OFFSET ?`).bind((page-1)*100).all();return apiOk({logs:rows.results,page,hasMore:rows.results.length===100});}
async function adminDiagnostics(env){const checks={d1:true,r2:!!env.MEDIA,resend:mailConfigured(env),paystack:!!env.PAYSTACK_SECRET_KEY,assets:!!env.ASSETS};try{await env.DB.prepare('SELECT 1').first()}catch{checks.d1=false}return apiOk({checks,version:'2.5.0',note:'This is a configuration check, not an external provider health guarantee.'});}

// ---------- Shared helpers ----------

async function currentPlan(env,userId){const row=await env.DB.prepare(`SELECT s.id AS subscription_id,s.status,s.current_period_end,sp.* FROM subscriptions s JOIN subscription_plans sp ON sp.id=s.plan_id WHERE s.user_id=? AND s.status IN ('active','trialing','gifted') AND (s.current_period_end IS NULL OR datetime(s.current_period_end)>datetime('now')) ORDER BY sp.display_order DESC,s.current_period_end DESC LIMIT 1`).bind(userId).first();if(row)return parsePlan(row);const free=await env.DB.prepare(`SELECT * FROM subscription_plans WHERE enabled=1 AND price_minor=0 ORDER BY display_order LIMIT 1`).first();return free?parsePlan({...free,status:'active',subscription_id:null,current_period_end:null}):null;}
function canAccessApp(app,plan){if(!app.subscription_required)return true;if(!app.required_plan_id)return !!plan;return !!plan&&Number(plan.display_order||0)>=Number(app.required_plan_order||Infinity);}
function parsePlan(p){return{...p,features:safeJson(p.features_json,[]),enabled_apps:safeJson(p.enabled_apps_json,[])};}
async function getPublicSettings(env){const keys=['default_theme','allow_user_theme','dock_apps_enabled','dock_updates_enabled','dock_requests_enabled','dock_settings_enabled','support_email','request_attachments_enabled','floating_promo_enabled'];const rows=await env.DB.prepare(`SELECT key,value_json FROM settings WHERE key IN (${keys.map(()=>'?').join(',')})`).bind(...keys).all();const out={};for(const r of rows.results)out[r.key]=safeJson(r.value_json,r.value_json);return out;}
async function activePromos(env,userId){const rows=await env.DB.prepare(`SELECT * FROM promo_campaigns WHERE enabled=1 AND (start_at IS NULL OR datetime(start_at)<=datetime('now')) AND (expires_at IS NULL OR datetime(expires_at)>datetime('now')) ORDER BY display_order,created_at DESC LIMIT 8`).all();return rows.results.map(mapPromoMedia);}
function mapAppMedia(a){return{...a,icon_url:a.icon_key?`/media/${a.icon_key}`:null,screenshots:safeJson(a.screenshots_json,[])};}
function mapUpdateMedia(u){return{...u,image_url:u.image_key?`/media/${u.image_key}`:null,app_ids:safeJson(u.app_ids_json,[])};}
function mapPromoMedia(p){return{...p,image_url:p.image_key?`/media/${p.image_key}`:null,icon_url:p.icon_key?`/media/${p.icon_key}`:null,target_values:safeJson(p.target_value_json,[])};}

async function serveMedia(request,env,key){if(!env.MEDIA)return new Response('Media unavailable',{status:503});if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});key=decodeURIComponent(key);if(key.includes('..')||key.startsWith('product-files/'))return new Response('Not found',{status:404});if(key.startsWith('avatars/')){const parts=key.split('/');const ownerId=Number(parts[1]);const ok=await canReadPrivateMedia(request,env,ownerId);if(!ok)return new Response('Not found',{status:404});}const obj=await env.MEDIA.get(key);if(!obj)return new Response('Not found',{status:404});const headers=new Headers();obj.writeHttpMetadata(headers);headers.set('etag',obj.httpEtag);headers.set('cache-control',key.startsWith('avatars/')?'private, max-age=300':'public, max-age=31536000, immutable');return new Response(request.method==='HEAD'?null:obj.body,{headers});}
async function canReadPrivateMedia(request,env,ownerId){const userToken=getCookie(request,'tc_session');if(userToken){const h=await sha256Hex(userToken);const row=await env.DB.prepare(`SELECT user_id,expires_at,revoked_at FROM sessions WHERE token_hash=?`).bind(h).first();if(row&&!row.revoked_at&&new Date(row.expires_at)>new Date()&&Number(row.user_id)===ownerId)return true;}const adminToken=getCookie(request,'tc_admin_session');if(adminToken){const h=await sha256Hex(adminToken);const row=await env.DB.prepare(`SELECT s.expires_at,s.revoked_at,a.enabled FROM admin_sessions s JOIN admin_users a ON a.id=s.admin_user_id WHERE s.token_hash=?`).bind(h).first();if(row&&!row.revoked_at&&row.enabled&&new Date(row.expires_at)>new Date())return true;}return false;}
async function readImageUpload(request,env,prefix){if(!env.MEDIA)return{response:apiError('R2 media storage is not configured.',503)};let form;try{form=await request.formData()}catch{return{response:apiError('Invalid upload.',400)}}const file=form.get('file');if(!(file instanceof File))return{response:apiError('Image file is required.',400)};const allowed=['image/webp','image/png','image/jpeg'];if(!allowed.includes(file.type))return{response:apiError('Use WebP, PNG or JPEG images.',400)};if(file.size>4*1024*1024)return{response:apiError('Image is too large. Maximum size is 4 MB.',400)};const ext=file.type==='image/webp'?'webp':file.type==='image/png'?'png':'jpg';const key=`${prefix}/${Date.now()}-${randomToken(8).replace(/[^a-zA-Z0-9]/g,'').slice(0,8)}.${ext}`;await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type,cacheControl:'public, max-age=31536000'}});return{key,contentType:file.type,size:file.size};}

async function sendEmail(env,{to,subject,html}){if(!mailConfigured(env))return{ok:false,error:'not_configured'};try{const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({from:env.RESEND_FROM,to:[to],subject,html})});if(!res.ok)return{ok:false,error:await res.text()};return{ok:true};}catch(err){return{ok:false,error:String(err)}}}
function mailConfigured(env){return !!(env.RESEND_API_KEY&&env.RESEND_FROM);}
function allowUnverifiedSignup(env){return String(env.ALLOW_UNVERIFIED_SIGNUP||'').trim().toLowerCase()==='true';}
function emailShell(title,body){return`<!doctype html><html><body style="margin:0;background:#0c0d12;color:#f4f5fb;font-family:Arial,sans-serif"><div style="max-width:560px;margin:auto;padding:32px 20px"><div style="font-weight:800;font-size:22px;margin-bottom:28px">ToolCart</div><div style="background:#151720;border:1px solid #292c39;border-radius:18px;padding:26px"><h1 style="font-size:24px">${escapeHtml(title)}</h1>${body}<p style="color:#a6a9b5;font-size:12px;margin-top:28px">ToolCart</p></div></div></body></html>`;}

async function audit(env,adminId,action,targetType,targetId,details={},request=null){try{const ip=request?await hashIpHint(request.headers.get('cf-connecting-ip')||'unknown'):null;const safe=JSON.stringify(redactAuditDetails(details));await env.DB.prepare(`INSERT INTO audit_logs(admin_user_id,action,target_type,target_id,details_json,ip_hint) VALUES(?,?,?,?,?,?)`).bind(adminId,action,targetType,targetId,safe,ip).run();}catch(err){console.error('Audit write failed',err)}}
function redactAuditDetails(obj){const clone={};for(const[k,v]of Object.entries(obj||{})){if(/password|token|secret|key/i.test(k))clone[k]='[redacted]';else clone[k]=typeof v==='string'&&v.length>500?v.slice(0,500):v;}return clone;}
function redactProviderPayload(data){if(!data||typeof data!=='object')return{};return{reference:data.reference,status:data.status,amount:data.amount,currency:data.currency,channel:data.channel,paid_at:data.paid_at,gateway_response:data.gateway_response};}

async function enforceRateLimit(request,env,action,max,windowSec){const ip=request.headers.get('cf-connecting-ip')||'unknown';const window=Math.floor(Date.now()/(windowSec*1000));const key=await sha256Hex(`${action}|${ip}|${window}`);const row=await env.DB.prepare('SELECT count FROM auth_rate_limits WHERE bucket_key=?').bind(key).first();if(!row){await env.DB.prepare('INSERT INTO auth_rate_limits(bucket_key,count,window_started_at,updated_at) VALUES(?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)').bind(key).run();return null;}if(Number(row.count)>=max)return apiError('Too many attempts. Please try again later.',429);await env.DB.prepare('UPDATE auth_rate_limits SET count=count+1,updated_at=CURRENT_TIMESTAMP WHERE bucket_key=?').bind(key).run();return null;}

function verifyCsrf(request,expected){const token=request.headers.get('x-csrf-token')||'';if(!token||!constantTimeStringEqual(token,expected))return apiError('Security token expired. Refresh and try again.',403);const origin=request.headers.get('origin');if(origin){const u=new URL(request.url);if(new URL(origin).host!==u.host)return apiError('Request origin is not allowed.',403);}return null;}
async function hashPassword(password){const saltBytes=crypto.getRandomValues(new Uint8Array(16));const salt=base64url(saltBytes);const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:saltBytes,iterations:100000},key,256);return{hash:base64url(new Uint8Array(bits)),salt};}
async function verifyPassword(password,salt,expected){try{const saltBytes=fromBase64url(salt);const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:saltBytes,iterations:100000},key,256);return constantTimeBytes(new Uint8Array(bits),fromBase64url(expected));}catch{return false}}
async function sha256Hex(value){const bytes=typeof value==='string'?enc.encode(value):value;const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function verifyHmacHex(secret,data,hex){try{const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-512'},false,['sign']);const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,data));const expected=[...sig].map(b=>b.toString(16).padStart(2,'0')).join('');return constantTimeStringEqual(expected,hex.toLowerCase());}catch{return false}}
function randomToken(bytes=32){return base64url(crypto.getRandomValues(new Uint8Array(bytes)));}
function base64url(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function fromBase64url(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const bin=atob(s);return Uint8Array.from(bin,c=>c.charCodeAt(0));}
function constantTimeBytes(a,b){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a[i]^b[i];return x===0;}
function constantTimeStringEqual(a,b){const aa=enc.encode(String(a)),bb=enc.encode(String(b));return constantTimeBytes(aa,bb);}

function apiOk(data={},status=200){return new Response(JSON.stringify({ok:true,...data}),{status,headers:jsonHeaders});}
function apiError(message,status=400,extra={}){return new Response(JSON.stringify({ok:false,error:message,...extra}),{status,headers:jsonHeaders});}
async function readJson(request){try{return await request.json()}catch{return null}}
function cleanText(v,max=500){return String(v??'').replace(/[\u0000-\u001F\u007F]/g,'').trim().slice(0,max);}
function normalizeEmail(v){return cleanText(v,254).toLowerCase();}
function isEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);}
function slugify(v){return cleanText(v,100).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);}
function boolInt(v){return v===true||v===1||v==='1'||v==='true'?1:0;}
function safeJson(v,fallback){try{return JSON.parse(v)}catch{return fallback}}
function safeHttpUrl(v){try{const u=new URL(String(v||''));return u.protocol==='http:'||u.protocol==='https:'}catch{return false}}
function dateOrNull(v){if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString();}
function dateOrNow(v){return dateOrNull(v)||new Date().toISOString();}
function isoInHours(h){return new Date(Date.now()+h*3600000).toISOString();}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function appOrigin(env,request){if(env.APP_ORIGIN&&safeHttpUrl(env.APP_ORIGIN))return env.APP_ORIGIN.replace(/\/$/,'');const u=new URL(request.url);return `${u.protocol}//${u.host}`;}
function sessionCookie(name,token,days,secure=true){return `${name}=${token}; Path=/; HttpOnly; ${secure?'Secure; ':''}SameSite=Lax; Max-Age=${Math.floor(days*86400)}`;}
function clearCookie(name){return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;}
function getCookie(request,name){const raw=request.headers.get('cookie')||'';for(const part of raw.split(';')){const i=part.indexOf('=');if(i>0&&part.slice(0,i).trim()===name)return part.slice(i+1).trim();}return null;}
async function hashIpHint(ip){return (await sha256Hex(ip)).slice(0,16);}
function deviceLabel(ua){if(/iPhone/i.test(ua))return'iPhone';if(/iPad/i.test(ua))return'iPad';if(/Android/i.test(ua))return'Android device';if(/Macintosh/i.test(ua))return'Mac';if(/Windows/i.test(ua))return'Windows PC';return'Browser session';}
function sanitizeUser(u){return{id:u.id,customerId:u.customer_id,email:u.email,fullName:u.full_name,firstName:u.first_name,phone:u.phone,country:u.country,preferredLanguage:u.preferred_language,timezone:u.timezone,preferredTheme:u.preferred_theme,profileImageUrl:u.profile_image_key?`/media/${u.profile_image_key}`:null,emailVerifiedAt:u.email_verified_at,status:u.status,memberSince:u.created_at,lastActiveAt:u.last_active_at};}
function sanitizeAdmin(a){return{id:a.id,email:a.email,fullName:a.full_name,role:a.role,lastLoginAt:a.last_login_at};}
async function uniqueCustomerId(env){for(let i=0;i<6;i++){const id=`TC${new Date().getUTCFullYear()}${Math.floor(100000+Math.random()*900000)}`;if(!(await env.DB.prepare('SELECT 1 FROM users WHERE customer_id=?').bind(id).first()))return id;}return`TC${Date.now()}`;}
async function uniqueRequestRef(env){for(let i=0;i<6;i++){const id=`REQ-${new Date().getUTCFullYear()}-${Math.floor(100000+Math.random()*900000)}`;if(!(await env.DB.prepare('SELECT 1 FROM requests WHERE reference_number=?').bind(id).first()))return id;}return`REQ-${Date.now()}`;}
