export function mapToObj(map) {
  return Object.fromEntries(map.entries());
}

export function isSameDependencyList(a, b) {
  return a.length === b.length && !a.some((item) => !b.includes(item));
}
