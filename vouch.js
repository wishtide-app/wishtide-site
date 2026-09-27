// Confirms a staff vouch for a group dream (token from the email link). See supabase/functions/group-checks.
(function () {
  var button = document.getElementById('confirm');
  var result = document.getElementById('result');
  var token = new URLSearchParams(window.location.search).get('t') || '';
  if (token.length < 20) {
    button.disabled = true;
    result.textContent = 'This link is not complete. · Este enlace no está completo.';
    return;
  }
  button.addEventListener('click', function () {
    button.disabled = true;
    result.textContent = '…';
    fetch('https://nukwzrwigjyzakktxqtp.supabase.co/functions/v1/group-checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm_vouch', token: token })
    })
      .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
      .then(function (r) {
        if (r.ok && r.body.confirmed) {
          result.textContent = 'Thank you! Your confirmation was saved. · ¡Gracias! Guardamos tu confirmación.';
        } else {
          result.textContent = 'This link was already used or is no longer valid. · Este enlace ya se usó o ya no es válido.';
        }
      })
      .catch(function () {
        button.disabled = false;
        result.textContent = 'Something went wrong. Please try again. · Algo salió mal. Inténtalo de nuevo.';
      });
  });
})();
