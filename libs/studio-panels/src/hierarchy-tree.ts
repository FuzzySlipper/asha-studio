import type { StudioEntityReadModel } from '@asha-studio/domain';

export function hierarchyEntityHasChildren(
  entities: readonly StudioEntityReadModel[],
  entity: StudioEntityReadModel,
): boolean {
  const index = entities.findIndex(candidate => candidate.id === entity.id);
  const next = index < 0 ? undefined : entities[index + 1];
  return next !== undefined && next.depth > entity.depth;
}

export function visibleHierarchyEntities(
  entities: readonly StudioEntityReadModel[],
): readonly StudioEntityReadModel[] {
  const ancestorExpandedByDepth: boolean[] = [];
  const visible: StudioEntityReadModel[] = [];

  for (const entity of entities) {
    const ancestorsExpanded = ancestorExpandedByDepth
      .slice(0, entity.depth)
      .every(expanded => expanded);

    if (entity.depth === 0 || ancestorsExpanded) visible.push(entity);
    ancestorExpandedByDepth[entity.depth] = entity.expanded;
    ancestorExpandedByDepth.length = entity.depth + 1;
  }

  return visible;
}

export function filteredHierarchyEntities(
  entities: readonly StudioEntityReadModel[],
  filter: string,
): readonly StudioEntityReadModel[] {
  const query = filter.trim().toLocaleLowerCase();
  if (query.length === 0) return visibleHierarchyEntities(entities);

  const includedIds = new Set<string>();
  const ancestors: StudioEntityReadModel[] = [];
  for (const entity of entities) {
    ancestors.length = entity.depth;
    if (entityMatchesFilter(entity, query)) {
      includedIds.add(entity.id);
      for (const ancestor of ancestors) includedIds.add(ancestor.id);
    }
    ancestors[entity.depth] = entity;
  }
  return entities.filter(entity => includedIds.has(entity.id));
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
