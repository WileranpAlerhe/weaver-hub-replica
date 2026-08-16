# Deploy na Vercel — sem configuração

Basta importar o repositório na Vercel e clicar em Deploy. Nada de variáveis
de ambiente, nada de chaves.

## Por que funciona sem config

- **Banco de dados**: a URL e a chave publicável estão embutidas em
  `src/lib/public-config.ts`, então funcionam em qualquer domínio.
- **Acesso do servidor ao banco**: `src/lib/db.server.ts` usa a chave
  publicável + um segredo interno enviado no cabeçalho
  `x-app-server-secret`. As políticas do banco só liberam as tabelas
  `leads` e `fb_settings` quando esse cabeçalho é enviado — ou seja,
  ninguém consegue acessar esses dados de fora, e a chave de service role
  deixou de ser necessária.
- **Pix (Pinpay)**: o token é lido em `src/lib/pinpay.server.ts`. Se a
  variável `PINPAY_TOKEN` não existir, ele usa o valor embutido no arquivo.
- **Pixel/Facebook**: fica salvo no banco, configurável em `/pixelfi`.

## Build

Já definido em `vercel.json` (framework Vite/TanStack Start). Nenhum ajuste
manual necessário.
