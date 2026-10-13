import raw from './catalog.json' with { type: 'json' };
import { exerciseSchema } from './core';
export const builtInCatalog = raw.map((e) => exerciseSchema.parse(e));
export const builtInCatalogVersion = 'xls-initial-1';
