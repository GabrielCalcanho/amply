# AMPLY

App de gestão de ministério de louvor (escalas, repertório, membros) em React Native com Expo SDK 57 e Supabase.

## Requisitos

- Node.js 20+
- pnpm (`corepack enable` ou `npm i -g pnpm`)
-Conta Supabase com as chaves em `.env` (veja `.env.example`)

## Instalação

```bash
pnpm install
cp .env.example .env   # preencha URL e anon key do Supabase
pnpm start             # expo start (web/android/ios)
```

## Scripts

| Comando        | Descrição                          |
| -------------- | ---------------------------------- |
| `pnpm start`   | Inicia o Expo                      |
| `pnpm web`     | Roda no navegador                  |
| `pnpm android` | Roda no Android                    |
| `pnpm ios`     | Roda no iOS                        |
| `pnpm lint`    | Verificação de tipos (`tsc`)       |

## Estrutura do projeto

```
amply/
├── App.tsx              # Entry point: providers + ErrorBoundary
├── index.js             # Registro no Expo
├── src/
│   ├── components/      # Componentes reutilizáveis (Button, Card, layout/…)
│   ├── constants/       # Constantes (tema, instrumentos)
│   ├── contexts/        # Auth, Theme, Toast, Drawer
│   ├── design/          # Design kit (tokens, primitivos, Screen, headers)
│   ├── navigation/      # RootNavigator (rotas)
│   ├── screens/         # Telas (auth/, menu/, ministry/, account/)
│   ├── services/        # supabase.ts, spotify.ts
│   ├── types/           # Tipos compartilhados
│   ├── utils/           # datas, upload, payload, notificações
│   └── assets/          # Imagens usadas pelo código
├── assets/              # Ícone/splash do app (app.json)
├── public/              # Assets web (favicon, robots.txt)
├── scripts/             # Deploy e testes das edge functions
├── supabase/
│   ├── functions/       # Edge functions (spotify-search)
│   └── migrations/      # Migrações SQL
└── docs/                # Documentação (setup Supabase, Spotify, notas)
```

Regras de organização:

- **Todo código de aplicação vive em `src/`** — nunca criar pastas `src/` espalhadas em `public/`, `scripts/`, `supabase/` ou raiz.
- Imports usam caminhos relativos (`./src/...`, `../components/...`). Não há alias configurado.
- SQL/migrations apenas em `supabase/migrations/`; docs apenas em `docs/`.
- Arquivos `*.backup*`, zips e comparativos não pertencem ao repositório.
- Antes de commitar: `pnpm lint` deve passar com zero erros.

## Documentação

- [Setup do Supabase Auth](docs/CONFIG-SUPABASE-AUTH.md)
- [Setup da busca Spotify](docs/SPOTIFY_SETUP.md)
- [Design kit (src/design)](docs/DESIGN-KIT.md)
