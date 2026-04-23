/**
 * Contact Popover - múltiples canales de contacto con fallback robusto
 * Funciona aunque el usuario no tenga cliente mailto: configurado.
 */

const WA_MESSAGE = 'Hola Manrado, me gustaría conversar sobre un proyecto.';

let popoverEl = null;
let fabEl = null;
let isOpen = false;
let lastFocusedBeforeOpen = null;
let copyResetTimer = null;

function buildPopover(fab) {
  const email = fab.dataset.email || 'info@manrado.com';
  const subject = fab.dataset.subject || 'Consulta Manrado';
  const whatsapp = fab.dataset.whatsapp || '';
  const subjectEnc = encodeURIComponent(subject);
  const emailEnc = encodeURIComponent(email);
  const waText = encodeURIComponent(WA_MESSAGE);
  const waUrl = whatsapp ? `https://wa.me/${whatsapp}?text=${waText}` : '';
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${emailEnc}&su=${subjectEnc}`;
  const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${emailEnc}&subject=${subjectEnc}`;
  const mailtoUrl = `mailto:${email}?subject=${subjectEnc}`;

  const el = document.createElement('div');
  el.className = 'fab-popover';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Opciones de contacto');
  el.setAttribute('data-open', 'false');
  el.hidden = true;

  // Iconos SVG inline (mínimos)
  const icons = {
    whatsapp: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.005a9.87 9.87 0 0 1-5.031-1.378l-.36-.214-3.74.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.887 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>',
    gmail: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path fill="currentColor" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>',
    outlook: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path fill="currentColor" d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.33-.76.22-.34.57-.54.35-.2.85-.2t.87.2q.36.2.58.55.22.34.33.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V10.85l1.24.72h.01q.1.07.18.18.07.12.07.25zm-6-8.25v3h3v-3zm0 4.5v3h3v-3zm0 4.5v1.83l3.05-1.83zm-5.25-9v3h3.75v-3zm0 4.5v3h3.75v-3zm0 4.5v2.03l2.41 1.5 1.34-.8v-2.73zM9 3.75V6h2l.13.01.12.04v-2.3zM5.98 15.98q.71 0 1.32-.26.61-.27 1.04-.75.43-.49.67-1.16.24-.68.24-1.5 0-.78-.23-1.44-.23-.66-.66-1.14-.43-.48-1.05-.75-.62-.27-1.4-.27-.79 0-1.42.27-.63.27-1.07.76-.45.5-.69 1.17-.24.68-.24 1.46 0 .79.22 1.45.22.66.65 1.14.43.48 1.05.75.62.27 1.43.27zM7.5 21h12.39L12 16.08V17q0 .41-.3.7-.29.3-.7.3H7.5zm15-.13v-7.24l-5.9 3.54z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    mail: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
  };

  const items = [];
  if (waUrl) {
    items.push({
      type: 'link', cls: 'fab-popover__btn fab-popover__btn--whatsapp',
      icon: icons.whatsapp, label: 'WhatsApp', href: waUrl, external: true
    });
  }
  items.push(
    { type: 'link', cls: 'fab-popover__btn', icon: icons.gmail, label: 'Abrir en Gmail', href: gmailUrl, external: true },
    { type: 'link', cls: 'fab-popover__btn', icon: icons.outlook, label: 'Abrir en Outlook', href: outlookUrl, external: true },
    { type: 'button', cls: 'fab-popover__btn fab-popover__btn--copy', icon: icons.copy, label: `Copiar ${email}`, action: 'copy' },
    { type: 'link', cls: 'fab-popover__btn', icon: icons.mail, label: 'Abrir app de correo', href: mailtoUrl, external: false }
  );

  el.innerHTML = `
    <div class="fab-popover__title" id="fab-popover-title">¿Cómo quieres contactarme?</div>
    <div class="fab-popover__list" role="group" aria-labelledby="fab-popover-title">
      ${items.map(it => {
        if (it.type === 'link') {
          const target = it.external ? ' target="_blank" rel="noopener noreferrer"' : '';
          return `<a class="${it.cls}" href="${it.href}"${target}><span class="fab-popover__icon">${it.icon}</span><span class="fab-popover__label">${it.label}</span></a>`;
        }
        return `<button type="button" class="${it.cls}" data-action="${it.action}" data-copy-target="${email}"><span class="fab-popover__icon">${it.icon}</span><span class="fab-popover__label">${it.label}</span></button>`;
      }).join('')}
    </div>
  `;

  // Iconos extra para feedback de copiado (precargados)
  el._iconCheck = icons.check;
  el._iconCopy = icons.copy;

  return el;
}

