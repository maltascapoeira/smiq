// ─── CONFIGURATION ──────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://ikhimltwdbneiojmcilu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kvCGMl0iYUv43dJb1M7rug_o3yU1sFB';
const TABLE             = 'smiq_responses';
// RLS FIX: In Supabase → Authentication → Policies → smiq_responses
// Add policy: Operation=INSERT, Target roles=anon, USING=true, WITH CHECK=true
// ────────────────────────────────────────────────────────────────────────────

const SEGMENTS = {
  curious: {
    label: 'The Curious One',
    icon:  '🌱',
    smiq:  'When it comes to starting Capoeira, what is your single biggest challenge or frustration right now?',
    placeholder: "e.g. I don't know where to find a good school nearby, and I'm not sure what style to look for...",
  },
  student: {
    label: 'The Student',
    icon:  '🎵',
    smiq:  'When it comes to growing in your Capoeira practice, what is your single biggest challenge or frustration right now?',
    placeholder: 'e.g. I struggle with the ginga feeling natural — my footwork is stiff and I freeze in the roda…',
  },
  practitioner: {
    label: 'The Practitioner',
    icon:  '🌀',
    smiq:  'When it comes to taking your Capoeira to the next level, what is your single biggest challenge or frustration right now?',
    placeholder: "e.g. I feel like my game has plateaued — I'm going through the motions but not growing...",
  },
  teacher: {
    label: 'The Teacher',
    icon:  '🪘',
    smiq:  'When it comes to teaching Capoeira and growing your school or group, what is your single biggest challenge or frustration right now?',
    placeholder: 'e.g. Retention is my biggest issue — students come to 4-5 classes then disappear...',
  },
  lapsed: {
    label: 'The One Who Left',
    icon:  '🌙',
    smiq:  'You trained Capoeira and then stepped away — what was the single biggest reason you left?',
    placeholder: "e.g. Life got busy and I couldn't keep up with class times, and eventually I just lost the habit...",
  },
};

// ─── STATE ──────────────────────────────────────────────────────────────────
let state = {
  currentStep:     0,
  segment:         null,
  segmentLabel:    null,
  smiqAnswer:      '',
  teachingRole:    null,
  graduationLevel: null,
  name:            '',
  email:           '',
};

// ─── HELPERS ────────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const isTeacher = () => state.segment === 'teacher';
const isLapsed  = () => state.segment === 'lapsed';

// Steps: 0 = segment, 1 = smiq, 2 = teacher detail, 3 = email
// Non-teachers skip step 2.
function totalDots() { return isTeacher() ? 4 : 3; }
function logicalStep(raw) {
  // Returns visible step number (0-indexed) in the dots
  if (!isTeacher() && raw >= 2) return raw - 1; // skip teacher step
  return raw;
}

function updateDots() {
  const dots = document.querySelectorAll('.dot');
  const teacher = isTeacher();
  dots[2].classList.toggle('hidden', !teacher); // hide/show teacher dot

  dots.forEach((dot, i) => {
    dot.classList.remove('active','done','inactive');
    if (i === 2 && !teacher) return; // skip rendering hidden dot
    const vis = teacher ? i : (i < 2 ? i : i - 1); // visible index
    const cur = teacher ? state.currentStep : (state.currentStep >= 2 ? state.currentStep - 1 : state.currentStep);
    // but actually compare raw indexes
    if (i === state.currentStep) dot.classList.add('active');
    else if (i < state.currentStep) dot.classList.add('done');
    else dot.classList.add('inactive');
  });
}

function renderStep(index) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const card = $('main-card');
  void card.offsetWidth; // force reflow for animation restart
  const el = $(`step-${index}`);
  if (el) el.classList.add('active');
  state.currentStep = index;
  updateDots();
}

function goNext() {
  const next = state.currentStep + 1;
  if (next === 2 && !isTeacher()) renderStep(3); // skip teacher step
  else renderStep(next);
}

function goBack() {
  const prev = state.currentStep - 1;
  if (prev === 2 && !isTeacher()) renderStep(1); // skip back over teacher step
  else renderStep(prev);
}

