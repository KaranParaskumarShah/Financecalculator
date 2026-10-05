import React,{useMemo,useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,useLocation,Link} from 'react-router-dom';
import {ArrowRight,BrainCircuit,Calculator,ChevronDown,CircleHelp,Globe2,Menu,Search,Sparkles,TrendingUp,X,Save,Download,Upload,ArrowLeftRight,Trash2,Link2,ShieldCheck} from 'lucide-react';
import './styles.css';

const money=(n,c='USD',ind=false)=>{const sym={USD:'$',INR:'₹',EUR:'€',GBP:'£'}[c]||'$';return sym+new Intl.NumberFormat(ind?'en-IN':'en-US',{maximumFractionDigits:2}).format(Number.isFinite(n)?n:0)};
const pct=n=>`${(Number(n)||0).toFixed(2)}%`;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));

const CALCS={
 compound:{title:'Compound Interest Calculator',slug:'compound-interest-calculator',region:'global',cat:'Investing',desc:'Project how your money can grow with compound returns and recurring contributions.',inputs:[['principal','Starting amount',10000],['monthly','Monthly contribution',500],['rate','Annual return',8],['years','Time horizon',20]],calc:v=>{const r=v.rate/100/12,n=v.years*12,f=v.monthly*((Math.pow(1+r,n)-1)/r||n)+v.principal*Math.pow(1+r,n);return {primary:f, invested:v.principal+v.monthly*n, interest:f-(v.principal+v.monthly*n)}},insight:r=>`Your projected balance is ${money(r.primary)}. About ${money(r.interest)} of the result comes from growth rather than your deposits.`},
 paycheck:{title:'Paycheck / Take-Home Pay Calculator',slug:'paycheck-calculator',region:'us',cat:'Income',desc:'Estimate U.S. take-home pay from gross salary using federal income tax and FICA assumptions.',inputs:[['salary','Annual gross salary',90000],['rate','Federal effective tax %',16],['state','State / local effective tax %',4],['pretax','Pre-tax deductions / year',6000],['freq','Paychecks / year',26]],calc:v=>{const taxable=Math.max(0,v.salary-v.pretax),federal=taxable*v.rate/100,state=taxable*v.state/100,fica=v.salary*.0765,net=Math.max(0,v.salary-federal-state-fica-v.pretax);return {primary:net/v.freq,annual:net,federal,state,fica}},insight:r=>`Estimated take-home is ${money(r.primary)} per paycheck. This is an estimate using the effective tax rates you entered; actual withholding depends on filing status, deductions and state rules.`},
 heloc:{title:'Home Equity Loan / HELOC Calculator',slug:'home-equity-loan-heloc-calculator',region:'us',cat:'Home & Loans',desc:'Estimate available home equity and an illustrative HELOC payment.',inputs:[['value','Home value',600000],['balance','Mortgage balance',350000],['ltv','Maximum combined LTV %',80],['rate','HELOC rate',8.5],['years','Repayment term (years)',10]],calc:v=>{const maxDebt=v.value*v.ltv/100,available=Math.max(0,maxDebt-v.balance),r=v.rate/100/12,n=v.years*12,pmt=r?available*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1):available/n;return {primary:pmt,available,equity:v.value-v.balance}},insight:r=>`Estimated available borrowing is ${money(r.available)} and the illustrative repayment payment is ${money(r.primary)} per month.`},
 mortgage:{title:'Mortgage Calculator',slug:'mortgage-calculator',region:'us',cat:'Home & Loans',desc:'Estimate monthly principal, interest, taxes, insurance and total housing cost.',inputs:[['price','Home price',450000],['down','Down payment',90000],['rate','Interest rate',6.5],['years','Loan term (years)',30],['tax','Property tax / year',6000],['insurance','Home insurance / year',1800],['pmi','PMI / month',0]],calc:v=>{const p=Math.max(0,v.price-v.down),r=v.rate/100/12,n=v.years*12,pi=p*(r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1);const monthly=pi+v.tax/12+v.insurance/12+v.pmi;return {primary:monthly,principal:p,interest:pi*n-p,total:monthly*n}},insight:r=>`Estimated monthly housing cost is ${money(r.primary)}. Principal financed is ${money(r.principal)}; taxes, insurance and PMI are shown separately.`},
 auto:{title:'Auto Loan Calculator',slug:'auto-loan-calculator',region:'us',cat:'Home & Loans',desc:'Calculate car payments, total interest and financing cost before you buy.',inputs:[['price','Vehicle price',38000],['down','Down payment',5000],['rate','APR',7],['months','Loan term (months)',60],['trade','Trade-in value',0],['tax','Sales tax %',7]],calc:v=>{const base=Math.max(0,v.price-v.down-v.trade)*(1+v.tax/100),r=v.rate/100/12,n=v.months,pm=r?base*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1):base/n;return {primary:pm,total:pm*n,interest:pm*n-base,financed:base}},insight:r=>`Your estimated payment is ${money(r.primary)} per month, with ${money(r.interest)} of interest over the loan term.`},
 credit:{title:'Credit Card Payoff Calculator',slug:'credit-card-payoff-calculator',region:'us',cat:'Debt',desc:'See how long it can take to clear a credit-card balance and how much interest you could pay.',inputs:[['balance','Current balance',8000],['rate','APR',24],['payment','Monthly payment',300]],calc:v=>{const r=v.rate/100/12;if(v.payment<=v.balance*r)return {primary:Infinity,interest:Infinity,months:Infinity};const n=-Math.log(1-r*v.balance/v.payment)/Math.log(1+r),interest=v.payment*n-v.balance;return {primary:n,interest,months:n}},insight:r=>Number.isFinite(r.months)?`At this payment, the balance takes about ${Math.ceil(r.months)} months to clear and costs roughly ${money(r.interest)} in interest.`:'Your payment is too low to reduce the balance at this APR. Increase the monthly payment.'},
 student:{title:'Student Loan Payoff Calculator',slug:'student-loan-payoff-calculator',region:'us',cat:'Debt',desc:'Estimate payoff time and interest when making extra student-loan payments.',inputs:[['balance','Loan balance',35000],['rate','Interest rate',5.5],['months','Remaining term (months)',120],['extra','Extra monthly payment',100]],calc:v=>{const r=v.rate/100/12,n=v.months,pmt=r?v.balance*r/(1-Math.pow(1+r,-n)):v.balance/n,actual=pmt+v.extra,months=r?(-Math.log(1-r*v.balance/actual)/Math.log(1+r)):v.balance/actual;return {primary:actual,months,interest:actual*months-v.balance,base:pmt}},insight:r=>`With the extra payment, estimated payoff is ${Math.ceil(r.months)} months. Your scheduled payment before the extra amount is about ${money(r.base)}.`},
 dti:{title:'Debt-to-Income Ratio Calculator',slug:'debt-to-income-ratio-calculator',region:'us',cat:'Debt',desc:'Measure monthly debt obligations against gross monthly income.',inputs:[['income','Gross monthly income',8000],['housing','Housing payment',2200],['car','Auto loans',500],['cards','Credit cards',250],['other','Other monthly debt',300]],calc:v=>{const d=v.housing+v.car+v.cards+v.other;return {primary:d/v.income*100,debt:d}},insight:r=>`Your DTI is ${pct(r.primary)}. Lower ratios generally leave more room in a household budget for savings and unexpected costs.`},
 cd:{title:'CD Calculator',slug:'cd-calculator',region:'us',cat:'Saving',desc:'Estimate maturity value and interest for a certificate of deposit.',inputs:[['deposit','Deposit',10000],['apy','APY',4.5],['years','Term (years)',3]],calc:v=>{const f=v.deposit*Math.pow(1+v.apy/100,v.years);return {primary:f,interest:f-v.deposit}},insight:r=>`At the stated APY, your estimated maturity value is ${money(r.primary)}, including ${money(r.interest)} of interest.`},
 retirement:{title:'401(k) & Retirement Calculator',slug:'401k-retirement-calculator',region:'us',cat:'Retirement',desc:'Project a retirement balance using current savings, contributions, employer match and growth.',inputs:[['balance','Current balance',50000],['contribution','Annual contribution',12000],['match','Employer match',4],['salary','Annual salary',90000],['rate','Annual return',7],['years','Years to retirement',30]],calc:v=>{let b=v.balance;const employerMatch=Math.min(v.contribution,v.salary*v.match/100);for(let i=0;i<v.years;i++){b=b*(1+v.rate/100)+v.contribution+employerMatch}return {primary:b,contrib:(v.contribution+employerMatch)*v.years,employerMatch}},insight:r=>`Projected retirement balance is ${money(r.primary)} under the assumptions entered. Employer matching is capped at the modeled employee contribution; actual plan rules vary.`},
 incomeTax:{title:'Income Tax Calculator — New vs Old Regime',slug:'income-tax-calculator',region:'in',cat:'Tax',desc:'Compare an illustrative Indian individual income-tax liability for AY 2026-27 under the new and old regimes; tax rules are simplified and exclude many special-rate items.',inputs:[['income','Annual income',1500000],['old','Old-regime deductions',300000]],calc:v=>{const taxableNew=Math.max(0,v.income-75000),slabs=[[400000,0],[800000,.05],[1200000,.10],[1600000,.15],[2000000,.20],[2400000,.25],[Infinity,.30]],rawTax=x=>{let t=0,p=0;for(const [cap,rate] of slabs){t+=Math.max(0,Math.min(x,cap)-p)*rate;p=cap;if(x<=cap)break}return t},taxNew0=x=>x<=1200000?0:rawTax(x),taxOld0=x=>x<=500000?0:Math.max(0,Math.min(x,500000)-250000)*.05+Math.max(0,Math.min(x,1000000)-500000)*.20+Math.max(0,x-1000000)*.30,n=taxNew0(taxableNew)*1.04,o=taxOld0(Math.max(0,v.income-v.old))*1.04;return {primary:Math.min(n,o),newTax:n,oldTax:o,saving:Math.abs(n-o)}},insight:r=>`Estimated lower liability is ${money(r.primary,'INR',true)}. New-regime tax is ${money(r.newTax,'INR',true)} and the simplified old-regime estimate is ${money(r.oldTax,'INR',true)}.`},
 salary:{title:'In-Hand Salary / CTC-to-Take-Home Calculator',slug:'in-hand-salary-calculator',region:'in',cat:'Income',desc:'Estimate monthly take-home pay from Indian CTC, basic salary, HRA and employee EPF.',inputs:[['ctc','Annual CTC',1200000],['basic','Annual basic salary',480000],['pt','Professional tax / year',2400]],calc:v=>{const epf=v.basic*.12,take=Math.max(0,v.ctc-epf-v.pt);return {primary:take/12,epf,annual:take}},insight:r=>`Estimated monthly take-home before income-tax adjustments is ${money(r.primary,'INR',true)}. Employee EPF contribution modeled here is ${money(r.epf,'INR',true)} per year.`},
 epf:{title:'EPF & Gratuity Calculator',slug:'epf-gratuity-calculator',region:'in',cat:'Retirement',desc:'Estimate EPF accumulation and gratuity from salary and years of service.',inputs:[['basic','Monthly basic salary',40000],['balance','Current EPF balance',150000],['rate','EPF annual interest',8.25],['years','Years of service',10],['increment','Annual salary growth %',7]],calc:v=>{let b=v.balance,s=v.basic;for(let y=0;y<v.years;y++){b=(b+s*.24*12)*(1+v.rate/100);s*=1+v.increment/100}const gratuity=s*15/26*Math.max(0,v.years);return {primary:b,gratuity}},insight:r=>`Projected EPF balance is ${money(r.primary,'INR',true)}. Illustrative gratuity using final modeled basic salary and completed years is ${money(r.gratuity,'INR',true)}.`},
 ssy:{title:'Sukanya Samriddhi Yojana Calculator',slug:'sukanya-samriddhi-yojana-calculator',region:'in',cat:'Saving',desc:'Estimate SSY maturity over the 21-year account term, with deposits modeled for up to 15 years.',inputs:[['annual','Annual deposit',100000],['rate','Interest rate',8.2],['depositYears','Deposit years',15]],calc:v=>{const depositYears=Math.min(15,Math.max(1,Math.floor(v.depositYears)));let b=0;for(let y=0;y<21;y++){b=(b+(y<depositYears?Math.min(v.annual,150000):0))*(1+v.rate/100)}const invested=Math.min(v.annual,150000)*depositYears;return {primary:b,invested,interest:b-invested,depositYears,maturityYears:21}},insight:r=>`Estimated maturity is ${money(r.primary,'INR',true)} with ${money(r.interest,'INR',true)} modeled as growth.`},
 sip:{title:'SIP Calculator',slug:'sip-calculator',region:'in',cat:'Investing',desc:'Estimate mutual-fund wealth with monthly SIP contributions and optional annual step-up.',inputs:[['monthly','Monthly SIP',10000],['rate','Expected annual return',12],['years','Tenure (years)',15],['step','Annual step-up %',10]],calc:v=>{let total=0,invested=0,m=v.monthly;const r=v.rate/100/12;for(let y=0;y<v.years;y++){for(let j=0;j<12;j++){total=total*(1+r)+m;invested+=m}m*=1+v.step/100}return {primary:total,invested,gain:total-invested}},insight:r=>`Estimated corpus is ${money(r.primary,'INR',true)}. Your invested amount is ${money(r.invested,'INR',true)} and the estimated growth is ${money(r.gain,'INR',true)}.`},
 emi:{title:'Loan EMI Calculator',slug:'loan-emi-calculator',region:'in',cat:'Home & Loans',desc:'Calculate monthly EMI, total interest and repayment amount for an Indian loan.',inputs:[['principal','Loan amount',2500000],['rate','Annual interest rate',8.5],['years','Tenure (years)',20]],calc:v=>{const r=v.rate/100/12,n=v.years*12,emi=r?v.principal*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1):v.principal/n;return {primary:emi,total:emi*n,interest:emi*n-v.principal}},insight:r=>`Your estimated EMI is ${money(r.primary,'INR',true)}. Total interest over the full term is ${money(r.interest,'INR',true)}.`},
 ppf:{title:'PPF Calculator',slug:'ppf-calculator',region:'in',cat:'Saving',desc:'Estimate Public Provident Fund maturity using annual contributions and an assumed rate.',inputs:[['annual','Annual contribution',150000],['rate','Interest rate',7.1],['years','Investment period',15]],calc:v=>{let b=0;for(let i=0;i<v.years;i++)b=(b+Math.min(v.annual,150000))*(1+v.rate/100);return {primary:b,invested:Math.min(v.annual,150000)*v.years,interest:b-Math.min(v.annual,150000)*v.years}},insight:r=>`Estimated PPF maturity is ${money(r.primary,'INR',true)}. The calculator caps annual contributions at ₹1.5 lakh for this model.`},
 fd:{title:'FD Calculator',slug:'fd-calculator',region:'in',cat:'Saving',desc:'Calculate fixed-deposit maturity with quarterly compounding.',inputs:[['principal','Deposit',200000],['rate','Interest rate',7],['years','Tenure (years)',5]],calc:v=>{const f=v.principal*Math.pow(1+v.rate/100/4,4*v.years);return {primary:f,interest:f-v.principal}},insight:r=>`Estimated FD maturity is ${money(r.primary,'INR',true)}, including ${money(r.interest,'INR',true)} of interest.`},
 gst:{title:'GST Calculator',slug:'gst-calculator',region:'in',cat:'Tax',desc:'Add or remove GST from an amount using common Indian GST slabs.',inputs:[['amount','Amount',100000],['rate','GST rate',18]],calc:v=>{const gst=v.amount*v.rate/100;return {primary:v.amount+gst,gst,base:v.amount,exclusive:v.amount/(1+v.rate/100)}},insight:r=>`GST on the entered base amount is ${money(r.gst,'INR',true)}. Inclusive amount is ${money(r.primary,'INR',true)}.`},
 swp:{title:'SWP Calculator',slug:'swp-calculator',region:'in',cat:'Retirement',desc:'Estimate how long an investment corpus may last with systematic withdrawals.',inputs:[['corpus','Starting corpus',5000000],['withdrawal','Monthly withdrawal',40000],['rate','Expected annual return',10],['years','Years',20]],calc:v=>{let b=v.corpus,r=v.rate/100/12;for(let i=0;i<v.years*12;i++){b=b*(1+r)-v.withdrawal;if(b<=0){return {primary:0,months:i+1}}}return {primary:b,months:v.years*12}},insight:r=>r.months<240?`At these assumptions, the corpus is depleted after about ${r.months} months.`:`After the selected period, an estimated ${money(r.primary,'INR',true)} remains.`}
};

