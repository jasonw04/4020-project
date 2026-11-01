// Fictional fixtures. Not official York requirements or DORIS records.
export const student = {id:'demo-jordan',name:'Jordan Davis',program:'Information Technology',degree:'Bachelor of Arts · Honours',year:3,target:120};
export const completed = [
 {code:'ITEC 1000',title:'Introduction to Information Technologies',credits:3,area:'core',term:'Fall 2024'},
 {code:'ITEC 1010',title:'Information and Organizations',credits:3,area:'core',term:'Fall 2024'},
 {code:'ITEC 1620',title:'Object-Oriented Programming',credits:3,area:'core',term:'Winter 2025'},
 {code:'ITEC 2610',title:'Object-Oriented Programming II',credits:3,area:'core',term:'Fall 2025'},
 {code:'ITEC 2620',title:'Introduction to Data Structures',credits:3,area:'core',term:'Winter 2026'},
 {code:'ITEC 3010',title:'Systems Analysis and Design',credits:3,area:'core',term:'Winter 2026'},
 {code:'MATH 1190',title:'Introduction to Sets and Logic',credits:3,area:'math',term:'Fall 2024'},
 {code:'MATH 2565',title:'Introduction to Applied Statistics',credits:3,area:'math',term:'Winter 2025'},
 {code:'MATH 1013',title:'Applied Calculus I',credits:3,area:'math',term:'Fall 2025'},
 {code:'GEN ED',title:'General education courses',credits:21,area:'general',term:'2024–2026'},
 {code:'ELECTIVES',title:'Completed elective courses',credits:18,area:'elective',term:'2024–2026'}
];
export const requirements = [
 {id:'core',label:'ITEC core',target:48,description:'Build your foundation in information technology.'},
 {id:'math',label:'Mathematics & statistics',target:12,description:'Quantitative reasoning and analytical skills.'},
 {id:'general',label:'General education',target:21,description:'Explore perspectives beyond your major.'},
 {id:'elective',label:'Electives',target:39,description:'Make room for your interests and specialization.'}
];
export const courses = [
 {code:'ITEC 3020',title:'Web Technologies',credits:3,area:'core',prereqs:['ITEC 2610'],seats:12,capacity:60,term:'Winter 2027',days:'Tue / Thu',time:'10:00–11:30',interest:'web',description:'Design accessible web interfaces and connect them to application services.'},
 {code:'ITEC 3220',title:'Database Systems',credits:3,area:'core',prereqs:['ITEC 2620'],seats:5,capacity:60,term:'Winter 2027',days:'Mon / Wed',time:'13:00–14:30',interest:'data',description:'Model relational data and use SQL to build reliable database applications.'},
 {code:'ITEC 3500',title:'Software Development',credits:3,area:'core',prereqs:['ITEC 2610'],seats:0,capacity:45,term:'Winter 2027',days:'Fri',time:'09:00–12:00',interest:'software',description:'Apply collaborative development, software design, and testing practices.'},
 {code:'ITEC 4020',title:'Internet Client-Server Systems',credits:3,area:'core',prereqs:['ITEC 3020'],seats:8,capacity:48,term:'Fall 2027',days:'Tue',time:'14:30–17:30',interest:'web',description:'Build dynamic applications with browser clients, server APIs, and databases.'},
 {code:'ITEC 4100',title:'Advanced Data Applications',credits:3,area:'core',prereqs:['ITEC 3220'],seats:10,capacity:40,term:'Fall 2027',days:'Wed',time:'09:00–12:00',interest:'data',description:'Develop applications that transform data into useful information.'},
 {code:'MATH 2030',title:'Elementary Probability',credits:3,area:'math',prereqs:['MATH 1013'],seats:18,capacity:80,term:'Winter 2027',days:'Tue / Thu',time:'13:00–14:30',interest:'data',description:'Explore probability models and uncertainty through practical problems.'},
 {code:'WRIT 2201',title:'Writing for Digital Media',credits:3,area:'elective',prereqs:[],seats:16,capacity:40,term:'Winter 2027',days:'Mon',time:'16:00–19:00',interest:'web',description:'Communicate clearly through digital formats, content, and storytelling.'},
 {code:'ENTR 2000',title:'Introduction to Entrepreneurship',credits:3,area:'elective',prereqs:[],seats:0,capacity:50,term:'Winter 2027',days:'Thu',time:'16:00–19:00',interest:'software',description:'Develop an idea, understand an audience, and explore a business model.'}
];
