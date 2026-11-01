import { useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import {
  Home01Icon, ChartLineData01Icon, MoneyReceiveSquareIcon, MoneySendSquareIcon,
  CashierIcon, MenuSquareIcon, BankIcon, Analytics01Icon, TagsIcon,
  UserMultipleIcon, FileExportIcon, CheckmarkCircle02Icon, FileImportIcon,
  Settings02Icon, Wallet01Icon, Briefcase01Icon, ToolsIcon
} from '@hugeicons/core-free-icons';
import BranchedMenu from './BranchedMenu/BranchedMenu.jsx';

const link = (value, label, icon) => ({ value, label, icon, href: `#${value}` });
const sections = [
  { value: 'principal', label: 'Principal', icon: Home01Icon, children: [
    link('geral', 'Visão geral', Home01Icon),
    link('fluxo', 'Fluxo de caixa', ChartLineData01Icon)
  ] },
  { value: 'financeiro', label: 'Financeiro', icon: Wallet01Icon, children: [
    link('receber', 'A receber', MoneyReceiveSquareIcon),
    link('pagar', 'A pagar', MoneySendSquareIcon),
    link('fechamento', 'Fechamento', CashierIcon),
    link('lancamentos', 'Lançamentos', MenuSquareIcon),
    link('contas', 'Contas financeiras', BankIcon)
  ] },
  { value: 'gestao', label: 'Gestão', icon: Briefcase01Icon, children: [
    link('indicadores', 'Indicadores', Analytics01Icon),
    link('categorias', 'Categorias', TagsIcon),
    link('pessoas', 'Clientes e fornecedores', UserMultipleIcon),
    link('relatorios', 'Relatórios', FileExportIcon)
  ] },
  { value: 'ferramentas', label: 'Ferramentas', icon: ToolsIcon, children: [
    link('conciliacao', 'Conciliação', CheckmarkCircle02Icon),
    link('dados', 'Importar dados', FileImportIcon)
  ] },
  { value: 'configuracoes', label: 'Configurações', icon: Settings02Icon, children: [
    link('configuracoes', 'Configurações', Settings02Icon)
  ] }
];
const storageKey = 'mn-menu-secoes';
const listeners = new Set();
let open = sections.map(section => section.value);
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (Array.isArray(saved) && saved.every(value => sections.some(section => section.value === value))) {
    open = [...new Set(saved)];
  }
} catch { /* Armazenamento indisponível: mantém o estado em memória. */ }

const route = location.hash.slice(1).split('/')[0];
const active = sections.some(section => section.children.some(item => item.value === route)) ? route : 'geral';
const activeGroup = sections.find(section => section.children.some(item => item.value === active)).value;
if (!open.includes(activeGroup)) open = [...open, activeGroup];
let state = { active, open, items: sections };
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const snapshot = () => state;
const publish = next => {
  state = { ...state, ...next };
  flushSync(() => listeners.forEach(listener => listener()));
};
const saveOpen = open => {
  try { localStorage.setItem(storageKey, JSON.stringify(open)); } catch { /* A navegação continua sem persistência. */ }
};
const toggle = (index, expanded) => {
  const value = sections[index].value;
  const open = expanded ? [...state.open, value] : state.open.filter(key => key !== value);
  saveOpen(open);
  publish({ open });
};
const mobile = matchMedia('(max-width: 900px)');
const subscribeViewport = listener => {
  mobile.addEventListener('change', listener);
  window.addEventListener('resize', listener);
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  return () => { mobile.removeEventListener('change', listener); window.removeEventListener('resize', listener); observer.disconnect(); };
};
const viewportSnapshot = () => `${mobile.matches}:${parseFloat(getComputedStyle(document.documentElement).fontSize) || 16}`;

function Navigation() {
  const { active, open, items } = useSyncExternalStore(subscribe, snapshot);
  const [mobileValue, rootFontSize] = useSyncExternalStore(subscribeViewport, viewportSnapshot).split(':');
  const isMobile = mobileValue === 'true';
  const textScale = Math.max(1, Number(rootFontSize) / 16);
  return <BranchedMenu
    items={items}
    activeValue={active}
    openSections={sections.flatMap((section, index) => open.includes(section.value) ? [index] : [])}
    onToggle={toggle}
    width={196}
    rowHeight={Math.ceil((isMobile ? 48 : 44) * textScale)}
    indent={28}
    trunk={8}
    radius={7}
    fontSize={14 * textScale}
    color="var(--text)"
    accentColor="var(--brand-ink)"
    lineColor="var(--control)"
    drawDuration={200}
    foldDuration={180}
    className="caixa-menu"
  />;
}

// Ponte pequena com o roteador e a camada de cálculos existentes em app.js.
window.CaixaMenu = {
  setActive(value) {
    if (state.active === value) return;
    const section = sections.find(section => section.children.some(item => item.value === value));
    if (!section) return;
    const open = state.open.includes(section.value) ? state.open : [...state.open, section.value];
    saveOpen(open);
    publish({ active: value, open });
  },
  setReceivableCount(count) {
    const badge = count > 0 ? new Intl.NumberFormat('pt-BR').format(count) : undefined;
    publish({ items: sections.map(section => ({ ...section, children: section.children.map(item =>
      item.value === 'receber' ? { ...item, badge, badgeLabel: `${count} títulos vencidos` } : item
    ) })) });
  }
};

flushSync(() => {
  document.querySelectorAll('[data-branched-menu]').forEach(container => createRoot(container).render(<Navigation />));
});
