// Ajustes de la clínica (WhatsApp y horario para el asistente)
let clinicPhone='';
let clinicSettings={};
fetch('_data/settings.json?t='+Date.now()).then(function(r){return r.json()}).then(function(s){clinicSettings=s;if(s.whatsapp)clinicPhone=s.whatsapp}).catch(function(){});

// Nav scroll effect
window.addEventListener('scroll',()=>{document.getElementById('mainNav').classList.toggle('scrolled',window.scrollY>50)},{passive:true});

// Mobile nav
const navToggle=document.getElementById('navToggle');
const navLinks=document.getElementById('navLinks');
function setMenu(open){
    if(!navLinks||!navToggle)return;
    navLinks.classList.toggle('active',open);
    navToggle.setAttribute('aria-expanded',open?'true':'false');
    navToggle.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');
    document.body.classList.toggle('menu-open',open);
}
if(navToggle)navToggle.addEventListener('click',()=>setMenu(!navLinks.classList.contains('active')));
document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
document.addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false)});
window.addEventListener('resize',()=>{if(window.innerWidth>1100)setMenu(false)});

// Intersection Observer
const ro=new IntersectionObserver(e=>{e.forEach(x=>{if(x.isIntersecting){x.target.classList.add('visible');ro.unobserve(x.target)}})},{threshold:.12,rootMargin:'0px 0px -30px 0px'});
document.querySelectorAll('.reveal').forEach(el=>ro.observe(el));

// Contact form → WhatsApp
const cf=document.getElementById('contactForm');
if(cf)cf.addEventListener('submit',function(e){
  e.preventDefault();
  const nombre=document.getElementById('nombre').value.trim();
  const telefono=document.getElementById('telefono').value.trim();
  const email=document.getElementById('email').value.trim();
  const asunto=document.getElementById('asunto').value;
  const mensaje=document.getElementById('mensaje').value.trim();
  const asuntoMap={cita:'Solicitar cita',consulta:'Consulta sobre servicios',otros:'Otro'};
  const asuntoTxt=asuntoMap[asunto]||asunto;
  let txt='Hola, soy '+nombre+'. ';
  if(telefono)txt+='Tel: '+telefono+'. ';
  if(email)txt+='Email: '+email+'. ';
  txt+='Motivo: '+asuntoTxt+'. ';
  if(mensaje)txt+=mensaje;
  window.open('https://wa.me/'+clinicPhone+'?text='+encodeURIComponent(txt),'_blank');
  const b=this.querySelector('.btn-submit'),o=b.textContent;
  b.textContent='✓ Abriendo WhatsApp...';b.style.background='#2D6B45';
  setTimeout(()=>{b.textContent=o;b.style.background='';this.reset()},3000);
});

// MAPA DE CONTACTO: Google Maps pone cookies, así que solo se carga al pulsar.
// Se busca por la dirección de Ajustes, así vale para cualquier clínica.
const mapBtn=document.getElementById('mapLoad');
function clinicAddress(){return (clinicSettings&&clinicSettings.address)||''}
if(mapBtn)mapBtn.addEventListener('click',function(){
  const box=document.getElementById('contactMap');
  box.classList.remove('contact-map--off');
  box.innerHTML='<iframe src="https://www.google.com/maps?q='+encodeURIComponent(clinicAddress())+'&output=embed" loading="lazy" allowfullscreen title="Ubicación"></iframe>';
});
const mapDir=document.getElementById('mapDirections');
if(mapDir)mapDir.addEventListener('click',function(){
  mapDir.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(clinicAddress());
});

// ========================
// MODERN FEATURES v2.0
// ========================

// ICON MOUSE FOLLOW
const cursorRing=document.querySelector('.cursor-ring');
if(cursorRing){
    let mx=0,my=0,rx=0,ry=0;
    document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY});
    function animateCursor(){rx+=(mx-rx)*.12;ry+=(my-ry)*.12;cursorRing.style.left=rx+'px';cursorRing.style.top=ry+'px';requestAnimationFrame(animateCursor)}
    animateCursor();
    document.querySelectorAll('.svc-icon,.plan-icon,.store-img').forEach(icon=>{
        icon.addEventListener('mouseenter',()=>{cursorRing.style.width='56px';cursorRing.style.height='56px';cursorRing.style.borderColor='rgba(212,118,78,.6)'});
        icon.addEventListener('mouseleave',()=>{cursorRing.style.width='36px';cursorRing.style.height='36px';cursorRing.style.borderColor='rgba(212,118,78,.3)'});
    });
}

