---
name: swagger-to-postman
description: >-
  Generates a Postman collection from a Swagger/OpenAPI JSON file using the
  project's conversion script. Use when the user wants to create, generate, or
  update a Postman collection, mentions Postman, or wants to convert Swagger to
  Postman format.
---

# Swagger to Postman Collection

Converte um arquivo Swagger/OpenAPI JSON em uma Postman Collection v2.1, pronta para importação.

## Pré-requisito

O script `scripts/swagger-to-postman.ts` já existe no projeto e faz toda a conversão. Este fluxo apenas orquestra sua execução.

## Fluxo

### 1. Coletar o arquivo Swagger

O usuário **deve informar o caminho do arquivo Swagger JSON**. Se não informou, pergunte usando `AskQuestion` ou texto direto:

> Informe o caminho do arquivo Swagger JSON (ex: `swagger.json`, `~/Downloads/swagger.json`).

Se o usuário fornecer uma URL (ex: `http://localhost:3000/swagger-json`), baixe o conteúdo primeiro:

```bash
curl -s <URL> -o swagger.json
```

### 2. Validar o arquivo

Antes de executar, confirme que o arquivo existe e é JSON válido:

```bash
# Verificar existência
ls -la <caminho-do-arquivo>

# Verificar se é JSON válido (primeiras linhas)
head -c 200 <caminho-do-arquivo>
```

Se o arquivo não existir ou não for JSON, informe o usuário e peça um novo caminho.

### 3. Gerar a collection

Execute o script de conversão passando o caminho do arquivo via variável de ambiente:

```bash
SWAGGER_PATH=<caminho-do-arquivo> npm run generate:postman
```

Se o usuário não especificou um caminho e o arquivo `swagger.json` na raiz do projeto estiver atualizado, basta:

```bash
npm run generate:postman
```

### 4. Confirmar resultado

Após a execução com sucesso, informe ao usuário:

- Arquivo gerado em: `postman/DPASIS-API.postman_collection.json`
- Instruções para importar no Postman:
  1. Abrir o Postman
  2. Clicar em **Import**
  3. Arrastar ou selecionar o arquivo `postman/DPASIS-API.postman_collection.json`
- Lembrar de ajustar a variável `baseUrl` se necessário
- O token JWT é salvo automaticamente após executar a rota de login

### 5. Lidar com erros

| Erro | Ação |
|------|------|
| Arquivo não encontrado | Pedir novo caminho ao usuário |
| JSON inválido | Verificar se o arquivo é realmente um Swagger JSON |
| Erro no script | Mostrar o log de erro e sugerir verificar se as dependências estão instaladas (`npm install`) |
| Arquivo sem `paths` ou `openapi` | O arquivo pode não ser um Swagger válido — informar ao usuário |

## Exemplo de uso

Usuário diz:
> "Gere a collection do Postman usando o arquivo ~/Downloads/swagger.json"

Execução:

```bash
SWAGGER_PATH=~/Downloads/swagger.json npm run generate:postman
```

Saída esperada:
```
Postman collection gerada em: /caminho/do/projeto/postman/DPASIS-API.postman_collection.json
```
