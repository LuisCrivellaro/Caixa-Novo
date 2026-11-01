import { createRoot } from 'react-dom/client';
import RubberSegment from './RubberSegment/RubberSegment.jsx';

const items = [
  { value: 'dia', label: 'Dia' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' }
];

// O único estado de período continua em app.js. Renderizar atualiza as props,
// mantendo a instância e os motion values da animação original.
window.CaixaFlowPeriod = {
  mount(container, { value, onChange }) {
    const root = createRoot(container);
    const setValue = value => root.render(<RubberSegment
      items={items}
      value={value}
      onChange={onChange}
      trackColor="var(--raised)"
      thumbColor="var(--active)"
      textColor="var(--muted)"
      activeTextColor="var(--text)"
      size="md"
      radius={10}
      className="caixa-period"
      aria-label="Agrupar fluxo de caixa por período"
    />);
    setValue(value);
    return { setValue };
  }
};
