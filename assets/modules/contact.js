export function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusDiv = form.querySelector('.form-status');
  const inputs = form.querySelectorAll('input, textarea');

  // Real-time validation
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      validateInput(input);
    });
    
    input.addEventListener('blur', () => {
      validateInput(input);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validate all fields
    let isValid = true;
    inputs.forEach(input => {
      if (!validateInput(input)) {
        isValid = false;
      }
    });

    if (!isValid) return;

    // Simulate submission
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    statusDiv.textContent = '';
    statusDiv.className = 'form-status';

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success
      statusDiv.textContent = '¡Mensaje enviado con éxito! Nos pondremos en contacto pronto.';
      statusDiv.classList.add('success');
      form.reset();
    } catch (error) {
      statusDiv.textContent = 'Hubo un error al enviar el mensaje. Por favor intenta de nuevo.';
      statusDiv.classList.add('error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

function validateInput(input) {
  const group = input.closest('.form-group');
  const errorSpan = group.querySelector('.error-msg');
  let isValid = true;
  let errorMsg = '';

  if (input.hasAttribute('required') && !input.value.trim()) {
    isValid = false;
    errorMsg = 'Este campo es requerido';
  } else if (input.type === 'email' && input.value.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.value.trim())) {
      isValid = false;
      errorMsg = 'Ingresa un correo válido';
    }
  }

  if (isValid) {
    group.classList.remove('error');
    errorSpan.textContent = '';
  } else {
    group.classList.add('error');
    errorSpan.textContent = errorMsg;
  }

  return isValid;
}
