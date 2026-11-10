# ETAPA 0B — Auditoria dinâmica do Conteudista

- Commit: `04259ceef51725d2d0a3640c477461b4f365d67b`
- Commit esperado da Etapa 0: `04259ceef51725d2d0a3640c477461b4f365d67b`
- Data: 2026-11-09T13:28:47.329Z
- Node.js: v23.11.0
- npm: 10.9.2
- URL local: http://127.0.0.1:4173/

## Matriz A-01 a A-30

| ID | Resultado | Evidência |
|---|---|---|
| A-01 | FAIL | Requer validação manual especificada na Etapa 0. |
| A-02 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-03 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-04 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-05 | PASS | Requer validação manual especificada na Etapa 0. |
| A-06 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-07 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-08 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-09 | PASS | Requer validação manual especificada na Etapa 0. |
| A-10 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-11 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-12 | FAIL | Requer validação manual especificada na Etapa 0. |
| A-13 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-14 | PASS | Requer validação manual especificada na Etapa 0. |
| A-15 | PASS | Requer validação manual especificada na Etapa 0. |
| A-16 | PASS | Requer validação manual especificada na Etapa 0. |
| A-17 | FAIL | Requer validação manual especificada na Etapa 0. |
| A-18 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-19 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-20 | PASS | Requer validação manual especificada na Etapa 0. |
| A-21 | PASS | Requer validação manual especificada na Etapa 0. |
| A-22 | FAIL | Requer validação manual especificada na Etapa 0. |
| A-23 | PASS | Requer validação manual especificada na Etapa 0. |
| A-24 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-25 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-26 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-27 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-28 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-29 | MANUAL | Requer validação manual especificada na Etapa 0. |
| A-30 | MANUAL | Requer validação manual especificada na Etapa 0. |

## Violações axe-core

### label-content-name-mismatch — serious
- Rodada: Tela inicial / desktop-1440
- WCAG/tags: cat.semantics, wcag21a, wcag253, EN-301-549, EN-9.2.5.3, RGAAv4, RGAA-6.1.5
- Ajuda: Elements must have their visible text as part of their accessible name
- Nós: 3
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[data-dica="Título 1 (Ctrl+Shift+1)"][aria-label="Título 1 (Ctrl+Shift+1)"][type="button"]`: Fix any of the following:   Text inside the element is not included in the accessible name
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[type="button"]:nth-child(5)`: Fix any of the following:   Text inside the element is not included in the accessible name
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[data-dica="Título 3 (Ctrl+Shift+3)"][aria-label="Título 3 (Ctrl+Shift+3)"][type="button"]`: Fix any of the following:   Text inside the element is not included in the accessible name

### nested-interactive — serious
- Rodada: Tela inicial / desktop-1440
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 2
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-gal > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### label-content-name-mismatch — serious
- Rodada: Tutorial aberto / desktop-1440
- WCAG/tags: cat.semantics, wcag21a, wcag253, EN-301-549, EN-9.2.5.3, RGAAv4, RGAA-6.1.5
- Ajuda: Elements must have their visible text as part of their accessible name
- Nós: 3
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[data-dica="Título 1 (Ctrl+Shift+1)"][aria-label="Título 1 (Ctrl+Shift+1)"][type="button"]`: Fix any of the following:   Text inside the element is not included in the accessible name
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[type="button"]:nth-child(5)`: Fix any of the following:   Text inside the element is not included in the accessible name
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[data-dica="Título 3 (Ctrl+Shift+3)"][aria-label="Título 3 (Ctrl+Shift+3)"][type="button"]`: Fix any of the following:   Text inside the element is not included in the accessible name

### nested-interactive — serious
- Rodada: Tutorial aberto / desktop-1440
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 2
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-gal > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### label-content-name-mismatch — serious
- Rodada: Ajuda com busca / desktop-1440
- WCAG/tags: cat.semantics, wcag21a, wcag253, EN-301-549, EN-9.2.5.3, RGAAv4, RGAA-6.1.5
- Ajuda: Elements must have their visible text as part of their accessible name
- Nós: 3
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[data-dica="Título 1 (Ctrl+Shift+1)"][aria-label="Título 1 (Ctrl+Shift+1)"][type="button"]`: Fix any of the following:   Text inside the element is not included in the accessible name
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[type="button"]:nth-child(5)`: Fix any of the following:   Text inside the element is not included in the accessible name
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[data-dica="Título 3 (Ctrl+Shift+3)"][aria-label="Título 3 (Ctrl+Shift+3)"][type="button"]`: Fix any of the following:   Text inside the element is not included in the accessible name

### nested-interactive — serious
- Rodada: Ajuda com busca / desktop-1440
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 2
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-gal > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### label-content-name-mismatch — serious
- Rodada: Menu Salvar aberto / desktop-1440
- WCAG/tags: cat.semantics, wcag21a, wcag253, EN-301-549, EN-9.2.5.3, RGAAv4, RGAA-6.1.5
- Ajuda: Elements must have their visible text as part of their accessible name
- Nós: 3
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[data-dica="Título 1 (Ctrl+Shift+1)"][aria-label="Título 1 (Ctrl+Shift+1)"][type="button"]`: Fix any of the following:   Text inside the element is not included in the accessible name
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[type="button"]:nth-child(5)`: Fix any of the following:   Text inside the element is not included in the accessible name
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[data-dica="Título 3 (Ctrl+Shift+3)"][aria-label="Título 3 (Ctrl+Shift+3)"][type="button"]`: Fix any of the following:   Text inside the element is not included in the accessible name

