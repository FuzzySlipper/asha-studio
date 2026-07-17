import type { StudioEntityReadModel } from '@asha-studio/domain';

export function hierarchyEntityHasChildren(
  entities: readonly StudioEntityReadModel[],
  entity: StudioEntityReadModel,
): boolean {
  return entities.some(candidate => candidate.parentId === entity.id);
}

export function visibleHierarchyEntities(
  entities: readonly StudioEntityReadModel[],
): readonly StudioEntityReadModel[] {
  const entityById = new Map(entities.map(entity => [entity.id, entity]));
  return entities.filter(entity => ancestorsAreExpanded(entity, entityById));
}

export function filteredHierarchyEntities(
  entities: readonly StudioEntityReadModel[],
  filter: string,
): readonly StudioEntityReadModel[] {
  const query = filter.trim().toLocaleLowerCase();
  if (query.length === 0) return visibleHierarchyEntities(entities);

  const includedIds = new Set<string>();
  const entityById = new Map(entities.map(entity => [entity.id, entity]));
  for (const entity of entities) {
    if (entityMatchesFilter(entity, query)) {
      includedIds.add(entity.id);
      let parentId = entity.parentId;
      const visited = new Set<string>();
      while (parentId !== null && !visited.has(parentId)) {
        visited.add(parentId);
        includedIds.add(parentId);
        parentId = entityById.get(parentId)?.parentId ?? null;
      }
    }
  }
  return entities.filter(entity => includedIds.has(entity.id));
}

function ancestorsAreExpanded(
  entity: StudioEntityReadModel,
  entityById: ReadonlyMap<string, StudioEntityReadModel>,
): boolean {
  let parentId = entity.parentId;
  const visited = new Set<string>();
  while (parentId !== null) {
    if (visited.has(parentId)) return false;
    visited.add(parentId);
    const parent = entityById.get(parentId);
    if (parent === undefined || !parent.expanded) return false;
    parentId = parent.parentId;
  }
  return true;
}

function entityMatchesFilter(entity: StudioEntityReadModel, query: string): boolean {
  return [
    entity.label,
    entity.kind,
    entity.badge,
    entity.sourceState,
    entity.renderableId ?? '',
    entity.sceneObjectId ?? '',
  ].some(value => value.toLocaleLowerCase().includes(query));
}
