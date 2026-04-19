import { useState, useEffect, useMemo, useCallback } from "react";
import {
  fetchBookings, addBooking, deleteBooking, updateBooking,
  fetchHours, saveHoursDB,
  fetchWaitlist, addWaitlist,
  fetchMaintenance, toggleMaintenanceDB
} from './db.js';


// ── Translations ───────────────────────────────────────────────────────────────
const LANGS = {
  he: {
    dir:"rtl",
    appTitle:"קאנטרי קהלתי נווה שרת", appSub:"מרכז סקווש — 4 מגרשים",
    adminLogin:"כניסת מנהל", adminBadge:"✓ מנהל מחובר", logout:"יציאה",
    tabBook:"📅 הזמנות", tabMine:"🎾 ההזמנות שלי", tabAll:"📋 דוח",
    tabWeek:"🗓 תצוגת שבוע", tabStats:"📊 סטטיסטיקות", tabSettings:"⚙️ הגדרות",
    today:"היום", openHours:"שעות פתיחה",
    free:"פנוי", booked:"מוזמן", fixed:"שריון קבוע", maint:"תחזוקה",
    court:"מגרש", courts12:"מגרשים 1 ו-2 — פתיחה בשעת הפתיחה",
    courts34:"מגרשים 3 ו-4 — פתיחה 30 דקות אחרי",
    cancelInfo:"ביטול עד 3 שעות לפני", maxCourts:"מקסימום 2 מגרשים ליום",
    days:["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"],
    membership:["מנוי סקווש","מנוי קאנטרי","אורח"],
    fullName:"שם מלא", phone:"טלפון", membType:"סוג מנוי",
    fixedBook:"שריון קבוע", weeksRepeat:"מספר שבועות",
    confirmBook:"✓ אישור הזמנה", cancel:"ביטול", save:"שמור",
    waSend:"שלח אישור בוואטסאפ", waitlistJoin:"הצטרף לרשימת המתנה",
    waitlistCount:"ממתינים",
    myBookingsTitle:"ההזמנות שלי", enterPhone:"הכנס מספר טלפון",
    search:"חיפוש", exportCSV:"ייצוא לאקסל (CSV)",
    setMaint:"🔧 סמן תחזוקה", clearMaint:"✓ בטל תחזוקה",
    editBook:"✏️ ערוך הזמנה", cancelBook:"ביטול הזמנה",
    closeModal:"סגור", password:"סיסמה", enter:"כניסה",
    wrongPwd:"❌ סיסמה שגויה", pwdHint:"ברירת מחדל: squash2024",
    codeLabel:"קוד אישי", codeMsg:"שמור את הקוד — הוא מאפשר לראות את ההזמנות שלך",
    closedMsg:"המועדון סגור", noBookings:"אין הזמנות",
    noPhone:"לא נמצאו הזמנות למספר זה",
    occup:"תפוסה", peak:"שעת שיא", totalMonth:"הזמנות החודש",
    byMembership:"לפי סוג מנוי", byCourt:"לפי מגרש", byHour:"שעות פופולריות",
    bookPaySoon:"💳 תשלום דרך האפליקציה — בקרוב",
    maintNote:"כמנהל: לחץ על שעה פנויה להזמנה או לסימון תחזוקה",
    typeLabel:"סוג הזמנה", customerType:"הזמנת לקוח",
    noPhone2:"לא נמצאו הזמנות",
    week:"שבוע",
  },
  en: {
    dir:"ltr",
    appTitle:"Neve Sharet Country Club", appSub:"Squash Center — 4 Courts",
    adminLogin:"Admin Login", adminBadge:"✓ Admin Connected", logout:"Logout",
    tabBook:"📅 Bookings", tabMine:"🎾 My Bookings", tabAll:"📋 Report",
    tabWeek:"🗓 Week View", tabStats:"📊 Statistics", tabSettings:"⚙️ Settings",
    today:"Today", openHours:"Opening Hours",
    free:"Free", booked:"Booked", fixed:"Fixed Reservation", maint:"Maintenance",
    court:"Court", courts12:"Courts 1 & 2 — Start at opening time",
    courts34:"Courts 3 & 4 — Start 30 min after opening",
    cancelInfo:"Cancel up to 3 hours before", maxCourts:"Max 2 courts per day",
    days:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    membership:["Squash Member","Country Member","Guest"],
    fullName:"Full Name", phone:"Phone", membType:"Membership Type",
    fixedBook:"Fixed Reservation", weeksRepeat:"Number of Weeks",
    confirmBook:"✓ Confirm Booking", cancel:"Cancel", save:"Save",
    waSend:"Send WhatsApp Confirmation", waitlistJoin:"Join Waitlist",
    waitlistCount:"Waiting",
    myBookingsTitle:"My Bookings", enterPhone:"Enter phone number",
    search:"Search", exportCSV:"Export to Excel (CSV)",
    setMaint:"🔧 Set Maintenance", clearMaint:"✓ Clear Maintenance",
    editBook:"✏️ Edit Booking", cancelBook:"Cancel Booking",
    closeModal:"Close", password:"Password", enter:"Login",
    wrongPwd:"❌ Wrong password", pwdHint:"Default: squash2024",
    codeLabel:"Personal Code", codeMsg:"Save this code to view your bookings",
    closedMsg:"Club is Closed", noBookings:"No bookings",
    noPhone:"No bookings found for this number",
    occup:"Occupancy", peak:"Peak Hour", totalMonth:"Bookings This Month",
    byMembership:"By Membership", byCourt:"By Court", byHour:"Popular Hours",
    bookPaySoon:"💳 In-app payments — coming soon",
    maintNote:"As admin: click a free slot to book or mark maintenance",
    typeLabel:"Booking Type", customerType:"Customer Booking",
    noPhone2:"No bookings found",
    week:"Week",
  }
};

// ── Holidays ───────────────────────────────────────────────────────────────────
const HOLIDAYS = {
  "2025-04-13":"פסח א׳","2025-04-14":"פסח ב׳","2025-04-15":"חוה״מ פסח",
  "2025-04-16":"חוה״מ פסח","2025-04-17":"חוה״מ פסח","2025-04-18":"חוה״מ פסח",
  "2025-04-19":"שביעי של פסח","2025-04-20":"אחרון של פסח",
  "2025-05-01":"יום הזיכרון","2025-05-02":"יום העצמאות",
  "2025-05-21":"שבועות","2025-09-22":"ראש השנה א׳","2025-09-23":"ראש השנה ב׳",
  "2025-10-01":"יום כיפור","2025-10-06":"סוכות","2025-10-07":"חוה״מ סוכות",
  "2025-10-08":"חוה״מ סוכות","2025-10-09":"חוה״מ סוכות","2025-10-10":"חוה״מ סוכות",
  "2025-10-11":"חוה״מ סוכות","2025-10-12":"חוה״מ סוכות",
  "2025-10-13":"שמיני עצרת","2025-10-14":"שמחת תורה",
  "2025-12-14":"חנוכה א׳","2025-12-15":"חנוכה ב׳","2025-12-16":"חנוכה ג׳",
  "2025-12-17":"חנוכה ד׳","2025-12-18":"חנוכה ה׳","2025-12-19":"חנוכה ו׳",
  "2025-12-20":"חנוכה ז׳","2025-12-21":"חנוכה ח׳",
  "2026-03-15":"פורים","2026-04-01":"פסח א׳","2026-04-02":"פסח ב׳",
  "2026-04-03":"חוה״מ פסח","2026-04-04":"חוה״מ פסח","2026-04-05":"חוה״מ פסח",
  "2026-04-06":"חוה״מ פסח","2026-04-07":"שביעי של פסח","2026-04-08":"אחרון של פסח",
  "2026-04-20":"יום הזיכרון","2026-04-21":"יום העצמאות","2026-05-21":"שבועות",
  "2026-09-11":"ראש השנה א׳","2026-09-12":"ראש השנה ב׳","2026-09-20":"יום כיפור",
  "2026-09-25":"סוכות","2026-09-26":"חוה״מ סוכות","2026-09-27":"חוה״מ סוכות",
  "2026-09-28":"חוה״מ סוכות","2026-09-29":"חוה״מ סוכות","2026-09-30":"חוה״מ סוכות",
  "2026-10-01":"חוה״מ סוכות","2026-10-02":"שמיני עצרת","2026-10-03":"שמחת תורה",
  "2026-12-03":"חנוכה א׳","2026-12-04":"חנוכה ב׳","2026-12-05":"חנוכה ג׳",
  "2026-12-06":"חנוכה ד׳","2026-12-07":"חנוכה ה׳","2026-12-08":"חנוכה ו׳",
  "2026-12-09":"חנוכה ז׳","2026-12-10":"חנוכה ח׳",
  "2027-03-20":"פורים","2027-04-19":"פסח א׳","2027-04-20":"פסח ב׳",
  "2027-04-21":"חוה״מ פסח","2027-04-22":"חוה״מ פסח","2027-04-23":"חוה״מ פסח",
  "2027-04-24":"חוה״מ פסח","2027-04-25":"שביעי של פסח","2027-04-26":"אחרון של פסח",
  "2027-05-06":"יום הזיכרון","2027-05-07":"יום העצמאות","2027-06-08":"שבועות",
  "2027-09-30":"ראש השנה א׳","2027-10-01":"ראש השנה ב׳","2027-10-09":"יום כיפור",
  "2027-10-14":"סוכות","2027-10-15":"חוה״מ סוכות","2027-10-16":"חוה״מ סוכות",
  "2027-10-17":"חוה״מ סוכות","2027-10-18":"חוה״מ סוכות","2027-10-19":"חוה״מ סוכות",
  "2027-10-20":"חוה״מ סוכות","2027-10-21":"שמיני עצרת","2027-10-22":"שמחת תורה",
  "2027-12-22":"חנוכה א׳","2027-12-23":"חנוכה ב׳","2027-12-24":"חנוכה ג׳",
  "2027-12-25":"חנוכה ד׳","2027-12-26":"חנוכה ה׳","2027-12-27":"חנוכה ו׳",
  "2027-12-28":"חנוכה ז׳","2027-12-29":"חנוכה ח׳",
};
const CLOSED_DAYS = ["2025-10-01","2026-09-20","2027-10-09"];
const DEFAULT_HOURS = {
  0:{open:"14:00",close:"22:00"},1:{open:"06:00",close:"22:00"},
  2:{open:"06:00",close:"22:00"},3:{open:"06:00",close:"22:00"},
  4:{open:"06:00",close:"22:00"},5:{open:"06:00",close:"18:00"},
  6:{open:"08:00",close:"18:00"},
};
const ADMIN_PWD = "squash2024";