const all=[...Object.values(CALCS),{title:'Inflation Calculator',slug:'inflation-calculator',region:'global',cat:'Planning',desc:'Understand how purchasing power changes over time.',inputs:[['amount','Current amount',100000],['rate','Inflation rate',3],['years','Years',10]],calc:v=>({primary:v.amount*Math.pow(1+v.rate/100,v.years),lost:v.amount*(Math.pow(1+v.rate/100,v.years)-1)}),insight:r=>`You would need about ${money(r.primary)} in the future to match the purchasing power represented by the amount today.`}];
const getCalc=slug=>all.find(x=>x.slug===slug)||Object.values(CALCS).find(x=>x.slug===slug);

function Header(){const [open,setOpen]=useState(false);return <header className="header"><Link className="brand" to="/"><span className="brandmark"><BrainCircuit size={20}/></span><span>FinanceCalculator<span className="dot">.si</span></span></Link><nav className={open?'nav open':'nav'}><Link to="/calculators">Calculators</Link><Link to="/us">US Finance</Link><Link to="/in">India Finance</Link><a href="#why">Why SI?</a></nav><div className="head-actions"><Link className="ghost-btn" to="/calculators">Explore</Link><button className="menu" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></div></header>}
function Footer(){return <footer><div><div className="brand footerbrand"><span className="brandmark"><BrainCircuit size={18}/></span>FinanceCalculator<span className="dot">.si</span></div><p>Intelligent financial calculators designed for clearer decisions.</p></div><div className="footerlinks"><div><b>Calculators</b><Link to="/compound-interest-calculator">Compound Interest</Link><Link to="/us/mortgage-calculator">Mortgage</Link><Link to="/in/sip-calculator">SIP</Link></div><div><b>Regions</b><Link to="/us">United States</Link><Link to="/in">India</Link></div></div><small>© 2026 FinanceCalculator.si · Educational tools, not financial advice.</small></footer>}
function CurrencyBar({currency,setCurrency,region}){const locked=region==='us'||region==='in';const label=region==='us'?'United States · USD':region==='in'?'India · INR':'Global';return <div className="toolbar"><div className="detect"><Globe2 size={16}/> {locked?'Regional format':'Auto-format'} <span>·</span> {label}</div><div className="currencies">{locked?<button className="active">{region==='in'?'INR':'USD'}</button>:['USD','INR','EUR','GBP'].map(c=><button className={currency===c?'active':''} onClick={()=>setCurrency(c)} key={c}>{c}</button>)}</div></div>}
function CalculatorCard({c}){return <Link to={(c.region==='us'?'/us/':c.region==='in'?'/in/':'/')+c.slug} className="calc-card"><div className="calc-icon"><Calculator size={19}/></div><div><span className="eyebrow">{c.cat}</span><h3>{c.title}</h3><p>{c.desc}</p></div><ArrowRight className="arr" size={19}/></Link>}
function Home(){const featured=all.slice(0,8);return <><Header/><main><section className="hero"><div className="hero-copy"><div className="pill"><Sparkles size={14}/> SI = Super Intelligence</div><h1>Finance decisions,<br/><em>calculated intelligently.</em></h1><p>Premium finance calculators for investing, borrowing, retirement, taxes and everyday money decisions — built to explain the number, not just produce it.</p><div className="hero-actions"><Link className="primary" to="/calculators">Explore calculators <ArrowRight size={17}/></Link><Link className="secondary" to="/compound-interest-calculator">Try Compound Interest</Link></div><div className="trust"><span><b>20+</b> calculators</span><span><b>US + India</b> coverage</span><span><b>100%</b> browser-side</span></div></div><div className="hero-orb"><div className="orb-core"><BrainCircuit size={52}/><span>SI ENGINE</span><b>Think · Calculate · Explain</b></div><div className="orb-chip c1">Scenario analysis</div><div className="orb-chip c2">Transparent math</div><div className="orb-chip c3">Private by design</div></div></section><section className="section" id="why"><div className="section-head"><div><span className="eyebrow">THE SI APPROACH</span><h2>More than a calculator.</h2></div><p>Every tool combines a transparent formula, scenario-ready inputs and a plain-English interpretation of the result.</p></div><div className="features"><div><BrainCircuit/><h3>Explain the result</h3><p>Understand what drives the number and which assumptions matter most.</p></div><div><TrendingUp/><h3>Model scenarios</h3><p>Change rates, terms and contributions instantly without sending data to a server.</p></div><div><CircleHelp/><h3>Learn while you calculate</h3><p>Each page is structured for search, education and real-world decision making.</p></div></div></section><section className="section"><div className="section-head"><div><span className="eyebrow">POPULAR TOOLS</span><h2>Start with a calculation.</h2></div><Link className="text-link" to="/calculators">View all <ArrowRight size={16}/></Link></div><div className="grid">{featured.map(c=><CalculatorCard key={c.slug} c={c}/>)}</div></section><section className="region-strip"><div><span className="eyebrow">BUILT FOR TWO MAJOR MARKETS</span><h2>One universal core.<br/>Localized finance where it matters.</h2></div><div className="region-cards"><Link to="/us"><b>🇺🇸 United States</b><span>Mortgage · 401(k) · Paycheck · DTI</span><ArrowRight size={17}/></Link><Link to="/in"><b>🇮🇳 India</b><span>SIP · EMI · PPF · GST · SWP</span><ArrowRight size={17}/></Link></div></section></main><Footer/></>}
function Listing({region}){const items=all.filter(c=>region==='global'?true:c.region===region||c.region==='global');return <><Header/><main className="listing"><div className="list-hero"><span className="pill"><Calculator size={14}/> {region==='us'?'United States':region==='in'?'India':'All calculators'}</span><h1>{region==='us'?'US Finance Calculators':region==='in'?'India Finance Calculators':'Finance calculators for every decision'}</h1><p>{region==='us'?'Mortgage, retirement, debt and paycheck planning tools.':region==='in'?'SIP, EMI, tax, deposits and retirement tools.':'Universal calculators plus country-specific finance tools.'}</p></div><div className="searchbox"><Search size={18}/><input placeholder="Search calculators..." onChange={e=>window.__calcSearch=e.target.value}/></div><div className="grid">{items.map(c=><CalculatorCard key={c.slug} c={c}/>)}</div></main><Footer/></>}
function siGoal(calc,result){
  if(calc.slug==='debt-to-income-ratio-calculator') return {label:'lower debt burden',direction:'lower'};
  if(calc.slug==='credit-card-payoff-calculator'||calc.slug==='student-loan-payoff-calculator') return {label:'faster payoff / lower interest',direction:'lower'};
  if(calc.cat==='Debt'||calc.cat==='Home & Loans') return {label:'lower modeled borrowing cost',direction:'lower'};
  if(calc.slug==='income-tax-calculator') return {label:'lower estimated tax',direction:'lower'};
  if(calc.slug==='paycheck-calculator'||calc.slug==='in-hand-salary-calculator') return {label:'higher take-home pay',direction:'higher'};
  if(calc.slug==='gst-calculator') return {label:'tax calculation accuracy',direction:'neutral'};
  if(calc.slug==='inflation-calculator') return {label:'purchasing-power awareness',direction:'neutral'};
  if(calc.slug==='mortgage-calculator'||calc.slug==='auto-loan-calculator') return {label:'lower lifetime financing cost',direction:'lower'};
  return {label:'higher projected financial value',direction:'higher'};
}

