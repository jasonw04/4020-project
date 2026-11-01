// Set window.UDPA_CONFIG = { mode:'api', baseUrl:'/api' } before app.js to connect a backend.
const config=window.UDPA_CONFIG || {mode:'demo'};
export const isDemo=config.mode!=='api';
export async function request(endpoint,options={}) {
  const response=await fetch((config.baseUrl || '/api')+endpoint,{
    ...options,headers:{'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(15000)
  });
  if(!response.ok){let message=`Request failed (${response.status}).`;try{const body=await response.json();message=body.message||message;}catch{}throw new Error(message);}
  return response.status===204?null:response.json();
}
export const api={
  load:()=>request('/workspace'),
  savePlan:plan=>request('/plans',{method:'PUT',body:JSON.stringify(plan)}),
  enrol:(code,action)=>request('/enrolments',{method:'POST',body:JSON.stringify({code,action})}),
  assistant:preferences=>request('/assistant/plans',{method:'POST',body:JSON.stringify(preferences)})
};
