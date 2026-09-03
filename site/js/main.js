// Cart System
let cart=JSON.parse(localStorage.getItem('vetCart'))||[];
const cartBtn=document.getElementById('cartBtn');
const cartBadge=document.getElementById('cartBadge');
const cartOverlay=document.getElementById('cartOverlay');
const cartSidebar=document.getElementById('cartSidebar');
const cartClose=document.getElementById('cartClose');
const cartItems=document.getElementById('cartItems');
const cartEmpty=document.getElementById('cartEmpty');
const cartFooter=document.getElementById('cartFooter');
const cartTotal=document.getElementById('cartTotal');
const checkoutBtn=document.getElementById('checkoutBtn');
const continueBtn=document.getElementById('continueBtn');

function saveCart(){localStorage.setItem('vetCart',JSON.stringify(cart))}
function updateBadge(){const t=cart.reduce((s,i)=>s+i.qty,0);cartBadge.textContent=t;cartBadge.classList.toggle('show',t>0)}
function renderCart(){
    if(cart.length===0){cartEmpty.style.display='block';cartFooter.style.display='none';cartItems.innerHTML='';cartItems.appendChild(cartEmpty);return}
    cartEmpty.style.display='none';cartFooter.style.display='block';cartItems.innerHTML='';
    cart.forEach(item=>{const el=document.createElement('div');el.className='cart-item';el.innerHTML=`<div class="cart-item-img"><img src="${item.img}" alt="${item.name}"></div><div class="cart-item-info"><div class="cart-item-brand">${item.brand}</div><div class="cart-item-name">${item.name}</div><div class="cart-item-price">${(item.price*item.qty).toFixed(2)}€</div><div class="cart-item-controls"><div class="cart-qty"><button onclick="changeQty(${item.id},-1)">−</button><span>${item.qty}</span><button onclick="changeQty(${item.id},1)">+</button></div><button class="cart-remove" onclick="removeItem(${item.id})">Eliminar</button></div></div>`;cartItems.appendChild(el)});
    cartTotal.textContent=cart.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2)+'€';
}
function addToCart(id,brand,name,price,img){const e=cart.find(i=>i.id===id);if(e)e.qty++;else cart.push({id,brand,name,price:parseFloat(price),img,qty:1});saveCart();updateBadge();renderCart();openCart()}
function changeQty(id,d){const i=cart.find(x=>x.id===id);if(i){i.qty+=d;if(i.qty<=0)cart=cart.filter(x=>x.id!==id);saveCart();updateBadge();renderCart()}}
function removeItem(id){cart=cart.filter(i=>i.id!==id);saveCart();updateBadge();renderCart()}
function openCart(){cartOverlay.classList.add('active');cartSidebar.classList.add('active');document.body.style.overflow='hidden'}
function closeCart(){cartOverlay.classList.remove('active');cartSidebar.classList.remove('active');document.body.style.overflow=''}

cartBtn.addEventListener('click',openCart);
cartOverlay.addEventListener('click',closeCart);
cartClose.addEventListener('click',closeCart);
if(continueBtn)continueBtn.addEventListener('click',closeCart);
if(checkoutBtn)checkoutBtn.addEventListener('click',()=>{const total=cart.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2);window.open(`https://wa.me/34955321470?text=Hola,%20me%20interesan%20estos%20productos%20de%20la%20tienda%20(%20${total}%20€).%20¿Podéis%20confirmarme%20disponibilidad?`,'_blank');closeCart()});

document.querySelectorAll('.store-btn').forEach(btn=>{btn.addEventListener('click',function(){const i=this.closest('.store-item');const{id,brand,name,price,img}=i.dataset;addToCart(parseInt(id),brand,name,price,img);this.textContent='✓ Añadido';this.style.background='#2D6B45';setTimeout(()=>{this.textContent='Añadir al carrito';this.style.background=''},1500)})});

// Nav scroll effect
window.addEventListener('scroll',()=>{document.getElementById('mainNav').classList.toggle('scrolled',window.scrollY>50)},{passive:true});