const inputMeta={
  principal:{label:'starting amount',kind:'amount'},monthly:{label:'monthly contribution',kind:'amount'},contribution:{label:'contribution',kind:'amount'},annual:{label:'annual contribution',kind:'amount'},withdrawal:{label:'withdrawal',kind:'amount'},payment:{label:'monthly payment',kind:'amount'},extra:{label:'extra payment',kind:'amount'},
  rate:{label:'interest / return rate',kind:'rate'},apy:{label:'APY',kind:'rate'},step:{label:'step-up rate',kind:'rate'},match:{label:'employer match',kind:'rate'},tax:{label:'tax rate',kind:'rate'},state:{label:'state tax rate',kind:'rate'},increment:{label:'salary growth',kind:'rate'},
  years:{label:'time horizon',kind:'time'},months:{label:'loan term',kind:'time'},salary:{label:'income',kind:'income'},ctc:{label:'CTC',kind:'income'},income:{label:'income',kind:'income'},
  price:{label:'purchase price',kind:'amount'},down:{label:'down payment',kind:'amount'},trade:{label:'trade-in',kind:'amount'},balance:{label:'balance',kind:'balance'},value:{label:'asset value',kind:'amount'},ltv:{label:'maximum LTV',kind:'rate'},insurance:{label:'insurance cost',kind:'amount'},pmi:{label:'PMI',kind:'amount'},pretax:{label:'pre-tax deductions',kind:'amount'},freq:{label:'pay frequency',kind:'count'},
  housing:{label:'housing debt',kind:'debt'},car:{label:'auto debt',kind:'debt'},cards:{label:'card debt',kind:'debt'},other:{label:'other debt',kind:'debt'},deposit:{label:'deposit',kind:'amount'},corpus:{label:'starting corpus',kind:'amount'},old:{label:'old-regime deductions',kind:'amount'},basic:{label:'basic salary',kind:'income'},pt:{label:'professional tax',kind:'amount'},invested:{label:'invested amount',kind:'amount'},amount:{label:'amount',kind:'amount'},depositYears:{label:'deposit years',kind:'time'}
};

/*
  SI is deliberately calculator-agnostic at the UI layer. Each calculator exposes
  inputs + calc(), and this engine turns those primitives into a local decision model.
  No static recommendation is attached to a number: every message below is derived
  from the user's current state and fresh counterfactual calculations.
*/
const siProfiles={
  'compound-interest-calculator':{objective:'maximize projected balance',direction:'higher',primary:'primary',drivers:['principal','monthly','rate','years']},
  'mortgage-calculator':{objective:'minimize lifetime financing cost',direction:'lower',primary:'interest',drivers:['price','down','rate','years']},
  'auto-loan-calculator':{objective:'minimize lifetime financing cost',direction:'lower',primary:'interest',drivers:['price','down','trade','rate','months']},
  'paycheck-calculator':{objective:'maximize estimated take-home pay',direction:'higher',primary:'annual',drivers:['salary','pretax','rate','state']},
  '401k-retirement-calculator':{objective:'maximize projected retirement balance',direction:'higher',primary:'primary',drivers:['balance','contribution','match','rate','years']},
  'credit-card-payoff-calculator':{objective:'minimize payoff time and interest',direction:'lower',primary:'months',drivers:['balance','rate','payment']},
  'student-loan-payoff-calculator':{objective:'minimize payoff time and interest',direction:'lower',primary:'months',drivers:['balance','rate','months','extra']},
  'home-equity-loan-heloc-calculator':{objective:'minimize HELOC repayment cost',direction:'lower',primary:'primary',drivers:['value','balance','ltv','rate','years']},
  'debt-to-income-ratio-calculator':{objective:'minimize debt burden',direction:'lower',primary:'primary',drivers:['income','housing','car','cards','other']},
  'cd-calculator':{objective:'maximize maturity value',direction:'higher',primary:'primary',drivers:['deposit','apy','years']},
  'income-tax-calculator':{objective:'minimize estimated tax',direction:'lower',primary:'primary',drivers:['income','old']},
  'in-hand-salary-calculator':{objective:'maximize estimated take-home pay',direction:'higher',primary:'primary',drivers:['ctc','basic','pt']},
  'epf-gratuity-calculator':{objective:'maximize projected retirement corpus',direction:'higher',primary:'primary',drivers:['basic','balance','rate','years','increment']},
  'sukanya-samriddhi-yojana-calculator':{objective:'maximize projected maturity value',direction:'higher',primary:'primary',drivers:['annual','rate','depositYears']},
  'sip-calculator':{objective:'maximize projected investment value',direction:'higher',primary:'primary',drivers:['monthly','rate','years','step']},
  'loan-emi-calculator':{objective:'minimize loan interest while keeping payment manageable',direction:'lower',primary:'interest',drivers:['principal','rate','years']},
  'ppf-calculator':{objective:'maximize projected maturity value',direction:'higher',primary:'primary',drivers:['annual','rate','years']},
  'fd-calculator':{objective:'maximize maturity value',direction:'higher',primary:'primary',drivers:['principal','rate','years']},
  'gst-calculator':{objective:'understand the correct tax-inclusive amount',direction:'neutral',primary:'primary',drivers:['amount','rate']},
  'swp-calculator':{objective:'preserve more of the withdrawal corpus',direction:'higher',primary:'primary',drivers:['corpus','withdrawal','rate','years']},
  'inflation-calculator':{objective:'understand purchasing-power change',direction:'neutral',primary:'primary',drivers:['amount','rate','years']}
};

function siProfile(calc){
  return siProfiles[calc.slug]||{objective:'improve the modeled financial outcome',direction:'higher',primary:'primary',drivers:calc.inputs.map(x=>x[0])};
}
function scenarioStep(key,current,sign){
  const n=Number(current)||0, meta=inputMeta[key]||{};
  if(meta.kind==='rate') return Math.max(0,n+sign*(Math.abs(n)>=8?2:1));
  if(meta.kind==='time') return Math.max(1,n+sign*(n>=10?5:1));
  if(meta.kind==='count') return Math.max(1,Math.round(n+sign));
  const floor=(key==='payment'||key==='monthly'||key==='contribution'||key==='extra'||key==='withdrawal')?50:100;
  return Math.max(0,n+sign*Math.max(Math.abs(n)*0.2,floor));
}
function safeCalc(calc,vals){
  try{
    const result=calc.calc(vals);
    if(!result || Object.values(result).some(v=>typeof v==='number'&&!Number.isFinite(v)&&v!==Infinity)) return null;
    return result;
  }catch{return null}
}
function siValue(calc,r){
  const profile=siProfile(calc);
  if(profile.primary==='months') return Number.isFinite(r?.months)?r.months:Infinity;
  if(profile.primary==='interest') return Number(r?.interest)||0;
  return Number(r?.[profile.primary])||0;
}
function siBetter(calc,a,b){
  const goal=siProfile(calc), av=siValue(calc,a), bv=siValue(calc,b);
  if(goal.direction==='neutral') return false;
  if(!Number.isFinite(av)) return Number.isFinite(bv);
  if(!Number.isFinite(bv)) return false;
  return goal.direction==='lower'?bv<av:bv>av;
}
function pctChange(a,b){
  if(!Number.isFinite(a)||!Number.isFinite(b)||a===0) return 0;
  return ((b-a)/Math.abs(a))*100;
}
function scenarioLabel(key,sign){return `${sign>0?'Increase':'Reduce'} ${inputMeta[key]?.label||key}`;}
function buildSingleScenarios(calc,vals,result){
  const profile=siProfile(calc), keys=profile.drivers.filter(k=>calc.inputs.some(x=>x[0]===k));
  const scenarios=[];
  for(const key of keys){
    for(const sign of [-1,1]){
      const current=Number(vals[key]); if(!Number.isFinite(current)) continue;
      const changed=scenarioStep(key,current,sign); if(changed===current) continue;
      const next={...vals,[key]:changed}, nextResult=safeCalc(calc,next); if(!nextResult) continue;
      const impact=pctChange(siValue(calc,result),siValue(calc,nextResult));
      scenarios.push({type:'single',key,sign,label:scenarioLabel(key,sign),result:nextResult,vals:next,delta:changed-current,impact,better:siBetter(calc,result,nextResult)});
    }
  }
  return scenarios;
}
function buildPairScenarios(calc,vals,result,singles){
  const profile=siProfile(calc);
  if(profile.direction==='neutral') return [];
  const ranking=[...singles].sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact));
  const keys=[]; for(const s of ranking){if(!keys.includes(s.key)) keys.push(s.key); if(keys.length>=3) break;}
  const out=[];
  for(let i=0;i<keys.length;i++) for(let j=i+1;j<keys.length;j++){
    for(const signs of [[1,1],[-1,-1],[1,-1],[-1,1]]){
      const next={...vals}; let valid=true;
      [keys[i],keys[j]].forEach((key,idx)=>{const n=Number(vals[key]); if(!Number.isFinite(n)){valid=false;return} next[key]=scenarioStep(key,n,signs[idx]);});
      if(!valid) continue;
      const rr=safeCalc(calc,next); if(!rr) continue;
      const impact=pctChange(siValue(calc,result),siValue(calc,rr));
      out.push({type:'pair',keys:[keys[i],keys[j]],signs,label:`${signs[0]>0?'Increase':'Reduce'} ${inputMeta[keys[i]]?.label||keys[i]} + ${signs[1]>0?'increase':'reduce'} ${inputMeta[keys[j]]?.label||keys[j]}`,result:rr,vals:next,impact,better:siBetter(calc,result,rr)});
    }
  }
  return out;
}
function buildPlan(calc,vals,result,singles,pairs){
  const profile=siProfile(calc);
  if(profile.direction==='neutral') return null;
  const candidates=[...singles.filter(x=>x.better),...pairs.filter(x=>x.better)].sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact));
  const best=candidates[0]; if(!best) return null;
  const label=best.type==='pair'?`Combine ${inputMeta[best.keys[0]]?.label||best.keys[0]} and ${inputMeta[best.keys[1]]?.label||best.keys[1]}`:best.label;
  return {label,impact:best.impact,result:best.result,vals:best.vals,type:best.type};
}
function buildSignals(calc,vals,result,singles,pairs,plan){
  const profile=siProfile(calc), sorted=[...singles].sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact));
  const signals=[];
  const top=sorted[0];
  if(top) signals.push(`${inputMeta[top.key]?.label||top.key} is the strongest tested lever: a ${Math.abs(top.delta).toLocaleString(undefined,{maximumFractionDigits:2})} change moves the modeled outcome ${top.impact>=0?'up':'down'} about ${Math.abs(top.impact).toFixed(1)}%.`);
  if(sorted[1]) signals.push(`SI's second lever is ${inputMeta[sorted[1].key]?.label||sorted[1].key}, showing that the decision is driven by more than one variable.`);
  if(plan) signals.push(`SI found a stronger combined path: ${plan.label.toLowerCase()} changes the modeled objective by ${plan.impact>=0?'+':'−'}${Math.abs(plan.impact).toFixed(1)}% versus the current state.`);
  if(profile.direction==='neutral') signals.push(`This tool has no universal “better” direction. SI stays neutral and focuses on accuracy, trade-offs and scenario visibility.`);
  if(calc.slug==='credit-card-payoff-calculator'&&!Number.isFinite(result.months)) signals.unshift('Critical signal: the current payment does not cover modeled monthly interest, so the balance does not amortize under these assumptions.');
  if(calc.slug==='debt-to-income-ratio-calculator') signals.push(result.primary<=20?'DTI is modeled as low, leaving comparatively more monthly capacity.':result.primary<=36?'DTI is moderate; preserve room for savings and future obligations.':result.primary<=43?'DTI is elevated; additional borrowing should be stress-tested.':'DTI is high; reducing recurring debt is the strongest modeled direction.');
  if(calc.slug==='income-tax-calculator') signals.push(result.newTax<=result.oldTax?'The new-regime estimate is lower under the current assumptions.':'The old-regime estimate is lower under the current assumptions.');
  if(['compound-interest-calculator','sip-calculator','401k-retirement-calculator','ppf-calculator','fd-calculator','cd-calculator','ssy-calculator','swp-calculator'].includes(calc.slug)) signals.push('Time compounds the effect: a modest recurring change can become materially larger over many periods.');
  return signals.slice(0,5);
}
function siEngine(calc,vals,result){
  const singles=buildSingleScenarios(calc,vals,result), pairs=buildPairScenarios(calc,vals,result,singles), profile=siProfile(calc);
  const betterSingles=singles.filter(x=>x.better).sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact));
  const worseSingles=singles.filter(x=>!x.better).sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact));
  const selected=[...betterSingles,...worseSingles];
  const seen=new Set(), scenarios=[];
  for(const s of selected){if(seen.has(s.key)) continue;seen.add(s.key);scenarios.push(s);if(scenarios.length===4) break;}
  const top=[...singles].sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact))[0]||null;
  const plan=buildPlan(calc,vals,result,singles,pairs);
  const signals=buildSignals(calc,vals,result,singles,pairs,plan);
  const explanation=profile.direction==='neutral'
    ? `SI is running a neutral decision model for ${profile.objective}. It tests the assumptions without forcing a “higher is better” recommendation.`
    : plan
      ? `SI found a modeled path toward ${profile.objective}: ${plan.label.toLowerCase()} has the strongest tested combined effect from your current starting point.`
      : `SI tested the highest-impact levers from your current inputs and did not find a clear improvement under the current model.`;
  return {profile,signals,scenarios,allScenarios:singles,pairedScenarios:pairs,best:betterSingles[0]||null,top,plan};
}

