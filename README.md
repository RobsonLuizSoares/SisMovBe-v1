# SismovBE Monorepo

Monorepo configurado com Turborepo contendo aplicações web e mobile.

## Estrutura

```
sismovbe/
├── apps/
│   ├── dashboard/    # Next.js (App Router) + Tailwind + shadcn/ui
│   └── mobile/       # Expo React Native + React Navigation + React Native Paper
├── packages/
│   ├── config/       # tsconfig, eslint e prettier compartilhados
│   └── types/        # tipos TypeScript compartilhados
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Pré-requisitos

- Node.js 18+
- pnpm 9+

## Comandos

### Instalar dependências

```bash
pnpm install
```

### Desenvolvimento (roda dashboard e mobile em paralelo)

```bash
pnpm dev
```

> O dashboard estará em http://localhost:3000 e o mobile abrirá o Expo Dev Tools.

### Lint

```bash
pnpm lint
```

### Build

```bash
pnpm build
```

### Formatar código

```bash
pnpm format        # Formatar arquivos
pnpm format:check  # Verificar formatação
```

## Scripts por app

### Dashboard

```bash
cd apps/dashboard
# Configure .env.local com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
pnpm dev     # http://localhost:3000
pnpm build
pnpm start
```

O dashboard exige autenticação. Rotas protegidas permitem roles `PATRIMONIO_ADMIN` ou `SEAME_ADMIN`. Configure o Supabase e crie usuários via Auth + tabela `profiles`.

### Mobile

```bash
cd apps/mobile
pnpm dev     # Expo Dev Tools
pnpm android # Abrir no emulador Android
pnpm ios     # Abrir no simulador iOS
```

## Tecnologias

- **Turborepo** - Build system para monorepos
- **pnpm** - Gerenciador de pacotes
- **Dashboard** - Next.js 15, Tailwind CSS, shadcn/ui
- **Mobile** - Expo, React Navigation, React Native Paper
- **Types** - Tipos compartilhados entre apps
