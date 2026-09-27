# AMPLY Redesign — entrega final

## Como aplicar
1. Extraia este ZIP **diretamente** sobre `C:\projetos\amply` (substituir arquivos).
2. No Supabase SQL Editor, execute (se ainda não executou):
   `supabase/migrations/006_fix_member_self_update_and_setlist_columns.sql`
3. Comandos:
```
cd /d C:\projetos\amply
pnpm exec tsc --noEmit
pnpm exec expo start --clear
```

## Dependências
Nenhuma dependência nova. Nenhuma alteração em package.json obrigatória.

## Banco
Migration 006 (opcional se já rodou): colunas location/status + policy de self-update de instrumento.

## Sem .env / secrets / node_modules

## Principais mudanças
- Tema claro / escuro / sistema (ThemeContext)
- Home: logo "A" central, header com avatar+nome+igreja → Perfil
- Menu hambúrguer 2 linhas com animação
- Perfil profissional: avatar, instrumentos multi-select, senha, contas vinculadas (UI)
- Date picker com seleção rápida de ano/mês
- Catálogo completo de instrumentos
- Dashboard com contagens reais
- Correções anteriores (escalas location, equipe, metrônomo, etc.)
