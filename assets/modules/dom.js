// Minimal DOM helpers for query selection and events
export const qs = (sel, ctx = document) => ctx.querySelector(sel);
export const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
export const on = (el, ev, handler, opts) => el && el.addEventListener(ev, handler, opts);
