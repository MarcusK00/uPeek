import { UMB_AUTH_CONTEXT as d } from "@umbraco-cms/backoffice/auth";
import { U as l, s as u } from "./upeek-api-Curt4TwX.js";
let s;
const v = async (o) => {
  const e = await o.getContext(d);
  e ? u(() => e.getLatestToken()) : console.warn("[uPeek] UMB_AUTH_CONTEXT was unavailable; uPeek reports will not be able to load."), s = p();
}, y = () => {
  s?.(), s = void 0;
};
function p() {
  let o = "", e = !1;
  const t = () => {
    if (e)
      return;
    const n = new URLSearchParams(window.location.search).get(l.property);
    n && `${window.location.pathname}?${n}` !== o && (o = `${window.location.pathname}?${n}`, m(n));
  }, a = window.setInterval(t, 400);
  return window.addEventListener("popstate", t), t(), () => {
    e = !0, window.clearInterval(a), window.removeEventListener("popstate", t);
  };
}
const i = "peek-pulse-style", w = `
@keyframes peek-pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(53, 68, 177, 0.55); }
  70%  { box-shadow: 0 0 0 12px rgba(53, 68, 177, 0); }
  100% { box-shadow: 0 0 0 0 rgba(53, 68, 177, 0); }
}
.peek-pulse {
  animation: peek-pulse-ring 1.1s ease-out 3;
  border-radius: 6px;
}
`;
async function m(o) {
  const e = await f(o);
  if (e) {
    if (!document.getElementById(i)) {
      const t = document.createElement("style");
      t.id = i, t.textContent = w, document.head.append(t);
    }
    e.scrollIntoView({ block: "center", behavior: "smooth" }), e.classList.add("peek-pulse"), window.setTimeout(() => e.classList.remove("peek-pulse"), 4e3);
  }
}
function f(o, e = 8e3) {
  const t = Date.now() + e;
  return new Promise((a) => {
    const r = () => {
      const n = c(document.body, `[data-mark="property:${o}"], [alias="${o}"]`);
      if (n) {
        a(n);
        return;
      }
      if (Date.now() > t) {
        a(void 0);
        return;
      }
      window.setTimeout(r, 200);
    };
    r();
  });
}
function c(o, e, t = 0) {
  if (t > 12)
    return;
  const a = o.querySelector(e);
  if (a)
    return a;
  for (const r of o.querySelectorAll("*"))
    if (r.shadowRoot) {
      const n = c(r.shadowRoot, e, t + 1);
      if (n)
        return n;
    }
}
export {
  v as onInit,
  y as onUnload
};
//# sourceMappingURL=entrypoint-BXy3AV1G.js.map