// ── Utils ──────────────────────────────────────────────────────────────────────
const toMin = t => { const [h,m]=t.split(":").map(Number); return h*60+m; };
const fromMin = m => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
const genSlots = (open,close,off=0) => {
  const s=[],end=toMin(close); let c=toMin(open)+off;
  while(c+45<=end){s.push(fromMin(c));c+=45;} return s;
};
const toDS = d => {
  const y=d.getFullYear(),mo=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return `${y}-${mo}-${day}`;
};
// DD/MM/YY display format
const toDMY = ds => {
  const [y,m,d]=ds.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};
const addDays = (d,n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const slotEnd = s => fromMin(toMin(s)+45);
const isPast = (ds,s) => new Date(`${ds}T${s}:00`) <= new Date();
const canCancel = (ds,s) => (new Date(`${ds}T${s}:00`)-new Date()) > 3*60*60*1000;
const makeCode = phone => {
  let h=1234;
  for(const c of String(phone)) h=(h*31+c.charCodeAt(0))%9000;
  return String(1000+h);
};
const waLink = (phone,name,court,slot,ds,lang) => {
  const raw=String(phone).replace(/\D/g,"");
  const intl=raw.startsWith("972")?raw:raw.startsWith("0")?"972"+raw.slice(1):raw;
  const msg=lang==="en"
    ? `Hello ${name}!\nYour booking is confirmed:\n🏆 Court ${court}\n📅 ${toDMY(ds)}\n⏰ ${slot}–${slotEnd(slot)}\n\nNeve Sharet Country Club`
    : `שלום ${name}!\nהזמנתך אושרה:\n🏆 מגרש ${court}\n📅 ${toDMY(ds)}\n⏰ ${slot}–${slotEnd(slot)}\n\nקאנטרי נווה שרת`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
};
const exportCSV = (rows,filename) => {
  const BOM="\uFEFF";
  const csv=BOM+rows.map(r=>r.map(c=>`"${String(c??"-").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};

// ── Light Theme ────────────────────────────────────────────────────────────────
const G = {
  bg:"#f5f7f2",
  card:"#ffffff",
  border:"#d8e4d2",
  header:"#2d5a3d",
  headerDark:"#1e3f2a",
  gold:"#8a6a1f",
  goldL:"#a07c24",
  goldBg:"#fdf5e4",
  goldBorder:"#e8d5a0",
  text:"#1a2e20",
  muted:"#5a7a65",
  mutedLight:"#8aaa95",
  free:  {bg:"#edf7f0",border:"#86c9a0",text:"#1a6b3a"},
  booked:{bg:"#fdf5e4",border:"#d4a847",text:"#7a5210"},
  fixed: {bg:"#eaf0fb",border:"#7aaae8",text:"#1e4a8a"},
  maint: {bg:"#fef0e6",border:"#e8943a",text:"#7a3a0a"},
  past:  {bg:"#f5f5f5",border:"#dddddd",text:"#aaaaaa"},
};

// ── SVG Court Watermark ────────────────────────────────────────────────────────
const CourtSVG = () => (
  <svg viewBox="0 0 300 150" style={{position:"absolute",right:"-10px",top:"-8px",opacity:0.12,width:"300px",pointerEvents:"none"}} xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="288" height="138" fill="none" stroke="white" strokeWidth="3"/>
    <line x1="6" y1="100" x2="294" y2="100" stroke="white" strokeWidth="1.5"/>
    <line x1="6" y1="52" x2="294" y2="52" stroke="white" strokeWidth="1.5"/>
    <line x1="150" y1="52" x2="150" y2="100" stroke="white" strokeWidth="1.5"/>
    <rect x="6" y="6" width="288" height="24" fill="rgba(255,255,255,0.15)"/>
    <line x1="6" y1="30" x2="294" y2="30" stroke="white" strokeWidth="1"/>
    <circle cx="150" cy="124" r="10" fill="none" stroke="white" strokeWidth="1.2"/>
  </svg>
);

const Ball = ({size=34}) => (
  <svg width={size} height={size} viewBox="0 0 36 36" style={{flexShrink:0}}>
    <circle cx="18" cy="18" r="16.5" fill="#c4922a"/>
    <path d="M4 12 Q18 8 32 12" fill="none" stroke="white" strokeWidth="2"/>
    <path d="M4 24 Q18 28 32 24" fill="none" stroke="white" strokeWidth="2"/>
    <path d="M12 3 Q10 18 12 33" fill="none" stroke="white" strokeWidth="1.2" opacity="0.4"/>
    <path d="M24 3 Q26 18 24 33" fill="none" stroke="white" strokeWidth="1.2" opacity="0.4"/>
  </svg>
);

// ── UI Primitives ──────────────────────────────────────────────────────────────
const MW = ({onClose,children,wide}) => (
  <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(30,63,42,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"1rem",minHeight:"600px",overflowY:"auto"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:G.card,borderRadius:"16px",padding:"1.75rem",width:"100%",maxWidth:wide?"600px":"400px",border:`1px solid ${G.border}`,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",margin:"auto"}}>
      {children}
    </div>
  </div>
);
const MH = ({children}) => <div style={{fontSize:"18px",fontWeight:"700",color:G.text,marginBottom:"1.1rem"}}>{children}</div>;
const Inp = ({style={},...p}) => <input {...p} style={{width:"100%",boxSizing:"border-box",padding:"11px 13px",background:"#f9faf8",border:`1.5px solid ${G.border}`,borderRadius:"8px",fontSize:"15px",color:G.text,outline:"none",textAlign:"inherit",marginBottom:"10px",...style}}/>;
const Lbl = ({children}) => <div style={{fontSize:"13px",color:G.muted,marginBottom:"5px",fontWeight:"600"}}>{children}</div>;
const PBtn = ({bg=G.header,tc="white",mb="10px",disabled,...p}) => <button {...p} style={{width:"100%",background:disabled?"#c8d8c8":bg,color:disabled?"#888":tc,border:"none",borderRadius:"9px",padding:"12px",fontSize:"15px",fontWeight:"700",cursor:disabled?"default":"pointer",marginBottom:mb}}/>;
const GhB = (p) => <button {...p} style={{width:"100%",background:"transparent",color:G.muted,border:`1.5px solid ${G.border}`,borderRadius:"9px",padding:"11px",fontSize:"14px",cursor:"pointer",fontWeight:"500"}}/>;
const Sel = ({children,...p}) => <select {...p} style={{width:"100%",padding:"11px 13px",background:"#f9faf8",border:`1.5px solid ${G.border}`,borderRadius:"8px",fontSize:"15px",color:G.text,marginBottom:"10px",textAlign:"inherit"}}>{children}</select>;
const Divider = () => <div style={{height:"1px",background:G.border,margin:"14px 0"}}/>;
const Tag = ({color,bg,border,children}) => <div style={{display:"inline-block",background:bg,color,border:`1px solid ${border}`,borderRadius:"20px",padding:"3px 12px",fontSize:"12px",fontWeight:"600"}}>{children}</div>;

// ── Login Modal ────────────────────────────────────────────────────────────────
const LoginModal = ({t,onLogin,onClose}) => {
  const [pw,setPw]=useState(""); const [err,setErr]=useState(false);
  const go=()=>{if(!onLogin(pw)){setErr(true);setPw("");}};
  return (
    <MW onClose={onClose}>
      <MH>🔐 {t.adminLogin}</MH>
      <Lbl>{t.password}</Lbl>
      <Inp type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr(false);}} onKeyDown={e=>e.key==="Enter"&&go()} autoFocus style={err?{borderColor:"#dc3030"}:{}}/>
      {err&&<div style={{color:"#c02020",fontSize:"14px",marginBottom:"10px"}}>{t.wrongPwd}</div>}
      <PBtn onClick={go}>{t.enter}</PBtn>
      <div style={{fontSize:"12px",color:G.mutedLight,textAlign:"center"}}>{t.pwdHint}</div>
    </MW>
  );
};

// ── Confirm Modal ──────────────────────────────────────────────────────────────
const ConfirmModal = ({t,lang,booking,court,slot,ds,onClose}) => {
  const code=makeCode(booking.phone||"0000");
  const waUrl=booking.phone?waLink(booking.phone,booking.name,court,slot,ds,lang):null;
  return (
    <MW onClose={onClose}>
      <div style={{textAlign:"center",marginBottom:"1rem"}}>
        <div style={{fontSize:"48px"}}>✅</div>
        <div style={{fontWeight:"700",fontSize:"18px",color:G.text,margin:"8px 0 4px"}}>{booking.name}</div>
        <div style={{color:G.goldL,fontSize:"15px",fontWeight:"600"}}>{t.court} {court} | {slot}–{slotEnd(slot)} | {toDMY(ds)}</div>
      </div>
      {booking.phone&&(
        <div style={{background:G.goldBg,border:`1px solid ${G.goldBorder}`,borderRadius:"12px",padding:"14px",textAlign:"center",marginBottom:"14px"}}>
          <div style={{fontSize:"13px",color:G.muted,marginBottom:"5px",fontWeight:"600"}}>{t.codeLabel}</div>
          <div style={{fontSize:"40px",fontWeight:"800",color:G.gold,letterSpacing:"8px"}}>{code}</div>
          <div style={{fontSize:"12px",color:G.muted,marginTop:"5px"}}>{t.codeMsg}</div>
        </div>
      )}
      {waUrl&&<PBtn bg="#25d366" onClick={()=>window.open(waUrl,"_blank")}>📱 {t.waSend}</PBtn>}
      <GhB onClick={onClose}>{t.closeModal}</GhB>
    </MW>
  );
};

// ── Book Modal ─────────────────────────────────────────────────────────────────
const BookModal = ({t,court,slot,ds,isAdmin,onConfirm,onClose}) => {
  const [name,setName]=useState(""); const [phone,setPhone]=useState("");
  const [memb,setMemb]=useState(t.membership[0]);
  const [fixed,setFixed]=useState(false); const [weeks,setWeeks]=useState("1");
  const ok=name.trim().length>=2;
  const submit=()=>ok&&onConfirm(name.trim(),phone.trim(),memb,fixed,parseInt(weeks)||1);
  return (
    <MW onClose={onClose}>
      <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"4px",flexWrap:"wrap"}}>
        <div style={{background:G.free.bg,color:G.free.text,border:`1px solid ${G.free.border}`,borderRadius:"7px",padding:"4px 12px",fontSize:"13px",fontWeight:"700"}}>{t.court} {court}</div>
        <div style={{color:G.goldL,fontSize:"15px",fontWeight:"700"}}>{slot} – {slotEnd(slot)}</div>
      </div>
      <div style={{color:G.muted,fontSize:"13px",marginBottom:"1rem",fontWeight:"500"}}>{toDMY(ds)} | {t.days[new Date(ds+"T12:00:00").getDay()]}</div>
      <Lbl>{t.fullName} *</Lbl>
      <Inp value={name} onChange={e=>setName(e.target.value)} placeholder={t.fullName} autoFocus/>
      <Lbl>{t.phone}</Lbl>
      <Inp value={phone} onChange={e=>setPhone(e.target.value)} placeholder="050-0000000" type="tel" dir="ltr" style={{textAlign:"left"}}/>
      <Lbl>{t.membType}</Lbl>
      <Sel value={memb} onChange={e=>setMemb(e.target.value)}>
        {t.membership.map(m=><option key={m} value={m}>{m}</option>)}
      </Sel>
      {isAdmin&&<>
        <Divider/>
        <label style={{display:"flex",alignItems:"center",gap:"10px",cursor:"pointer",marginBottom:"12px"}}>
          <input type="checkbox" checked={fixed} onChange={e=>setFixed(e.target.checked)} style={{width:"18px",height:"18px",accentColor:G.header}}/>
          <div>
            <div style={{fontSize:"15px",color:G.header,fontWeight:"700"}}>{t.fixedBook}</div>
            <div style={{fontSize:"12px",color:G.muted}}>חזרה שבועית אוטומטית</div>
          </div>
        </label>
        <Lbl>{t.weeksRepeat}</Lbl>
        <Sel value={weeks} onChange={e=>setWeeks(e.target.value)}>
          {[1,2,3,4,6,8,10,12,16,20,24,36,48,52].map(w=>(
            <option key={w} value={w}>{w===1?(t.dir==="rtl"?"שבוע אחד":"1 week"):`${w} ${t.dir==="rtl"?"שבועות":"weeks"}`}</option>
          ))}
        </Sel>
      </>}
      <Divider/>
      <PBtn onClick={submit} disabled={!ok}>{t.confirmBook}</PBtn>
      <GhB onClick={onClose}>{t.cancel}</GhB>
    </MW>
  );
};

// ── Detail Modal ───────────────────────────────────────────────────────────────
const DetailModal = ({t,court,slot,booking,isAdmin,canDel,onDelete,onEdit,onClose,waitlist}) => {
  const cfg=booking.type==="fixed"
    ? {label:t.fixed,color:G.fixed.text,bg:G.fixed.bg,border:G.fixed.border}
    : {label:t.booked,color:G.goldL,bg:G.goldBg,border:G.goldBorder};
  const wl=waitlist||[];
  return (
    <MW onClose={onClose}>
      <Tag color={cfg.color} bg={cfg.bg} border={cfg.border}>{cfg.label}</Tag>
      <div style={{fontSize:"22px",fontWeight:"700",color:G.text,marginTop:"10px",marginBottom:"4px"}}>{booking.name}</div>
      {isAdmin&&<>
        {booking.phone&&<div style={{color:G.header,fontSize:"15px",marginBottom:"4px",fontWeight:"600"}}>📞 {booking.phone}</div>}
        <div style={{display:"inline-block",background:"#f0f4ef",color:G.muted,borderRadius:"6px",padding:"3px 12px",fontSize:"13px",marginBottom:"12px",fontWeight:"500"}}>{booking.membership||"—"}</div>
        {wl.length>0&&<div style={{background:G.goldBg,border:`1px solid ${G.goldBorder}`,borderRadius:"8px",padding:"10px 12px",marginBottom:"12px"}}>
          <div style={{fontSize:"13px",color:G.goldL,fontWeight:"700",marginBottom:"6px"}}>⏳ {t.waitlistCount}: {wl.length}</div>
          {wl.map((w,i)=><div key={i} style={{fontSize:"13px",color:G.muted}}>{i+1}. {w.name} {w.phone&&`| ${w.phone}`}</div>)}
        </div>}
      </>}
      {!isAdmin&&<div style={{color:G.muted,fontSize:"14px",marginBottom:"14px"}}>{t.dir==="rtl"?"פרטי ההזמנה מוגנים":"Booking details are private"}</div>}
      <div style={{background:"#f5f7f2",borderRadius:"10px",padding:"12px 16px",marginBottom:"16px",display:"flex",gap:"24px"}}>
        <div><div style={{fontSize:"12px",color:G.muted,fontWeight:"600"}}>{t.court}</div><div style={{fontSize:"22px",fontWeight:"800",color:G.text}}>{court}</div></div>
        <div><div style={{fontSize:"12px",color:G.muted,fontWeight:"600"}}>{t.dir==="rtl"?"שעה":"Time"}</div><div style={{fontSize:"16px",fontWeight:"700",color:G.goldL}}>{slot} – {slotEnd(slot)}</div></div>
        <div><div style={{fontSize:"12px",color:G.muted,fontWeight:"600"}}>{t.dir==="rtl"?"תאריך":"Date"}</div><div style={{fontSize:"15px",fontWeight:"600",color:G.text}}>{toDMY(booking.ds||"")}</div></div>
      </div>
      {isAdmin&&<PBtn onClick={onEdit} bg={G.goldBg} tc={G.goldL} mb="10px" style={{border:`1px solid ${G.goldBorder}`}}>{t.editBook}</PBtn>}
      {canDel
        ? <PBtn onClick={onDelete} bg="#dc2626" tc="white">{isAdmin?t.cancelBook+" ↩":t.cancelBook}</PBtn>
        : !isAdmin&&<div style={{color:"#c02020",fontSize:"13px",textAlign:"center",marginBottom:"10px",padding:"10px",background:"#fef0f0",border:"1px solid #f5c0c0",borderRadius:"8px",fontWeight:"600"}}>{t.cancelInfo}</div>
      }
      <GhB onClick={onClose}>{t.closeModal}</GhB>
    </MW>
  );
};

// ── Edit Modal ─────────────────────────────────────────────────────────────────
const EditModal = ({t,booking,onSave,onClose}) => {
  const [name,setName]=useState(booking.name);
  const [phone,setPhone]=useState(booking.phone||"");
  const [memb,setMemb]=useState(booking.membership||t.membership[0]);
  const [type,setType]=useState(booking.type||"customer");
  return (
    <MW onClose={onClose}>
      <MH>{t.editBook}</MH>
      <Lbl>{t.fullName}</Lbl><Inp value={name} onChange={e=>setName(e.target.value)} autoFocus/>
      <Lbl>{t.phone}</Lbl><Inp value={phone} onChange={e=>setPhone(e.target.value)} type="tel" dir="ltr" style={{textAlign:"left"}}/>
      <Lbl>{t.membType}</Lbl>
      <Sel value={memb} onChange={e=>setMemb(e.target.value)}>
        {t.membership.map(m=><option key={m} value={m}>{m}</option>)}
      </Sel>
      <Lbl>{t.typeLabel}</Lbl>
      <Sel value={type} onChange={e=>setType(e.target.value)}>
        <option value="customer">{t.customerType}</option>
        <option value="fixed">{t.fixedBook}</option>
      </Sel>
      <Divider/>
      <PBtn disabled={name.trim().length<2} onClick={()=>name.trim().length>=2&&onSave({...booking,name:name.trim(),phone:phone.trim(),membership:memb,type})}>{t.save}</PBtn>
      <GhB onClick={onClose}>{t.cancel}</GhB>
    </MW>
  );
};

// ── Waitlist Modal ─────────────────────────────────────────────────────────────
const WaitlistModal = ({t,court,slot,ds,onJoin,onClose}) => {
  const [name,setName]=useState(""); const [phone,setPhone]=useState("");
  return (
    <MW onClose={onClose}>
      <div style={{textAlign:"center",fontSize:"36px",marginBottom:"8px"}}>⏳</div>
      <MH>{t.waitlistJoin}</MH>
      <div style={{color:G.muted,fontSize:"14px",marginBottom:"14px"}}>{t.court} {court} | {slot} | {toDMY(ds)}</div>
      <Lbl>{t.fullName} *</Lbl><Inp value={name} onChange={e=>setName(e.target.value)} autoFocus/>
      <Lbl>{t.phone}</Lbl><Inp value={phone} onChange={e=>setPhone(e.target.value)} type="tel" dir="ltr" style={{textAlign:"left"}}/>
      <PBtn disabled={name.trim().length<2} onClick={()=>name.trim().length>=2&&onJoin(name.trim(),phone.trim())}>{t.waitlistJoin}</PBtn>
      <GhB onClick={onClose}>{t.cancel}</GhB>
    </MW>
  );
};

// ── My Bookings (inline view) ──────────────────────────────────────────────────
const MyBookingsView = ({t,bookings,onClose}) => {
  const [phone,setPhone]=useState(""); const [searched,setSearched]=useState("");
  const results=useMemo(()=>{
    if(!searched) return [];
    const found=[];
    for(const [ds,dayB] of Object.entries(bookings)){
      const d=new Date(ds+"T12:00:00"); d.setHours(0,0,0,0);
      if(d<new Date()) continue;
      for(const [c,courtB] of Object.entries(dayB)){
        for(const [slot,b] of Object.entries(courtB)){
          if(b.phone===searched||makeCode(b.phone||"")===searched)
            found.push({ds,court:c,slot,booking:b});
        }
      }
    }
    return found.sort((a,z)=>(a.ds+a.slot)<(z.ds+z.slot)?-1:1);
  },[searched,bookings]);
  return (
    <div>
      <div style={{fontWeight:"700",fontSize:"17px",color:G.text,marginBottom:"14px"}}>{t.myBookingsTitle}</div>
      <div style={{display:"flex",gap:"8px",marginBottom:"16px"}}>
        <Inp value={phone} onChange={e=>setPhone(e.target.value)} onKeyDown={e=>e.key==="Enter"&&setSearched(phone.trim())} placeholder={`${t.phone} / ${t.codeLabel}`} style={{marginBottom:0,flex:1}} dir="ltr"/>
        <button onClick={()=>setSearched(phone.trim())} style={{background:G.header,color:"white",border:"none",borderRadius:"8px",padding:"0 18px",fontWeight:"700",cursor:"pointer",fontSize:"14px",flexShrink:0}}>{t.search}</button>
      </div>
      {searched&&(results.length===0
        ? <div style={{textAlign:"center",color:G.muted,padding:"2rem",fontSize:"15px"}}>{t.noPhone}</div>
        : results.map(({ds,court,slot,booking},i)=>(
            <div key={i} style={{display:"flex",gap:"10px",alignItems:"center",padding:"12px 14px",background:G.free.bg,border:`1px solid ${G.free.border}`,borderRadius:"10px",marginBottom:"8px",flexWrap:"wrap"}}>
              <div style={{background:G.header,color:"white",borderRadius:"6px",padding:"3px 10px",fontSize:"13px",fontWeight:"700"}}>{t.court} {court}</div>
              <div style={{fontFamily:"monospace",fontSize:"14px",color:G.text,fontWeight:"600"}}>{slot}</div>
              <div style={{fontSize:"14px",color:G.muted,fontWeight:"500"}}>{toDMY(ds)}</div>
              <div style={{marginRight:"auto",fontSize:"13px",color:G.muted}}>{booking.membership}</div>
              {canCancel(ds,slot)&&<div style={{fontSize:"12px",color:G.free.text,fontWeight:"600",background:G.free.bg,border:`1px solid ${G.free.border}`,borderRadius:"5px",padding:"2px 8px"}}>✓ {t.dir==="rtl"?"ניתן לביטול":"Cancellable"}</div>}
            </div>
          ))
      )}
    </div>
  );
};

// ── Court Section ──────────────────────────────────────────────────────────────
const CourtSection = ({t,label,courts,slots,bookings,maintenance,ds,onSlot,isAdmin}) => {
  if(!slots.length) return null;
  return (
    <div style={{marginBottom:"14px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
        <div style={{height:"2px",flex:1,background:`linear-gradient(to ${t.dir==="rtl"?"left":"right"},${G.border},transparent)`}}/>
        <div style={{fontSize:"13px",color:G.header,fontWeight:"700",whiteSpace:"nowrap",letterSpacing:"0.3px"}}>{label}</div>
        <div style={{height:"2px",flex:1,background:`linear-gradient(to ${t.dir==="rtl"?"right":"left"},${G.border},transparent)`}}/>
      </div>
      <div style={{background:G.card,borderRadius:"12px",border:`1px solid ${G.border}`,overflow:"auto",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:"300px"}}>
          <thead>
            <tr style={{background:"#edf3ea"}}>
              <th style={{padding:"10px 12px",textAlign:t.dir==="rtl"?"right":"left",color:G.muted,fontWeight:"600",fontSize:"13px",width:"56px"}}>
                {t.dir==="rtl"?"שעה":"Time"}
              </th>
              {courts.map(c=>(
                <th key={c} style={{padding:"10px 8px",textAlign:"center",color:G.header,fontWeight:"700",fontSize:"14px"}}>{t.court} {c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot,i)=>{
              const past=isPast(ds,slot);
              return (
                <tr key={slot} style={{borderTop:`1px solid #f0f4ee`,background:i%2?"#fafcf9":"white"}}>
                  <td style={{padding:"3px 12px",fontFamily:"monospace",fontSize:"13px",color:G.muted,fontWeight:"600"}} dir="ltr">{slot}</td>
                  {courts.map(c=>{
                    const isMaint=maintenance[ds]?.[c]?.[slot];
                    const b=bookings[ds]?.[c]?.[slot];
                    const sc=past?G.past:isMaint?G.maint:b?(b.type==="fixed"?G.fixed:G.booked):G.free;
                    const txt=isMaint?t.maint:b?(isAdmin?b.name:t.booked):(past?"":t.free);
                    return (
                      <td key={c} style={{padding:"3px 5px"}}>
                        <div onClick={()=>!past&&onSlot(c,slot)} style={{
                          borderRadius:"7px",padding:"8px 6px",textAlign:"center",minHeight:"32px",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          background:sc.bg,color:sc.text,border:`1px solid ${sc.border}`,
                          cursor:past?"default":"pointer",fontSize:"13px",
                          fontWeight:b||isMaint?"700":"500",userSelect:"none",
                          transition:"filter 0.1s"
                        }}>
                          <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"110px",display:"block"}}>{txt}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Week View ──────────────────────────────────────────────────────────────────
const WeekView = ({t,bookings,maintenance,hours,startDate}) => {
  const days=[...Array(7)].map((_,i)=>addDays(startDate,i));
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"6px"}}>
        {days.map(d=>{
          const ds=toDS(d); const dow=d.getDay();
          const dh=hours[dow]||DEFAULT_HOURS[dow];
          const s12=genSlots(dh.open,dh.close,0); const s34=genSlots(dh.open,dh.close,30);
          const total=(s12.length+s34.length)*2;
          const cnt=[1,2,3,4].map(c=>(c<=2?s12:s34).filter(s=>bookings[ds]?.[c]?.[s]||maintenance[ds]?.[c]?.[s]).length).reduce((a,b)=>a+b,0);
          const pct=total>0?Math.round(cnt/total*100):0;
          const holiday=HOLIDAYS[ds]; const closed=CLOSED_DAYS.includes(ds);
          const isToday=ds===toDS(new Date());
          return (
            <div key={ds} style={{background:isToday?"#edf7f0":G.card,borderRadius:"10px",border:`1.5px solid ${isToday?G.free.border:G.border}`,padding:"10px 6px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{fontSize:"11px",color:isToday?G.free.text:G.muted,fontWeight:"700"}}>{t.days[dow].slice(0,3)}</div>
              <div style={{fontSize:"18px",fontWeight:"800",color:G.text,margin:"2px 0"}}>{d.getDate()}</div>
              <div style={{fontSize:"10px",color:G.muted,marginBottom:"2px"}}>{String(d.getMonth()+1).padStart(2,"0")}/{String(d.getFullYear()).slice(2)}</div>
              {holiday&&<div style={{fontSize:"9px",color:"#7c5dc0",marginBottom:"2px",lineHeight:1.3,fontWeight:"600"}}>{holiday}</div>}
              {closed?<div style={{fontSize:"10px",color:"#c02020",fontWeight:"700"}}>{t.closedMsg}</div>:<>
                <div style={{fontSize:"12px",color:G.goldL,fontWeight:"700",marginBottom:"4px"}}>{cnt}/{total||"—"}</div>
                <div style={{height:"5px",background:"#e8f0e6",borderRadius:"3px"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:pct>80?"#dc2626":pct>50?G.goldL:G.free.text,borderRadius:"3px"}}/>
                </div>
              </>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Stats View ─────────────────────────────────────────────────────────────────
const StatsView = ({t,bookings}) => {
  const stats=useMemo(()=>{
    const now=new Date(); const cut=addDays(now,-30);
    let total=0,byMemb={},byCourt={1:0,2:0,3:0,4:0},byHour={};
    for(const [ds,dayB] of Object.entries(bookings)){
      const d=new Date(ds+"T12:00:00");
      if(d<cut||d>now) continue;
      for(const [c,courtB] of Object.entries(dayB)){
        for(const [slot,b] of Object.entries(courtB)){
          total++; byCourt[c]=(byCourt[c]||0)+1;
          const m=b.membership||"?"; byMemb[m]=(byMemb[m]||0)+1;
          const h=slot.split(":")[0]; byHour[h]=(byHour[h]||0)+1;
        }
      }
    }
    const peakH=Object.entries(byHour).sort((a,z)=>z[1]-a[1])[0];
    return {total,byMemb,byCourt,byHour,peakH};
  },[bookings]);
  const Bar=({val,max,color=G.header})=>(
    <div style={{height:"7px",background:"#e8f0e6",borderRadius:"4px",overflow:"hidden"}}>
      <div style={{height:"100%",width:max>0?`${Math.round(val/max*100)}%`:"0%",background:color,borderRadius:"4px"}}/>
    </div>
  );
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}}>
        {[{label:t.totalMonth,val:stats.total,color:G.header},{label:t.peak,val:stats.peakH?`${stats.peakH[0]}:00`:"-",color:G.fixed.text}].map(({label,val,color})=>(
          <div key={label} style={{background:G.card,borderRadius:"10px",border:`1px solid ${G.border}`,padding:"16px",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{fontSize:"12px",color:G.muted,fontWeight:"600",marginBottom:"5px"}}>{label}</div>
            <div style={{fontSize:"28px",fontWeight:"800",color}}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
        <div style={{background:G.card,borderRadius:"10px",border:`1px solid ${G.border}`,padding:"16px"}}>
          <div style={{fontSize:"13px",color:G.muted,fontWeight:"700",marginBottom:"12px"}}>{t.byCourt}</div>
          {[1,2,3,4].map(c=>(
            <div key={c} style={{marginBottom:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"14px",marginBottom:"4px"}}>
                <span style={{color:G.text,fontWeight:"600"}}>{t.court} {c}</span>
                <span style={{color:G.goldL,fontWeight:"700"}}>{stats.byCourt[c]||0}</span>
              </div>
              <Bar val={stats.byCourt[c]||0} max={Math.max(...Object.values(stats.byCourt))||1}/>
            </div>
          ))}
        </div>
        <div style={{background:G.card,borderRadius:"10px",border:`1px solid ${G.border}`,padding:"16px"}}>
          <div style={{fontSize:"13px",color:G.muted,fontWeight:"700",marginBottom:"12px"}}>{t.byMembership}</div>
          {Object.entries(stats.byMemb).sort((a,z)=>z[1]-a[1]).map(([m,cnt])=>(
            <div key={m} style={{marginBottom:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"13px",marginBottom:"4px"}}>
                <span style={{color:G.text,fontWeight:"600"}}>{m}</span>
                <span style={{color:G.fixed.text,fontWeight:"700"}}>{cnt}</span>
              </div>
              <Bar val={cnt} max={Math.max(...Object.values(stats.byMemb))||1} color={G.fixed.text}/>
            </div>
          ))}
          {!Object.keys(stats.byMemb).length&&<div style={{color:G.muted,fontSize:"14px"}}>—</div>}
        </div>
      </div>
    </div>
  );
};

// ── All Bookings ───────────────────────────────────────────────────────────────
const AllView = ({t,bookings}) => {
  const days=[...Array(30)].map((_,i)=>toDS(addDays(new Date(),i)));
  const doExport=()=>{
    const rows=[[t.dir==="rtl"?"תאריך":"Date",t.dir==="rtl"?"יום":"Day",t.court,t.dir==="rtl"?"שעה":"Time",t.fullName,t.phone,t.membType,t.typeLabel]];
    for(const ds of days){
      const d=new Date(ds+"T12:00:00");
      for(const c of [1,2,3,4])
        for(const [slot,b] of Object.entries(bookings[ds]?.[c]||{}))
          rows.push([toDMY(ds),t.days[d.getDay()],c,slot,b.name,b.phone||"",b.membership||"",b.type==="fixed"?t.fixedBook:t.customerType]);
    }
    exportCSV(rows,`squash-${toDS(new Date())}.csv`);
  };
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px",flexWrap:"wrap",gap:"8px"}}>
        <div style={{fontWeight:"700",fontSize:"17px",color:G.text}}>{t.tabAll} — 30 {t.dir==="rtl"?"ימים":"days"}</div>
        <button onClick={doExport} style={{background:"#edf7f0",color:G.free.text,border:`1.5px solid ${G.free.border}`,borderRadius:"8px",padding:"8px 16px",fontSize:"13px",fontWeight:"700",cursor:"pointer"}}>
          📊 {t.exportCSV}
        </button>
      </div>
      {days.map(ds=>{
        const all=[];
        for(const c of [1,2,3,4])
          for(const [slot,b] of Object.entries(bookings[ds]?.[c]||{}))
            all.push({c,slot,b});
        if(!all.length) return null;
        all.sort((a,z)=>toMin(a.slot)-toMin(z.slot));
        const d=new Date(ds+"T12:00:00");
        return (
          <div key={ds} style={{background:G.card,borderRadius:"10px",border:`1px solid ${G.border}`,padding:"14px",marginBottom:"10px",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{fontWeight:"700",color:G.header,fontSize:"14px",marginBottom:"10px",display:"flex",gap:"10px",alignItems:"center",flexWrap:"wrap"}}>
              <span>{t.days[d.getDay()]} — {toDMY(ds)}</span>
              {HOLIDAYS[ds]&&<span style={{color:"#7c5dc0",fontSize:"12px",fontWeight:"600"}}>✦ {HOLIDAYS[ds]}</span>}
              {ds===toDS(new Date())&&<span style={{color:G.free.text,fontSize:"12px",background:G.free.bg,border:`1px solid ${G.free.border}`,borderRadius:"4px",padding:"1px 7px"}}>• {t.today}</span>}
              <span style={{color:G.muted,fontSize:"12px"}}>({all.length})</span>
            </div>
            {all.map(({c,slot,b},i)=>(
              <div key={i} style={{display:"flex",gap:"10px",alignItems:"center",padding:"8px 0",borderTop:i?`1px solid #f0f4ee`:"none",flexWrap:"wrap"}}>
                <div style={{background:G.header,color:"white",borderRadius:"5px",padding:"3px 9px",fontSize:"12px",fontWeight:"700",flexShrink:0}}>{t.court} {c}</div>
                <div style={{fontFamily:"monospace",fontSize:"13px",color:G.muted,fontWeight:"600",minWidth:"44px"}} dir="ltr">{slot}</div>
                <div style={{flex:1,fontWeight:"700",color:G.text,fontSize:"14px"}}>{b.name}</div>
                {b.phone&&<div style={{color:G.muted,fontSize:"13px"}} dir="ltr">{b.phone}</div>}
                <div style={{fontSize:"11px",padding:"2px 9px",borderRadius:"20px",background:b.type==="fixed"?G.fixed.bg:G.goldBg,color:b.type==="fixed"?G.fixed.text:G.goldL,border:`1px solid ${b.type==="fixed"?G.fixed.border:G.goldBorder}`,fontWeight:"600",flexShrink:0}}>
                  {b.membership||"—"}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

// ── Settings ───────────────────────────────────────────────────────────────────
const SettingsView = ({t,hours,saveHours}) => {
  const [local,setLocal]=useState({...hours}); const [saved,setSaved]=useState(false);
  const set=(d,f,v)=>setLocal(p=>({...p,[d]:{...p[d],[f]:v}}));
  const save=async()=>{await saveHours(local);setSaved(true);setTimeout(()=>setSaved(false),2500);};
  return (
    <div style={{background:G.card,borderRadius:"12px",border:`1px solid ${G.border}`,padding:"1.5rem",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
      <div style={{fontWeight:"700",fontSize:"17px",color:G.text,marginBottom:"4px"}}>{t.tabSettings}</div>
      <div style={{fontSize:"13px",color:G.muted,marginBottom:"1.25rem"}}>{t.dir==="rtl"?"שינויים ייכנסו לתוקף מיד":"Changes take effect immediately"}</div>
      {[0,1,2,3,4,5,6].map(d=>(
        <div key={d} style={{display:"flex",alignItems:"center",gap:"14px",padding:"11px 14px",background:"#f5f7f2",borderRadius:"8px",marginBottom:"7px"}}>
          <span style={{fontWeight:"700",fontSize:"14px",color:G.header,minWidth:"66px"}}>{t.days[d]}</span>
          {/* Hours always LTR */}
          <div style={{display:"flex",alignItems:"center",gap:"8px",flex:1}} dir="ltr">
            <input type="time" value={local[d].open} onChange={e=>set(d,"open",e.target.value)} style={{background:"white",border:`1.5px solid ${G.border}`,borderRadius:"7px",padding:"7px 10px",fontSize:"14px",color:G.text,fontWeight:"600"}}/>
            <span style={{color:G.muted,fontWeight:"700"}}>–</span>
            <input type="time" value={local[d].close} onChange={e=>set(d,"close",e.target.value)} style={{background:"white",border:`1.5px solid ${G.border}`,borderRadius:"7px",padding:"7px 10px",fontSize:"14px",color:G.text,fontWeight:"600"}}/>
          </div>
        </div>
      ))}
      <button onClick={save} style={{width:"100%",marginTop:"14px",padding:"12px",borderRadius:"9px",background:saved?"#16a34a":G.header,color:"white",border:"none",fontSize:"15px",fontWeight:"700",cursor:"pointer",transition:"background 0.4s"}}>
        {saved?(t.dir==="rtl"?"✓ נשמר בהצלחה":"✓ Saved!"):(t.save)}
      </button>
    </div>
  );
};

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [lang,setLang]=useState("he");
  const t=LANGS[lang];
  const [isAdmin,setIsAdmin]=useState(false);
  const [view,setView]=useState("book");
  const [date,setDate]=useState(new Date());
  const [hours,setHours]=useState(DEFAULT_HOURS);
  const [bookings,setBookings]=useState({});
  const [waitlist,setWaitlist]=useState({});
  const [maintenance,setMaintenance]=useState({});
  const [modal,setModal]=useState(null);
  const [loading,setLoading]=useState(true);
  const [weekStart,setWeekStart]=useState(()=>{const d=new Date();d.setHours(0,0,0,0);return d;});

  useEffect(()=>{
    (async()=>{
      try{
        const [b,h,w,m] = await Promise.all([
          fetchBookings(),
          fetchHours(),
          fetchWaitlist(),
          fetchMaintenance(),
        ]);
        if(b) setBookings(b);
        if(h) setHours(h);
        if(w) setWaitlist(w);
        if(m) setMaintenance(m);
      }catch(e){ console.error('load error',e); }
      setLoading(false);
    })();
  },[]);

  // saveB is now handled per-operation via db.js
  const saveH=async nh=>{setHours(nh); await saveHoursDB(nh);};
  // waitlist saved per-operation
  // maintenance saved per-operation

  const today=useMemo(()=>{const d=new Date();d.setHours(0,0,0,0);return d;},[]);
  const ds=toDS(date);
  const dow=date.getDay();
  const dh=hours[dow]||DEFAULT_HOURS[dow];
  const holiday=HOLIDAYS[ds];
  const isClosed=CLOSED_DAYS.includes(ds);
  const maxDate=addDays(today,isAdmin?730:7);
  const slots12=useMemo(()=>genSlots(dh.open,dh.close,0),[dh]);
  const slots34=useMemo(()=>genSlots(dh.open,dh.close,30),[dh]);
  const dateObj=useMemo(()=>{const d=new Date(ds+"T12:00:00");d.setHours(0,0,0,0);return d;},[ds]);

  const customerCountToday=useCallback((name,phone)=>{
    let n=0;
    for(const c of [1,2,3,4])
      for(const b of Object.values(bookings[ds]?.[c]||{}))
        if(b.name===name&&b.phone===phone)n++;
    return n;
  },[bookings,ds]);

  const handleSlot=(court,slot)=>{
    const isMaint=maintenance[ds]?.[court]?.[slot];
    const b=bookings[ds]?.[court]?.[slot];
    if(isMaint&&!isAdmin) return;
    if(isMaint&&isAdmin){setModal({type:"maint_detail",court,slot});return;}
    if(b){setModal({type:"detail",court,slot,booking:{...b,ds}});return;}
    if(isPast(ds,slot)||dateObj<today) return;
    if(!isAdmin&&dateObj>maxDate){setModal({type:"msg",msg:t.dir==="rtl"?"ניתן להזמין עד שבוע מראש בלבד":"Bookings available up to 1 week in advance"});return;}
    if(isClosed&&!isAdmin){setModal({type:"msg",msg:t.closedMsg+(holiday?` — ${holiday}`:"")});return;}
    setModal({type:"book",court,slot});
  };

  const confirmBook=async(name,phone,membership,isFixed,weeks)=>{
    if(!isAdmin&&customerCountToday(name,phone)>=2){
      setModal({type:"msg",msg:t.maxCourts});return;
    }
    const {court,slot}=modal;
    const booking={name,phone,membership,type:isFixed?"fixed":"customer"};
    const newBookings=JSON.parse(JSON.stringify(bookings));
    for(let i=0;i<weeks;i++){
      const td=toDS(addDays(new Date(ds),i*7));
      if(!newBookings[td])newBookings[td]={};
      if(!newBookings[td][court])newBookings[td][court]={};
      if(!newBookings[td][court][slot]){
        newBookings[td][court][slot]=booking;
        await addBooking({ds:td,court,slot,...booking});
      }
    }
    setBookings(newBookings);
    setModal({type:"confirm",court,slot,booking});
  };

  const cancelB=async(court,slot)=>{
    await deleteBooking({ds,court,slot});
    const nb=JSON.parse(JSON.stringify(bookings));
    if(nb[ds]?.[court])delete nb[ds][court][slot];
    setBookings(nb);
    const wl=(waitlist[ds]?.[court]?.[slot])||[];
    if(wl.length>0&&isAdmin) setModal({type:"msg",msg:`⏳ ${wl[0].name} ${t.dir==="rtl"?"ממתין":"is waiting"} — ${wl[0].phone||"—"}`});
    else setModal(null);
  };

  const joinWaitlist=async(name,phone)=>{
    const {court,slot}=modal;
    await addWaitlist({ds,court,slot,name,phone});
    const nw=JSON.parse(JSON.stringify(waitlist));
    if(!nw[ds])nw[ds]={};
    if(!nw[ds][court])nw[ds][court]={};
    if(!nw[ds][court][slot])nw[ds][court][slot]=[];
    nw[ds][court][slot].push({name,phone});
    setModal({type:"msg",msg:`✅ ${name} ${t.dir==="rtl"?"נוסף לרשימת המתנה":"added to waitlist"}`});
  };

  const toggleMaint=async(court,slot)=>{
    const nm=JSON.parse(JSON.stringify(maintenance));
    if(!nm[ds])nm[ds]={};
    if(!nm[ds][court])nm[ds][court]={};
    const isActive=nm[ds][court][slot];
    if(isActive) delete nm[ds][court][slot];
    else nm[ds][court][slot]=true;
    await toggleMaintenanceDB({ds,court,slot,active:!isActive});
    setMaintenance(nm);setModal(null);
  };

  const editBooking=async(court,slot,updated)=>{
    await updateBooking({ds,court,slot,...updated});
    const nb=JSON.parse(JSON.stringify(bookings));
    if(nb[ds]?.[court]?.[slot])nb[ds][court][slot]=updated;
    setBookings(nb);setModal(null);
  };

  if(loading) return (
    <div style={{background:G.bg,minHeight:"600px",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"14px",color:G.muted,fontFamily:"Segoe UI,Tahoma,sans-serif",fontSize:"16px"}}>
      <Ball size={48}/><div>{t.dir==="rtl"?"טוען...":"Loading..."}</div>
    </div>
  );

  const adminTabs=[{k:"book",l:t.tabBook},{k:"week",l:t.tabWeek},{k:"all",l:t.tabAll},{k:"stats",l:t.tabStats},{k:"settings",l:t.tabSettings}];
  const customerTabs=[{k:"book",l:t.tabBook},{k:"mine",l:t.tabMine}];
  const tabs=isAdmin?adminTabs:customerTabs;

  return (
    <div dir={t.dir} style={{fontFamily:"'Segoe UI',Tahoma,'Arial Hebrew',sans-serif",background:G.bg,minHeight:"700px",color:G.text,position:"relative",fontSize:"15px"}}>

      {/* HEADER */}
      <div style={{background:`linear-gradient(140deg,${G.headerDark} 0%,${G.header} 60%,${G.headerDark} 100%)`,padding:"1.25rem 1.25rem 0",position:"relative",overflow:"hidden"}}>
        <CourtSVG/>
        <div style={{maxWidth:"940px",margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"10px"}}>
            <div style={{display:"flex",gap:"14px",alignItems:"center"}}>
              <img src="data:image/png;base64,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" alt="logo" style={{height:"60px",width:"auto",flexShrink:0,objectFit:"contain"}}/>
              <div>
                <div style={{fontSize:"20px",fontWeight:"800",color:"white"}}>{t.appTitle}</div>
                <div style={{fontSize:"12px",color:"rgba(255,255,255,0.75)",letterSpacing:"1px",marginTop:"2px"}}>{t.appSub}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
              <button onClick={()=>setLang(l=>l==="he"?"en":"he")} style={{background:"rgba(255,255,255,0.15)",color:"white",border:"1px solid rgba(255,255,255,0.3)",padding:"6px 14px",borderRadius:"8px",fontSize:"13px",cursor:"pointer",fontWeight:"600"}}>
                {lang==="he"?"🌐 English":"🌐 עברית"}
              </button>
              {isAdmin?(
                <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                  <div style={{background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.4)",color:"white",padding:"5px 14px",borderRadius:"20px",fontSize:"13px",fontWeight:"700"}}>{t.adminBadge}</div>
                  <button onClick={()=>{setIsAdmin(false);setView("book");}} style={{background:"transparent",color:"rgba(255,255,255,0.7)",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:"600"}}>{t.logout}</button>
                </div>
              ):(
                <button onClick={()=>setModal({type:"login"})} style={{background:"rgba(255,255,255,0.15)",color:"white",border:"1px solid rgba(255,255,255,0.35)",padding:"7px 16px",borderRadius:"9px",fontSize:"14px",cursor:"pointer",fontWeight:"600"}}>
                  {t.adminLogin}
                </button>
              )}
            </div>
          </div>
          <div style={{display:"flex",gap:"4px",marginTop:"1.25rem",flexWrap:"wrap"}}>
            {tabs.map(({k,l})=>(
              <button key={k} onClick={()=>setView(k)} style={{padding:"8px 16px",borderRadius:"9px 9px 0 0",fontSize:"13px",fontWeight:"700",border:"none",cursor:"pointer",background:view===k?"white":"rgba(255,255,255,0.12)",color:view===k?G.header:"rgba(255,255,255,0.85)",transition:"all 0.15s"}}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{maxWidth:"940px",margin:"0 auto",padding:"1rem"}}>

        {view==="book"&&<>
          {/* Date Navigator */}
          <div style={{background:G.card,borderRadius:"12px",border:`1px solid ${G.border}`,padding:"14px 18px",marginBottom:"14px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"4px"}} dir="ltr">
              <button onClick={()=>setDate(addDays(date,-1))} style={{fontSize:"26px",border:"none",background:"none",cursor:"pointer",color:G.muted,padding:"2px 12px",borderRadius:"7px",lineHeight:1,fontWeight:"300"}}>‹</button>
              <div style={{flex:1,textAlign:"center"}} dir={t.dir}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"12px",flexWrap:"wrap"}}>
                  <span style={{fontWeight:"800",fontSize:"17px",color:G.text}}>{t.days[dow]}</span>
                  {/* DD/MM/YY display next to native date picker */}
                  <span style={{fontWeight:"700",fontSize:"16px",color:G.goldL}}>{toDMY(ds)}</span>
                  <input type="date" value={ds} onChange={e=>{const d=new Date(e.target.value+"T12:00:00");if(!isNaN(d))setDate(d);}} style={{background:"#f5f7f2",border:`1.5px solid ${G.border}`,borderRadius:"7px",color:G.muted,fontSize:"13px",cursor:"pointer",padding:"4px 8px"}}/>
                  <button onClick={()=>setDate(new Date())} style={{fontSize:"12px",padding:"4px 12px",border:`1.5px solid ${G.border}`,borderRadius:"20px",cursor:"pointer",background:"white",color:G.muted,fontWeight:"600"}}>{t.today}</button>
                </div>
                {/* Hours — always LTR */}
                <div style={{fontSize:"14px",color:G.muted,marginTop:"4px",fontWeight:"600"}} dir="ltr">
                  {t.openHours}: {dh.open} – {dh.close}
                </div>
                {holiday&&<div style={{fontSize:"13px",color:"#7c5dc0",marginTop:"2px",fontWeight:"700"}}>✦ {holiday}</div>}
                {isClosed&&<div style={{fontSize:"13px",color:"#c02020",fontWeight:"700",marginTop:"2px"}}>❌ {t.closedMsg}</div>}
                {!isAdmin&&<div style={{fontSize:"12px",color:G.mutedLight,marginTop:"2px",fontWeight:"500"}}>{t.cancelInfo} | {t.maxCourts}</div>}
              </div>
              <button onClick={()=>setDate(addDays(date,1))} style={{fontSize:"26px",border:"none",background:"none",cursor:"pointer",color:G.muted,padding:"2px 12px",borderRadius:"7px",lineHeight:1,fontWeight:"300"}}>›</button>
            </div>
          </div>

          {/* Legend */}
          <div style={{display:"flex",gap:"16px",marginBottom:"12px",fontSize:"13px",flexWrap:"wrap",alignItems:"center"}}>
            {[["free",t.free],["booked",t.booked],["fixed",t.fixed],["maint",t.maint]].map(([k,l])=>(
              <span key={k} style={{display:"flex",alignItems:"center",gap:"6px",color:G[k].text,fontWeight:"600"}}>
                <span style={{width:"13px",height:"13px",borderRadius:"3px",background:G[k].bg,border:`1.5px solid ${G[k].border}`,display:"inline-block",flexShrink:0}}/>
                {l}
              </span>
            ))}
          </div>

          {/* Court Grids */}
          <CourtSection t={t} label={t.courts12} courts={[1,2]} slots={slots12} bookings={bookings} maintenance={maintenance} ds={ds} onSlot={handleSlot} isAdmin={isAdmin}/>
          <CourtSection t={t} label={t.courts34} courts={[3,4]} slots={slots34} bookings={bookings} maintenance={maintenance} ds={ds} onSlot={handleSlot} isAdmin={isAdmin}/>

          {/* Stats bar */}
          <div style={{display:"flex",gap:"8px",marginTop:"10px"}}>
            {[1,2,3,4].map(c=>{
              const s=c<=2?slots12:slots34;
              const cnt=Object.keys(bookings[ds]?.[c]||{}).length;
              const pct=s.length?Math.round(cnt/s.length*100):0;
              return(
                <div key={c} style={{flex:1,background:G.card,borderRadius:"9px",border:`1px solid ${G.border}`,padding:"10px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                  <div style={{fontSize:"12px",color:G.muted,fontWeight:"600"}}>{t.court} {c}</div>
                  <div style={{fontSize:"17px",fontWeight:"800",color:G.text,margin:"3px 0"}}>{cnt}/{s.length}</div>
                  <div style={{height:"4px",background:"#e8f0e6",borderRadius:"2px"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:G.header,borderRadius:"2px",transition:"width 0.4s"}}/>
                  </div>
                </div>
              );
            })}
          </div>

          {isAdmin&&<div style={{marginTop:"10px",padding:"10px 14px",background:"#fef9ec",border:`1px solid ${G.goldBorder}`,borderRadius:"8px",fontSize:"13px",color:G.goldL,fontWeight:"600"}}>
            ℹ️ {t.maintNote}
          </div>}
          <div style={{marginTop:"8px",padding:"10px 14px",background:G.fixed.bg,border:`1px solid ${G.fixed.border}`,borderRadius:"8px",fontSize:"13px",color:G.fixed.text,textAlign:"center",fontWeight:"600"}}>
            {t.bookPaySoon}
          </div>
        </>}

        {view==="mine"&&!isAdmin&&<MyBookingsView t={t} bookings={bookings} onClose={()=>setView("book")}/>}

        {view==="week"&&isAdmin&&<>
          <div style={{display:"flex",gap:"10px",alignItems:"center",marginBottom:"14px",flexWrap:"wrap"}}>
            <button onClick={()=>setWeekStart(d=>addDays(d,-7))} style={{fontSize:"20px",background:G.card,border:`1px solid ${G.border}`,cursor:"pointer",color:G.muted,padding:"6px 14px",borderRadius:"8px",lineHeight:1}}>‹</button>
            <span style={{fontSize:"14px",color:G.muted,fontWeight:"600"}}>{toDMY(toDS(weekStart))} – {toDMY(toDS(addDays(weekStart,6)))}</span>
            <button onClick={()=>setWeekStart(d=>addDays(d,7))} style={{fontSize:"20px",background:G.card,border:`1px solid ${G.border}`,cursor:"pointer",color:G.muted,padding:"6px 14px",borderRadius:"8px",lineHeight:1}}>›</button>
            <button onClick={()=>{const d=new Date();d.setHours(0,0,0,0);setWeekStart(d);}} style={{fontSize:"12px",padding:"6px 14px",border:`1.5px solid ${G.border}`,borderRadius:"20px",cursor:"pointer",background:G.card,color:G.muted,fontWeight:"600"}}>{t.today}</button>
          </div>
          <WeekView t={t} bookings={bookings} maintenance={maintenance} hours={hours} startDate={weekStart}/>
        </>}

        {view==="all"&&isAdmin&&<AllView t={t} bookings={bookings}/>}
        {view==="stats"&&isAdmin&&<StatsView t={t} bookings={bookings}/>}
        {view==="settings"&&isAdmin&&<SettingsView t={t} hours={hours} saveHours={saveH}/>}
      </div>

      {/* ── MODALS ── */}
      {modal?.type==="login"&&<LoginModal t={t} onLogin={pw=>{if(pw===ADMIN_PWD){setIsAdmin(true);setModal(null);return true;}return false;}} onClose={()=>setModal(null)}/>}

      {modal?.type==="msg"&&(
        <MW onClose={()=>setModal(null)}>
          <div style={{textAlign:"center",padding:"0.5rem"}}>
            <div style={{fontSize:"44px",marginBottom:"10px"}}>{modal.msg.startsWith("✅")?"":modal.msg.startsWith("⏳")?"":"⚠️"}</div>
            <div style={{color:G.text,fontWeight:"700",marginBottom:"1.25rem",lineHeight:1.6,fontSize:"16px"}}>{modal.msg}</div>
            <PBtn onClick={()=>setModal(null)} bg={G.header}>{t.closeModal}</PBtn>
          </div>
        </MW>
      )}
      {modal?.type==="book"&&<BookModal t={t} court={modal.court} slot={modal.slot} ds={ds} isAdmin={isAdmin} onConfirm={confirmBook} onClose={()=>setModal(null)}/>}
      {modal?.type==="confirm"&&<ConfirmModal t={t} lang={lang} booking={modal.booking} court={modal.court} slot={modal.slot} ds={ds} onClose={()=>setModal(null)}/>}
      {modal?.type==="detail"&&<DetailModal t={t} court={modal.court} slot={modal.slot} booking={modal.booking} isAdmin={isAdmin} canDel={isAdmin||canCancel(ds,modal.slot)} onDelete={()=>cancelB(modal.court,modal.slot)} onEdit={()=>setModal({...modal,type:"edit"})} waitlist={waitlist[ds]?.[modal.court]?.[modal.slot]} onClose={()=>setModal(null)}/>}
      {modal?.type==="edit"&&isAdmin&&<EditModal t={t} booking={modal.booking} onSave={updated=>editBooking(modal.court,modal.slot,updated)} onClose={()=>setModal(null)}/>}
      {modal?.type==="maint_detail"&&isAdmin&&(
        <MW onClose={()=>setModal(null)}>
          <MH>🔧 {t.maint}</MH>
          <div style={{color:G.muted,fontSize:"14px",marginBottom:"1.25rem"}}>{t.court} {modal.court} | {modal.slot}</div>
          <PBtn onClick={()=>toggleMaint(modal.court,modal.slot)} bg={G.maint.bg} tc={G.maint.text} style={{border:`1.5px solid ${G.maint.border}`}}>{t.clearMaint}</PBtn>
          <GhB onClick={()=>setModal(null)}>{t.closeModal}</GhB>
        </MW>
      )}
      {modal?.type==="waitlist"&&<WaitlistModal t={t} court={modal.court} slot={modal.slot} ds={ds} onJoin={joinWaitlist} onClose={()=>setModal(null)}/>}
    </div>
  );
}
