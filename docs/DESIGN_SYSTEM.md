# Sistema visual

Tema claro. Tipografia: Fraunces nos títulos e Source Sans 3 no texto. Idioma da interface: português do Brasil.

## Tokens

Definidos em `app/globals.css` como cores do Tailwind 4:

| Token | Valor | Uso |
| --- | --- | --- |
| canvas | `#F7F9FC` | Fundo da aplicação |
| surface | `#FFFFFF` | Painéis e formulários |
| ink | `#172033` | Texto principal |
| muted | `#64748B` | Texto secundário |
| line | `#E2E8F0` | Bordas |
| teal | `#0F766E` | Ação principal |
| aqua | `#14B8A6` | Acento pontual |
| success | `#166534` | Confirmação |
| warning | `#92400E` | Demonstração e atenção |
| danger | `#991B1B` | Falha |

Espaçamento segue a escala do Tailwind, em múltiplos de 4. Cantos de campos e botões usam `rounded-xl`. Foco visível em campos e botões. Alvos de toque com altura mínima de 44px.

## Movimento

Transições de 150ms em botões e campos, apenas com `motion-safe`. `prefers-reduced-motion` remove a transição do campo e o scroll suave.

## O que a interface evita

Gradientes como decoração, sombras pesadas, selos em excesso, emoji no lugar de ícone, métricas sem fonte e animação para esconder espera. O estado de demonstração é uma faixa âmbar persistente, não um detalhe escondido.

## Componentes

`components/ui/button.tsx`, `components/ui/notice.tsx`, `components/ui/submit-button.tsx`, `components/forms/bound-form.tsx`, `components/shell/shell.tsx`. A barra lateral recolhe no desktop e vira diálogo no mobile. A paleta de comandos abre com Ctrl ou Cmd + K e só lista rotas e registros da clínica da sessão.
