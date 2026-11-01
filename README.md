# Caixa Novo

Painel interno de caixa da Mundo Novo, distribuidora de frutas em Rondonópolis. Uso do dono e do financeiro.

> Este repositório é público e traz só dados de exemplo, inventados. Os dados reais importados pela tela Importar dados ficam no navegador de quem importou e nunca entram no repositório. Não faça commit de planilhas ou extratos reais.

Telas: visão geral, fluxo de caixa, a receber, a pagar, fechamento da gaveta, lançamentos, indicadores, contas financeiras, clientes e fornecedores, categorias, relatórios, conciliação, importação e configurações. Funciona no computador, tablet e celular, com tema claro e escuro.

Os dados em `dados/` são **de exemplo**, gerados por `scripts/gerar_dados.py`. Nenhum número é real ainda.

## Ferramentas

- **Resumo do dia** (Visão geral): monta um texto curto com saldo, movimento do dia, vencimentos da semana, vencidos e diferença de gaveta. Dá para copiar ou abrir direto no WhatsApp.
- **Nota de pagador** (A receber): classifica cada cliente pelos títulos que venceram nos últimos 180 dias, sem cartão. Paga em dia: 90% ou mais pagos até 2 dias depois do vencimento e nenhum atraso acima de 15 dias. Costuma atrasar: menos de 75% em dia com atraso médio de 5 dias ou mais, ou algum atraso acima de 60 dias. Sem histórico: menos de 3 títulos. Os critérios ficam no cálculo `pagadores`, em `calculos.js`.
- **Conciliação bancária**: importa o extrato (OFX, CSV ou Excel) de uma conta e confere cada linha com os lançamentos. Bate quando o valor é igual ao centavo e a data fica a até 3 dias de diferença. Mostra o que bateu, o que só está no extrato e o que só está no sistema. Há um extrato de exemplo para testar.
- **Importar dados**: troca os dados de exemplo pelos reais, uma fonte por vez, a partir de Excel ou CSV. O painel sugere qual coluna do arquivo vai em cada campo, mostra um exemplo lido e quantas linhas não deram para ler, e só aplica depois da conferência. Os dados importados ficam guardados no navegador (localStorage) e cada fonte pode voltar ao exemplo.
- **Títulos e detalhes**: consulte títulos recebidos/pagos e em aberto, com pesquisa, situação, datas, abatimentos e movimentos vinculados quando a fonte tiver essa relação.
- **Relatórios**: movimentações, títulos e fluxo de caixa com filtros, ordenação, paginação e exportação CSV de todos os registros filtrados. O arquivo identifica a origem de exemplo/importada dos dados.
- **Contas financeiras**: saldos informados pelas fontes, com acesso aos movimentos de cada conta. O extrato não reconstrói nem modifica os saldos.

O aviso de origem aparece em todas as telas: exemplos, fontes mistas ou dados totalmente importados. Importar uma fonte substitui seus registros após confirmação; não faz inclusão incremental. Voltar ao exemplo também exige confirmação.

O projeto não tem backend. Cadastro/edição, baixas de pagamentos/recebimentos, transferências, estornos e pagamentos parciais ainda dependem de uma API com persistência e histórico; essas operações não são simuladas pela interface.

Para ler Excel, o painel carrega o SheetJS 0.18.5 do cdnjs na primeira vez que alguém importa um .xlsx. CSV e OFX são lidos sem nada externo.

## Rodar no VS Code

O site lê os arquivos de `dados/` com `fetch`, então precisa de um servidor local. Abrir o `index.html` direto no navegador não carrega os dados.

Escolha um dos caminhos:

Execute `npm install` na primeira vez: ele instala as dependências e compila as duas ilhas React locais, BranchedMenu e RubberSegment. As telas e as rotas continuam em JavaScript. Depois, escolha um dos servidores abaixo.

- **Live Server:** instale a extensão recomendada (o VS Code oferece ao abrir a pasta), clique com o botão direito em `index.html` e escolha "Open with Live Server".
- **Terminal, com Node instalado:** `npm run dev` e abra http://localhost:5173.
- **Terminal, só com Python:** `python -m http.server 5173` e abra http://localhost:5173.

## Estrutura

```
index.html                 telas e textos fixos
assets/css/styles.css      cores, fontes, caixas e versão de celular
assets/js/calculos.js      todos os cálculos do caixa
assets/js/app.js           carga dos dados, rotas, telas e filtros
assets/js/ui.js            tabelas, diálogos, status, mensagens e exportações
assets/js/workspace.js     consultas de gestão, títulos e relatórios
assets/js/charts.js        gráficos em SVG (da taste-skill, licença MIT)
assets/components/BranchedMenu/  BranchedMenu.jsx e BranchedMenu.css, base React Bits
assets/components/navigation.jsx  categorias e integração com o roteador existente
assets/generated/          JS/CSS compilados do menu (gerados, ignorados pelo Git)
assets/img/                logo
dados/*.json               dados de exemplo
scripts/gerar_dados.py     gera os dados de exemplo
scripts/montar_arquivo_unico.py   gera dist/caixa-novo.html, tudo num arquivo
scripts/build-menu.cjs     compila React e Hugeicons localmente com esbuild
tests/                     testes financeiros e de integração no navegador
docs/FRONTEND_ARCHITECTURE.md   arquitetura, design system, validação e pendências
```

## Regras do projeto

- Todo valor em dinheiro é guardado e somado em **centavos inteiros** (`valor_centavos`). Só vira reais na hora de mostrar.
- As telas nunca leem os arquivos de dados diretamente. Elas pedem os resultados aos cálculos de `calculos.js`, e os cálculos leem as fontes. Para trocar os dados de exemplo pelos reais (planilha, ERP), mude só a carga no início de `app.js` e mantenha as mesmas colunas.
- "Hoje" no painel é a data do saldo em `dados/contas.json` (`data_saldo`).
- O saldo mínimo de referência (R$ 120.000,00) é uma premissa. Fica em `calculos.js`, no cálculo `resumo`, na constante `SALDO_MINIMO`.

