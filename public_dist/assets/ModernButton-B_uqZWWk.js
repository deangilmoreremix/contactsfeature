import{Ln as n,jn as l,wt as u}from"./react-vendor-BwdQg1Vi.js";var e=l();await n("react");var y=({children:t,variant:a="primary",size:s="md",loading:r=!1,disabled:d=!1,onClick:g,className:o=""})=>{const b=()=>{switch(a){case"glass":return"bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 dark:bg-gray-800/40 dark:border-gray-600/50 dark:hover:bg-gray-700/50";case"outline":return"bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600";case"ghost":return"bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700";default:return"bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"}},i=()=>{switch(s){case"sm":return"px-3 py-1.5 text-sm";case"lg":return"px-6 py-3 text-lg";default:return"px-4 py-2 text-base"}};return(0,e.jsxs)("button",{onClick:g,disabled:d||r,className:`
        ${b()}
        ${i()}
        rounded-lg font-medium transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${o}
      `,children:[r&&(0,e.jsx)(u,{className:"w-4 h-4 animate-spin"}),t]})};export{y as t};