// 3D TILT EFFECT
document.querySelectorAll('.tilt').forEach(card=>{
    card.addEventListener('mousemove',e=>{
        const r=card.getBoundingClientRect();
        const x=e.clientX-r.left;
        const y=e.clientY-r.top;
        const cx=r.width/2;
        const cy=r.height/2;
        const rx=(y-cy)/cy*-6;
        const ry=(x-cx)/cx*6;
        card.style.transform=`perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-5px)`;
    });
    card.addEventListener('mouseleave',()=>{card.style.transform='perspective(800px) rotateX(0) rotateY(0) translateY(0)'});
});

// VIEW TRANSITIONS (page navigation)
document.querySelectorAll('a[href$=".html"]').forEach(link=>{
    link.addEventListener('click',function(e){
        const href=this.getAttribute('href');
        if(!href||href===window.location.pathname.split('/').pop())return;
        // Enlaces que abren otra pestaña (o Ctrl/Cmd+clic) no deben sacar al usuario de esta página
        if(this.target==='_blank'||e.ctrlKey||e.metaKey||e.shiftKey||e.button!==0)return;
        e.preventDefault();
        const overlay=document.createElement('div');
        overlay.className='page-transition active';
        document.body.appendChild(overlay);
        setTimeout(()=>{window.location.href=href},350);
    });
});

// Al volver con el botón Atrás el navegador restaura la página tal cual: quitar la cortina
window.addEventListener('pageshow',e=>{if(e.persisted)document.querySelectorAll('.page-transition.active').forEach(o=>o.remove())});

// LAZY LOAD VIDEO ON MOBILE
const heroVideo=document.getElementById('heroVideo');
if(heroVideo&&window.innerWidth<768){
    heroVideo.removeAttribute('autoplay');
    heroVideo.preload='none';
}

// SCROLL TO TOP
const scrollTopBtn=document.createElement('button');
scrollTopBtn.className='scroll-top';
scrollTopBtn.innerHTML='↑';
scrollTopBtn.setAttribute('aria-label','Volver arriba');
document.body.appendChild(scrollTopBtn);
window.addEventListener('scroll',()=>{scrollTopBtn.classList.toggle('visible',window.scrollY>400)},{passive:true});
scrollTopBtn.addEventListener('click',()=>{window.scrollTo({top:0,behavior:'smooth'})});

// SCROLL-BASED NAV BACKGROUND
let lastScroll=0;
window.addEventListener('scroll',()=>{
    const nav=document.getElementById('mainNav');
    const st=window.scrollY;
    // Con el menú abierto la barra no se esconde. Sin transform cuando está visible:
    // un transform haría que el menú (position:fixed) quedara encerrado en la barra.
    if(st>lastScroll&&st>200&&!document.body.classList.contains('menu-open')){nav.style.transform='translateY(-100%)'}
    else{nav.style.transform=''}
    lastScroll=st;
},{passive:true});

// VetBot Modal
const vetbotOverlay=document.getElementById('vetbotOverlay');
const vetbotModal=document.getElementById('vetbotModal');
const vetbotClose=document.getElementById('vetbotClose');
const vetbotSend=document.getElementById('vetbotSend');
const vetbotInput=document.getElementById('vetbotInput');
const vetbotChat=document.getElementById('vetbotChat');
let vetbotOpen=false;
let vetbotData={};

function openVetBot(){
    if(!vetbotOverlay)return;
    vetbotOverlay.classList.add('active');
    vetbotOpen=true;
    document.body.style.overflow='hidden';
    if(vetbotInput)setTimeout(()=>vetbotInput.focus(),400);
}
function closeVetBot(){
    if(!vetbotOverlay)return;
    vetbotOverlay.classList.remove('active');
    vetbotOpen=false;
    document.body.style.overflow='';
}

document.querySelectorAll('.vetbot-trigger').forEach(btn=>{
    btn.addEventListener('click',function(e){
        e.preventDefault();
        openVetBot();
    });
});

if(vetbotClose)vetbotClose.addEventListener('click',closeVetBot);
if(vetbotOverlay)vetbotOverlay.addEventListener('click',function(e){if(e.target===this)closeVetBot()});

document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
        if(vetbotOpen)closeVetBot();
    }
});

// Load VetBot responses from JSON files
fetch('_data/chatbot/index.json?t='+Date.now())
    .then(function(r){return r.json()})
    .then(function(data){vetbotData=data})
    .catch(function(){vetbotData={}});

// Marcas que se pueden usar en las respuestas del asistente (panel → VetBot):
// {horario} = horario actual del panel, {estado} = abierto/cerrado ahora,
// {clinica} = nombre de la clínica, {telefono} = teléfono (los dos de Ajustes).
function fillVetBotText(text){
    const hours=window.ClinicSchedule?ClinicSchedule.groups(clinicSettings).map(g=>g.days+': '+(g.closed?'cerrado':g.hours)).join('; '):'';
    const state=window.ClinicSchedule?ClinicSchedule.status(clinicSettings).text:'';
    return String(text).replace(/{horario}/g,hours).replace(/{estado}/g,state)
        .replace(/{clinica}/g,clinicSettings.name||'la clínica').replace(/{telefono}/g,clinicSettings.phone||'');
}

