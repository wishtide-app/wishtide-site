// Staff vouch page for a group dream (token from the email link). See supabase/functions/group-checks and
// migration 0048: the person says whether they know the organizer, then answers a short form. Only "I know them"
// + "yes, the dream is real" confirms the vouch; any other answer is saved for the Wishtide team (admins only).
(function () {
  var API = 'https://nukwzrwigjyzakktxqtp.supabase.co/functions/v1/group-checks';
  var T = {
    en: {
      title: 'Confirm a group dream',
      intro: 'Someone shared a group dream on Wishtide and said you can vouch for it. It takes about a minute. You are not giving money.',
      prefix: 'My dream is to ',
      meta: function (name, org) { return [name, org].filter(Boolean).join(' · '); },
      askQ: function (name) { return name ? 'Do you know ' + name + '?' : 'Do you know the person who shared this dream?'; },
      yesKnow: 'Yes, I know this person',
      noKnow: 'No, I don’t know them',
      howLabel: 'How do you know them?',
      how: { staff: 'I work at their organization', volunteer: 'I volunteer with them', coworker: 'We work together',
        faith: 'Church or faith community', teacher: 'School (teacher or parent)', neighbor: 'Neighbor', friend: 'Friend',
        family: 'Family', other: 'Other' },
      howOther: 'Tell us how (e.g. their doctor)',
      longLabel: 'For how long?',
      long: { lt1: 'Less than 1 year', '1to3': '1 to 3 years', '3to10': '3 to 10 years', gt10: 'More than 10 years' },
      realLabel: 'Is this dream real and important for them?',
      real: { yes: 'Yes', not_sure: 'I’m not sure', no: 'No' },
      noteLabel: 'Anything we should know? (optional)',
      count: function (n) { return n + ' / 500'; },
      send: 'Send my answer',
      back: '← Back',
      noIntro: 'Thank you for telling us. You can add a note for the Wishtide team if you like.',
      missing: { how: 'Please choose how you know them.', other: 'Please tell us how you know them (at least 2 characters).',
        long: 'Please choose for how long.', real: 'Please answer whether the dream is real and important for them.' },
      doneTitle: 'Thank you!',
      doneYes: 'Your answer helps this dream go live. The Wishtide team reviews every group dream before it is published.',
      doneOther: 'Thank you for your honesty. Your answer goes only to the Wishtide team, who will take a careful look at this dream.',
      sending: 'Sending…',
      loading: 'Loading…',
      bad: 'This link is not complete. Please open it again from the email.',
      used: 'This link was already used or is no longer valid. If you think that’s wrong, write to wishtide.app@gmail.com.',
      failed: 'Something went wrong. Please try again.',
      contact: 'If you don’t recognize this dream, you can also write to wishtide.app@gmail.com.'
    },
    es: {
      title: 'Confirma un sueño de grupo',
      intro: 'Alguien compartió un sueño de grupo en Wishtide e indicó que tú lo puedes avalar. Toma más o menos un minuto. No estás dando dinero.',
      prefix: 'Mi sueño es ',
      meta: function (name, org) { return [name, org].filter(Boolean).join(' · '); },
      askQ: function (name) { return name ? '¿Conoces a ' + name + '?' : '¿Conoces a la persona que compartió este sueño?'; },
      yesKnow: 'Sí, conozco a esta persona',
      noKnow: 'No, no la conozco',
      howLabel: '¿De dónde la conoces?',
      how: { staff: 'Trabajo en su organización', volunteer: 'Soy voluntario/a con ella', coworker: 'Trabajamos juntos',
        faith: 'Iglesia o comunidad de fe', teacher: 'Colegio (profesor/a o familia)', neighbor: 'Vecino/a', friend: 'Amigo/a',
        family: 'Familia', other: 'Otro' },
      howOther: 'Cuéntanos de dónde (p. ej. soy su médico)',
      longLabel: '¿Desde hace cuánto?',
      long: { lt1: 'Menos de 1 año', '1to3': 'De 1 a 3 años', '3to10': 'De 3 a 10 años', gt10: 'Más de 10 años' },
      realLabel: '¿Este sueño es real e importante para ellos?',
      real: { yes: 'Sí', not_sure: 'No estoy seguro/a', no: 'No' },
      noteLabel: '¿Algo que debamos saber? (opcional)',
      count: function (n) { return n + ' / 500'; },
      send: 'Enviar mi respuesta',
      back: '← Atrás',
      noIntro: 'Gracias por contarnos. Si quieres, puedes dejar una nota para el equipo de Wishtide.',
      missing: { how: 'Elige de dónde la conoces.', other: 'Cuéntanos de dónde la conoces (al menos 2 caracteres).',
        long: 'Elige desde hace cuánto.', real: 'Responde si el sueño es real e importante para ellos.' },
      doneTitle: '¡Gracias!',
      doneYes: 'Tu respuesta ayuda a que este sueño se publique. El equipo de Wishtide revisa cada sueño de grupo antes de publicarlo.',
      doneOther: 'Gracias por tu sinceridad. Tu respuesta solo la ve el equipo de Wishtide, que revisará este sueño con cuidado.',
      sending: 'Enviando…',
      loading: 'Cargando…',
      bad: 'Este enlace no está completo. Ábrelo de nuevo desde el correo.',
      used: 'Este enlace ya se usó o ya no es válido. Si crees que es un error, escribe a wishtide.app@gmail.com.',
      failed: 'Algo salió mal. Inténtalo de nuevo.',
      contact: 'Si no reconoces este sueño, también puedes escribir a wishtide.app@gmail.com.'
    }
  };

  var params = new URLSearchParams(window.location.search);
  var token = params.get('t') || '';
  var lang = params.get('l') === 'es' ? 'es' : params.get('l') === 'en' ? 'en' : null;
  var info = null; // { dream, lang, dreamerName, orgName }
  var step = 'loading'; // loading | ask | form | no | done | dead
  var counted = false;
  var $ = function (id) { return document.getElementById(id); };
  var t = function () { return T[lang || 'en']; };

  function show(name) {
    step = name;
    ['ask', 'form', 'no', 'done'].forEach(function (s) { $('step-' + s).hidden = s !== name; });
    $('dream-card').hidden = !info || name === 'done';
    $('intro').hidden = name === 'done' || name === 'dead';
    if (name !== 'loading' && name !== 'dead') status('');
  }
  function status(text, isError) {
    $('status').textContent = text;
    $('status').className = isError ? 'vouch-error' : '';
  }
  function radios(boxId, group, labels) {
    var box = $(boxId);
    var current = (box.querySelector('input:checked') || {}).value;
    box.textContent = '';
    Object.keys(labels).forEach(function (key) {
      var label = document.createElement('label');
      label.className = 'vouch-option';
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = group;
      input.value = key;
      if (key === current) input.checked = true;
      input.addEventListener('change', onChange);
      label.appendChild(input);
      label.appendChild(document.createTextNode(' ' + labels[key]));
      box.appendChild(label);
    });
  }
  function picked(group) {
    var el = document.querySelector('input[name="' + group + '"]:checked');
    return el ? el.value : '';
  }
  function onChange() {
    $('how-other').hidden = picked('how') !== 'other';
    $('form-error').textContent = '';
  }

  // Fills every text in the current language (also after switching language).
  function render() {
    var s = t();
    document.documentElement.lang = lang || 'en';
    document.title = s.title + ' · Wishtide';
    $('title').textContent = s.title;
    $('intro').textContent = s.intro;
    $('contact').textContent = s.contact;
    Array.prototype.forEach.call(document.querySelectorAll('[data-t]'), function (el) {
      el.textContent = s[el.getAttribute('data-t')];
    });
    if (info) {
      // The dream sentence stays in the language it was written in.
      $('dream-text').textContent = '“' + T[info.lang === 'es' ? 'es' : 'en'].prefix + info.dream + '”';
      $('dream-meta').textContent = s.meta(info.dreamerName, info.orgName);
      $('ask-q').textContent = s.askQ(info.dreamerName);
    }
    radios('how-options', 'how', s.how);
    radios('long-options', 'long', s.long);
    radios('real-options', 'real', s.real);
    $('how-other').placeholder = s.howOther;
    $('how-other').setAttribute('aria-label', s.howOther);
    $('note-count').textContent = s.count($('note').value.length);
    $('done-title').textContent = s.doneTitle;
    $('done-body').textContent = counted ? s.doneYes : s.doneOther;
    onChange();
  }

  function post(payload) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) { return { ok: res.ok, status: res.status, body: body }; });
      });
  }

  function send(answers, button, errorEl) {
    var s = t();
    button.disabled = true;
    errorEl.textContent = s.sending;
    errorEl.classList.add('vouch-busy');
    post({ action: 'confirm_vouch', token: token, answers: answers })
      .then(function (r) {
        button.disabled = false;
        errorEl.classList.remove('vouch-busy');
        if (r.ok && r.body.saved) {
          counted = !!r.body.confirmed;
          render();
          show('done');
          $('step-done').focus();
          window.scrollTo(0, 0);
        } else if (r.status === 404) {
          dead(s.used);
        } else if (r.body && /^VOUCH_ANSWER_/.test(r.body.error || '')) {
          var key = { VOUCH_ANSWER_HOW: 'how', VOUCH_ANSWER_HOW_OTHER: 'other', VOUCH_ANSWER_HOW_LONG: 'long', VOUCH_ANSWER_REAL: 'real' }[r.body.error];
          errorEl.textContent = key ? s.missing[key] : s.failed;
        } else {
          errorEl.textContent = s.failed;
        }
      })
      .catch(function () {
        button.disabled = false;
        errorEl.classList.remove('vouch-busy');
        errorEl.textContent = s.failed;
      });
  }

  function dead(message) {
    info = null;
    show('dead');
    status(message, true);
  }

  // Language switch
  Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (b) {
    b.addEventListener('click', function () { lang = b.getAttribute('data-lang'); render(); });
  });
  $('ask-yes').addEventListener('click', function () { show('form'); });
  $('ask-no').addEventListener('click', function () { show('no'); });
  $('back').addEventListener('click', function () { show('ask'); });
  $('back-no').addEventListener('click', function () { show('ask'); });
  $('note').addEventListener('input', function () { $('note-count').textContent = t().count($('note').value.length); });
  $('send').addEventListener('click', function () {
    var s = t();
    var how = picked('how');
    var other = $('how-other').value.trim();
    var missing = !how ? 'how' : how === 'other' && other.length < 2 ? 'other' : !picked('long') ? 'long' : !picked('real') ? 'real' : null;
    if (missing) {
      $('form-error').textContent = s.missing[missing];
      return;
    }
    send({ knows: true, how: how, howOther: how === 'other' ? other : null, howLong: picked('long'), real: picked('real'),
      note: $('note').value.trim() || null }, $('send'), $('form-error'));
  });
  $('send-no').addEventListener('click', function () {
    send({ knows: false, real: 'not_sure', note: $('no-note').value.trim() || null }, $('send-no'), $('no-error'));
  });

  render();
  if (token.length < 20) {
    dead(t().bad);
    return;
  }
  show('loading');
  status(t().loading);
  post({ action: 'vouch_info', token: token })
    .then(function (r) {
      if (r.ok && r.body.dream) {
        info = r.body;
        if (!lang) lang = info.lang === 'es' ? 'es' : 'en';
        render();
        show('ask');
      } else if (r.status === 404 || r.status === 400) {
        dead(t().used);
      } else {
        dead(t().failed);
      }
    })
    .catch(function () { dead(t().failed); });
})();
