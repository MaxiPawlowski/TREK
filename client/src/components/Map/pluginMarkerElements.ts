import type { PluginMapMarker } from '../../api/client';
import { PLUGIN_TONE_COLORS } from './pluginLayerGeo';

// Tone dot for a plugin marker — visual twin of MapPluginMarkers' divIcon.
export function createPluginMarkerElement(tone: PluginMapMarker['tone']): HTMLDivElement {
  const color = PLUGIN_TONE_COLORS[tone] ?? PLUGIN_TONE_COLORS.default;
  const el = document.createElement('div');
  el.style.cssText = 'width:16px;height:16px;cursor:pointer;';
  el.innerHTML = `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);box-sizing:border-box;"></span>`;
  return el;
}

// Popup body for a plugin marker, built with textContent — the values are already
// host-sanitized, but nothing plugin-supplied is ever handed to innerHTML anyway.
export function buildPluginMarkerPopup(mk: PluginMapMarker): HTMLDivElement {
  const box = document.createElement('div');
  box.style.cssText = 'min-width:120px;font-size:13px;';
  if (mk.label) {
    const t = document.createElement('div');
    t.style.cssText = `font-weight:600;${mk.popupText ? 'margin-bottom:4px;' : ''}`;
    t.textContent = mk.label;
    box.appendChild(t);
  }
  if (mk.popupText) {
    const p = document.createElement('div');
    p.style.color = '#4b5563';
    p.textContent = mk.popupText;
    box.appendChild(p);
  }
  if (mk.url) {
    const a = document.createElement('a');
    a.href = mk.url; // http/https/mailto only — enforced server-side
    a.target = '_blank';
    a.rel = 'noreferrer noopener';
    a.style.cssText = `display:inline-block;margin-top:6px;color:${PLUGIN_TONE_COLORS.default};`;
    a.textContent = mk.url;
    box.appendChild(a);
  }
  return box;
}
