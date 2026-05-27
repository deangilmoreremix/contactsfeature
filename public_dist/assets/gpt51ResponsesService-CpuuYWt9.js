import{n as i}from"./webSearchService-BbQPwOdE.js";import{t as l}from"./cache-lsXFiT-W.js";var u=class c{static instance;API_BASE_URL="https://api.openai.com/v1/responses";apiKey={BASE_URL:"/",DEV:!1,MODE:"production",PROD:!0,SSR:!1}.VITE_OPENAI_API_KEY;maxRetries=3;retryDelay=1e3;static getInstance(){return c.instance||(c.instance=new c),c.instance}constructor(){i.info("GPT-5.1 Responses Service initialized",{hasApiKey:!!this.apiKey,apiUrl:this.API_BASE_URL})}async createResponse(e){if(!this.apiKey)throw new Error("OpenAI API key is not configured");const n=l.getGPT51CacheKey(e),a=l.get(n);if(a)return i.info("Returning cached GPT-5.1 response"),a;for(let o=1;o<=this.maxRetries;o++)try{i.info(`GPT-5.1 API call attempt ${o}`,{model:e.model||getModelForTask("sdr")||SMARTCRM_DEFAULT_MODEL,reasoning:e.reasoning?.effort||"none",verbosity:e.text?.verbosity||"medium",hasTools:!!e.tools?.length});const s=await fetch(this.API_BASE_URL,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.apiKey}`},body:JSON.stringify({model:e.model||getModelForTask("sdr")||SMARTCRM_DEFAULT_MODEL,input:e.input,reasoning:e.reasoning||{effort:"none"},text:e.text||{verbosity:"medium"},max_output_tokens:e.max_output_tokens,tools:e.tools,tool_choice:e.tool_choice,previous_response_id:e.previous_response_id,instructions:e.instructions})});if(!s.ok){const p=await s.json().catch(()=>({}));throw new Error(`GPT-5.1 API error: ${s.status} ${s.statusText}. ${p.error?.message||""}`)}const t=await s.json(),r={id:t.id,output_text:t.output_text,reasoning:t.reasoning,tool_calls:t.tool_calls,usage:t.usage};return l.set(n,r),i.info("GPT-5.1 response created successfully",{responseId:r.id,outputLength:r.output_text?.length||0,toolCalls:r.tool_calls?.length||0,usage:r.usage}),r}catch(s){if(i.warn(`GPT-5.1 API attempt ${o} failed:`,s),o===this.maxRetries)throw i.error("All GPT-5.1 API attempts failed"),new Error(`GPT-5.1 API call failed after ${this.maxRetries} attempts: ${s.message}`);await new Promise(t=>setTimeout(t,this.retryDelay*Math.pow(2,o-1)))}throw new Error("Unexpected error in GPT-5.1 API call")}async analyzeProductIntelligence(e,n,a){const o=`
Analyze the following company/product information and provide structured intelligence:

URLs to analyze: ${e.join(", ")}
${n.length>0?`Documents: ${n.join(", ")}`:""}
${a?`Additional context: ${a}`:""}

Please provide:
1. Company overview (name, industry, size, location, description)
2. Product analysis (name, category, features, pricing, target market)
3. Market intelligence (size, growth, competitors, opportunities, threats)
4. Key contacts found (with roles and confidence levels)
5. Strategic recommendations for sales engagement

Format your response as a structured JSON object.
    `,s=await this.createResponse({model:SMARTCRM_DEFAULT_MODEL,input:o,reasoning:{effort:"high"},text:{verbosity:"high"},max_output_tokens:4e3});try{const t=JSON.parse(s.output_text);return{company:t.company||{},product:t.product||{},market:t.market||{},contacts:t.contacts||[],recommendations:t.recommendations||[]}}catch{return i.warn("Failed to parse GPT-5.1 analysis response, using fallback"),this.parseFallbackAnalysis(s.output_text)}}async generateContent(e,n,a){const o=`
Based on this analysis: ${JSON.stringify(e)}

Generate a ${n} for sales engagement.
${a?`Additional context: ${a}`:""}

Use high reasoning effort to create compelling, personalized content.
    `;return(await this.createResponse({model:SMARTCRM_DEFAULT_MODEL,input:o,reasoning:{effort:"high"},text:{verbosity:"high"},max_output_tokens:2e3})).output_text}async applyCodePatch(e,n,a){const o=[{type:"apply_patch",name:"apply_patch"}],s=`
${e}
${n?`
Current code:
${n}`:""}

Use the apply_patch tool to make the necessary code changes.
Explain your reasoning before applying patches.
    `,t=await this.createResponse({model:SMARTCRM_DEFAULT_MODEL,input:s,reasoning:{effort:"high"},text:{verbosity:"medium"},tools:o,previous_response_id:a,instructions:"Before calling apply_patch, explain what changes you will make and why."});return{patches:t.tool_calls?.filter(r=>r.type==="apply_patch")||[],explanation:t.output_text}}async executeShellCommand(e,n,a){const o=[{type:"shell",name:"shell"}],s=`
Execute this shell command: ${e}
${n?`Context: ${n}`:""}

Use the shell tool to run the command and analyze the results.
    `,t=await this.createResponse({model:SMARTCRM_DEFAULT_MODEL,input:s,reasoning:{effort:"medium"},text:{verbosity:"low"},tools:o,previous_response_id:a});return{output:t.output_text,success:!t.tool_calls?.some(r=>r.type==="error")}}async useCustomTool(e,n,a,o){const s=[{type:"custom",name:e,description:n,parameters:o?{grammar:o}:void 0}],t=await this.createResponse({model:SMARTCRM_DEFAULT_MODEL,input:a,reasoning:{effort:"medium"},text:{verbosity:"medium"},tools:s,tool_choice:{type:"allowed_tools",mode:"required",tools:[{type:"custom",name:e}]}});return{result:t.output_text,toolCalls:t.tool_calls||[]}}parseFallbackAnalysis(e){return{company:{name:"Unknown",description:e.substring(0,200)},product:{name:"Unknown"},market:{size:"Unknown"},contacts:[],recommendations:["Analysis completed - review full response for details"]}}getAvailableModels(){return["gpt-5.2","gpt-5.2-thinking","gpt-5.2-instant","gpt-5-mini","gpt-5-nano"]}isConfigured(){return!!this.apiKey}},h=u.getInstance();export{h as t};
