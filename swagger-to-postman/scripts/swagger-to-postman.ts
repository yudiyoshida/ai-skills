/**
 * Converts OpenAPI/Swagger JSON to Postman Collection v2.1 format.
 *
 * Environment variables:
 *   SWAGGER_PATH  - path to input swagger.json (default: <cwd>/swagger.json)
 *   OUTPUT_PATH   - path to output .postman_collection.json (default: <cwd>/postman/<title>.postman_collection.json)
 *
 * Usage: npx ts-node scripts/swagger-to-postman.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface OpenAPISpec {
  openapi: string;
  info: { title: string; description?: string; version: string };
  paths: Record<string, Record<string, OpenAPIOperation>>;
  components?: { schemas?: Record<string, unknown> };
}

interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  tags?: string[];
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    schema?: { type?: string; enum?: string[]; example?: unknown };
  }>;
  requestBody?: {
    content?: {
      'application/json'?: {
        schema?: { $ref?: string; properties?: Record<string, unknown>; example?: unknown };
      };
    };
  };
  security?: Array<Record<string, unknown>>;
}

function slugify(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toUpperCase();
}

function getExampleFromSchema(schema: {
  properties?: Record<string, unknown>;
  example?: unknown;
}): string {
  if (schema.example) return JSON.stringify(schema.example, null, 2);
  if (!schema.properties) return '{}';
  const example: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    const p = prop as Record<string, unknown>;
    if (p.example !== undefined) example[key] = p.example;
    else if (p.type === 'string') example[key] = '';
    else if (p.type === 'number') example[key] = 0;
    else if (p.type === 'boolean') example[key] = false;
    else if (p.type === 'array') example[key] = [];
  }
  return JSON.stringify(example, null, 2);
}

function buildExampleBody(spec: OpenAPISpec, schemaRef?: string): string {
  if (!schemaRef || !spec.components?.schemas) return '{}';
  const schemaName = schemaRef.replace('#/components/schemas/', '');
  const schema = spec.components.schemas[schemaName] as {
    properties?: Record<string, unknown>;
    example?: unknown;
  };
  if (!schema) return '{}';
  return getExampleFromSchema(schema);
}

function swaggerToPostman(spec: OpenAPISpec): object {
  const folders: Record<string, { name: string; item: object[] }> = {};
  const httpMethods = ['get', 'post', 'put', 'patch', 'delete'];

  for (const [pathStr, pathItem] of Object.entries(spec.paths)) {
    for (const method of httpMethods) {
      const op = pathItem[method] as OpenAPIOperation | undefined;
      if (!op) continue;

      const tag = op.tags?.[0] || 'Outros';
      if (!folders[tag]) folders[tag] = { name: tag, item: [] };

      let url = `{{baseUrl}}${pathStr}`;
      const pathParams = op.parameters?.filter((p) => p.in === 'path') || [];
      let pathStrWithVars = pathStr;
      for (const param of pathParams) {
        url = url.replace(`{${param.name}}`, `{{${param.name}}}`);
        pathStrWithVars = pathStrWithVars.replace(`{${param.name}}`, `{{${param.name}}}`);
      }

      const queryParams = op.parameters?.filter((p) => p.in === 'query') || [];
      const postmanQuery = queryParams.map((p) => ({
        key: p.name,
        value: `{{${p.name}}}`,
        description: p.required ? 'Obrigatório' : 'Opcional',
      }));

      let body = '';
      const schemaRef = op.requestBody?.content?.['application/json']?.schema?.$ref;
      if (schemaRef) {
        body = buildExampleBody(spec, schemaRef);
      } else {
        const schema = op.requestBody?.content?.['application/json']?.schema;
        if (schema) body = getExampleFromSchema(schema);
      }

      const needsAuth = op.security?.some((s) => 'bearer' in s);

      const request: Record<string, unknown> = {
        name: op.summary || op.operationId || `${method.toUpperCase()} ${pathStr}`,
        request: {
          method: method.toUpperCase(),
          header: [{ key: 'Content-Type', value: 'application/json', type: 'text' }],
          url: {
            raw: url,
            host: ['{{baseUrl}}'],
            path: pathStrWithVars.split('/').filter(Boolean),
            query: postmanQuery.length ? postmanQuery : undefined,
          },
          body:
            body && ['post', 'put', 'patch'].includes(method)
              ? { mode: 'raw', raw: body }
              : undefined,
          description: op.summary || '',
        },
      };

      if (pathStr === '/auth/login' && method === 'post') {
        (request.request as Record<string, unknown>).event = [
          {
            listen: 'test',
            script: {
              exec: [
                'const json = pm.response.json();',
                'if (json.accessToken) {',
                '  pm.collectionVariables.set("accessToken", json.accessToken);',
                '  console.log("Token salvo automaticamente!");',
                '}',
              ],
              type: 'text/javascript',
            },
          },
        ];
        (request.request as Record<string, unknown>).auth = { type: 'noauth' };
      } else if (needsAuth) {
        (request.request as Record<string, unknown>).auth = {
          type: 'bearer',
          bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }],
        };
      }

      folders[tag].item.push(request);
    }
  }

  const items = Object.values(folders).map((f) => ({
    name: f.name,
    item: f.item,
  }));

  return {
    info: {
      name: spec.info.title || 'API',
      description: spec.info.description || 'Postman Collection',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }],
    },
    variable: [
      { key: 'baseUrl', value: 'http://localhost:3000', type: 'string' },
      { key: 'accessToken', value: '', type: 'string' },
    ],
    item: items,
  };
}

function main() {
  const swaggerPath = process.env.SWAGGER_PATH || path.join(process.cwd(), 'swagger.json');
  const swaggerContent = fs.readFileSync(swaggerPath, 'utf-8');
  const spec = JSON.parse(swaggerContent) as OpenAPISpec;

  const collectionName = slugify(spec.info.title || 'API');
  const outputPath =
    process.env.OUTPUT_PATH ||
    path.join(process.cwd(), 'postman', `${collectionName}.postman_collection.json`);

  const collection = swaggerToPostman(spec);

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2), 'utf-8');
  console.log(`Postman collection gerada em: ${outputPath}`);
}

main();