### nested-interactive — serious
- Rodada: Menu Salvar aberto / desktop-1440
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 2
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-gal > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### label-content-name-mismatch — serious
- Rodada: Importar aberto / desktop-1440
- WCAG/tags: cat.semantics, wcag21a, wcag253, EN-301-549, EN-9.2.5.3, RGAAv4, RGAA-6.1.5
- Ajuda: Elements must have their visible text as part of their accessible name
- Nós: 3
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[data-dica="Título 1 (Ctrl+Shift+1)"][aria-label="Título 1 (Ctrl+Shift+1)"][type="button"]`: Fix any of the following:   Text inside the element is not included in the accessible name
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[type="button"]:nth-child(5)`: Fix any of the following:   Text inside the element is not included in the accessible name
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[data-dica="Título 3 (Ctrl+Shift+3)"][aria-label="Título 3 (Ctrl+Shift+3)"][type="button"]`: Fix any of the following:   Text inside the element is not included in the accessible name

### nested-interactive — serious
- Rodada: Importar aberto / desktop-1440
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 2
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-gal > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### label-content-name-mismatch — serious
- Rodada: Compartilhar link aberto / desktop-1440
- WCAG/tags: cat.semantics, wcag21a, wcag253, EN-301-549, EN-9.2.5.3, RGAAv4, RGAA-6.1.5
- Ajuda: Elements must have their visible text as part of their accessible name
- Nós: 3
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[data-dica="Título 1 (Ctrl+Shift+1)"][aria-label="Título 1 (Ctrl+Shift+1)"][type="button"]`: Fix any of the following:   Text inside the element is not included in the accessible name
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[type="button"]:nth-child(5)`: Fix any of the following:   Text inside the element is not included in the accessible name
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[data-dica="Título 3 (Ctrl+Shift+3)"][aria-label="Título 3 (Ctrl+Shift+3)"][type="button"]`: Fix any of the following:   Text inside the element is not included in the accessible name

### nested-interactive — serious
- Rodada: Compartilhar link aberto / desktop-1440
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 2
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-gal > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### label-content-name-mismatch — serious
- Rodada: Versões aberto / desktop-1440
- WCAG/tags: cat.semantics, wcag21a, wcag253, EN-301-549, EN-9.2.5.3, RGAAv4, RGAA-6.1.5
- Ajuda: Elements must have their visible text as part of their accessible name
- Nós: 3
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[data-dica="Título 1 (Ctrl+Shift+1)"][aria-label="Título 1 (Ctrl+Shift+1)"][type="button"]`: Fix any of the following:   Text inside the element is not included in the accessible name
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[type="button"]:nth-child(5)`: Fix any of the following:   Text inside the element is not included in the accessible name
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[data-dica="Título 3 (Ctrl+Shift+3)"][aria-label="Título 3 (Ctrl+Shift+3)"][type="button"]`: Fix any of the following:   Text inside the element is not included in the accessible name

### nested-interactive — serious
- Rodada: Versões aberto / desktop-1440
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 2
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-gal > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### label-content-name-mismatch — serious
- Rodada: Painel Acessibilidade aberto / desktop-1440
- WCAG/tags: cat.semantics, wcag21a, wcag253, EN-301-549, EN-9.2.5.3, RGAAv4, RGAA-6.1.5
- Ajuda: Elements must have their visible text as part of their accessible name
- Nós: 3
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[data-dica="Título 1 (Ctrl+Shift+1)"][aria-label="Título 1 (Ctrl+Shift+1)"][type="button"]`: Fix any of the following:   Text inside the element is not included in the accessible name
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[type="button"]:nth-child(5)`: Fix any of the following:   Text inside the element is not included in the accessible name
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-tb > button[data-dica="Título 3 (Ctrl+Shift+3)"][aria-label="Título 3 (Ctrl+Shift+3)"][type="button"]`: Fix any of the following:   Text inside the element is not included in the accessible name

### nested-interactive — serious
- Rodada: Painel Acessibilidade aberto / desktop-1440
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 2
  - `#pg > .mde[data-la="1"][data-m="s"] > .mde-gal > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Tela inicial / mobile-384
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Tutorial aberto / mobile-384
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Ajuda com busca / mobile-384
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Menu Salvar aberto / mobile-384
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Importar aberto / mobile-384
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Compartilhar link aberto / mobile-384
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Tela inicial / mobile-320
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Tutorial aberto / mobile-320
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Ajuda com busca / mobile-320
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Menu Salvar aberto / mobile-320
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Importar aberto / mobile-320
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Compartilhar link aberto / mobile-320
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Tela inicial / mobile-384-reduce
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Tutorial aberto / mobile-384-reduce
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Ajuda com busca / mobile-384-reduce
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Menu Salvar aberto / mobile-384-reduce
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Importar aberto / mobile-384-reduce
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

### nested-interactive — serious
- Rodada: Compartilhar link aberto / mobile-384-reduce
- WCAG/tags: cat.keyboard, wcag2a, wcag412, TTv5, TT6.a, EN-301-549, EN-9.4.1.2, RGAAv4, RGAA-7.1.1
- Ajuda: Interactive controls must not be nested
- Nós: 1
  - `#dxRes > summary`: Fix any of the following:   Element has focusable descendants. Move them outside of the element, or remove them.