// SI Financial Decision Graph — product-aware constrained goal seeking.
const lockedSIKeys=new Set(['rate','apy','tax','state','ltv','match','freq','increment']);

const siConstraints={
 'compound-interest-calculator':{bounds:{principal:[0,1e9],monthly:[0,1e7],years:[1,80]},objective:'maximize projected balance'},
 'mortgage-calculator':{bounds:{price:[10000,1e8],down:[0,1e8],years:[5,40]},rules:v=>v.down<=v.price&&v.down>=0,objective:'reduce housing cost / financing burden'},
 'auto-loan-calculator':{bounds:{price:[1000,1e7],down:[0,1e7],months:[12,96],trade:[0,1e7]},rules:v=>v.down+v.trade<=v.price,objective:'reduce payment and financing cost'},
 'paycheck-calculator':{bounds:{salary:[10000,1e7],pretax:[0,1e6],freq:[1,52]},rules:v=>v.pretax<=v.salary,objective:'maximize estimated take-home'},
 '401k-retirement-calculator':{bounds:{balance:[0,1e8],contribution:[0,1e6],salary:[10000,1e7],years:[1,70]},objective:'maximize retirement projection'},
 'credit-card-payoff-calculator':{bounds:{balance:[1,1e7],payment:[1,1e6]},rules:v=>v.payment>0,objective:'reduce payoff time and interest'},
 'student-loan-payoff-calculator':{bounds:{balance:[1,1e7],months:[1,480],extra:[0,1e6]},rules:v=>v.extra>=0,objective:'reduce payoff time and interest'},
 'home-equity-loan-heloc-calculator':{bounds:{value:[10000,1e8],balance:[0,1e8],years:[1,30]},rules:v=>v.balance<=v.value,objective:'control borrowing cost'},
 'debt-to-income-ratio-calculator':{bounds:{income:[1,1e7],housing:[0,1e6],car:[0,1e6],cards:[0,1e6],other:[0,1e6]},objective:'reduce debt burden'},
 'cd-calculator':{bounds:{deposit:[1,1e8],years:[0.25,10]},objective:'maximize modeled maturity value'},
 'sip-calculator':{bounds:{monthly:[100,1e7],years:[1,60],step:[0,50]},objective:'maximize projected corpus'},
 'loan-emi-calculator':{bounds:{principal:[1000,1e8],years:[1,40]},objective:'reduce EMI / total interest'},
 'income-tax-calculator':{bounds:{income:[0,1e9],old:[0,1e8]},rules:v=>v.old<=v.income,objective:'minimize estimated tax'},
 'ppf-calculator':{bounds:{annual:[500,150000],years:[15,50]},objective:'maximize modeled maturity value'},
 'fd-calculator':{bounds:{principal:[1000,1e8],years:[0.25,20]},objective:'maximize modeled maturity value'},
 'in-hand-salary-calculator':{bounds:{ctc:[100000,1e8],basic:[0,1e8],pt:[0,1e6]},rules:v=>v.basic<=v.ctc&&v.pt<=v.ctc,objective:'maximize estimated take-home'},
 'epf-gratuity-calculator':{bounds:{basic:[1000,1e7],balance:[0,1e8],years:[1,45]},objective:'maximize modeled retirement corpus'},
 'sukanya-samriddhi-yojana-calculator':{bounds:{annual:[250,150000],depositYears:[1,15]},objective:'maximize modeled maturity value'},
 'swp-calculator':{bounds:{corpus:[1000,1e9],withdrawal:[1,1e7],years:[1,60]},rules:v=>v.withdrawal>0,objective:'preserve more of the withdrawal corpus'},
 'inflation-calculator':{bounds:{amount:[1,1e9],years:[1,100]},objective:'understand purchasing-power change'},
 'gst-calculator':{bounds:{amount:[0,1e9]},objective:'accuracy / tax transparency'}
};
function constraintFor(calc){return siConstraints[calc.slug]||{bounds:{},objective:siProfile(calc).objective};}
function validCandidate(calc,v){
 const c=constraintFor(calc);
 for(const [k,[lo,hi]] of Object.entries(c.bounds||{})){const n=Number(v[k]);if(Number.isFinite(n)&&(n<lo||n>hi))return false;}
 if(c.rules&&!c.rules(v))return false;
 if(calc.slug==='credit-card-payoff-calculator'&&Number(v.payment)<=0)return false;
 if(calc.slug==='debt-to-income-ratio-calculator'&&Number(v.income)<=0)return false;
 return true;
}
function graphStepValues(calc,key,current){
 const kind=inputMeta[key]?.kind; const n=Number(current)||0;
 let unit=kind==='time'?Math.max(1,n>=20?2:1):kind==='count'?1:Math.max(Math.abs(n)*0.1, key==='monthly'||key==='contribution'||key==='withdrawal'||key==='payment'||key==='extra'?100:10);
 const steps=kind==='time'?[-6,-4,-2,-1,0,1,2,4,6]:[-5,-3,-2,-1,0,1,2,3,5];
 const c=constraintFor(calc).bounds?.[key];
 return [...new Set(steps.map(s=>{let x=n+s*unit;if(kind==='time'||kind==='count')x=Math.round(x);else x=Math.round(x*100)/100;if(c)x=clamp(x,c[0],c[1]);return x;}).filter(x=>Number.isFinite(x)))];
}
function siGraph(calc,values,target,selectedKeys,budget){
 const profile=siProfile(calc), base=safeCalc(calc,values), metric=r=>Number(r?.[profile.primary]);
 const start=metric(base); if(!Number.isFinite(start)||!Number.isFinite(target)||target<0||profile.direction==='neutral')return {error:'This calculator does not have a universal optimization direction.'};
 const keys=selectedKeys.filter(k=>calc.inputs.some(x=>x[0]===k)&&!lockedSIKeys.has(k)).slice(0,3);
 if(!keys.length)return {error:'Select at least one adjustable input.'};
 const options=keys.map(k=>graphStepValues(calc,k,values[k]));
 let tested=0,valid=0,feasible=[],closest=null;
 const evaluate=patch=>{
  const candidate={...values,...patch}; if(!validCandidate(calc,candidate))return;
  const result=safeCalc(calc,candidate); const output=metric(result); if(!Number.isFinite(output))return;
  valid++; const changes=keys.filter(k=>candidate[k]!==values[k]);
  const effort=changes.reduce((sum,k)=>sum+Math.abs(candidate[k]-values[k])/(Math.max(Math.abs(values[k]),1)),0);
  if(Number.isFinite(budget)&&effort>budget)return;
  tested++;
  const gap=Math.abs(output-target), meets=profile.direction==='lower'?output<=target:output>=target;
  const entry={inputs:candidate,result,output,gap,effort,changes,meets};
  if(!closest||gap<closest.gap||(gap===closest.gap&&effort<closest.effort))closest=entry;
  if(meets)feasible.push(entry);
 };
 const walk=(depth,patch)=>{if(depth===options.length){evaluate(patch);return}for(const value of options[depth])walk(depth+1,{...patch,[keys[depth]]:value});};
 walk(0,{});
 feasible.sort((a,b)=>a.effort-b.effort||a.gap-b.gap); const winners=feasible.slice(0,3),winner=winners[0]||closest;
 return {tested,valid,achieved:feasible.length>0,winner,alternatives:winners,keys,target,start,objective:constraintFor(calc).objective||profile.objective,approximate:true,constraints:constraintFor(calc)};
}
function SIGraphLab({calc,vals,currency}){
 const profile=siProfile(calc),base=safeCalc(calc,vals),baseValue=Number(base?.[profile.primary]);
 const editable=calc.inputs.filter(([key])=>!lockedSIKeys.has(key));
 const [goal,setGoal]=useState('');const [chosen,setChosen]=useState([]);const [effort,setEffort]=useState(2);const [run,setRun]=useState(false);
 useEffect(()=>{setGoal('');setChosen([]);setRun(false)},[calc.slug]);
 const active=chosen.length?chosen:editable.slice(0,2).map(x=>x[0]);
 const numericGoal=goal===''?NaN:Number(goal);
 const graph=useMemo(()=>run?siGraph(calc,vals,numericGoal,active,effort):null,[calc,vals,numericGoal,active.join(','),effort,run]);
 const fmt=n=>profile.primary==='months'?`${Math.round(n)} months`:calc.slug==='debt-to-income-ratio-calculator'?pct(n):money(n,currency,currency==='INR');
 return <section className="si-graph"><div className="si-plan-head"><div><span className="eyebrow">SI FINANCIAL DECISION GRAPH</span><h2>Give SI a destination. It finds the path.</h2><p>SI searches combinations of the decisions you can actually change, validates them against calculator-specific financial constraints, and ranks the least-disruptive paths toward your target.</p></div><div className="si-badge"><BrainCircuit size={17}/> CONSTRAINED SI</div></div>
 {profile.direction==='neutral'?<div className="graph-neutral"><BrainCircuit size={18}/><p><b>SI stays neutral here.</b> This calculator is for measurement rather than optimization, so it won't manufacture a “better” financial decision.</p></div>:<>
 <div className="graph-controls"><label>Target {profile.primary==='months'?'(months)':calc.slug==='debt-to-income-ratio-calculator'?'(%)':'(amount)'}<input type="number" min="0" placeholder={Number.isFinite(baseValue)?String(Math.round(baseValue*(profile.direction==='higher'?1.25:.8))):'Enter target'} value={goal} onChange={e=>{setGoal(e.target.value);setRun(false)}}/></label><label>Change budget<select value={effort} onChange={e=>{setEffort(Number(e.target.value));setRun(false)}}><option value="0.5">Very conservative</option><option value="1">Moderate</option><option value="2">Flexible</option><option value="5">Wide exploration</option></select></label></div>
 <div className="graph-levers"><b>Decisions SI may change (up to 3)</b><div>{editable.map(([key,label])=><label key={key}><input type="checkbox" checked={active.includes(key)} onChange={()=>{setChosen(current=>{const prev=current.length?current:active;return prev.includes(key)?prev.filter(k=>k!==key):prev.length<3?[...prev,key]:prev});setRun(false)}}/>{label}</label>)}</div></div>
 <div className="graph-constraint-note"><span>CONSTRAINTS</span><p>SI enforces product rules such as non-negative balances, valid term ranges, down payment ≤ purchase price, debt payment logic, and scheme-specific contribution limits where modeled.</p></div>
 <button className="graph-run" onClick={()=>setRun(true)} disabled={!Number.isFinite(numericGoal)||numericGoal<0||!active.length}>Find the closest feasible path <ArrowRight size={17}/></button>
 {graph&&(graph.error?<p>{graph.error}</p>:<div className="graph-answer"><span className="eyebrow">{graph.achieved?'TARGET REACHED WITH VALID CONSTRAINTS':'TARGET NOT REACHED — CLOSEST VALID PATH'}</span><h3>{graph.winner?fmt(graph.winner.output):'No valid candidate within constraints'}</h3><p>Target: <b>{fmt(graph.target)}</b> · Current: <b>{fmt(graph.start)}</b> · {graph.tested} valid combinations evaluated.</p>{graph.winner&&<div className="graph-changes">{graph.winner.changes.length?graph.winner.changes.map(k=><div key={k}><span>{inputMeta[k]?.label||k}</span><b>{fmtValue(calc,k,vals[k],currency)} → {fmtValue(calc,k,graph.winner.inputs[k],currency)}</b></div>):<p>Your current inputs already meet the target.</p>}</div>}{graph.alternatives.length>1&&<p>{graph.alternatives.length} qualifying paths found; SI ranks lower input change first.</p>}<small>Bounded local search, not a guarantee or financial advice. Assumptions such as market returns and tax rates remain assumptions unless the calculator explicitly allows them to vary.</small></div>)}
 </>}</section>
}
function fmtValue(calc,key,value,currency){const meta=inputMeta[key]||{};if(meta.kind==='rate'||['rate','apy','tax','state','ltv','match','increment','step'].includes(key))return `${Number(value).toFixed(2)}%`;if(calc.slug==='debt-to-income-ratio-calculator'&&key==='income')return money(value,currency,currency==='INR');return money(value,currency,currency==='INR');}
function constraintMessage(calc,vals){const c=constraintFor(calc);for(const [k,[lo,hi]] of Object.entries(c.bounds||{})){const n=Number(vals[k]);if(Number.isFinite(n)&&(n<lo||n>hi))return `${inputMeta[k]?.label||k} must stay between ${lo.toLocaleString()} and ${hi.toLocaleString()} for SI scenario modeling.`;}if(c.rules&&!c.rules(vals)){if(calc.slug==='mortgage-calculator')return 'Down payment cannot exceed the home price.';if(calc.slug==='auto-loan-calculator')return 'Down payment plus trade-in cannot exceed the vehicle price.';if(calc.slug==='paycheck-calculator')return 'Pre-tax deductions cannot exceed gross salary.';if(calc.slug==='home-equity-loan-heloc-calculator')return 'Mortgage balance cannot exceed home value.';if(calc.slug==='income-tax-calculator')return 'Old-regime deductions cannot exceed annual income.';if(calc.slug==='in-hand-salary-calculator')return 'Basic salary and professional tax cannot exceed CTC in this model.';}return '';}

