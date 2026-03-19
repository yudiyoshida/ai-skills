---
name: swagger-to-postman
description: >-
  Generates a Postman collection from a Swagger/OpenAPI JSON file. Use when the
  user wants to create, generate, or update a Postman collection, mentions
  Postman, or wants to convert Swagger to Postman format.
---

# Swagger to Postman Collection

Converte um arquivo Swagger/OpenAPI JSON em uma Postman Collection v2.1, pronta para importação.

O script de conversão está em [scripts/swagger-to-postman.ts](scripts/swagger-to-postman.ts) dentro desta skill.

## Fluxo

### 1. Coletar o arquivo Swagger

O usuário **deve informar o caminho do arquivo Swagger JSON**. Se não informou, pergunte usando `AskQuestion` ou texto direto:

> Informe o caminho do arquivo Swagger JSON (ex: `swagger.json`, `~/Downloads/swagger.json`).

Se o usuário fornecer uma URL (ex: `http://localhost:3000/swagger-json`), baixe o conteúdo primeiro:

```bash
curl -s <URL> -o swagger.json
```

### 2. Garantir que o script existe no projeto

Verifique se `scripts/swagger-to-postman.ts` existe na raiz do projeto:

```bash
ls scripts/swagger-to-postman.ts
```

**Se não existir**, copie o script desta skill para o projeto:

```bash
mkdir -p scripts
cp .cursor/skills/swagger-to-postman/scripts/swagger-to-postman.ts scripts/swagger-to-postman.ts
```

### 3. Garantir o npm script no package.json

Verifique se o `package.json` contém o script `generate:postman`. Se não tiver, adicione:

```json
{
  "scripts": {
    "generate:postman": "ts-node -r tsconfig-paths/register scripts/swagger-to-postman.ts"
  }
}
```

Pré-requisito: `ts-node` e `typescript` devem estar instalados como devDependencies. Se não estiverem:

```bash
npm install -D ts-node typescript
```

### 4. Validar o arquivo Swagger

Antes de executar, confirme que o arquivo existe e é JSON válido:

```bash
ls -la <caminho-do-arquivo>
node -e "JSON.parse(require('fs').readFileSync('<caminho-do-arquivo>','utf-8')); console.log('JSON válido')"
```

Se o arquivo não existir ou não for JSON, informe o usuário e peça um novo caminho.

### 5. Gerar a collection

Execute o script passando o caminho do arquivo via `SWAGGER_PATH`:

```bash
SWAGGER_PATH=<caminho-do-arquivo> npm run generate:postman
```

Se o usuário não especificou um caminho e o arquivo `swagger.json` na raiz estiver atualizado:

```bash
npm run generate:postman
```

Variáveis de ambiente suportadas:

| Variável | Descrição | Default |
|----------|-----------|---------|
| `SWAGGER_PATH` | Caminho do swagger.json de entrada | `<cwd>/swagger.json` |
| `OUTPUT_PATH` | Caminho do arquivo de saída | `<cwd>/postman/<TITLE>.postman_collection.json` |

### 6. Confirmar resultado

Após a execução com sucesso, informe ao usuário:

- Caminho do arquivo gerado (exibido no console)
- Instruções para importar no Postman:
  1. Abrir o Postman
  2. Clicar em **Import**
  3. Arrastar ou selecionar o arquivo `.postman_collection.json` gerado
- Lembrar de ajustar a variável `baseUrl` na collection se necessário
- O token JWT é salvo automaticamente após executar a rota de login (`/auth/login`)

### 7. Lidar com erros

| Erro | Ação |
|------|------|
| Arquivo não encontrado | Pedir novo caminho ao usuário |
| JSON inválido | Verificar se o arquivo é realmente um Swagger JSON |
| `ts-node` não encontrado | Executar `npm install -D ts-node typescript` |
| Erro no script | Mostrar o log de erro e sugerir `npm install` |
| Arquivo sem `paths` ou `openapi` | O arquivo pode não ser um Swagger válido — informar ao usuário |