// ─── STEP 0: SEGMENT ────────────────────────────────────────────────────────
document.querySelectorAll('.segment-card').forEach(card => {
  card.addEventListener('click', () => {
    const seg = card.dataset.segment;
    state.segment      = seg;
    state.segmentLabel = SEGMENTS[seg].label;

    // Set SMIQ question + placeholder
    $('smiq-question').textContent  = SEGMENTS[seg].smiq;
    $('smiq-eyebrow').textContent   = seg === 'lapsed' ? 'Why you stepped away' : 'Your biggest challenge';
    $('smiq-answer').placeholder    = SEGMENTS[seg].placeholder;
    $('smiq-answer').value          = '';
    $('next-from-smiq').disabled    = true;

    // Reset teacher choices
    state.teachingRole    = null;
    state.graduationLevel = null;
    document.querySelectorAll('#role-grid .choice-card, #grad-grid .choice-card')
      .forEach(c => c.classList.remove('selected'));
    $('next-from-teacher').disabled = true;

    renderStep(1);
  });
});

// ─── STEP 1: SMIQ ───────────────────────────────────────────────────────────
$('smiq-answer').addEventListener('input', () => {
  state.smiqAnswer = $('smiq-answer').value;
  $('next-from-smiq').disabled = state.smiqAnswer.trim().length < 10;
});

$('back-from-smiq').addEventListener('click', () => renderStep(0));
$('next-from-smiq').addEventListener('click', goNext);

// ─── STEP 2: TEACHER DETAIL ─────────────────────────────────────────────────
document.querySelectorAll('#role-grid .choice-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('#role-grid .choice-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.teachingRole = card.dataset.role;
    checkTeacherReady();
  });
});

document.querySelectorAll('#grad-grid .choice-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('#grad-grid .choice-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.graduationLevel = card.dataset.grad;
    checkTeacherReady();
  });
});

function checkTeacherReady() {
  $('next-from-teacher').disabled = !(state.teachingRole && state.graduationLevel);
}

$('back-from-teacher').addEventListener('click', () => renderStep(1));
$('next-from-teacher').addEventListener('click', goNext);

// ─── STEP 3: EMAIL ──────────────────────────────────────────────────────────
function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function checkEmailReady() {
  const name  = $('name-input').value.trim();
  const email = $('email-input').value.trim();
  $('submit-btn').disabled = !(name.length > 0 && validateEmail(email));
}

$('name-input').addEventListener('input', () => { state.name = $('name-input').value.trim(); checkEmailReady(); });
$('email-input').addEventListener('input', () => { state.email = $('email-input').value.trim(); checkEmailReady(); });

$('back-from-email').addEventListener('click', goBack);

$('submit-btn').addEventListener('click', async () => {
  const btn  = $('submit-btn');
  const errEl = $('submit-error');
  btn.classList.add('spinning');
  btn.disabled = true;
  errEl.classList.remove('visible');

  const payload = {
    name:             state.name,
    email:            state.email,
    segment:          state.segment,
    segment_label:    state.segmentLabel,
    smiq_answer:      state.smiqAnswer,
    teaching_role:    isTeacher() ? state.teachingRole    : null,
    graduation_level: isTeacher() ? state.graduationLevel : null,
    created_at:       new Date().toISOString(),
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Server error ${res.status}${detail ? ': ' + detail : ''}`);
    }

    // Success
    showSuccess();

  } catch (err) {
    errEl.textContent = `Submission failed: ${err.message}. Please try again.`;
    errEl.classList.add('visible');
    btn.classList.remove('spinning');
    btn.disabled = false;
  }
});

function showSuccess() {
  $('step-dots').style.display = 'none';
  document.querySelectorAll('.step').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });

  const seg = SEGMENTS[state.segment];
  $('success-heading').textContent = `Axe, ${state.name}!`;
  $('success-badge').innerHTML     = `<span>${seg.icon}</span><span>${seg.label}</span>`;
  $('success-msg').textContent     = isLapsed()
    ? "Thank you for sharing your story. Understanding why people step away matters deeply — your answer will be read carefully."
    : "Thank you for sharing. We read every response personally and your answer will help shape something genuinely useful for the Capoeira community.";

  $('success-screen').style.display = 'block';
}

// Initial render
renderStep(0);