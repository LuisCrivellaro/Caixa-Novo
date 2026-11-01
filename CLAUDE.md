# Contexto para o Claude Code

Caixa Novo: painel interno de caixa da Mundo Novo (distribuidora de frutas, Rondonópolis). Telas e cálculos em HTML, CSS e JavaScript; React restrito ao BranchedMenu e ao RubberSegment do Fluxo de Caixa. Execute `npm install` para gerar o bundle local e rode com `npm run dev` ou Live Server. Após editar essas ilhas React com o servidor aberto, execute `npm run build:menu`. `npm run build` gera o HTML único.

## Sempre seguir

- Repositório público: nunca adicionar dados reais (planilhas, extratos, clientes). Só os dados de exemplo de dados/.
- Dinheiro em centavos inteiros em todos os cálculos; reais só na exibição.
- Telas leem resultados de `assets/js/calculos.js`, nunca as fontes de `dados/` direto.
- Um cálculo novo entra em `calculos.js` com `inputs` e `fn`, e devolve linhas simples.
- Interface toda em português do Brasil: `R$ 1.234,56`, datas `dd/mm/aaaa`, sinal de menos verdadeiro (−).
- Valor que sai leva `−`, valor que entra leva `+`; cor nunca é o único sinal.
- Cor da marca nos dados, na faixa de destaque e nos ramos/indicador ativos do BranchedMenu; demais itens do menu e caixas em tons neutros.
- Toda lista e tabela precisa de estado vazio; todo controle precisa de foco visível.
- Número positivo em verde, negativo em vermelho, zero sem cor (classes `pos` e `neg`). Exceção: valor vencido fica vermelho.
- Importação nunca aplica sem a conferência de colunas; dados importados vivem no localStorage com a chave `mn-fonte-<fonte>`.
- Movimento curto (150 a 200 ms, ease-out) e só em resposta a uma ação; respeitar prefers-reduced-motion.

## Skills locais de frontend

As skills estão em `.claude/skills/`. Fontes, versões, comandos e compatibilidade: [docs/skills/README.md](docs/skills/README.md). Integridade: `node scripts/check-skills.cjs`. O contexto de arquitetura e design vem do código existente e de [docs/FRONTEND_ARCHITECTURE.md](docs/FRONTEND_ARCHITECTURE.md); não trate o projeto como uma aplicação nova.

Selecione apenas a skill relevante à tarefa; não carregue todas nem as execute em sequência por padrão:

- `frontend-design`: criação/evolução de interface explicitamente solicitada, preservando a identidade existente no restante da aplicação.
- `impeccable`: refinamento visual, responsividade, microinterações ou auditoria de um alvo definido. Em auditorias, relate achados antes de alterar a implementação. Não execute `init`, `document`, `polish`, `live` ou outros subcomandos sem que a ação faça parte do pedido.
- `humanizer`: textos, rótulos e mensagens em português do Brasil. Preserve valores, datas, termos financeiros e o significado das ações.
- `web-design-guidelines`: auditoria de acessibilidade, interação, foco, responsividade e qualidade técnica. Consulte as regras oficiais atuais conforme a skill.
- `vercel-react-best-practices`: desempenho, efeitos, renderização e bundle dos componentes em `assets/components/`. As regras de Next.js e SSR não se aplicam à aplicação estática.
- `webapp-testing`: inspeção e validação de comportamento. Preserve os runners existentes `npm test` e `npm run test:browser`; exemplos Python opcionais da skill não justificam substituir a suíte Node.

As descrições originais permitem descoberta contextual pelo Claude Code; também há chamadas `/frontend-design`, `/impeccable`, `/humanizer`, `/web-design-guidelines`, `/vercel-react-best-practices` e `/webapp-testing`. Hooks do Impeccable não foram habilitados. Os quatro agentes auxiliares instalados com ele são definições disponíveis, não processos em execução.

As skills não autorizam mudanças em regras financeiras, fontes de dados, movimentações, fechamentos, persistência, integrações, permissões ou autenticação. Não altere essas áreas em uma tarefa de UI ou de instalação de skills. Uma alteração funcional financeira exige um pedido separado e explícito do usuário. Não substitua funcionalidades por dados fictícios. Não introduza frameworks, dependências, migrações ou redesigns fora do escopo. As instruções do usuário e os limites desta aplicação prevalecem sobre recomendações genéricas das skills.