function siStressModel(calc, vals, result){
  const profile=siProfile(calc);
  const tests=[];
  const add=(label,key,delta)=>{
    if(!calc.inputs.some(x=>x[0]===key)) return;
    const base=Number(vals[key]); if(!Number.isFinite(base)) return;
    let next;
    if(inputMeta[key]?.kind==='rate') next=Math.max(0,base+delta);
    else if(inputMeta[key]?.kind==='time') next=Math.max(1,Math.round(base+delta));
    else next=Math.max(0,base*(1+delta));
    const candidate={...vals,[key]:next};
    if(!validCandidate(calc,candidate)) return;
    const rr=safeCalc(calc,candidate); if(!rr) return;
    const current=siValue(calc,result), stressed=siValue(calc,rr);
    if(!Number.isFinite(current)||!Number.isFinite(stressed)) return;
    tests.push({label,key,delta,next,result:rr,impact:pctChange(current,stressed),better:siBetter(calc,result,rr)});
  };
  const p=profile.drivers;
  for(const key of p){
    if(['rate','apy','step','match','increment','tax','state'].includes(key)){add('Rate shock −2pp',key,-2);add('Rate shock +2pp',key,2);}
    else if(['years','months'].includes(key)){add('Shorter horizon',key,-Math.max(1,Math.round((Number(vals[key])||1)*.15)));add('Longer horizon',key,Math.max(1,Math.round((Number(vals[key])||1)*.15)));}
    else {add('Downside −20%',key,-.2);add('Upside +20%',key,.2);}
  }
  const downside=tests.filter(t=>!t.better).sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact));
  const upside=tests.filter(t=>t.better).sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact));
  const worst=downside[0]||null;
  const avgDown=downside.length?downside.reduce((a,x)=>a+Math.abs(x.impact),0)/downside.length:0;
  const robustness=Math.max(0,Math.min(100,100-avgDown*.65-(worst?Math.max(0,Math.abs(worst.impact)-20)*.35:0)));
  return {tests,downside,upside,worst,robustness};
}
function siActionPlan(calc, vals, result, intelligence, stress){
  const actions=[];
  const top=intelligence.top;
  if(top){
    actions.push({priority:'01',title:`Watch ${inputMeta[top.key]?.label||top.key}`,text:`This is the highest-sensitivity lever SI found. Small changes here can materially move the modeled outcome.`,type:'monitor'});
  }
  if(stress.worst){
    actions.push({priority:'02',title:`Stress-test ${inputMeta[stress.worst.key]?.label||stress.worst.key}`,text:`The modeled downside case changes the objective by ${Math.abs(stress.worst.impact).toFixed(1)}%. Check whether your real-world budget can absorb that change.`,type:'risk'});
  }
  if(intelligence.plan){
    actions.push({priority:'03',title:'Evaluate the combined path',text:`SI's strongest tested combination is ${intelligence.plan.label.toLowerCase()}. Compare the modeled gain against the effort required before acting.`,type:'decision'});
  }
  const c=constraintFor(calc);
  if(Object.keys(c.bounds||{}).length){
    actions.push({priority:'04',title:'Stay inside the feasible zone',text:'SI rejects mathematically invalid scenario states before ranking them. Your constraints remain part of the decision, not an afterthought.',type:'constraint'});
  }
  return actions.slice(0,4);
}
function SIAdvancedConsole({calc,vals,result,intelligence,currency}){
  const stress=useMemo(()=>siStressModel(calc,vals,result),[calc,vals,result]);
  const actions=useMemo(()=>siActionPlan(calc,vals,result,intelligence,stress),[calc,vals,result,intelligence,stress]);
  const f=n=>money(n,currency,currency==='INR');
  return <section className="si-advanced">
    <div className="si-plan-head"><div><span className="eyebrow">SI FINANCIAL INTELLIGENCE CONSOLE</span><h2>SI challenges the plan before you trust it.</h2><p>This layer does not just search for an attractive outcome. It stress-tests the current state, identifies fragility, and turns the strongest signals into an action sequence.</p></div><div className="si-badge"><BrainCircuit size={17}/> SI CORE</div></div>
    <div className="si-console-grid">
      <div className="panel si-robustness"><span className="eyebrow">ROBUSTNESS INDEX</span><div className="robust-score"><strong>{Math.round(stress.robustness)}</strong><span>/ 100</span></div><div className="robust-bar"><i style={{width:`${stress.robustness}%`}}/></div><b>{stress.robustness>=75?'Resilient modeled state':stress.robustness>=50?'Moderate sensitivity':'High sensitivity'}</b><p>Based on the size of modeled changes under SI stress tests. This is a scenario indicator, not a probability of success.</p></div>
      <div className="panel si-stress"><div className="console-title"><div><span className="eyebrow">ADVERSARIAL STRESS TEST</span><h3>What could break the plan?</h3></div><span>{stress.tests.length} tests</span></div><div className="stress-list">{stress.tests.sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact)).slice(0,5).map((t,i)=><div className={`stress-row ${t.better?'up':'down'}`} key={`${t.key}-${t.delta}-${i}`}><div><b>{t.label}</b><small>{inputMeta[t.key]?.label||t.key}</small></div><strong>{t.impact>=0?'+':'−'}{Math.abs(t.impact).toFixed(1)}%</strong></div>)}</div></div>
    </div>
    <div className="si-action-grid"><div className="panel"><span className="eyebrow">SI ACTION SEQUENCE</span><h3>What to do with the insight</h3><div className="action-list">{actions.map(a=><div className="action-row" key={a.priority}><span>{a.priority}</span><div><b>{a.title}</b><p>{a.text}</p></div></div>)}</div></div><div className="panel si-frontier"><span className="eyebrow">DECISION FRONTIER</span><h3>Best upside vs. worst downside</h3><div className="frontier-pair"><div><small>Strongest tested upside</small><b>{stress.upside[0]?`+${Math.abs(stress.upside[0].impact).toFixed(1)}%`:'—'}</b><span>{stress.upside[0]?.label||'No improving stress case'}</span></div><div><small>Largest tested downside</small><b>{stress.downside[0]?`−${Math.abs(stress.downside[0].impact).toFixed(1)}%`:'—'}</b><span>{stress.downside[0]?.label||'No downside detected'}</span></div></div><p>SI uses this frontier to distinguish a plan that merely looks good from one that remains comparatively stable when assumptions move.</p></div></div>
    <div className="panel si-facts"><span className="eyebrow">SI TRANSPARENCY</span><div className="fact-grid"><div><b>Current modeled output</b><strong>{formatScenario(calc,result,currency)}</strong></div><div><b>Objective</b><strong>{siProfile(calc).objective}</strong></div><div><b>Constraint model</b><strong>{Object.keys(constraintFor(calc).bounds||{}).length} bounded variables</strong></div><div><b>Decision search</b><strong>{intelligence.pairedScenarios.length+intelligence.allScenarios.length} local scenarios</strong></div></div><small>SI is a decision-support engine. It models the assumptions you provide; it does not know your complete financial situation and does not guarantee future returns, rates, taxes, or outcomes.</small></div>
  </section>
}

