import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { api } from './api/client.js';

const impactImages = [
  'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=900&q=80'
];

function money(value, currency = 'GBP') {
  return new Intl.NumberFormat(currency?.toLowerCase() === 'inr' ? 'en-IN' : 'en-GB', {
    style: 'currency',
    currency: currency || 'GBP',
    minimumFractionDigits: 0
  }).format((value || 0) / 100);
}

function scannerPayload({ plan, amount, currency, userEmail }) {
  const upiId = import.meta.env.VITE_UPI_ID || 'digitalheroes@upi';
  const merchant = import.meta.env.VITE_MERCHANT_NAME || 'Digital Heroes';
  const amountDecimal = ((amount || 0) / 100).toFixed(2);
  const note = `Digital Heroes ${plan} subscription ${userEmail || ''}`.trim();

  if (upiId) {
    const params = new URLSearchParams({
      pa: upiId,
      pn: merchant,
      am: amountDecimal,
      cu: 'INR',
      tn: note
    });
    return `upi://pay?${params.toString()}`;
  }

  return JSON.stringify({ merchant, plan, amount: amountDecimal, currency, note });
}

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout'));
    document.body.appendChild(script);
  });
}

function dateValue(date) {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
}

function Notice({ error, message }) {
  if (!error && !message) return null;
  return <p className={error ? 'notice error' : 'notice'}>{error || message}</p>;
}

function AuthPanel({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: 'Sample Subscriber',
    email: 'user@digitalheroes.local',
    password: 'User123!'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : form;
      const data = await api(path, { method: 'POST', body: JSON.stringify(body) });
      localStorage.setItem('dh_token', data.token);
      onAuthed(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-copy">
        <p className="eyebrow">Digital Heroes</p>
        <h1>Play for prizes. Fund real causes.</h1>
        <p>Track your latest Stableford scores, support a charity, and stay ready for the monthly draw.</p>
        <img src={impactImages[0]} alt="Community volunteers smiling together" />
      </section>
      <form className="auth-form panel" onSubmit={submit}>
        <div className="split-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Login
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            Register
          </button>
        </div>
        {mode === 'register' && (
          <label>
            Name
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
        )}
        <label>
          Email
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </label>
        <button className="primary" disabled={loading}>{loading ? 'Working...' : mode === 'login' ? 'Enter dashboard' : 'Create account'}</button>
        <Notice error={error} />
        <p className="hint">Seed user: user@digitalheroes.local / User123!</p>
        <p className="hint">Seed admin: admin@digitalheroes.local / Admin123!</p>
      </form>
    </main>
  );
}

function Shell({ user, onLogout, active, setActive }) {
  const nav = user?.role === 'admin'
    ? ['dashboard', 'subscription', 'scores', 'charities', 'draws', 'winners', 'admin']
    : ['dashboard', 'subscription', 'scores', 'charities', 'draws', 'winners'];

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Digital Heroes</p>
        <h1>{user?.name || 'Dashboard'}</h1>
      </div>
      <nav>
        {nav.map((item) => (
          <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}>
            {item}
          </button>
        ))}
      </nav>
      <button className="ghost" onClick={onLogout}>Logout</button>
    </header>
  );
}

function Dashboard({ dashboard, refresh, openSubscription }) {
  const subscription = dashboard?.subscription;
  const winnings = dashboard?.winnings;

  return (
    <section className="grid two">
      <article className="panel impact-panel">
        <div>
          <p className="eyebrow">Subscription</p>
          <h2>{subscription?.status || 'Inactive'}</h2>
          <p>Renewal: {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'No active plan'}</p>
        </div>
        <div className="button-stack">
          <button className="primary small" onClick={openSubscription}>Add subscription</button>
          <button className="ghost small" onClick={refresh}>Refresh</button>
        </div>
      </article>
      <article className="panel image-panel">
        <img src={impactImages[1]} alt="People supporting a community project" />
        <div>
          <p className="eyebrow">Charity Share</p>
          <h2>{dashboard?.charityContributionPercentage || 10}%</h2>
          <p>{subscription?.charity?.name || 'Choose a charity to receive your contribution.'}</p>
        </div>
      </article>
      <article className="panel">
        <p className="eyebrow">Scores Ready</p>
        <h2>{dashboard?.scores?.length || 0}/5</h2>
        <p>Your draw entry uses the five latest score dates.</p>
      </article>
      <article className="panel">
        <p className="eyebrow">Winnings</p>
        <h2>{money(winnings?.totalWon)}</h2>
        <p>{winnings?.pendingPaymentCount || 0} pending payout record(s).</p>
      </article>
    </section>
  );
}

