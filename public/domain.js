export function audit(completed, requirements) {
  return requirements.map(r=>({...r,earned:completed.filter(c=>c.area===r.id).reduce((s,c)=>s+c.credits,0)}));
}
export function eligibility(course,completed) {
  const codes=new Set(completed.map(c=>c.code));
  return {completed:codes.has(course.code),missing:course.prereqs.filter(p=>!codes.has(p))};
}
export function validatePlan(codes,catalog,completed,term,maxCredits=15) {
  const errors=[]; let credits=0;
  if(new Set(codes).size!==codes.length) errors.push('Your plan contains duplicate courses.');
  for(const code of codes) {
    const c=catalog.find(c=>c.code===code);
    if(!c){errors.push(`Unknown course: ${code}`);continue;}
    credits+=c.credits;
    const e=eligibility(c,completed);
    if(e.completed) errors.push(`${code} is already completed.`);
    if(e.missing.length) errors.push(`${code} requires ${e.missing.join(', ')}.`);
    if(c.term!==term) errors.push(`${code} is not offered in ${term}.`);
  }
  if(credits>maxCredits)errors.push(`Your plan exceeds the ${maxCredits}-credit limit.`);
  return {credits,errors,valid:errors.length===0};
}
export function recommend(catalog,completed,{term,interest='balanced',maxCredits=12,openOnly=false}) {
  const available=catalog.filter(c=>c.term===term&&!eligibility(c,completed).completed&&!eligibility(c,completed).missing.length&&(!openOnly||c.seats>0));
  available.sort((a,b)=>((b.interest===interest?4:0)+(b.area==='core'?2:0)+(b.seats>0?1:0))-((a.interest===interest?4:0)+(a.area==='core'?2:0)+(a.seats>0?1:0))||a.code.localeCompare(b.code));
  const result=[];let credits=0;
  for(const c of available)if(credits+c.credits<=maxCredits){result.push(c.code);credits+=c.credits;}
  return result;
}