function SIMemoryVault({calc,vals,result,currency,setVals}){
  const storageKey=`fcsi:vault:${calc.slug}`;
  const [plans,setPlans]=useState([]);
  const [name,setName]=useState('My plan');
  const [compare,setCompare]=useState([]);
  const [notice,setNotice]=useState('');
  useEffect(()=>{try{setPlans(JSON.parse(localStorage.getItem(storageKey)||'[]'))}catch{setPlans([])}},[storageKey]);
  const persist=(next)=>{setPlans(next);try{localStorage.setItem(storageKey,JSON.stringify(next))}catch{setNotice('Browser storage is unavailable. Your current calculation still works.')}};
  const snapshot=()=>({id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name:name.trim()||'Untitled plan',savedAt:new Date().toISOString(),vals:{...vals},currency,result:{...result},output:siValue(calc,result)});
  const save=()=>{const item=snapshot();persist([item,...plans].slice(0,8));setName('My plan');setNotice('Saved privately in this browser.')};
  const remove=id=>persist(plans.filter(x=>x.id!==id));
  const load=p=>{setVals({...p.vals});setNotice(`Loaded ${p.name}.`)};
  const toggleCompare=p=>setCompare(c=>c.includes(p.id)?c.filter(x=>x!==p.id):c.length<3?[...c,p.id]:c);
  const exportVault=()=>{const blob=new Blob([JSON.stringify({version:1,calculator:calc.slug,plans},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`financecalculator-si-${calc.slug}-vault.json`;a.click();URL.revokeObjectURL(a.href)};
  const importVault=e=>{const file=e.target.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);const incoming=Array.isArray(x.plans)?x.plans:[];persist([...incoming,...plans].slice(0,8));setNotice('Scenario vault imported locally.')}catch{setNotice('Could not import that vault file.')}};r.readAsText(file)};
  const share=()=>{try{const payload=btoa(unescape(encodeURIComponent(JSON.stringify({calc:calc.slug,vals,currency}))));const url=`${location.origin}${location.pathname}?si_state=${payload}`;navigator.clipboard?.writeText(url);setNotice('Private share link copied. Anyone with the link can see the encoded inputs.')}catch{setNotice('Could not create a share link.')}};
  useEffect(()=>{const q=new URLSearchParams(location.search).get('si_state');if(!q)return;try{const x=JSON.parse(decodeURIComponent(escape(atob(q))));if(x.calc===calc.slug&&x.vals){setVals(v=>({...v,...x.vals}));setNotice('Shared SI scenario loaded from the URL.')}}catch{}},[calc.slug,setVals]);
  const selected=plans.filter(p=>compare.includes(p.id));
  return <section className="si-vault">
    <div className="si-plan-head"><div><span className="eyebrow">SI LOCAL MEMORY</span><h2>Save decisions. Compare futures.</h2><p>Your browser can remember scenarios without a backend. SI can store named financial states locally, reload them later, and compare up to three paths.</p></div><div className="si-badge"><ShieldCheck size={17}/> LOCAL ONLY</div></div>
    <div className="vault-actions"><div className="vault-save"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Scenario name"/><button onClick={save}><Save size={15}/> Save scenario</button></div><button className="vault-secondary" onClick={share}><Link2 size={15}/> Share state</button><button className="vault-secondary" onClick={exportVault}><Download size={15}/> Export</button><label className="vault-secondary"><Upload size={15}/> Import<input type="file" accept="application/json" onChange={importVault} hidden/></label></div>
    {notice&&<div className="vault-notice">{notice}</div>}
    {plans.length===0?<div className="vault-empty"><BrainCircuit size={18}/><div><b>No saved scenarios yet.</b><span>Save your current inputs as “Safe plan”, “Aggressive plan”, “Target plan”, etc. They stay on this device.</span></div></div>:<div className="vault-list">{plans.map(p=><div className="vault-row" key={p.id}><label className="compare-check"><input type="checkbox" checked={compare.includes(p.id)} onChange={()=>toggleCompare(p)}/><ArrowLeftRight size={15}/></label><div className="vault-main"><b>{p.name}</b><small>{new Date(p.savedAt).toLocaleString()} · {formatScenario(calc,p.result,p.currency||currency)}</small></div><button title="Load scenario" onClick={()=>load(p)}>Load</button><button className="icon-danger" title="Delete" onClick={()=>remove(p.id)}><Trash2 size={15}/></button></div>)}</div>}
    {selected.length>=2&&<div className="vault-compare"><div className="console-title"><div><span className="eyebrow">SI SCENARIO COMPARISON</span><h3>Which saved future is stronger?</h3></div><span>{selected.length} paths</span></div><div className="compare-grid">{selected.map(p=><div className="compare-card" key={p.id}><span>{p.name}</span><strong>{formatScenario(calc,p.result,p.currency||currency)}</strong><small>{siProfile(calc).objective}</small></div>)}</div><p>Comparison is based on the calculator's modeled objective. SI does not label a plan “safe” or “guaranteed”; assumptions remain the user's responsibility.</p></div>}
    <small className="vault-privacy">Local browser storage is not an account or cloud backup. Clearing site data removes saved scenarios. Share links encode inputs into the URL; don't use them for information you don't want exposed.</small>
  </section>
}


// SI Financial Timeline — browser-only trajectory view.
function SITimeline({calc,vals,result,currency}){
  const years=calc.slug==='sukanya-samriddhi-yojana-calculator'?21:(Number(vals.years)||Number(vals.months&&vals.months/12)||20);
  const horizon=Math.max(1,Math.min(40,Math.round(years)));
  const points=useMemo(()=>{
    const out=[];
    const timelineSlugs=new Set(['compound-interest-calculator','sip-calculator','401k-retirement-calculator','ppf-calculator','fd-calculator','cd-calculator','sukanya-samriddhi-yojana-calculator','swp-calculator','mortgage-calculator','auto-loan-calculator','student-loan-payoff-calculator']);
    if(!timelineSlugs.has(calc.slug)) return [{t:0,value:siValue(calc,result),label:'Current model'},{t:1,value:siValue(calc,result),label:'Current model'}];
    for(let y=0;y<=horizon;y+=Math.max(1,Math.ceil(horizon/8))){
      let v={...vals};
      if(calc.slug==='sukanya-samriddhi-yojana-calculator'){ v.depositYears=Math.min(15,Math.max(1,Math.floor(y))); }
      if(Object.prototype.hasOwnProperty.call(v,'years')) v.years=Math.max(0.25,y||0.25);
      if(Object.prototype.hasOwnProperty.call(v,'months')) v.months=Math.max(1,Math.round(y*12)||1);
      const r=safeCalc(calc,v); const value=siValue(calc,r);
      if(Number.isFinite(value)) out.push({t:y,value,label:y===0?'Today':`Year ${y}`});
    }
    if(out.at(-1)?.t!==horizon){let v={...vals};if(calc.slug==='sukanya-samriddhi-yojana-calculator')v.depositYears=Math.min(15,Math.max(1,Math.floor(horizon)));if('years' in v)v.years=horizon;if('months' in v)v.months=horizon*12;const r=safeCalc(calc,v);const value=siValue(calc,r);if(Number.isFinite(value))out.push({t:horizon,value,label:`Year ${horizon}`})}
    return out;
  },[calc,vals,result,horizon]);
  const max=Math.max(...points.map(x=>Math.abs(x.value)),1);
  return <section className="si-feature si-timeline"><div className="feature-head"><div><span className="eyebrow">SI FINANCIAL TIMELINE</span><h2>See the decision evolve over time.</h2><p>SI recalculates the model at different points in the horizon. This is a modeled trajectory, not a forecast or guarantee.</p></div><div className="si-badge"><TrendingUp size={17}/> TIME MODEL</div></div><div className="timeline-chart">{points.map((p,i)=><div className="timeline-point" key={p.label}><div className="timeline-bar" style={{height:`${Math.max(7,Math.min(100,Math.abs(p.value)/max*100))}%`}}/><span>{p.label}</span><b>{money(p.value,currency,currency==='INR')}</b></div>)}</div><div className="timeline-insight"><BrainCircuit size={16}/><span><b>SI observation:</b> {points.length>1&&points.at(-1).value>points[0].value?'The modeled outcome grows over the selected horizon.':'The modeled outcome is relatively flat or declining under this model.'} SI keeps the assumptions visible so you can challenge them.</span></div></section>
}

function SIWhatIfPlayground({calc,vals,result,currency,setVals}){
  const keys=calc.inputs.map(x=>x[0]).filter(k=>!lockedSIKeys.has(k));
  const [key,setKey]=useState(keys[0]||calc.inputs[0]?.[0]);
  const [factor,setFactor]=useState(100);
  const selected=calc.inputs.find(x=>x[0]===key)||calc.inputs[0];
  const base=Number(vals[key])||0;
  const preview=useMemo(()=>{const next={...vals,[key]:base*factor/100};return {vals:next,result:safeCalc(calc,next)}},[calc,vals,key,base,factor]);
  const delta=useMemo(()=>{const a=siValue(calc,result),b=siValue(calc,preview.result);return a?((b-a)/Math.abs(a))*100:0},[calc,result,preview.result]);
  const apply=()=>setVals(preview.vals);
  return <section className="si-feature"><div className="feature-head"><div><span className="eyebrow">SI WHAT-IF PLAYGROUND</span><h2>Move one lever. Watch the model react.</h2><p>Drag a variable before committing it. SI recalculates the complete calculator locally, so the preview changes with the actual inputs.</p></div><div className="si-badge"><Sparkles size={17}/> LIVE WHAT-IF</div></div><div className="whatif-grid"><div className="whatif-controls"><label>Variable<select value={key} onChange={e=>{setKey(e.target.value);setFactor(100)}}>{keys.map(k=><option key={k} value={k}>{inputMeta[k]?.label||k}</option>)}</select></label><label>Change <b>{factor}%</b><input type="range" min="50" max="200" step="1" value={factor} onChange={e=>setFactor(Number(e.target.value))}/><div className="range-meta"><span>−50%</span><span>Current</span><span>+100%</span></div></label><button onClick={apply}>Apply this scenario</button></div><div className="whatif-result"><span>SI PREVIEW</span><small>{inputMeta[key]?.label||key}: {base.toLocaleString()} → {(base*factor/100).toLocaleString()}</small><strong>{formatScenario(calc,preview.result,currency)}</strong><b className={delta>=0?'positive':'negative'}>{delta>=0?'+':''}{delta.toFixed(1)}% modeled change</b><p>Preview only. Your actual calculator inputs change when you press Apply.</p></div></div></section>
}

function SITargetCountdown({calc,vals,result,currency}){
  const current=siValue(calc,result); const profile=siProfile(calc); const [target,setTarget]=useState(()=>Math.max(1,Math.round(Math.abs(current||1)*(profile.direction==='lower'?0.9:1.1))));
  const gap=Math.abs(target-(current||0));
  const progress=target?Math.max(0,Math.min(100,(profile.direction==='lower'?target/Math.max(current,1):current/target)*100)):0;
  const reached=profile.direction==='lower'?current<=target:current>=target;
  return <section className="si-feature si-target"><div className="feature-head"><div><span className="eyebrow">SI TARGET COUNTDOWN</span><h2>Turn a number into a destination.</h2><p>Set a target for the current calculator's modeled output. SI tracks the gap and tells you whether the current state has reached it.</p></div><div className="si-badge"><TrendingUp size={17}/> TARGET</div></div><div className="target-grid"><div><label>Target modeled output<input type="number" value={target} onChange={e=>setTarget(Math.max(0,Number(e.target.value)||0))}/></label><div className="target-meter"><i style={{width:`${progress}%`}}/></div><div className="target-numbers"><span>Current <b>{money(current,currency,currency==='INR')}</b></span><span>Target <b>{money(target,currency,currency==='INR')}</b></span><span>Gap <b>{money(gap,currency,currency==='INR')}</b></span></div></div><div className={`target-status ${reached?'hit':''}`}><span>{reached?'TARGET REACHED':'TARGET GAP'}</span><strong>{reached?'100%':`${Math.round(progress)}%`}</strong><p>{reached?'The current modeled state is at or beyond your target. SI can now stress-test how robust that achievement is.':`SI sees ${money(gap,currency,currency==='INR')} between the current model and your target.`}</p></div></div></section>
}

function SIDecisionJournal({calc,vals,result,currency}){
  const key=`fcsi:journal:${calc.slug}`; const [entries,setEntries]=useState([]); const [note,setNote]=useState('');
  useEffect(()=>{try{setEntries(JSON.parse(localStorage.getItem(key)||'[]'))}catch{}},[key]);
  const add=()=>{if(!note.trim())return;const e={id:Date.now(),date:new Date().toISOString(),note:note.trim(),output:siValue(calc,result),display:formatScenario(calc,result,currency),vals:{...vals}};const next=[e,...entries].slice(0,20);setEntries(next);localStorage.setItem(key,JSON.stringify(next));setNote('')};
  return <section className="si-feature si-journal"><div className="feature-head"><div><span className="eyebrow">SI DECISION JOURNAL</span><h2>Remember why you made the decision.</h2><p>Write a short note about your assumption, target or decision. It stays locally in this browser.</p></div><div className="si-badge"><Save size={17}/> LOCAL JOURNAL</div></div><div className="journal-compose"><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Example: Increased SIP after salary review; keep within ₹15,000 monthly limit."/><button onClick={add}>Save journal entry</button></div>{entries.length>0&&<div className="journal-list">{entries.slice(0,5).map(e=><article key={e.id}><span>{new Date(e.date).toLocaleDateString()}</span><p>{e.note}</p><b>{e.display||money(e.output,currency,currency==='INR')}</b></article>)}</div>}</section>
}