function Subscription({ dashboard, refresh }) {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [checkout, setCheckout] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const subscription = dashboard?.subscription;
  const profile = dashboard?.profile;

  async function createQr(plan) {
    setLoading(true);
    setError('');
    setMessage('');
    setQrImage('');
    setCheckout(null);
    setSelectedPlan(plan);

    try {
      const data = await api('/subscriptions/checkout-session', {
        method: 'POST',
        body: JSON.stringify({ plan })
      });
      const payload = data.checkout || {
        plan,
        amount: data.amount,
        currency: data.currency,
        checkoutUrl: data.checkoutUrl
      };
      const qrText = payload.checkoutUrl || scannerPayload({
        plan,
        amount: payload.amount,
        currency: payload.currency,
        userEmail: profile?.email
      });
      const image = await QRCode.toDataURL(qrText, {
        width: 280,
        margin: 2,
        color: {
          dark: '#171715',
          light: '#ffffff'
        }
      });

      setCheckout({ ...payload, qrText });
      setQrImage(image);
      setMessage('Scan this QR code with your payment scanner.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function payWithRazorpay(plan = selectedPlan) {
    setPaying(true);
    setError('');
    setMessage('');

    try {
      const data = await api('/subscriptions/razorpay/order', {
        method: 'POST',
        body: JSON.stringify({ plan })
      });

      if (data.order?.mode === 'mock') {
        setError('Razorpay keys are not configured on the backend yet. Add them to the backend .env and restart the server.');
        return;
      }

      await loadRazorpayScript();

      const key = data.order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!key) throw new Error('Missing Razorpay key id');

      const options = {
        key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: data.order.name || 'Digital Heroes',
        description: data.order.description,
        order_id: data.order.id,
        prefill: {
          name: profile?.name,
          email: profile?.email
        },
        theme: {
          color: '#00796b'
        },
        handler: async (response) => {
          await api('/subscriptions/razorpay/verify', {
            method: 'POST',
            body: JSON.stringify(response)
          });
          setMessage('Razorpay payment verified. Subscription activated.');
          await refresh();
        },
        modal: {
          ondismiss: () => setPaying(false)
        }
      };

      const instance = new window.Razorpay(options);
      instance.on('payment.failed', (response) => {
        setError(response.error?.description || 'Razorpay payment failed');
        setPaying(false);
      });
      instance.open();
    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  }

  return (
    <section className="grid two subscription-layout">
      <article className="panel">
        <p className="eyebrow">Subscription</p>
        <h2>Add subscription</h2>
        <p>Choose a plan, scan the QR code, and complete the payment from your scanner app.</p>
        <div className="plan-grid">
          <button className={selectedPlan === 'monthly' ? 'plan active' : 'plan'} onClick={() => createQr('monthly')} disabled={loading}>
            <strong>Monthly</strong>
            <span>Flexible entry</span>
          </button>
          <button className={selectedPlan === 'yearly' ? 'plan active' : 'plan'} onClick={() => createQr('yearly')} disabled={loading}>
            <strong>Yearly</strong>
            <span>Discounted annual plan</span>
          </button>
        </div>
        <button className="primary razorpay-button" onClick={() => payWithRazorpay()} disabled={paying}>
          {paying ? 'Opening Razorpay...' : `Pay ${selectedPlan} with Razorpay`}
        </button>
        <Notice error={error} message={message} />
        <div className="current-subscription">
          <p className="eyebrow">Current Status</p>
          <h3>{subscription?.status || 'Inactive'}</h3>
          <p>{subscription?.currentPeriodEnd ? `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` : 'No active subscription found.'}</p>
        </div>
        <button className="ghost" onClick={refresh}>Refresh status</button>
      </article>

      <article className="panel qr-panel">
        <p className="eyebrow">Scanner QR</p>
        <h2>{checkout ? `${checkout.plan} plan` : 'Select a plan'}</h2>
        {qrImage ? (
          <>
            <img className="qr-image" src={qrImage} alt="Subscription payment QR code" />
            <p className="qr-amount">{money(checkout.amount, checkout.currency)}</p>
            <p>Open your scanner app and scan this code to pay for the selected subscription.</p>
            <p className="hint">For Razorpay UPI, use the Razorpay button and choose UPI or QR inside Checkout.</p>
          </>
        ) : (
          <div className="qr-empty">
            <span>QR</span>
            <p>Monthly and yearly subscription QR codes will appear here.</p>
          </div>
        )}
      </article>
    </section>
  );
}

function Scores({ scores, refresh }) {
  const [form, setForm] = useState({ value: 30, playedAt: dateValue(new Date()), notes: '' });
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function save(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const path = editingId ? `/scores/${editingId}` : '/scores';
      const method = editingId ? 'PATCH' : 'POST';
      await api(path, {
        method,
        body: JSON.stringify({ ...form, value: Number(form.value) })
      });
      setEditingId('');
      setMessage('Score saved.');
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    setError('');
    await api(`/scores/${id}`, { method: 'DELETE' });
    await refresh();
  }

  return (
    <section className="grid two">
      <form className="panel" onSubmit={save}>
        <p className="eyebrow">Stableford Score</p>
        <h2>{editingId ? 'Edit score' : 'Add latest score'}</h2>
        <label>
          Score
          <input type="number" min="1" max="45" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} />
        </label>
        <label>
          Date
          <input type="date" value={form.playedAt} onChange={(event) => setForm({ ...form, playedAt: event.target.value })} />
        </label>
        <label>
          Notes
          <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </label>
        <button className="primary">{editingId ? 'Update score' : 'Add score'}</button>
        {editingId && <button type="button" className="ghost" onClick={() => setEditingId('')}>Cancel edit</button>}
        <Notice error={error} message={message} />
      </form>
      <div className="list">
        {(scores || []).map((score) => (
          <article className="panel list-row" key={score._id}>
            <div>
              <p className="eyebrow">{new Date(score.playedAt).toLocaleDateString()}</p>
              <h3>{score.value} points</h3>
              <p>{score.notes || 'No notes'}</p>
            </div>
            <div className="row-actions">
              <button className="ghost" onClick={() => {
                setEditingId(score._id);
                setForm({ value: score.value, playedAt: dateValue(score.playedAt), notes: score.notes || '' });
              }}>
                Edit
              </button>
              <button className="ghost danger" onClick={() => remove(score._id)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Charities() {
  const [charities, setCharities] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await api(`/charities${query ? `?search=${encodeURIComponent(query)}` : ''}`);
      setCharities(data.charities || []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section>
      <div className="toolbar">
        <input placeholder="Search charities" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button className="primary small" onClick={load}>Search</button>
      </div>
      <Notice error={error} />
      <div className="charity-grid">
        {charities.map((charity, index) => (
          <article className="panel charity" key={charity._id}>
            <img src={charity.imageUrls?.[0] || impactImages[index % impactImages.length]} alt={`${charity.name} charity`} />
            <div>
              <p className="eyebrow">{charity.category || 'Impact'}</p>
              <h3>{charity.name}</h3>
              <p>{charity.description}</p>
              <strong>{money(charity.totalContributed)} contributed</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Draws({ isAdmin }) {
  const [draws, setDraws] = useState([]);
  const [form, setForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), logic: 'random' });
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const data = await api('/draws');
    setDraws(data.draws || []);
  }

  async function run(path) {
    setError('');
    try {
      const data = await api(path, {
        method: 'POST',
        body: JSON.stringify({ ...form, month: Number(form.month), year: Number(form.year) })
      });
      setPreview(data);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  return (
    <section className="grid two">
      {isAdmin && (
        <article className="panel">
          <p className="eyebrow">Draw Control</p>
          <h2>Run monthly draw</h2>
          <div className="inline-fields">
            <input type="number" min="1" max="12" value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })} />
            <input type="number" min="2020" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} />
          </div>
          <select value={form.logic} onChange={(event) => setForm({ ...form, logic: event.target.value })}>
            <option value="random">Random</option>
            <option value="algorithmic">Algorithmic</option>
          </select>
          <div className="button-row">
            <button className="ghost" onClick={() => run('/draws/simulate')}>Simulate</button>
            <button className="primary" onClick={() => run('/draws/publish')}>Publish</button>
          </div>
          <Notice error={error} />
          {preview?.draw && <p className="notice">Numbers: {preview.draw.winningNumbers.join(', ')}</p>}
        </article>
      )}
      <div className="list">
        {draws.map((draw) => (
          <article className="panel list-row" key={draw._id}>
            <div>
              <p className="eyebrow">{draw.month}/{draw.year} · {draw.status}</p>
              <h3>{draw.winningNumbers?.length ? draw.winningNumbers.join(' · ') : 'Awaiting numbers'}</h3>
              <p>{money(draw.totalPrizePool)} prize pool · {draw.activeSubscriberCount} active subscribers</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Winners({ isAdmin }) {
  const [winners, setWinners] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    const data = await api(isAdmin ? '/winners' : '/winners/me');
    setWinners(data.winners || []);
  }

  async function review(id, status) {
    await api(`/winners/${id}/review`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await load();
  }

  async function paid(id) {
    await api(`/winners/${id}/paid`, { method: 'PATCH' });
    await load();
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [isAdmin]);

  return (
    <section>
      <Notice error={error} />
      <div className="list">
        {winners.map((winner) => (
          <article className="panel list-row" key={winner._id}>
            <div>
              <p className="eyebrow">{winner.matchType} · {winner.verificationStatus}</p>
              <h3>{money(winner.prizeAmount)}</h3>
              <p>{winner.user?.email || 'Your prize'} · payment {winner.paymentStatus}</p>
            </div>
            {isAdmin && (
              <div className="row-actions">
                <button className="ghost" onClick={() => review(winner._id, 'approved')}>Approve</button>
                <button className="ghost danger" onClick={() => review(winner._id, 'rejected')}>Reject</button>
                <button className="primary small" onClick={() => paid(winner._id)}>Paid</button>
              </div>
            )}
          </article>
        ))}
        {!winners.length && <article className="panel"><h3>No winner records yet.</h3><p>Published draws will appear here when entries match.</p></article>}
      </div>
    </section>
  );
}

function Admin() {
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    const [analyticsData, usersData] = await Promise.all([
      api('/admin/analytics'),
      api('/admin/users')
    ]);
    setAnalytics(analyticsData.analytics);
    setUsers(usersData.users || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  return (
    <section className="grid two">
      <article className="panel">
        <p className="eyebrow">Platform</p>
        <h2>{analytics?.totalUsers || 0} users</h2>
        <p>{analytics?.activeSubscribers || 0} active subscribers</p>
        <p>{money(analytics?.totalPrizePool)} prize pool</p>
      </article>
      <article className="panel">
        <p className="eyebrow">Review Queue</p>
        <h2>{analytics?.pendingWinners || 0}</h2>
        <p>Winner proof submissions pending review.</p>
      </article>
      <div className="list wide">
        <Notice error={error} />
        {users.map((item) => (
          <article className="panel list-row" key={item._id}>
            <div>
              <p className="eyebrow">{item.role} · {item.status}</p>
              <h3>{item.name}</h3>
              <p>{item.email}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [active, setActive] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';

  async function loadDashboard() {
    const data = await api('/dashboard/me');
    setDashboard(data.dashboard);
    setUser(data.dashboard.profile);
  }

  async function restore() {
    const token = localStorage.getItem('dh_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      await loadDashboard();
    } catch {
      localStorage.removeItem('dh_token');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    restore();
  }, []);

  async function afterAuth(nextUser) {
    setUser(nextUser);
    try {
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  function logout() {
    localStorage.removeItem('dh_token');
    setUser(null);
    setDashboard(null);
    setActive('dashboard');
  }

  const content = useMemo(() => {
    if (active === 'subscription') return <Subscription dashboard={dashboard} refresh={loadDashboard} />;
    if (active === 'scores') return <Scores scores={dashboard?.scores} refresh={loadDashboard} />;
    if (active === 'charities') return <Charities />;
    if (active === 'draws') return <Draws isAdmin={isAdmin} />;
    if (active === 'winners') return <Winners isAdmin={isAdmin} />;
    if (active === 'admin') return <Admin />;
    return <Dashboard dashboard={dashboard} refresh={loadDashboard} openSubscription={() => setActive('subscription')} />;
  }, [active, dashboard, isAdmin]);

  if (loading) return <main className="loading">Loading Digital Heroes...</main>;
  if (!user) return <AuthPanel onAuthed={afterAuth} />;

  return (
    <div className="app">
      <Shell user={user} onLogout={logout} active={active} setActive={setActive} />
      <Notice error={error} />
      {content}
    </div>
  );
}
