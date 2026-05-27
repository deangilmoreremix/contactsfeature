import{ei as s,ni as a,oi as d}from"./react-vendor-8hOgBDPA.js";import"./SmartCRMApp-CeGFpJrd.js";import{t as l}from"./ErrorBoundary-BVHKzRlf.js";import{t as p}from"./App-k4SMnc7F.js";var t=a(),c=s();console.log("BOOTSTRAP EXECUTING");var m=await d("react"),f=({children:n})=>(0,t.jsx)(l,{onError:(e,o)=>{try{const r=document.getElementById("root");r&&(r.innerHTML=`
              <div style="padding:20px;background:#fef2f2;color:#991b1b;font-family:system-ui;border:2px solid #ef4444;">
                <h2 style="margin:0 0 10px 0;">ROOT ERROR:</h2>
                <pre style="white-space:pre-wrap;font-size:12px;">${e?.message||"Unknown error"}<br/>${o?.componentStack||""}</pre>
              </div>
            `)}catch{}console.error("RootErrorBoundary:",e,o)},children:n}),i=document.getElementById("root");if(i){const n=e=>{const o="reason"in e?e.reason:e.error;console.error("Global error caught:",o);const r=document.getElementById("root");r&&!r.innerHTML.includes("ROOT ERROR")&&(r.innerHTML=`
        <div style="padding:20px;background:#fef2f2;color:#991b1b;font-family:system-ui;border:2px solid #ef4444;">
          <h2 style="margin:0 0 10px 0;">INITIALIZATION ERROR:</h2>
          <pre style="white-space:pre-wrap;font-size:12px;">${o?.message||o||"Unknown initialization error"}</pre>
          <p style="margin-top:10px;font-size:12px;">Check console for details. This may be due to missing environment variables.</p>
        </div>
      `)};window.addEventListener("error",n),window.addEventListener("unhandledrejection",n),(0,c.createRoot)(i).render((0,t.jsx)(m.StrictMode,{children:(0,t.jsx)(f,{children:(0,t.jsx)(p,{})})}))}else console.error("Root element not found!");
