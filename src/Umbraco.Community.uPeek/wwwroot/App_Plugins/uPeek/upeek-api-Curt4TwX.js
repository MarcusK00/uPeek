const p = "/umbraco/upeek/api/v1", k = {
  property: "upeekProperty"
};
let a = null;
function d(e) {
  a = e;
}
class i extends Error {
  constructor(o, t) {
    super(o), this.status = t, this.name = "PeekApiError";
  }
}
async function r(e, o = {}) {
  if (!a)
    throw new i("uPeek API called before the backoffice entry point initialised it.", 0);
  const t = new URL(`${p}${e}`, window.location.origin);
  for (const [c, n] of Object.entries(o))
    n !== void 0 && t.searchParams.set(c, n);
  const u = await a(), s = await fetch(t, {
    headers: {
      authorization: `Bearer ${u}`,
      accept: "application/json"
    }
  });
  if (!s.ok)
    throw new i(`uPeek API returned ${s.status} for ${e}`, s.status);
  return await s.json();
}
const P = {
  status: () => r("/status"),
  documentTypeUsage: (e) => r(`/document-type/${e}/usage`),
  mediaUsage: (e) => r(`/media/${e}/usage`),
  orphans: () => r("/report/orphans"),
  reverseLookup: (e, o, t) => r("/report/reverse-lookup", { contentTypeKey: e, propertyAlias: o, culture: t })
};
export {
  k as U,
  d as s,
  P as u
};
//# sourceMappingURL=upeek-api-Curt4TwX.js.map
