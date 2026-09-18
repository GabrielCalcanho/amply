# AMPLY — Nova identidade visual (v1 completa)

## Design System
- Paleta: carvão / off-white / verde oliva (#5C6B4A · #9BB084 dark)
- Tokens unificados em theme.ts + ThemeContext
- Tipografia, spacing, radius, sombras suaves
- Header neutro (sem barra colorida)

## Navegação (4 tabs)
Início · Músicas · Setlists · Perfil

Drawer: Ministério, Equipe, Calendário, Mensagens + menu existente.

## Telas refeitas
- Home — saudação, próximo compromisso, semana, atalhos
- Músicas — busca, chips Todas/Favoritas, lista
- Detalhe da música — hero, tom/BPM, materiais, anotação
- Setlists — busca, status pill, cards
- Detalhe setlist — tema dinâmico
- Equipe — avatar, badges, convite, edição
- Perfil — tab shell, aparência (tema), dados, segurança

## Sem alteração
Supabase, auth, RLS, APIs, regras de negócio, deps novas

## Aplicar
pnpm exec expo start --clear
