import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const baseDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'api');
const rootPath = join(baseDir, 'openapi.json');
const outPath = join(baseDir, 'openapi.bundled.json');

type JsonValue = { [key: string]: JsonValue } | JsonValue[] | string | number | boolean | null;

const cache = new Map<string, JsonValue>();

function load(path: string): JsonValue {
	const normalized = normalize(path);
	if (!cache.has(normalized)) {
		cache.set(normalized, JSON.parse(readFileSync(normalized, 'utf8')));
	}
	return cache.get(normalized)!;
}

function resolvePointer(doc: JsonValue, pointer: string): JsonValue {
	if (!pointer || pointer === '/') return doc;

	return pointer
		.replace(/^\//, '')
		.split('/')
		.reduce((node, part) => {
			const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
			return (node as Record<string, JsonValue>)[key];
		}, doc);
}

function inline(node: JsonValue, currentDir: string): JsonValue {
	if (Array.isArray(node)) return node.map((item) => inline(item, currentDir));

	if (node && typeof node === 'object') {
		const ref = (node as Record<string, JsonValue>)['$ref'];

		if (typeof ref === 'string') {
			const [filePart, pointer = ''] = ref.split('#');

			if (filePart) {
				const targetPath = normalize(join(currentDir, filePart));
				const resolved = resolvePointer(load(targetPath), pointer);
				return inline(structuredClone(resolved), dirname(targetPath));
			}

			return node; // internal ref within the bundle — keep as-is
		}

		return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, inline(value, currentDir)]));
	}

	return node;
}

const root = load(rootPath);
const bundled = inline(root, baseDir);

writeFileSync(outPath, JSON.stringify(bundled, null, '\t') + '\n');

console.log(`Bundled OpenAPI spec written to ${outPath}`);
