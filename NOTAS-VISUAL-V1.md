# AMPLY — Identidade visual v1 (completa + revisão global)

## Design System
- Carvão / off-white / verde oliva (#5C6B4A · #9BB084 dark)
- Tokens unificados (theme.ts + ThemeContext)
- Header neutro, tipografia e spacing consistentes

## Navegação
Tabs: Início · Músicas · Setlists · Perfil
Drawer: Ministério, Equipe, Calendário, Mensagens + menus

## Telas principais
Home, Músicas, Detalhe música, Setlists, Detalhe setlist, Equipe, Perfil

## Revisão global (ETAPA 10)
Todas as telas secundárias migradas para useTheme():
- Formulários (Song, Setlist, Material, SongPicker)
- Calendar, Notifications, ChordViewer, MemberDetail
- Menu (Announcements, Birthdays, Metronome, Plans, ScaleOverview, Unavailability, Settings)
- Ministry SimpleEntityList
- TimeField
- Auth já usava useTheme

Settings: opção Sistema / Claro / Escuro (sem forçar light)

## Aplicar
pnpm exec expo start --clear