function getVetBotResponse(msg){
    const lower=msg.toLowerCase();
    // Check loaded chatbot responses
    if(vetbotData.responses){
        for(var i=0;i<vetbotData.responses.length;i++){
            var r=vetbotData.responses[i];
            var kws=String(r.keywords||'').toLowerCase().split(',').map(function(s){return s.trim()}).filter(Boolean);
            for(var j=0;j<kws.length;j++){
                if(lower.includes(kws[j]))return fillVetBotText(r.response);
            }
        }
    }
    // Fallback defaults
    if(lower.includes('cita')||lower.includes('appointment'))return 'Perfecto, para solicitar una cita puedo necesitar algunos datos. ¿Qué tipo de consulta necesitas?';
    if(lower.includes('hola')||lower.includes('buenas'))return fillVetBotText('¡Hola! Soy el asistente virtual de {clinica}. ¿En qué puedo ayudarte?');
    if(lower.includes('vacuna')||lower.includes('vacunación'))return 'La vacunación es esencial. Ofrecemos planes de vacunación adaptados a cada mascota. ¿Tienes perro o gato?';
    if(lower.includes('precio')||lower.includes('coste')||lower.includes('cuánto'))return 'Nuestros precios son muy competitivos. ¿Te gustaría saber el precio de algún servicio en concreto?';
    if(lower.includes('horario')||lower.includes('hora')||lower.includes('cuándo')||lower.includes('abierto')){
        if(window.ClinicSchedule){
            const lines=ClinicSchedule.groups(clinicSettings).map(g=>g.days+': '+(g.closed?'cerrado':g.hours));
            return 'Nuestro horario es: '+lines.join('; ')+'. '+ClinicSchedule.status(clinicSettings).text+'.';
        }
        return 'Puedes consultar nuestro horario en la página de contacto.';
    }
    if(lower.includes('urgencia')||lower.includes('emergencia')||lower.includes('24h')||lower.includes('noche'))return 'Para urgencias fuera de horario, llama al '+(clinicSettings.phone||clinicPhone)+' y te redirigimos al servicio de guardia correspondiente.';
    return 'Gracias por tu interés. Un miembro de nuestro equipo te atenderá pronto. ¿Hay algo más en lo que pueda ayudarte?';
}

// Las respuestas del panel pueden llevar enlaces (<a href='citas.html'>Pedir cita</a>):
// se muestran como enlaces y cualquier otra etiqueta como texto.
function botHtml(text){
    const d=document.createElement('div');d.textContent=text;
    return d.innerHTML.replace(/&lt;a href=['"]((?:https?:\/\/|tel:|mailto:|[a-z0-9_-]+\.html)[^'"&<>]*)['"]&gt;(.*?)&lt;\/a&gt;/gi,
        function(m,url,label){const ext=/^https?:/i.test(url);return '<a href="'+url+'"'+(ext?' target="_blank" rel="noopener"':'')+'>'+label+'</a>'});
}

function addVetBotMsg(text,type){
    if(!vetbotChat)return;
    const msg=document.createElement('div');
    msg.className=`vetbot-msg vetbot-msg--${type}`;
    if(type==='bot')msg.innerHTML=botHtml(text);else msg.textContent=text;
    vetbotChat.appendChild(msg);
    vetbotChat.scrollTop=vetbotChat.scrollHeight;
}

function showTyping(){
    if(!vetbotChat)return;
    const typing=document.createElement('div');
    typing.className='vetbot-typing';
    typing.id='vetbotTyping';
    typing.innerHTML='<span></span><span></span><span></span>';
    vetbotChat.appendChild(typing);
    vetbotChat.scrollTop=vetbotChat.scrollHeight;
}

function removeTyping(){
    const t=document.getElementById('vetbotTyping');
    if(t)t.remove();
}

function sendVetBotMsg(){
    if(!vetbotInput)return;
    const msg=vetbotInput.value.trim();
    if(!msg)return;
    addVetBotMsg(msg,'user');
    vetbotInput.value='';
    showTyping();
    setTimeout(()=>{
        removeTyping();
        addVetBotMsg(getVetBotResponse(msg),'bot');
    },1000+Math.random()*1000);
}

if(vetbotSend)vetbotSend.addEventListener('click',sendVetBotMsg);
if(vetbotInput)vetbotInput.addEventListener('keydown',function(e){if(e.key==='Enter')sendVetBotMsg()});