function twinRegionFor(calc){
  return calc.region==='us'?'us':calc.region==='in'?'in':'global';
}
function twinKey(region){return `fcsi:twin:${region}`}
function readTwin(region){try{return JSON.parse(localStorage.getItem(twinKey(region))||'{}')}catch{return {}}}
function twinCurrency(region){return region==='in'?'INR':'USD'}
function twinLocale(region){return region==='in'?'en-IN':'en-US'}
function TwinProfile({region}){
  const [profileRegion,setProfileRegion]=useState(()=>{try{return localStorage.getItem('fcsi:twin:global-region')||'in'}catch{return 'in'}});
  const activeRegion=region==='global'?profileRegion:region;
  const [t,setT]=useState(()=>readTwin(activeRegion));
  useEffect(()=>{setT(readTwin(activeRegion));},[activeRegion]);
  useEffect(()=>{const sync=()=>setT(readTwin(activeRegion));window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[activeRegion]);
  const update=(k,v)=>{const n={...t,[k]:v};setT(n);try{localStorage.setItem(twinKey(activeRegion),JSON.stringify(n))}catch{}};
  if(region==='global'){
    const choose=e=>{const r=e.target.value;setProfileRegion(r);try{localStorage.setItem('fcsi:twin:global-region',r)}catch{}};
    return <section className="si-feature si-twin"><div className="feature-head"><div><span className="eyebrow">SI FINANCIAL TWIN</span><h2>Choose the financial system SI should model.</h2><p>Universal calculators can use a US or India Twin. Regional calculators automatically use their own local profile.</p></div><div className="si-badge"><ShieldCheck size={17}/> DEVICE ONLY</div></div><div className="region-switch"><button className={profileRegion==='in'?'active':''} onClick={()=>choose({target:{value:'in'}})}>🇮🇳 India</button><button className={profileRegion==='us'?'active':''} onClick={()=>choose({target:{value:'us'}})}>🇺🇸 United States</button></div><TwinFields region={activeRegion} t={t} update={update}/></section>
  }
  return <section className="si-feature si-twin"><div className="feature-head"><div><span className="eyebrow">SI FINANCIAL TWIN · {region==='in'?'INDIA':'UNITED STATES'}</span><h2>Your {region==='in'?'India':'US'} financial context stays separate.</h2><p>SI stores this regional profile only on this device and uses it across matching calculators.</p></div><div className="si-badge"><ShieldCheck size={17}/> DEVICE ONLY</div></div><TwinFields region={region} t={t} update={update}/></section>
}
function TwinFields({region,t,update}){
  const c=twinCurrency(region), ind=region==='in',income=Number(t.income)||0,savings=Number(t.savings)||0,debt=Number(t.debt)||0,capacity=Math.max(0,income-debt); const resilience=clamp((savings/Math.max(income,1))*20+(1-(debt/Math.max(income*12,1)))*80,0,100);
  return <div className="twin-grid"><div className="twin-fields">{[['income',ind?'Monthly income':'Monthly gross income'],['savings',ind?'Liquid savings':'Liquid savings'],['debt',ind?'Monthly debt payments':'Monthly debt payments'],['goal','Primary financial goal']].map(([k,l])=><label key={k}>{l}<input type={k==='goal'?'text':'number'} min="0" value={t[k]||''} onChange={e=>update(k,e.target.value)} placeholder={k==='goal'?(ind?'Retire with ₹1 crore':'Retire with $2 million'):''}/></label>)}</div><div className="twin-readout"><span>SI CONTEXT SIGNAL · {ind?'INDIA':'US'}</span><strong>{Math.round(resilience)}/100</strong><b>{resilience>=75?'Strong modeled cushion':resilience>=50?'Moderate modeled cushion':'Thin modeled cushion'}</b><p>Modeled monthly capacity: <strong>{money(capacity,c,ind)}</strong></p><small>Illustrative context only. SI does not connect to a bank, verify income, or predict investment outcomes.</small></div></div>
}
function SICrossCalculatorIntelligence({calc,vals,setVals,currency}){
  const region=twinRegionFor(calc); const [globalRegion,setGlobalRegion]=useState(()=>{try{return localStorage.getItem('fcsi:twin:global-region')||'in'}catch{return 'in'}}); const activeRegion=region==='global'?globalRegion:region; const [t,setT]=useState(()=>readTwin(activeRegion));
  useEffect(()=>{const sync=()=>{try{setGlobalRegion(localStorage.getItem('fcsi:twin:global-region')||'in')}catch{};setT(readTwin(region==='global'?(localStorage.getItem('fcsi:twin:global-region')||'in'):region))};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[region]);
  useEffect(()=>setT(readTwin(activeRegion)),[activeRegion]);
  const income=Number(t.income)||0,savings=Number(t.savings)||0,debt=Number(t.debt)||0,capacity=Math.max(0,income-debt),ind=activeRegion==='in',c=twinCurrency(activeRegion);
  const currentDti=income?debt/income*100:0, emergencyMonths=income?savings/income:0, profileReady=income>0||savings>0||debt>0||t.goal, cross=[];
  if(income>0) cross.push({title:'DTI context',value:pct(currentDti),text:currentDti<=36?'Stored debt is inside the SI model’s lower-debt reference band.':'Stored debt is elevated in this SI model.',action:calc.slug==='debt-to-income-ratio-calculator'?()=>setVals(v=>({...v,income,debt,housing:0,car:0,cards:0,other:debt})):null});
  if(calc.slug==='mortgage-calculator'&&income>0){const housingCap=Math.max(0,capacity*.28);cross.push({title:'Housing payment envelope',value:money(housingCap,c,ind)+'/mo',text:'A conservative scenario bound based on local income and existing debt. It is not an approval amount.'});}
  if(calc.slug==='sip-calculator'&&income>0){const contributionCap=Math.max(0,Math.min(capacity*.2,capacity));cross.push({title:'SI contribution envelope',value:money(contributionCap,c,ind)+'/mo',text:'A scenario bound based on 20% of modeled monthly capacity; it is not investment advice.',action:()=>setVals(v=>({...v,monthly:Math.min(Number(v.monthly)||0,contributionCap)}))});}
  if(calc.slug==='401k-retirement-calculator'&&income>0){cross.push({title:'Annual cash-flow context',value:money(capacity*12,c,ind),text:'Modeled annual capacity available after stored monthly debt.'});}
  if(calc.slug==='income-tax-calculator'&&income>0)cross.push({title:'Twin income context',value:money(income,c,ind)+'/mo',text:'SI can use your stored monthly income as a context check, but the tax calculator still uses its own annual-income input.'});
  if(savings>0)cross.push({title:'Liquidity runway',value:emergencyMonths.toFixed(1)+' mo',text:'Liquid savings divided by monthly income. This is a resilience signal, not an emergency-fund recommendation.'});
  if(t.goal)cross.push({title:'Twin goal',value:t.goal,text:'The same regional goal is available locally across matching calculators.'});
  return <section className="si-feature si-cross"><div className="feature-head"><div><span className="eyebrow">SI CROSS-CALCULATOR INTELLIGENCE</span><h2>One {ind?'India':'US'} financial model. Every {ind?'India':'US'} calculator.</h2><p>{profileReady?`Your local ${ind?'India':'US'} Financial Twin is now context for this calculator.`:`Create your ${ind?'India':'US'} Financial Twin once and SI can carry the same context across ${ind?'India':'US'} tools.`}</p></div><div className="si-badge"><BrainCircuit size={17}/> {ind?'INDIA':'US'} CONTEXT</div></div>{profileReady?<div className="cross-grid">{cross.map((x,i)=><div className="cross-card" key={i}><span>{x.title}</span><strong>{x.value}</strong><p>{x.text}</p>{x.action&&<button onClick={x.action}>Use in this calculator</button>}</div>)}</div>:<div className="cross-empty"><ShieldCheck size={18}/><div><b>No {ind?'India':'US'} Financial Twin context yet.</b><p>Enter your regional income, liquid savings, monthly debt and goal above. SI keeps US and India profiles separate.</p></div></div>}<small className="vault-privacy">Stored only in this browser. No bank connection, server database, cloud financial profile or cross-country mixing.</small></section>
}

function CalcPage({calc}){
  useEffect(()=>{document.title=`${calc.title} | FinanceCalculator.si`;const d=document.querySelector('meta[name=description]');if(d)d.setAttribute('content',calc.desc+' Calculate, simulate scenarios and understand the decision with SI Super Intelligence.');let link=document.querySelector('link[rel=canonical]');if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link)}link.href='https://financecalculator.si'+location.pathname;let script=document.getElementById('calc-schema');if(!script){script=document.createElement('script');script.id='calc-schema';script.type='application/ld+json';document.head.appendChild(script)}script.textContent=JSON.stringify({['@context']:'https://schema.org',['@type']:'WebApplication',name:calc.title+' — SI Super Intelligence',applicationCategory:'FinanceApplication',operatingSystem:'Web',url:'https://financecalculator.si'+location.pathname,description:calc.desc});},[calc]);
  const [currency,setCurrency]=useState(calc.region==='in'?'INR':'USD');
  const [vals,setVals]=useState(Object.fromEntries(calc.inputs.map(([k,,v])=>[k,v])));
  const [focus,setFocus]=useState(null);
  const result=useMemo(()=>calc.calc(vals),[vals,calc]);
  const intelligence=useMemo(()=>siEngine(calc,vals,result),[calc,vals,result]);
  const validation=constraintMessage(calc,vals);
  const update=(k,v)=>setVals({...vals,[k]:Number(v)});
  const displayPrimary=calc.slug==='credit-card-payoff-calculator'?(Number.isFinite(result.primary)?`${Math.ceil(result.primary)} months`:'Payment too low'):calc.slug==='debt-to-income-ratio-calculator'?pct(result.primary):money(result.primary,currency,currency==='INR');
  const focused=focus?intelligence.scenarios.find(s=>`${s.key}-${s.sign}`===focus):null;
  return <><Header/><main className="calc-page">
    <div className="breadcrumbs"><Link to="/">Home</Link><span>/</span>{calc.region!=='global'&&<><Link to={'/'+calc.region}>{calc.region.toUpperCase()}</Link><span>/</span></>}{calc.title}</div>
    <div className="calc-head"><div><span className="pill"><BrainCircuit size={14}/> SI Super Intelligence · {calc.cat}</span><h1>{calc.title}</h1><p>{calc.desc} SI doesn't stop at the number — it tests the assumptions and shows which decisions can change it.</p></div></div>
    <CurrencyBar currency={currency} setCurrency={setCurrency} region={calc.region}/>
    <div className="calculator-layout">
      <section className="panel inputs"><div className="panel-title"><div><span className="eyebrow">TELL SI YOUR ASSUMPTIONS</span><h2>Inputs</h2></div><span className="privacy">Private · browser only</span></div>{calc.inputs.map(([k,label,defaultVal])=><label className="field" key={k}><span>{label}</span><div><input type="number" value={vals[k]} onChange={e=>update(k,e.target.value)}/>{['rate','apy','step','match','tax','state'].includes(k)?<b>%</b>:null}</div></label>)}<div className="assumption si-prompt"><Sparkles size={16}/><span><b>SI is watching the levers.</b> Change an input and the Decision Engine re-evaluates the outcome, trade-offs and scenarios instantly.</span></div>{validation&&<div className="constraint-warning"><X size={16}/><div><b>SI constraint check</b><span>{validation}</span></div></div>}</section>
      <section className="result-stack"><div className="panel result"><div className="result-topline"><span className="eyebrow">SI COMPUTED OUTCOME</span><span className="live-dot">LIVE REASONING</span></div><div className="result-number">{displayPrimary}</div><p>{calc.insight(result)}</p><div className="result-grid">{renderStats(calc,result,currency)}</div></div>
      <div className="panel intelligence"><div className="intel-head"><BrainCircuit size={21}/><div><b>SI Decision Engine</b><span>Interpret · simulate · challenge · recommend</span></div></div><h3>{intelligence.explanation}</h3><div className="signal-list">{intelligence.signals.map((s,i)=><div className="signal" key={i}><span>{String(i+1).padStart(2,'0')}</span><p>{s}</p></div>)}</div></div></section>
    </div>
    <section className="si-lab"><div className="si-lab-head"><div><span className="eyebrow">SI DECISION LAB</span><h2>What happens if you change the decision?</h2><p>Every card is recalculated from your <b>current inputs</b>. Change ₹1,000 to ₹10,000, a rate, a term or any other field and SI rebuilds the scenarios from scratch.</p></div><div className="si-badge"><BrainCircuit size={17}/> SI ENGINE</div></div>{intelligence.top&&<div className="si-sensitivity"><div><span>HIGHEST SENSITIVITY</span><b>{inputMeta[intelligence.top.key]?.label||intelligence.top.key}</b></div><strong>{scenarioCopy(intelligence.top)}</strong><small>based on a one-variable change from your current assumptions</small></div>}<div className="scenario-grid">{intelligence.scenarios.map((s,i)=>{const val=formatScenario(calc,s.result,currency);return <button className={`scenario ${s.better?'better':''}`} key={`${s.key}-${s.sign}-${i}`} onClick={()=>setFocus(`${s.key}-${s.sign}`)}><span>{s.better?'SI FAVORS':'SCENARIO'}</span><b>{s.label}</b><strong>{val}</strong><small>{scenarioCopy(s)} · {s.better?'toward the modeled objective':'away from the modeled objective'}</small></button>})}</div>{focused&&<div className="counterfactual"><div><span className="eyebrow">COUNTERFACTUAL · LIVE FROM YOUR INPUTS</span><h3>{focused.label}</h3><p>SI changed only <b>{inputMeta[focused.key]?.label||focused.key}</b> and recomputed the full calculator. The modeled outcome is <b>{formatScenario(calc,focused.result,currency)}</b>, with a {focused.impact>=0?'+':'−'}{Math.abs(focused.impact).toFixed(1)}% change from the current result.</p></div><button onClick={()=>setFocus(null)}><X size={17}/></button></div>}</section>
    <section className="si-plan">
      <div className="si-plan-head"><div><span className="eyebrow">SI DECISION SYNTHESIS</span><h2>What SI would test next</h2><p>SI does not stop at one-variable sensitivity. It combines the strongest levers and recalculates the whole model from your current inputs.</p></div><div className="si-badge"><BrainCircuit size={17}/> LIVE MODEL</div></div>
      {intelligence.plan ? <div className="plan-grid">
        <div className="plan-main"><span className="plan-kicker">BEST TESTED COMBINATION</span><h3>{intelligence.plan.label}</h3><p>Starting from your current assumptions, this combined scenario moves the modeled objective <b>{intelligence.plan.impact>=0?'+':'−'}{Math.abs(intelligence.plan.impact).toFixed(1)}%</b>.</p><div className="plan-result">{formatScenario(calc,intelligence.plan.result,currency)}</div><small>Counterfactual result · recalculated locally from the current inputs</small></div>
        <div className="plan-list"><div><span>01</span><b>Current state</b><strong>{formatScenario(calc,result,currency)}</strong></div><div><span>02</span><b>Combined test</b><strong>{formatScenario(calc,intelligence.plan.result,currency)}</strong></div><div><span>03</span><b>Modeled change</b><strong>{intelligence.plan.impact>=0?'+':'−'}{Math.abs(intelligence.plan.impact).toFixed(1)}%</strong></div></div>
      </div> : <div className="neutral-plan"><BrainCircuit size={18}/><div><b>SI stays neutral for this tool.</b><p>There is no universally better direction. SI focuses on showing how the assumptions change the outcome rather than telling you to maximize or minimize it.</p></div></div>}
      {intelligence.pairedScenarios.length>0 && <div className="pair-strip"><span className="eyebrow">MULTI-LEVER TESTS</span><div className="pair-grid">{[...intelligence.pairedScenarios].sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact)).slice(0,3).map((s,i)=><div className={`pair-card ${s.better?'better':''}`} key={i}><span>{s.better?'SI FAVORS':'COMBINATION'}</span><b>{s.label}</b><strong>{formatScenario(calc,s.result,currency)}</strong><small>{s.impact>=0?'+':'−'}{Math.abs(s.impact).toFixed(1)}% modeled change</small></div>)}</div></div>}
    </section>
    <SIGraphLab calc={calc} vals={vals} currency={currency}/>
    <SIAdvancedConsole calc={calc} vals={vals} result={result} intelligence={intelligence} currency={currency}/><SITimeline calc={calc} vals={vals} result={result} currency={currency}/><SIWhatIfPlayground calc={calc} vals={vals} result={result} currency={currency} setVals={setVals}/><SITargetCountdown calc={calc} vals={vals} result={result} currency={currency}/><SIDecisionJournal calc={calc} vals={vals} result={result} currency={currency}/><TwinProfile region={calc.region}/><SICrossCalculatorIntelligence calc={calc} vals={vals} setVals={setVals} currency={currency}/><SIMemoryVault calc={calc} vals={vals} result={result} currency={currency} setVals={setVals}/>
    <section className="si-explain"><div className="explain-card"><span className="eyebrow">WHY THIS IS SI</span><h2>From calculation to financial reasoning.</h2><div className="reason-steps"><div><b>01 · CALCULATE</b><p>Transparent formulas produce the baseline result.</p></div><div><b>02 · INTERROGATE</b><p>SI identifies the assumptions and signals that matter.</p></div><div><b>03 · SIMULATE</b><p>Counterfactual scenarios show what changes if you act differently.</p></div><div><b>04 · DECIDE</b><p>The engine surfaces the direction of the better modeled choice — without pretending certainty.</p></div></div></div></section>
    <section className="seo-copy"><h2>How the {calc.title} works</h2><p>{calc.desc} Enter realistic assumptions above and the calculation updates instantly. FinanceCalculator.si combines transparent financial mathematics with a local SI decision layer that evaluates trade-offs and alternative scenarios.</p><h3>What SI analyzes</h3><ul><li>The baseline financial result and its key drivers.</li><li>Counterfactual scenarios that change one assumption at a time.</li><li>Signals, risks and trade-offs relevant to this calculator type.</li><li>Decision direction rather than an unexplained “AI answer.”</li></ul></section>
  </main><Footer/></>}
