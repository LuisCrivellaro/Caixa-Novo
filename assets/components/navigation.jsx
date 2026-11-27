import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Home01Icon, ChartLineData01Icon, MoneyReceiveSquareIcon, MoneySendSquareIcon, BankIcon, Analytics01Icon
} from '@hugeicons/core-free-icons';

// Seis páginas, todas visíveis ao mesmo tempo. Configurações fica no rodapé da sidebar (HTML estático).
const pages = [
  { value: 'geral', label: 'Visão geral', icon: Home01Icon },
  { value: 'fluxo', label: 'Fluxo de caixa', icon: ChartLineData01Icon },
  { value: 'receber', label: 'Contas a receber', icon: MoneyReceiveSquareIcon },
  { value: 'pagar', label: 'Contas a pagar', icon: MoneySendSquareIcon },
  { value: 'tesouraria', label: 'Tesouraria', icon: BankIcon },
  { value: 'resultados', label: 'Resultados', icon: Analytics01Icon }
];
const listeners = new Set();
const route = location.hash.slice(1).split('/')[0];
let state = { active: pages.some(page => page.value === route) ? route : 'geral', badge: null };
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const snapshot = () => state;
const publish = next => {
  state = { ...state, ...next };
  flushSync(() => listeners.forEach(listener => listener()));
};

function Navigation() {
  const { active, badge } = useSyncExternalStore(subscribe, snapshot);
  const navRef = useRef(null);
  const inkRef = useRef(null);
  // O realce desliza até a página ativa; na primeira pintura ele só aparece no lugar.
  useLayoutEffect(() => {
    const nav = navRef.current, ink = inkRef.current;
    if (!nav || !ink) return undefined;
    const place = (glide) => {
      const link = nav.querySelector('a[aria-current="page"]');
      if (!link) { ink.removeAttribute('data-on'); return; }
      if (!glide) ink.style.transition = 'none';
      ink.style.transform = `translateY(${link.offsetTop}px)`;
      ink.style.height = `${link.offsetHeight}px`;
      ink.setAttribute('data-on', '');
      if (!glide) { void ink.offsetHeight; ink.style.transition = ''; }
    };
    place(ink.hasAttribute('data-on'));
    const ro = new ResizeObserver(() => place(false));
    ro.observe(nav);
    return () => ro.disconnect();
  }, [active, badge]);
  return (
    <nav className="nav" aria-label="Páginas" ref={navRef}>
      <span className="nav-ink" ref={inkRef} aria-hidden="true" />
      {pages.map(page => (
        <a key={page.value} href={`#${page.value}`} data-view={page.value} aria-current={page.value === active ? 'page' : undefined}>
          <HugeiconsIcon icon={page.icon} size={18} strokeWidth={1.7} aria-hidden="true" />
          <span>{page.label}</span>
          {page.value === 'receber' && badge ? <span className="nav-count" aria-label={badge.label}>{badge.text}</span> : null}
        </a>
      ))}
    </nav>
  );
}

// Ponte pequena com o roteador e a camada de cálculos de app.js.
window.CaixaMenu = {
  setActive(value) {
    if (state.active !== value) publish({ active: value });
  },
  setReceivableCount(count) {
    publish({ badge: count > 0 ? { text: new Intl.NumberFormat('pt-BR').format(count), label: `${count} títulos vencidos` } : null });
  }
};

flushSync(() => {
  document.querySelectorAll('[data-menu]').forEach(container => createRoot(container).render(<Navigation />));
});
