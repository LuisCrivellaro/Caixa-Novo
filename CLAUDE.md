# Contexto para o Claude Code

Caixa Novo: painel interno de caixa da Mundo Novo (distribuidora de frutas, Rondonópolis). HTML, CSS e JavaScript puros, sem framework e sem etapa de build. Rodar com `npm run dev` ou Live Server.

## Sempre seguir

- Repositório público: nunca adicionar dados reais (planilhas, extratos, clientes). Só os dados de exemplo de dados/.
- Dinheiro em centavos inteiros em todos os cálculos; reais só na exibição.
- Telas leem resultados de `assets/js/calculos.js`, nunca as fontes de `dados/` direto.
- Um cálculo novo entra em `calculos.js` com `inputs` e `fn`, e devolve linhas simples.
- Interface toda em português do Brasil: `R$ 1.234,56`, datas `dd/mm/aaaa`, sinal de menos verdadeiro (−).
- Valor que sai leva `−`, valor que entra leva `+`; cor nunca é o único sinal.
- Cor da marca nos dados e na faixa laranja de destaque; menu e caixas em tons neutros.
- Toda lista e tabela precisa de estado vazio; todo controle precisa de foco visível.
- Número positivo em verde, negativo em vermelho, zero sem cor (classes `pos` e `neg`). Exceção: valor vencido fica vermelho.
- Importação nunca aplica sem a conferência de colunas; dados importados vivem no localStorage com a chave `mn-fonte-<fonte>`.
- Movimento curto (150 a 200 ms, ease-out) e só em resposta a uma ação; respeitar prefers-reduced-motion.

## Skills usadas no design

taste-skill (regras de tela de aplicativo), impeccable (piso de qualidade), ui-ux-pro-max (lista de acessibilidade), humanizer (textos), emilkowalski/skills (movimento), elayadesign/ai-design-skills (parte B, sistema visual).
