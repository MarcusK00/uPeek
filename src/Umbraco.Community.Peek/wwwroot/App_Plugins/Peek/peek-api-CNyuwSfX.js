const u = "/umbraco/peek/api/v1", k = {
  property: "peekProperty"
};
let a = null;
function P(e) {
  a = e;
}
class i extends Error {
  constructor(o, t) {
    super(o), this.status = t, this.name = "PeekApiError";
  }
}
async function r(e, o = {}) {
  if (!a)
    throw new i("Peek API called before the backoffice entry point initialised it.", 0);
  const t = new URL(`${u}${e}`, window.location.origin);
  for (const [p, n] of Object.entries(o))
    n !== void 0 && t.searchParams.set(p, n);
  const c = await a(), s = await fetch(t, {
    headers: {
      authorization: `Bearer ${c}`,
      accept: "application/json"
    }
  });
  if (!s.ok)
    throw new i(`Peek API returned ${s.status} for ${e}`, s.status);
  return await s.json();
}
const d = {
  status: () => r("/status"),
  documentTypeUsage: (e) => r(`/document-type/${e}/usage`),
  mediaUsage: (e) => r(`/media/${e}/usage`),
  orphans: () => r("/report/orphans"),
  reverseLookup: (e, o, t) => r("/report/reverse-lookup", { contentTypeKey: e, propertyAlias: o, culture: t })
};
export {
  k as P,
  d as p,
  P as s
};
//# sourceMappingURL=peek-api-CNyuwSfX.js.map
