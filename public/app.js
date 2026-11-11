import {student as demoStudent,completed as demoCompleted,requirements as demoRequirements,courses as demoCourses} from './data.js';
import {audit,eligibility,validatePlan,recommend} from './domain.js';
import {api,isDemo} from './api.js';
const $=s=>document.querySelector(s);
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let student=demoStudent,completed=demoCompleted,requirements=demoRequirements,courses=structuredClone(demoCourses);
let stored={};try{stored=JSON.parse(localStorage.getItem('udpa-demo-v1')||'{}');}catch{}
let state={term:'2018-19 Semester 1',plan:[],enrolments:{},...stored};
if(!Array.isArray(state.plan))state.plan=[];
if(!state.enrolments||typeof state.enrolments!=='object')state.enrolments={};
let query='',area='all',availability='all',
    proposal=null,enrolmentProposal=null,noticeTimer;
const pages={overview:'Overview',requirements:'Degree requirements',courses:'Course explorer',planner:'Semester planner',assistant:'Planning assistant'};
const page=()=>Object.hasOwn(pages,location.hash.slice(1))?location.hash.slice(1):'overview';
const earned=()=>completed.reduce((s,c)=>s+c.credits,0);
const totalPlan=()=>state.plan.reduce((s,code)=>s+(courses.find(c=>c.code===code)?.credits||0),0);
const persist=()=>{if(isDemo)try{localStorage.setItem('udpa-demo-v1',JSON.stringify(state));}catch{toast('Storage is unavailable. Changes will last for this session.');}};
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#toast').classList.remove('show'),4500);}
function intro(eyebrow,title,text,action=''){return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="subtitle">${text}</p></div>${action}</div>`;}
function progress(value,max){return `<div class="progress" role="progressbar" aria-label="Credits completed" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="${max}"><span style="width:${Math.min(100,value/max*100)}%"></span></div>`;}
function requirementRows(){return audit(completed,requirements).map(r=>`<div class="requirement-row"><div><strong>${escape(r.label)}</strong><span>${r.earned>=r.target?'<span class="pill green">Complete</span>':`${Math.max(0,r.target-r.earned)} credits to go`}</span></div>${progress(r.earned,r.target)}<small>${r.earned} / ${r.target} credits</small></div>`).join('');}
function courseCard(c){const e=eligibility(c,completed),added=state.plan.includes(c.code);return `<article class="course-card"><div class="course-card-top"><span class="course-code">${escape(c.code)}</span><span class="pill ${e.missing.length?'neutral':c.seats?'green':'amber'}">${e.missing.length?'Prerequisite needed':c.seats?'Open · '+c.seats+' seats':'Waitlist available'}</span></div><h3>${escape(c.title)}</h3><p>${escape(c.description)}</p><div class="course-meta"><span>${c.credits} credits</span><span>${escape(c.term)}</span><span>${escape(c.days)} · ${escape(c.time)}</span></div><div class="card-action"><small>${e.missing.length?'Requires '+escape(e.missing.join(', ')):e.completed?'Already completed':escape(requirements.find(r=>r.id===c.area)?.label||c.area)}</small><button class="button small ${added?'secondary':''}" data-add="${escape(c.code)}" ${e.missing.length||e.completed||added||c.term!==state.term?'disabled':''}>${added?'✓ In plan':c.term!==state.term?'Different term':'+ Add to plan'}</button></div></article>`;}
function overview(){const value=earned(),percent=Math.round(value/student.target*100);return intro('A CLEARER PATH FORWARD',`Your next chapter starts here<span class="heading-dot">.</span>`,`Welcome back, ${escape(student.name.split(' ')[0])}. Let’s turn your progress into a plan.`,`<a class="button" href="#planner">Open my planner <span>↗</span></a>`)+`
<section class="hero"><div class="hero-copy"><span class="pill hero-pill">${escape(student.degree)}</span><h2>${escape(student.program)}</h2><p>You’ve put in the work. See how far you’ve come<br class="desktop"> and what’s waiting around the corner.</p><div class="hero-stats"><div><strong>${value}<small> / ${student.target}</small></strong><span>credits completed</span></div><div><strong>${student.target-value}</strong><span>credits remaining</span></div><div><strong>Year ${student.year}</strong><span>your current chapter</span></div></div></div><div class="degree-ring" style="--pct:${percent}%"><div><strong>${percent}<span>%</span></strong><small>of the way there</small><span class="ring-star">✧</span></div></div><span class="hero-decoration" aria-hidden="true">✳</span></section>
<div class="overview-grid"><section class="panel"><div class="section-heading"><div><h2>Your degree, at a glance</h2><p>Every credit brings you a little closer.</p></div><a href="#requirements" class="text-link">View details ↗</a></div>${requirementRows()}</section><section class="panel next-panel"><span class="icon-tile">▤</span><p class="eyebrow">LOOKING AHEAD</p><h2>Make room for<br>what’s next.</h2><p>Build your ${escape(state.term)} plan around your goals, interests, and degree requirements.</p><div class="next-plan"><span>Your semester plan</span><strong>${state.plan.length} courses <span>· ${totalPlan()} credits</span></strong></div><a href="#planner" class="button wide">${state.plan.length?'Continue planning':'Start planning'} <span>→</span></a></section></div>
<section class="recommended"><div class="section-heading"><div><p class="eyebrow">YOUR NEXT STEPS</p><h2>A few courses to move you forward</h2></div><a href="#courses" class="text-link">Explore all courses ↗</a></div><div class="course-grid">${courses.filter(c=>c.term===state.term&&c.area==='core'&&!eligibility(c,completed).missing.length).slice(0,3).map(courseCard).join('')}</div></section><div class="source-note"><span>ⓘ</span> This workspace uses fictional student records, program rules, and course availability for demonstration. It does not perform real university enrolment.</div>`;}
function requirementsPage(){return intro('THE BIG PICTURE','Every requirement, in view.','See what you’ve completed and where to focus next.')+`<div class="summary-strip"><div><strong>${earned()} / ${student.target}</strong><span>total credits completed</span></div><div><strong>${audit(completed,requirements).filter(r=>r.earned>=r.target).length} / ${requirements.length}</strong><span>requirement areas complete</span></div><div><strong>${student.target-earned()}</strong><span>credits remaining</span></div></div><section class="panel">${requirementRows()}</section><section class="panel spaced"><div class="section-heading"><div><h2>Completed coursework</h2><p>Your demonstration academic record.</p></div></div><div class="table-wrap"><table><thead><tr><th>Course</th><th>Title</th><th>Term</th><th>Credits</th></tr></thead><tbody>${completed.map(c=>`<tr><td class="course-code">${escape(c.code)}</td><td>${escape(c.title)}</td><td>${escape(c.term)}</td><td>${c.credits}</td></tr>`).join('')}</tbody></table></div></section><p class="source-note">These are illustrative program requirements. Verify official requirements with an academic advisor.</p>`;}
function explorer(){const filtered=courses.filter(c=>(!query||`${c.code} ${c.title}`.toLowerCase().includes(query.toLowerCase()))&&(area==='all'||c.area===area)&&(availability==='all'||(availability==='open'?c.seats>0:!eligibility(c,completed).missing.length)));return intro('FIND YOUR NEXT INTEREST','Good things are on the course list.','Explore courses, check prerequisites, and add your next steps to a plan.')+`<div class="filters"><label class="search-field"><span>⌕</span><input id="search" type="search" placeholder="Search by course name or code" value="${escape(query)}" aria-label="Search courses"></label><label><span class="sr-only">Requirement area</span><select id="area"><option value="all">All requirement areas</option>${requirements.map(r=>`<option value="${r.id}" ${area===r.id?'selected':''}>${escape(r.label)}</option>`).join('')}</select></label><label><span class="sr-only">Availability</span><select id="availability"><option value="all">All availability</option><option value="open" ${availability==='open'?'selected':''}>Open seats</option><option value="eligible" ${availability==='eligible'?'selected':''}>Prerequisites met</option></select></label></div><div class="results-line"><span>${filtered.length} courses to explore</span><span>Planning for ${escape(state.term)} · <a href="#planner">Change term</a></span></div><div class="course-grid explorer-grid">${filtered.length?filtered.map(courseCard).join(''):'<div class="empty panel"><h2>No matching courses</h2><p>Try a different search or clear your filters.</p><button class="button secondary" data-action="clear-filters">Clear filters</button></div>'}</div>`;}
function planner() {
  const validation = validatePlan(
    state.plan,
    courses,
    completed,
    state.term
  );

  return intro(
    'A SEMESTER THAT FITS',
    'Make your next move.',
    'Build, save, and review your semester before taking the next step.',
    `<button class="button" data-action="save-plan">
      Save plan <span>↗</span>
    </button>`
  ) + `
    <div class="planner-layout">

      <section>
        <div class="panel planner-toolbar">
          <label for="term">Planning semester</label>

          <select id="term">
  <option selected>
    2018-19 Semester 1
  </option>
</select>

          <span>
            ${state.plan.length} courses ·
            ${validation.credits} / 15 credits
          </span>
        </div>

        <div class="plan-list">

          ${state.plan.length
            ? state.plan.map(code => {

                const c = courses.find(c => c.code === code);

                if (!c) return '';

                const status = state.enrolments[code];

                return `
                  <article class="panel plan-course">

                    <div>
                      <span class="course-code">
                        ${escape(c.code)}
                      </span>

                      <h3>${escape(c.title)}</h3>

                      <p>
                        ${c.credits} credits ·
                        ${escape(c.days)} ·
                        ${escape(c.time)}
                      </p>

                      <span class="pill ${
                        status
                          ? 'green'
                          : c.seats
                            ? 'neutral'
                            : 'amber'
                      }">
                        ${
                          status
                            ? escape(status)
                            : c.seats
                              ? 'Ready to enrol'
                              : 'Course full · waitlist available'
                        }
                      </span>
                    </div>

                    <div class="plan-buttons">

                      <button
                        class="icon-button"
                        aria-label="Remove ${escape(c.code)} from plan"
                        data-remove="${escape(c.code)}"
                      >
                        ×
                      </button>

                      <button
                        class="button small secondary"
                        data-enrol="${escape(c.code)}"
                        ${status || !validation.valid ? 'disabled' : ''}
                      >
                        ${
                          status
                            ? 'Action recorded'
                            : c.seats
                              ? 'Enrol'
                              : 'Join waitlist'
                        }
                      </button>

                    </div>
                  </article>
                `;
              }).join('')

            : `
                <div class="panel empty">
                  <span class="empty-icon">▤</span>

                  <h2>A fresh page for your next semester</h2>

                  <p>
                    Find a course you’re curious about, or let the
                    planning assistant suggest a starting point.
                  </p>

                  <a class="button" href="#courses">
                    Explore courses →
                  </a>

                  <a class="text-link" href="#assistant">
                    Get a suggested plan
                  </a>
                </div>
              `
          }

        </div>

        <a href="#courses" class="add-course-link">
          + Explore and add courses
        </a>

      </section>

      <aside>

        <section class="panel">

          <p class="eyebrow">YOUR SEMESTER SNAPSHOT</p>

          <h2>${escape(state.term)}</h2>

          <div class="big-number">
            ${validation.credits}
            <small> / 15 credits</small>
          </div>

          ${progress(validation.credits, 15)}

          <p class="muted">
            ${
              15 - validation.credits >= 0
                ? 15 - validation.credits +
                  ' credits of room in your plan.'
                : 'Reduce your course load to 15 credits.'
            }
          </p>

          <hr>

          <strong>
            ${
              validation.valid
                ? '✓ Your plan passes prerequisite and credit checks'
                : 'Your plan needs attention'
            }
          </strong>

          ${validation.errors
            .map(error =>
              `<p class="error-text">${escape(error)}</p>`
            )
            .join('')}

          <p class="muted">
            Seat availability may change.
            Check timetable conflicts before confirming your selections.
          </p>

          ${enrolmentProposal ? `

            <hr>

            <p class="eyebrow">
              AI ENROLMENT REVIEW
            </p>

            ${enrolmentProposal.actions.map(item => `
              <div class="suggested-course">

                <span class="course-code">
                  ${escape(item.code)}
                </span>

                <p>
                  ${
                    item.action === 'enrolled'
                      ? '✓ Enrol — seats available'
                      : '→ Join waitlist — course full'
                  }
                </p>

              </div>
            `).join('')}

            ${
              enrolmentProposal.actions.length
                ? `
                  <button
                    class="button wide"
                    data-action="approve-enrolments"
                  >
                    Approve these actions →
                  </button>
                `
                : `
                  <p class="muted">
                    No new enrolment actions are needed.
                  </p>
                `
            }

          ` : ''}

          <button
            class="button wide"
            data-action="review-enrolments"
            ${!state.plan.length || !validation.valid ? 'disabled' : ''}
          >
            Review enrolment actions ✧
          </button>

          <button
            class="button secondary wide"
            data-action="export"
            ${!state.plan.length ? 'disabled' : ''}
          >
            Export plan ↓
          </button>

        </section>

        <div class="source-note">
          ${
            isDemo
              ? 'Enrolment and waitlist actions are simulations saved in this browser.'
              : 'Enrolment actions are sent to your connected backend.'
          }
        </div>

      </aside>

    </div>
  `;
}
function assistant() {
  return intro(
    'A LITTLE DIRECTION',
    'Your goals. A thoughtful starting point.',
    'Tell us what matters to you, and explore a plan you can make your own.'
  ) + `
    <div class="assistant-layout">
      <form class="panel" id="assistant-form">

        <span class="icon-tile">✧</span>

        <h2>What’s your next chapter?</h2>

        <p class="muted">
          ${
            isDemo
              ? 'Demo planner · deterministic suggestions based on eligibility, interests, and available courses. No AI service is connected.'
              : 'Request a suggested plan from your connected planning service.'
          }
        </p>

        <label class="field">
          Semester

          <select name="term">
            <option selected>
              2018-19 Semester 1
            </option>
          </select>
        </label>

        <label class="field">
          I’m interested in

          <select name="interest">
            <option value="balanced">
              A balanced semester
            </option>

            <option value="web">
              Web development
            </option>

            <option value="data">
              Data & analytics
            </option>

            <option value="software">
              Software development
            </option>
          </select>
        </label>

        <label class="field">
          Preferred course load

          <select name="maxCredits">
            <option value="6">
              6 credits · lighter load
            </option>

            <option value="9">
              9 credits · moderate load
            </option>

            <option value="12" selected>
              12 credits · full load
            </option>

            <option value="15">
              15 credits · maximum load
            </option>
          </select>
        </label>

        <label class="checkbox">
          <input
            name="openOnly"
            type="checkbox"
            checked
          >

          Only suggest courses with open seats
        </label>

        <button
          class="button wide"
          type="submit"
        >
          Find my starting point
          <span>✧</span>
        </button>

        <p class="form-note">
          Suggestions support planning.
          You choose what goes into your semester.
        </p>

      </form>

      <section
        id="suggestions"
        class="panel suggestion-panel"
        aria-live="polite"
      >
        ${
          proposal
            ? proposalHtml()
            : `
              <div class="assistant-empty">

                <span class="sparkle">✧</span>

                <h2>
                  There’s more than one path forward.
                </h2>

                <p>
                  Choose your preferences to find eligible
                  courses that help move your degree along.
                </p>

                <div class="assistant-tags">
                  <span>Prerequisites checked</span>
                  <span>Your interests considered</span>
                  <span>You stay in control</span>
                </div>

              </div>
            `
        }
      </section>

    </div>
  `;
}
function proposalHtml(){return `<p class="eyebrow">YOUR SUGGESTED STARTING POINT</p><h2>${escape(proposal.term)}</h2><p class="muted">${proposal.codes.length} courses · ${proposal.codes.reduce((s,code)=>s+courses.find(c=>c.code===code).credits,0)} credits. Review this suggestion before replacing your current plan.</p>${proposal.codes.map(code=>{const c=courses.find(c=>c.code===code);return `<div class="suggested-course"><span class="course-code">${escape(code)}</span><h3>${escape(c.title)}</h3><p>${c.credits} credits · ${escape(requirements.find(r=>r.id===c.area)?.label||c.area)}${c.seats?'':' · Waitlist required'}</p></div>`;}).join('')}${!proposal.codes.length?'<p>No eligible courses match these preferences. Try another semester or allow waitlisted courses.</p>':'<button class="button wide" data-action="apply-proposal">Use this plan →</button>'}`;}
function render(){const active=page();$('#main').innerHTML=({overview,requirements:requirementsPage,courses:explorer,planner,assistant}[active])();$('#page-crumb').textContent=pages[active];document.title=`${pages[active]} · UDPA`;document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.toggle('active',a.dataset.nav===active);if(a.dataset.nav===active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});$('#plan-count').textContent=state.plan.length;}
async function confirmAction(title,description){$('#confirm-title').textContent=title;$('#confirm-description').textContent=description;const dialog=$('#confirm-dialog');dialog.showModal();return new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true}));}
async function add(code){const next=[...state.plan,code];const check=validatePlan(next,courses,completed,state.term);if(!check.valid){toast(check.errors[0]);return;}state.plan=next;persist();render();toast(`${code} added to your plan.`);}
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.add){add(button.dataset.add);return;}
  if(button.dataset.remove){state.plan=state.plan.filter(c=>c!==button.dataset.remove);persist();render();return;}
  if(button.dataset.enrol){const code=button.dataset.enrol,c=courses.find(c=>c.code===code);if(!validatePlan(state.plan,courses,completed,state.term).valid){toast('Resolve your plan issues first.');return;}const action=c.seats?'enrolled':'waitlisted';if(!await confirmAction(`${action==='enrolled'?'Enrol in':'Join the waitlist for'} ${code}?`,`${isDemo?'This is a demonstration; no real university record will change.':'This action will be sent to the connected server.'} ${c.title} · ${c.credits} credits.`))return;
    button.disabled=true;try{if(!isDemo)await api.enrol(code,action);state.enrolments[code]=action;if(action==='enrolled')c.seats=Math.max(0,c.seats-1);persist();render();toast(`${code}: ${action==='enrolled'?'enrolment':'waitlist'} ${isDemo?'simulated':'recorded'}.`);}catch(e){toast(e.message);button.disabled=false;}return;}
  switch(button.dataset.action){
    case 'clear-filters':query='';area='all';availability='all';render();break;
    case 'save-plan':{const check=validatePlan(state.plan,courses,completed,state.term);if(!check.valid){toast(check.errors[0]);break;}button.disabled=true;try{if(!isDemo)await api.savePlan({term:state.term,codes:state.plan});persist();toast(isDemo?'Plan saved in this browser.':'Plan saved.');}catch(e){toast(e.message);}finally{button.disabled=false;}break;}
    case 'apply-proposal': {
  if (
    state.plan.length &&
    !await confirmAction(
      'Replace your current plan?',
      'Your saved course selections will be replaced by this suggestion. Existing enrolment actions remain recorded.'
    )
  ) break;

  const newPlan = {
    term: proposal.term,
    codes: [...proposal.codes]
  };

  try {
    if (!isDemo) {
      await api.savePlan(newPlan);
    }

    state.plan = newPlan.codes;
    state.term = newPlan.term;

    persist();
    location.hash = 'planner';
    render();

    toast('AI suggested plan saved.');

  } catch (error) {
    toast(error.message);
  }

  break;
}
    case 'approve-enrolments': {
  if (!enrolmentProposal?.actions?.length) {
    toast('There are no enrolment actions to approve.');
    break;
  }

  const approved = await confirmAction(
    'Approve these enrolment actions?',
    'The approved enrolment and waitlist actions will be recorded in the connected UDPA backend.'
  );

  if (!approved) break;

  button.disabled = true;
  button.textContent = 'Recording actions…';

  try {
    for (const item of enrolmentProposal.actions) {

      await api.enrol(item.code, item.action);

      state.enrolments[item.code] = item.action;

      if (item.action === 'enrolled') {
        const course = courses.find(c => c.code === item.code);

        if (course) {
          course.seats = Math.max(0, course.seats - 1);
        }
      }
    }

    enrolmentProposal = null;

    persist();
    render();

    toast('Approved enrolment actions recorded.');

  } catch (error) {
    toast(error.message);
  }

  break;
}
      
      case 'review-enrolments': {
  button.disabled = true;
  button.textContent = 'Reviewing availability…';

  try {
    if (isDemo) {
      toast('AI enrolment review requires the connected backend.');
      break;
    }

    enrolmentProposal = await api.enrolmentActions({
      term: state.term,
      codes: state.plan
    });

    render();
    toast('AI enrolment review ready.');

  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
  }

  break;
}
    case 'export':{const lines=[`UDPA semester plan — ${state.term}`,'Demonstration planning record',...state.plan.map(code=>{const c=courses.find(c=>c.code===code);return `${code} — ${c.title} | ${c.credits} credits | ${c.days} ${c.time} | ${state.enrolments[code]||'Planned'}`;}),`Total: ${totalPlan()} credits`];const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='udpa-semester-plan.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);break;}
  }
});
document.addEventListener('input',event=>{if(event.target.id==='search'){const position=event.target.selectionStart;query=event.target.value;render();$('#search').focus();$('#search').setSelectionRange(position,position);}});
document.addEventListener('change',async event=>{if(event.target.id==='area'){area=event.target.value;render();}if(event.target.id==='availability'){availability=event.target.value;render();}if(event.target.id==='term'){const next=event.target.value;if(state.plan.length&&!await confirmAction('Start a plan for another semester?','Changing semesters clears your planned courses. Existing enrolment actions remain recorded.')){event.target.value=state.term;return;}state.term=next;state.plan=[];persist();render();}});
document.addEventListener('submit',async event=>{if(event.target.id!=='assistant-form')return;event.preventDefault();const form=event.target,button=form.querySelector('button');const values=new FormData(form);const preferences={term:values.get('term'),interest:values.get('interest'),maxCredits:Number(values.get('maxCredits')),openOnly:values.has('openOnly')};button.disabled=true;button.textContent='Finding eligible courses…';$('#suggestions').setAttribute('aria-busy','true');try{const codes=isDemo?recommend(courses,completed,preferences):(await api.assistant(preferences)).codes;const check=validatePlan(codes,courses,completed,preferences.term,preferences.maxCredits);if(!check.valid)throw new Error('The suggested plan failed validation. '+check.errors[0]);proposal={codes,term:preferences.term};$('#suggestions').innerHTML=proposalHtml();}catch(e){$('#suggestions').textContent=e.message;}finally{button.disabled=false;button.innerHTML='Find my starting point <span>✧</span>';$('#suggestions').removeAttribute('aria-busy');}});
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);$('#main').focus({preventScroll:true});});
async function start(){if(!isDemo){$('#mode-badge').textContent='● Connected workspace';$('#main').innerHTML='<div class="panel empty" role="status">Loading your workspace…</div>';try{const data=await api.load();student=data.student;completed=data.completed;requirements=data.requirements;courses=data.courses;state={term:data.plan?.term||'2018-19 Semester 1',plan:data.plan?.codes||[],enrolments:data.enrolments||{}};document.querySelector('.profile strong').textContent=student.name;document.querySelector('.profile small').textContent=`Year ${student.year}`;document.querySelector('.avatar').textContent=student.name.split(' ').map(n=>n[0]).slice(0,2).join('');}catch(e){$('#main').innerHTML=`<div class="panel empty"><h1>We couldn’t load your workspace.</h1><p>${escape(e.message)}</p><button class="button" onclick="location.reload()">Try again</button></div>`;return;}}render();}
start();