// Mobile nav
const navToggle=document.getElementById('navToggle');
const navLinks=document.getElementById('navLinks');
if(navToggle)navToggle.addEventListener('click',()=>navLinks.classList.toggle('active'));
document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>navLinks.classList.remove('active')));

// Intersection Observer
const ro=new IntersectionObserver(e=>{e.forEach(x=>{if(x.isIntersecting){x.target.classList.add('visible');ro.unobserve(x.target)}})},{threshold:.12,rootMargin:'0px 0px -30px 0px'});
document.querySelectorAll('.reveal').forEach(el=>ro.observe(el));

// Contact form
const cf=document.getElementById('contactForm');
if(cf)cf.addEventListener('submit',function(e){e.preventDefault();const b=this.querySelector('.btn-submit'),o=b.textContent;b.textContent='✓ Enviado';b.style.background='#2D6B45';setTimeout(()=>{b.textContent=o;b.style.background='';this.reset()},3000)});

// Store tabs
document.querySelectorAll('.store-tab').forEach(t=>t.addEventListener('click',function(){document.querySelectorAll('.store-tab').forEach(b=>b.classList.remove('active'));this.classList.add('active');const c=this.dataset.cat;document.querySelectorAll('.store-item').forEach(i=>{i.style.display=(c==='todos'||i.dataset.cat===c)?'':'none'})}));

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
        e.preventDefault();
        const overlay=document.createElement('div');
        overlay.className='page-transition active';
        document.body.appendChild(overlay);
        setTimeout(()=>{window.location.href=href},350);
    });
});

// DARK MODE TOGGLE (system preference)
if(window.matchMedia('(prefers-color-scheme:dark)').matches){
    document.documentElement.classList.add('dark');
}

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
    if(st>100){nav.style.background=nav.style.background||'rgba(255,255,255,.97)'}
    if(st>lastScroll&&st>200){nav.style.transform='translateY(-100%)'}
    else{nav.style.transform='translateY(0)'}
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

const vetbotResponses={
    'cita':'Perfecto, para solicitar una cita puedo necesitar algunos datos. ¿Qué tipo de consulta necesitas? (Consulta general, vacunación, cirugía, terapias alternativas...)',
    'hola':'¡Hola! Soy el asistente virtual de la Clínica Veterinaria San José. ¿En qué puedo ayudarte?',
    'vacuna':'La vacunación es esencial. Ofrecemos planes de vacunación adaptados a cada mascota. ¿Tienes perro o gato?',
    'precio':'Nuestros precios son muy competitivos. ¿Te gustaría saber el precio de algún servicio en concreto?',
    'horario':'Nuestro horario es: Lunes a Viernes de 10:00 a 21:00 y Sábados de 10:00 a 13:30.',
    'urgencia':'Para urgencias fuera de horario, llama al 955 321 470 y te redirigimos al servicio de guardia correspondiente.',
    'default':'Gracias por tu interés. Un miembro de nuestro equipo te atenderá pronto. ¿Hay algo más en lo que pueda ayudarte?'
};

function getVetBotResponse(msg){
    const lower=msg.toLowerCase();
    if(lower.includes('cita')||lower.includes('appointment'))return vetbotResponses.cita;
    if(lower.includes('hola')||lower.includes('buenas'))return vetbotResponses.hola;
    if(lower.includes('vacuna')||lower.includes('vacunación'))return vetbotResponses.vacuna;
    if(lower.includes('precio')||lower.includes('coste')||lower.includes('cuánto'))return vetbotResponses.precio;
    if(lower.includes('horario')||lower.includes('hora')||lower.includes('cuándo'))return vetbotResponses.horario;
    if(lower.includes('urgencia')||lower.includes('emergencia')||lower.includes('24h')||lower.includes('noche'))return vetbotResponses.urgencia;
    return vetbotResponses.default;
}

function addVetBotMsg(text,type){
    if(!vetbotChat)return;
    const msg=document.createElement('div');
    msg.className=`vetbot-msg vetbot-msg--${type}`;
    msg.textContent=text;
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

updateBadge();renderCart();
