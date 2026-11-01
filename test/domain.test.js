import test from 'node:test';
import assert from 'node:assert/strict';
import {completed,courses,requirements} from '../public/data.js';
import {audit,eligibility,validatePlan,recommend} from '../public/domain.js';
test('degree audit reconciles area totals with completed credits',()=>{
 const result=audit(completed,requirements);
 assert.equal(result.reduce((s,r)=>s+r.earned,0),66);
 assert.equal(result.find(r=>r.id==='general').earned,21);
});
test('missing prerequisites cannot be satisfied by merely planning a course',()=>{
 assert.deepEqual(eligibility(courses.find(c=>c.code==='ITEC 4020'),completed).missing,['ITEC 3020']);
 assert.equal(validatePlan(['ITEC 3020','ITEC 4020'],courses,completed,'Winter 2027').valid,false);
});
test('rejects duplicates, unknown courses, wrong semester, and excessive credit loads',()=>{
 for(const codes of [['ITEC 3020','ITEC 3020'],['FAKE 1000'],['ITEC 4020']])assert.equal(validatePlan(codes,courses,completed,'Winter 2027').valid,false);
 assert.equal(validatePlan(['ITEC 3020','ITEC 3220'],courses,completed,'Winter 2027',3).valid,false);
});
test('rejects an already completed course',()=>{
 const c=courses[0];assert.equal(validatePlan([c.code],courses,[...completed,c],c.term).valid,false);
});
test('recommendations respect semester, prerequisites, open seats and load',()=>{
 for(const term of ['Winter 2027','Fall 2027'])for(const maxCredits of [6,9,12,15]){
 const codes=recommend(courses,completed,{term,maxCredits,openOnly:true,interest:'data'});
 assert.equal(validatePlan(codes,courses,completed,term,maxCredits).valid,true);
 assert.ok(codes.every(code=>courses.find(c=>c.code===code).seats>0));
 }
});
test('full courses remain valid planning choices for waitlist flows',()=>{
 assert.equal(validatePlan(['ITEC 3500'],courses,completed,'Winter 2027').valid,true);
});
