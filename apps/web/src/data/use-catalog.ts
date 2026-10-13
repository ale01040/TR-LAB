import { useMemo } from 'react';
import { builtInCatalog } from '@tr-lab/contracts';
import { useApp } from '../components/AppProvider';
export const globalCatalog = builtInCatalog;
export function useCatalog(includeArchived = false) {
  const { entities } = useApp();
  return useMemo(
    () =>
      [
        ...globalCatalog,
        ...entities.flatMap((r) =>
          r.kind === 'private_exercise' && (includeArchived || r.data.status === 'active')
            ? [r.data.exercise]
            : [],
        ),
      ].sort((a, b) => a.name.localeCompare(b.name, 'it-IT') || a.id.localeCompare(b.id)),
    [entities, includeArchived],
  );
}
