# AMPLY — Design Kit para React Native (Expo)

Tradução do redesign de `AmplyApp.tsx` (protótipo web) para componentes React Native.
Só contém arquivos NOVOS em `src/design/`. Nada existente é alterado e nada aqui
é importado até você (ou eu) usar nas telas, então não pode quebrar o app.

Verificado com `tsc --strict` (React 19, react-native, @expo/vector-icons, react-native-safe-area-context): 0 erros.

## Instalação

1. Copie a pasta `src/design` para `C:\projetos\amply\src\design`.
2. Dependências (normalmente já existem; se faltar, use o `expo install`, que respeita o SDK 57):
   ```
   pnpm exec expo install @expo/vector-icons react-native-safe-area-context
   ```
3. Importe de um só lugar: `import { Screen, BrandHeader, ... } from '../design';`

## Mapa: protótipo web → React Native

| Protótipo (AmplyApp.tsx)           | Kit                                   |
| ---------------------------------- | ------------------------------------- |
| `.brand-row` (wordmark + ações)    | `BrandHeader` (com menu de 2 linhas)  |
| `Header`                           | `ScreenHeader`                        |
| `BottomNav`                        | `BottomTabBar`                        |
| `.app-stage` / `.screen`           | `Screen`                              |
| `Avatar`                           | `Avatar` (imagem ou iniciais)         |
| `.icon-tile` / `.round-icon`       | `IconTile`                            |
| `.church-row`, `.notice` (borda)   | `Card`                                |
| `.section-title`                   | `SectionTitle`                        |
| `.shortcut`                        | `ShortcutTile`                        |
| `.next-event`                      | `NextEventCard`                       |
| `Segments`                         | `Segments`                            |
| `.search`                          | `SearchField`                         |
| `.song-row`, `.member-row`, `.settings-list`, `.ministry-list` | `ListRow` + `ListGroup` |
| `.profile-stats`                   | `StatsRow`                            |
| tema claro/escuro                  | `AmplyThemeProvider` / `useAmplyTheme` |

## Exemplos

Barra inferior com React Navigation (Bottom Tabs), sem trocar o navegador:

```tsx
<Tab.Navigator
  screenOptions={{ headerShown: false }}
  tabBar={(p) => (
    <BottomTabBar
      items={[
        { key: 'Home', label: 'Início', icon: 'home' },
        { key: 'Musicas', label: 'Músicas', icon: 'music' },
        // ...use os nomes de rota que já existem no seu RootNavigator
      ]}
      activeKey={p.state.routes[p.state.index].name}
      onPress={(name) => p.navigation.navigate(name)}
    />
  )}
>
```

Linha de música com dados reais do Supabase:

```tsx
<ListGroup>
  {songs.map((s) => (
    <ListRow
      key={s.id}
      leading={<IconTile icon="music" size={40} round inverted />}
      title={s.title}
      subtitle={s.artist}
      meta={<Text>{s.key}</Text>}
      onPress={() => navigation.navigate('MusicaDetalhe', { id: s.id })}
    />
  ))}
</ListGroup>
```

## Home reestruturada (`HomeView`)

Componente só visual, sem dados: hero do ministério com capa e véu escuro, próxima escala em bloco preto,
"Minhas escalas" com data grande, avisos em texto com ponto (sem caixas), aniversariantes em carrossel de fotos.
Seções vazias somem. Sem grade de atalhos e com quase nenhuma borda.

Na `HomeScreen.tsx` real, mantenha os hooks/queries e só mapeie o resultado:

```tsx
<Screen>
  <HomeView
    greetingName={profile.firstName}
    userPhoto={profile.avatarUrl ? { uri: profile.avatarUrl } : null}
    onMenu={openDrawerOuMenuAtual}
    onBell={() => navigation.navigate('Avisos')}
    ministry={{ ministryName: ministry.name, churchName: church.name, cover: ministry.coverUrl ? { uri: ministry.coverUrl } : null, onPress: () => navigation.navigate('MinistryHome') }}
    schedules={mySchedules.map((s) => ({ id: s.id, day: s.day, month: s.month, title: s.title, subtitle: s.time, onPress: () => {/* rota atual */} }))}
    notices={...}
    birthdays={...}
  />
</Screen>
```
(Os nomes acima são ilustrativos: use os campos e rotas que já existem.)

Navegação inferior de 5 itens (Início, Escalas, Repertório, Mensagens, Ministério), via `BottomTabBar`:
`home` → HomeScreen, `calendar` → escalas, `music` → repertório, `message-circle` → MessagesScreen, `users` → MinistryHomeScreen.

## Decisões e limites

- **Menu hambúrguer:** duas linhas, a de baixo menor (`secondLineRatio`, padrão 0.6). O `AmplyApp.tsx` não tinha esse menu; ele vem do que foi combinado depois.
- **Tema escuro:** o do protótipo web herdava um tom azulado do shadcn. O kit usa cinzas neutros, coerente com "preto e branco".
- **Tipografia:** um pouco maior que o protótipo (9–12px fica pequeno em aparelho real).
- **Avatares em escala de cinza:** o protótipo usava `filter: grayscale`, que o `Image` do React Native não tem. Se quiser, dá para tratar a imagem no upload.
- **`Screen`** já aplica a área segura no topo: use `headerShown: false` nas rotas que o usarem.
- **Ícones:** Feather (traço fino). Não há ícone de igreja no Feather; para "Ministérios" use `MaterialCommunityIcons` `church` diretamente ou `users`.
