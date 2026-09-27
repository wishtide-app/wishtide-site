// Waiting-list form. Text is only ever written with textContent (never innerHTML), so nothing typed can run as code.
const ENDPOINT = 'https://nukwzrwigjyzakktxqtp.supabase.co/functions/v1/join-waitlist';
const form = document.getElementById('waitlist');
const statusEl = document.getElementById('status');
const dreamField = document.getElementById('dream-field');
const btn = document.getElementById('submit');
const openedAt = Date.now(); // bots submit instantly; people take a few seconds

form.addEventListener('change', () => {
  dreamField.hidden = form.role.value !== 'dreamer';
});

function show(kind, text) {
  statusEl.className = 'status ' + kind;
  statusEl.textContent = text;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) {
    show('err', 'Please enter a valid email address.');
    form.email.focus();
    return;
  }
  btn.disabled = true;
  show('', 'Adding you…');
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        role: form.role.value,
        firstName: form.firstName.value.slice(0, 60),
        dream: form.dream.value.slice(0, 300),
        website: form.website.value, // spam trap
        elapsedMs: Date.now() - openedAt,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    show('ok', "You're on the list. We'll email you the day Wishtide opens. 🌊");
    form.reset();
    dreamField.hidden = true;
  } catch (err) {
    show('err', err.message);
  } finally {
    btn.disabled = false;
  }
});