function getFocusableItems() {
  if (!popoverEl) return [];
  return Array.from(popoverEl.querySelectorAll('a, button:not([disabled])'));
}

function openPopover() {
  if (!popoverEl || isOpen) return;
  isOpen = true;
  lastFocusedBeforeOpen = document.activeElement;
  popoverEl.hidden = false;
  // forzar reflow para activar transición
  void popoverEl.offsetWidth;
  popoverEl.dataset.open = 'true';
  fabEl.setAttribute('aria-expanded', 'true');
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onDocumentClick, true);
  // foco al primer item
  const items = getFocusableItems();
  if (items[0]) items[0].focus();
}

function closePopover({ restoreFocus = true } = {}) {
  if (!popoverEl || !isOpen) return;
  isOpen = false;
  popoverEl.dataset.open = 'false';
  fabEl.setAttribute('aria-expanded', 'false');
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('click', onDocumentClick, true);
  // ocultar tras la transición
  const hide = () => { if (!isOpen) popoverEl.hidden = true; };
  setTimeout(hide, 180);
  if (restoreFocus && lastFocusedBeforeOpen && typeof lastFocusedBeforeOpen.focus === 'function') {
    lastFocusedBeforeOpen.focus();
  }
}

function onKeyDown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closePopover();
    return;
  }
  if (e.key === 'Tab') {
    const items = getFocusableItems();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

function onDocumentClick(e) {
  if (!isOpen) return;
  if (popoverEl.contains(e.target) || fabEl.contains(e.target)) return;
  closePopover({ restoreFocus: false });
}

async function copyEmail(btn, email) {
  let ok = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(email);
      ok = true;
    } else {
      const ta = document.createElement('textarea');
      ta.value = email;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand('copy');
      document.body.removeChild(ta);
    }
  } catch (_) {
    ok = false;
  }

  const labelEl = btn.querySelector('.fab-popover__label');
  const iconEl = btn.querySelector('.fab-popover__icon');
  if (!labelEl || !iconEl) return;

  if (copyResetTimer) clearTimeout(copyResetTimer);
  const originalLabel = btn.dataset.originalLabel || labelEl.textContent;
  btn.dataset.originalLabel = originalLabel;

  if (ok) {
    btn.classList.add('is-copied');
    iconEl.innerHTML = popoverEl._iconCheck;
    labelEl.textContent = '¡Copiado!';
  } else {
    labelEl.textContent = `No se pudo copiar — ${email}`;
  }

  copyResetTimer = setTimeout(() => {
    btn.classList.remove('is-copied');
    iconEl.innerHTML = popoverEl._iconCopy;
    labelEl.textContent = originalLabel;
  }, 2000);
}

function onPopoverClick(e) {
  const actionBtn = e.target.closest('[data-action]');
  if (actionBtn && actionBtn.dataset.action === 'copy') {
    e.preventDefault();
    copyEmail(actionBtn, actionBtn.dataset.copyTarget);
    return;
  }
  // cualquier link cierra el popover tras invocar la acción nativa
  const link = e.target.closest('a');
  if (link) {
    // dejar que el navegador navegue/abra pestaña; cerrar sin restaurar foco
    setTimeout(() => closePopover({ restoreFocus: false }), 50);
  }
}

export function initContactPopover() {
  fabEl = document.querySelector('.fab-contact');
  if (!fabEl) return;

  popoverEl = buildPopover(fabEl);
  document.body.appendChild(popoverEl);
  popoverEl.addEventListener('click', onPopoverClick);

  const onActivate = (e) => {
    e.preventDefault();
    if (isOpen) closePopover();
    else openPopover();
  };

  fabEl.addEventListener('click', onActivate);
  fabEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onActivate(e);
    }
  });
}
