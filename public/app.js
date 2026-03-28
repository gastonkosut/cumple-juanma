let currentType = 'individual';
let adults = 1;
let kids = 1;

function setType(type) {
  currentType = type;

  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  const familyFields = document.getElementById('family-fields');
  const nameLabel = document.getElementById('name-label');

  if (type === 'family') {
    familyFields.classList.add('visible');
    nameLabel.textContent = 'NOMBRE DE CONTACTO';
  } else {
    familyFields.classList.remove('visible');
    nameLabel.textContent = 'NOMBRE DEL MAGO/A';
  }
}

function changeCount(field, delta) {
  if (field === 'adults') {
    adults = Math.max(0, adults + delta);
    document.getElementById('adults-count').textContent = adults;
  } else {
    kids = Math.max(0, kids + delta);
    document.getElementById('kids-count').textContent = kids;
  }
}

async function submitRsvp() {
  const name = document.getElementById('name').value.trim();
  const allergies = document.getElementById('allergies').value.trim();
  const submitBtn = document.getElementById('submit-btn');

  if (!name) {
    shakeField('name');
    return;
  }

  if (currentType === 'family' && adults + kids === 0) {
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando lechuza...';

  try {
    const body = {
      name,
      type: currentType,
      allergies
    };

    if (currentType === 'family') {
      body.adults = adults;
      body.kids = kids;
    }

    const res = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al confirmar');
    }

    document.getElementById('rsvp-form').style.display = 'none';
    document.getElementById('success-message').classList.add('visible');
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirmo asistencia ⚡';
    alert('Error: ' + err.message);
  }
}

function shakeField(id) {
  const el = document.getElementById(id);
  el.style.borderColor = '#ae0001';
  el.style.transition = 'transform 0.1s';
  el.style.transform = 'translateX(-5px)';
  setTimeout(() => { el.style.transform = 'translateX(5px)'; }, 100);
  setTimeout(() => { el.style.transform = 'translateX(-3px)'; }, 200);
  setTimeout(() => { el.style.transform = 'translateX(3px)'; }, 300);
  setTimeout(() => {
    el.style.transform = '';
    el.style.borderColor = '';
  }, 400);
  el.focus();
}