## Formato dos dados

| Arquivo | Uma linha é | Campos principais |
| --- | --- | --- |
| `contas.json` | uma conta | `conta`, `tipo`, `saldo_centavos`, `data_saldo` |
| `clientes.json` | um cliente | `id`, `nome`, `tipo`, `rota`, `vendedor`, `limite_centavos` |
| `receber.json` | uma parcela a receber | `id`, `pedido`, `cliente_id`, `forma`, `adquirente`, `emissao`, `vencimento`, `valor_centavos`, `pago_em` |
| `pagar.json` | uma parcela a pagar | `id`, `fornecedor`, `categoria`, `documento`, `emissao`, `vencimento`, `valor_centavos`, `abatimento_centavos`, `motivo_abatimento`, `pago_em` |
| `lancamentos.json` | uma entrada ou saída realizada | `id`, `data`, `tipo` (`entrada` ou `saida`), `categoria`, `conta`, `forma`, `valor_centavos` |
| `fechamentos.json` | um fechamento de gaveta | `data`, `responsavel`, valores da gaveta e das vendas por forma, `contado_centavos` |

Datas no formato `AAAA-MM-DD`. `pago_em` vazio (`null`) quer dizer em aberto.

## Visual

- Fundo bege `#F5F3EE`, cards brancos, bordas discretas e sidebar compacta. Laranja do logo `#FE7D01`, destaque `#B85605` no tema claro e `#FF9A3D` no escuro, verde positivo `#35713D` e vermelho negativo `#BE473F`.
- Fontes: Red Hat Display nos títulos e números grandes, Red Hat Text no resto e Birthstone exclusivamente na frase institucional do rodapé.
- Gráficos existentes da taste-skill preservados. Navegação BranchedMenu com ramos curvos e marcador ativo laranja; cores e tipografia acompanham o tema. Números alinhados à direita, algarismos de largura fixa e sombras suaves.

O menu usa a [implementação JavaScript/CSS do BranchedMenu, do React Bits](https://reactbits.dev/c/micro/branched-menu), com Hugeicons nas cinco categorias e nos 14 destinos existentes. Mantém o roteamento por hash, inclusive subrotas e voltar/avançar, e o badge de títulos vencidos. As seções abertas são compartilhadas entre desktop e celular e salvas em `mn-menu-secoes`; a navegação funciona em memória se o armazenamento estiver indisponível. Ao acessar uma página de outra seção recolhida, essa seção abre para mostrar o item ativo.

A sidebar continua com 224px, logo, empresa, frase institucional, atalho de Configurações e temas Auto/Claro/Escuro. A área de navegação tem rolagem própria. A referência e sua licença estão em [docs/licenses/react-bits.md](docs/licenses/react-bits.md).

`npm run dev` recompila o menu ao iniciar. Após editar os arquivos JSX/CSS do componente com o servidor já aberto, execute `npm run build:menu` e atualize o navegador. Os recursos compilados incluem React e os ícones usados; não dependem de CDN para funcionar.

## Verificar e gerar a entrega

```sh
npm install
npm run check
npm test
npm run build
```

O build gera `dist/caixa-novo.html`, com scripts, estilos, logo e dados de exemplo embutidos. Não publica o projeto.

Para os testes de integração: instale o Chromium com `npx playwright install chromium` caso ele não esteja disponível e execute `npm run test:browser`. O teste abre e fecha seu próprio servidor local, verifica as telas em desktop/tablet/celular e gera capturas em `test-results/`.

Não há TypeScript ou configuração de ESLint. `npm run check` verifica sintaxe JavaScript. Consulte [a arquitetura do frontend](docs/FRONTEND_ARCHITECTURE.md) para componentes, decisões e limitações.

A [evolução visual do frontend](docs/FRONTEND_POLISH.md) registra a auditoria, os componentes refinados e a comparação das 14 rotas nos temas claro/escuro em cinco larguras. Para novas alterações visuais, `node tests/visual.cjs before` salva uma referência e `node tests/visual.cjs after` verifica layout, contraste e preservação dos valores exibidos. As capturas ficam em `test-results/`.

A [revisão tipográfica](docs/TYPOGRAPHY.md) documenta a escala centralizada, a legibilidade das tabelas e menus, os ajustes dos rótulos SVG e a validação com fontes externas indisponíveis e texto ampliado. Os testes visuais também verificam os tamanhos efetivos por função e o espaçamento entre datas dos gráficos.

## Skills para Claude Code

Seis skills locais estão instaladas em `.claude/skills/`: Frontend Design, Impeccable, Humanizer, Web Design Guidelines, React Best Practices e Webapp Testing. O [guia de skills](docs/skills/README.md) registra fontes oficiais, versões, instalação, comandos, ativação contextual e limites de compatibilidade. `CLAUDE.md` orienta a seleção por tarefa. Verifique a integridade com `node scripts/check-skills.cjs` e recarregue o Claude Code para usar as skills na próxima sessão.

Os hooks do Impeccable permanecem desativados. A instalação das skills não adiciona dependências npm ao aplicativo nem altera seus cálculos, fontes de dados ou visual.

## Próximos passos

1. Importar as planilhas reais pela tela Importar dados, ou trocar a carga no início de `app.js` por uma fonte fixa (ERP, planilha online).
2. Lançamento manual e baixa de pagamento.
3. Logo oficial em PNG ou SVG (o atual foi recriado a partir de uma imagem).
