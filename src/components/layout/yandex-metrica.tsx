import Script from "next/script";

import { YandexMetricaHit } from "./yandex-metrica-hit";

/*
  Yandex.Metrica, the operator's analytics panel.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ OFF UNLESS YANDEX_METRICA_ID IS SET. A plain env var, not NEXT_PUBLIC_:  │
  │ the id is injected into the inline snippet here, on the server, and the  │
  │ browser never reads it from `process.env`. deploy.sh exports every var   │
  │ in shared/.env before `next build`, so this component and the CSP in    │
  │ next.config.ts pick it up together at build time. Changing it is a       │
  │ rebuild, like every other build-time value here.                        │
  │                                                                          │
  │ Local development leaves it unset, so nothing loads, no cookie is set    │
  │ and the tight CSP is unchanged — the same reason the footer's own        │
  │ first-party counter exists is why this one stays opt-in.                 │
  └──────────────────────────────────────────────────────────────────────────┘

  WHAT IS AND IS NOT ENABLED. `clickmap`, `trackLinks` and
  `accurateTrackBounce` are the ordinary counter. `webvisor` (full session
  recording — mouse, scroll, form input, streamed to Yandex) is deliberately
  OFF: on a state portal, recording a citizen's every move on the page is not
  a default. It can be turned on later from the Metrica dashboard without a
  code change; the CSP note in next.config.ts explains what a code-side
  webvisor would additionally need.

  `defer: true` means `init` does NOT send the first hit — <YandexMetricaHit>
  sends every hit, the first one included, so App Router client navigations
  are counted the same way as the initial load with no double count.

  Not rendered under /admin: this component is only in the [locale] layout,
  and the panel has its own root layout. Editor traffic stays out of the
  public numbers.
*/

const RAW_ID = process.env.YANDEX_METRICA_ID?.trim();
/* A counter id is 8 digits today; allow 6-10 and reject anything else so a
   fat-fingered value fails visibly here rather than silently loading nothing. */
const ID = RAW_ID && /^\d{6,10}$/.test(RAW_ID) ? Number(RAW_ID) : null;

export function YandexMetrica() {
  if (ID === null) return null;

  return (
    <>
      <Script id="yandex-metrica" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<e.scripts.length;j++){if(e.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${ID},"init",{defer:true,clickmap:true,trackLinks:true,accurateTrackBounce:true});`}
      </Script>
      <noscript>
        {/*
          The no-JS pixel. A bare <img> to mc.yandex.ru/watch/<id> records the
          visit for readers with scripting off — mostly crawlers and locked-down
          government machines, but a real slice of them here.
        */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- a 1x1 tracking pixel; next/image is meaningless here and would not run without JS anyway */}
          <img
            src={`https://mc.yandex.ru/watch/${ID}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
      <YandexMetricaHit id={ID} />
    </>
  );
}
