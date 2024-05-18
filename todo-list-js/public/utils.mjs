export function mapToObj(map) {
  return Object.fromEntries(map.entries());
}

export function isSameDependencyList(a, b) {
  const sameLength = a.length === b.length;
  const missingRefs = a.some((item) => !b.includes(item));
  console.log('isSameDepList', sameLength && !missingRefs, {a, b}, {sameLength, missingRefs});
  return sameLength && !missingRefs;
}