## Medições por rodada

| Rodada | Perfil | axe | Incompletos | <24px | 24–43px | Overflow | Diálogos | Live |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Tela inicial | desktop-1440 | 2 | 4 | 3 | 51 | 0px | 1 | 16 |
| Tutorial aberto | desktop-1440 | 2 | 4 | 3 | 51 | 0px | 1 | 16 |
| Ajuda com busca | desktop-1440 | 2 | 4 | 3 | 53 | 0px | 1 | 16 |
| Menu Salvar aberto | desktop-1440 | 2 | 4 | 3 | 49 | 0px | 0 | 16 |
| Importar aberto | desktop-1440 | 2 | 4 | 3 | 54 | 0px | 1 | 16 |
| Compartilhar link aberto | desktop-1440 | 2 | 4 | 4 | 54 | 0px | 1 | 16 |
| Versões aberto | desktop-1440 | 2 | 4 | 4 | 54 | 0px | 1 | 16 |
| Painel Acessibilidade aberto | desktop-1440 | 2 | 4 | 5 | 53 | 0px | 0 | 16 |
| Tela inicial | mobile-384 | 1 | 4 | 2 | 31 | 0px | 1 | 16 |
| Tutorial aberto | mobile-384 | 1 | 4 | 2 | 31 | 0px | 1 | 16 |
| Ajuda com busca | mobile-384 | 1 | 4 | 2 | 33 | 0px | 1 | 16 |
| Menu Salvar aberto | mobile-384 | 1 | 4 | 2 | 29 | 0px | 0 | 16 |
| Importar aberto | mobile-384 | 1 | 4 | 2 | 34 | 0px | 1 | 16 |
| Compartilhar link aberto | mobile-384 | 1 | 4 | 3 | 34 | 0px | 1 | 16 |
| Tela inicial | mobile-320 | 1 | 4 | 1 | 29 | 0px | 1 | 16 |
| Tutorial aberto | mobile-320 | 1 | 4 | 1 | 29 | 0px | 1 | 16 |
| Ajuda com busca | mobile-320 | 1 | 4 | 2 | 30 | 0px | 1 | 16 |
| Menu Salvar aberto | mobile-320 | 1 | 4 | 1 | 27 | 0px | 0 | 16 |
| Importar aberto | mobile-320 | 1 | 4 | 1 | 32 | 0px | 1 | 16 |
| Compartilhar link aberto | mobile-320 | 1 | 4 | 2 | 32 | 0px | 1 | 16 |
| Tela inicial | mobile-384-reduce | 1 | 4 | 2 | 31 | 0px | 1 | 16 |
| Tutorial aberto | mobile-384-reduce | 1 | 4 | 2 | 31 | 0px | 1 | 16 |
| Ajuda com busca | mobile-384-reduce | 1 | 4 | 2 | 33 | 0px | 1 | 16 |
| Menu Salvar aberto | mobile-384-reduce | 1 | 4 | 2 | 29 | 0px | 0 | 16 |
| Importar aberto | mobile-384-reduce | 1 | 4 | 2 | 34 | 0px | 1 | 16 |
| Compartilhar link aberto | mobile-384-reduce | 1 | 4 | 3 | 34 | 0px | 1 | 16 |

## Testes humanos e de tecnologia assistiva ainda obrigatórios

- [ ] A-01: ciclo de Tab/Shift+Tab, Escape, retorno do foco e fundo inerte em cada janela.
- [ ] A-03: casos 13.5 e 13.7, Alt+Shift+N/I e equivalência com TalkBack/NVDA.
- [ ] A-06/A-13: conflitos dos atalhos com TalkBack, controle por voz e layout de teclado.
- [ ] A-07: avanço automático desligado por padrão, pausa, intervalo >=10x e anúncio dos slides.
- [ ] A-08: navegação sem gesto de arrastar.
- [ ] A-10: diff compreensível sem percepção de cor.
- [ ] A-18: inspeção visual com movimento reduzido.
- [ ] A-19: foco não encoberto por barras fixas.
- [ ] A-21: zoom 200%/400% e espaçamento de texto.
- [ ] A-22: colar senha, gerenciador, mostrar senha e erros associados.
- [ ] A-25: player e anúncio de progresso/download.
- [ ] A-28: tooltip por foco, Escape, hover persistente.
- [ ] A-29: retrato e paisagem sem perda de função.

## Limitação

Resultados automáticos PASS significam apenas que a falha não foi reproduzida nas rodadas executadas. Não representam certificação WCAG 2.2 AA.