function renderStats(calc,r,c){const f=(n)=>money(n,c,c==='INR');const maps={compound:[['Total invested',f(r.invested)],['Growth',f(r.interest)]],mortgage:[['Principal',f(r.principal)],['Loan interest',f(r.interest)]],auto:[['Financed',f(r.financed)],['Total interest',f(r.interest)]],credit:[['Interest',Number.isFinite(r.interest)?f(r.interest):'—']],student:[['Base payment',f(r.base)],['Interest',f(r.interest)]],dti:[['Monthly debt',f(r.debt)]],cd:[['Interest',f(r.interest)]],retirement:[['Contributions + match',f(r.contrib)]],paycheck:[['Annual take-home',f(r.annual)],['Federal tax',f(r.federal)],['FICA',f(r.fica)]],heloc:[['Available equity',f(r.available)],['Home equity',f(r.equity)]],incomeTax:[['New regime',f(r.newTax)],['Old regime',f(r.oldTax)],['Difference',f(r.saving)]],salary:[['Annual estimate',f(r.annual)],['Employee EPF',f(r.epf)]],epf:[['Gratuity',f(r.gratuity)]],ssy:[['Invested',f(r.invested)],['Interest',f(r.interest)]],sip:[['Invested',f(r.invested)],['Growth',f(r.gain)]],emi:[['Total repayment',f(r.total)],['Interest',f(r.interest)]],ppf:[['Invested',f(r.invested)],['Interest',f(r.interest)]],fd:[['Interest',f(r.interest)]],inflation:[['Purchasing-power equivalent',f(r.primary)],['Increase needed',f(r.lost)]],gst:[['GST',f(r.gst)],['Base',f(r.base)]],swp:[['Months modeled',String(r.months)]]};return (maps[calc.slug]||maps.inflation||[]).map(([k,v])=><div className="stat" key={k}><span>{k}</span><b>{v}</b></div>)}
function formatScenario(calc,r,c){const f=(n)=>money(n,c,c==='INR');if(calc.slug==='credit-card-payoff-calculator'||calc.slug==='student-loan-payoff-calculator')return Number.isFinite(r.months)?`${Math.ceil(r.months)} mo`:'—';if(calc.slug==='debt-to-income-ratio-calculator')return pct(r.primary);if(calc.slug==='income-tax-calculator')return f(r.primary);return f(r.primary)}
function scenarioCopy(s){const impact=Math.abs(s.impact).toFixed(1);return `${s.impact>=0?'+':'−'}${impact}% modeled outcome`;}

function App(){
  const loc=useLocation();
  const pathname=(loc.pathname||'/').replace(/\/+$/,'')||'/';
  if(pathname==='/') return <Home/>;
  if(pathname==='/calculators') return <Listing region="global"/>;
  if(pathname==='/us') return <Listing region="us"/>;
  if(pathname==='/in') return <Listing region="in"/>;
  let slug=pathname.replace(/^\//,'');
  if(slug.startsWith('us/')) slug=slug.slice(3);
  else if(slug.startsWith('in/')) slug=slug.slice(3);
  const calc=getCalc(slug);
  if(calc) return <CalcPage calc={calc}/>;
  return <NotFound path={pathname}/>;
}
function NotFound({path}){return <><Header/><main className="listing"><div className="list-hero"><span className="pill"><CircleHelp size={14}/> Page not found</span><h1>That SI route does not exist.</h1><p>{path} is not a registered FinanceCalculator.si route.</p><Link className="primary" to="/calculators">Browse calculators <ArrowRight size={17}/></Link></div></main><Footer/></>}
class AppErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={error:null}; }
  static getDerivedStateFromError(error){ return {error}; }
  componentDidCatch(error, info){ console.error('FinanceCalculator.si runtime error', error, info); }
  render(){
    if(this.state.error){
      return <div style={{minHeight:'100vh',padding:'40px',fontFamily:'system-ui,sans-serif',background:'#f7f9fc',color:'#101828'}}>
        <div style={{maxWidth:760,margin:'40px auto',padding:28,background:'#fff',border:'1px solid #e5e9ef',borderRadius:16}}>
          <div style={{fontSize:12,fontWeight:800,color:'#2257e6',letterSpacing:1}}>FINANCECALCULATOR.SI</div>
          <h1 style={{margin:'12px 0'}}>The SI interface hit a runtime error.</h1>
          <p style={{color:'#667085'}}>The app loaded, but one browser-side module failed. Refresh after updating the project, or use the error below to identify the exact module.</p>
          <pre style={{whiteSpace:'pre-wrap',background:'#f7f9fc',padding:16,borderRadius:10,fontSize:12,overflow:'auto'}}>{String(this.state.error?.stack||this.state.error)}</pre>
        </div>
      </div>
    }
    return this.props.children
  }
}

const root=document.getElementById('root');
if(!root) throw new Error('FinanceCalculator.si: #root element is missing from index.html');

window.addEventListener('error', event => {
  console.error('FinanceCalculator.si window error', event.error || event.message);
});
window.addEventListener('unhandledrejection', event => {
  console.error('FinanceCalculator.si unhandled rejection', event.reason);
});

createRoot(root).render(<AppErrorBoundary><BrowserRouter><App/></BrowserRouter></AppErrorBoundary>);
setTimeout(()=>{ window.__FC_APP_MOUNTED=true; },0);
