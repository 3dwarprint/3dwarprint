  /*
    ⚠️ Ce bloc est le SEUL <script> de la page.
    Supabase et Stripe sont chargés dynamiquement au besoin.
  */

  // ─── CONFIG ───────────────────────────────────────────
  var CONFIG = {
    SUPABASE_URL:  'https://TON-PROJET.supabase.co',
    SUPABASE_ANON: 'TON_ANON_KEY',
    STRIPE_PK:     'pk_test_TON_CLE',
    CHECKOUT_URL:  'https://TON-PROJET.supabase.co/functions/v1/create-checkout',
  };

  // ─── UTILS ────────────────────────────────────────────
  function loadScript(src) {
    return new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function toast(msg) {
    var c = document.getElementById('toastBox');
    var t = document.createElement('div');
    t.className = 'pointer-events-auto flex items-center gap-3 bg-bg-alt border border-accent/20 px-5 py-3 toast-enter';
    t.innerHTML = '<span class="iconify text-accent text-lg" data-icon="lucide:check-circle"></span><span class="text-sm">' + msg + '</span>';
    c.appendChild(t);
    setTimeout(function() { t.classList.remove('toast-enter'); t.classList.add('toast-exit'); setTimeout(function() { t.remove(); }, 300); }, 2500);
  }

  function fmtPrice(n) { return n.toFixed(2).replace('.', ',') + ' €'; }

  // ─── DATA ─────────────────────────────────────────────
  var CATS = [
    { id:'all',     label:'Tout',        count:'4 fichiers',  icon:'lucide:layout-grid' },
    { id:'sci-fi',  label:'Sci-Fi',      count:'4 fichiers',  icon:'lucide:cpu' },
  ];

  // CHARGEMENT DYNAMIQUE SUPABASE - voir fonction loadProducts()
  var PRODUCTS = [
    {
      id:1, name:"Biomorphic Base", price:10.00, cat:"sci-fi",
      img:"images/base_rendu.png", badge:"Nouveau", pieces:1, scale:"28mm", sup:false,
      desc:"Décor modulaire de base contaminée. Compatible avec toute la gamme Biomorphic.",
      details:["1 fichier STL","Sans support","Échelle 28mm","Modulaire — s'assemble avec la gamme","FDM & Résine"]
    },
    {
      id:2, name:"Biomorphic Console", price:9.00, cat:"sci-fi",
      img:"images/console.png", badge:"Nouveau", pieces:1, scale:"28mm", sup:false,
      desc:"Console contaminée modulaire. Détails organiques haute définition.",
      details:["1 fichier STL","Sans support","Échelle 28mm","Modulaire — s'assemble avec la gamme","FDM & Résine"]
    },
    {
      id:3, name:"Biomorphic Stairs", price:7.00, cat:"sci-fi",
      img:"images/stairs.png", badge:null, pieces:1, scale:"28mm", sup:false,
      desc:"Escalier contaminé modulaire. Connecteurs intégrés pour assemblage rapide.",
      details:["1 fichier STL","Sans support","Échelle 28mm","Modulaire — s'assemble avec la gamme","FDM & Résine"]
    },
    {
      id:4, name:"Biomorphic Bunker", price:8.00, cat:"sci-fi",
      img:"images/bunker2.png", badge:null, pieces:1, scale:"28mm", sup:false,
      desc:"Bunker contaminé modulaire. Point défensif pour vos batailles en zone hostile.",
      details:["1 fichier STL","Sans support","Échelle 28mm","Modulaire — s'assemble avec la gamme","FDM & Résine"]
    },
  ];

  var FAQS = [
    { q:"Quelle échelle sont les fichiers STL ?", a:"Majoritairement 28mm (Warhammer 40k, Age of Sigmar). Certains kits incluent 32mm et 15mm. Chaque fiche précise les dimensions exactes." },
    { q:"Les fichiers nécessitent-ils des supports ?", a:"Tous nos fichiers sont conçus sans support. Pièces pré-orientées et découpées. Guide d'impression inclus dans chaque archive." },
    { q:"Puis-je revendre les pièces imprimées ?", a:"Licence personnelle pour votre usage. Licence commerciale disponible en option. Redistribution des fichiers numériques interdite." },
    { q:"Mes données bancaires sont-elles sécurisées ?", a:"Le paiement est géré par Stripe. Nous ne stockons aucune donnée bancaire. Stripe est conforme PCI-DSS niveau 1." },
    { q:"J'ai perdu mes liens de téléchargement", a:"Utilisez la section « Mes commandes » avec l'email utilisé lors du paiement pour récupérer tous vos liens." },
  ];

  // ─── STATE ────────────────────────────────────────────
  var cart = [];
  var currentCat = 'all';

  // ─── CATEGORIES ───────────────────────────────────────
  function renderCats() {
    var html = '';
    for (var i = 0; i < CATS.length; i++) {
      var c = CATS[i];
      var active = c.id === currentCat ? ' active' : '';
      html += '<button class="cat-btn border border-white/[0.08] p-6 text-left card-hover' + active + '" data-cat="' + c.id + '">' +
        '<span class="iconify ci text-2xl text-gray-500 mb-4 block" data-icon="' + c.icon + '"></span>' +
        '<div class="font-display font-semibold text-sm">' + c.label + '</div>' +
        '<div class="text-text-muted text-xs mt-1">' + c.count + '</div></button>';
    }
    document.getElementById('catGrid').innerHTML = html;

    var btns = document.querySelectorAll('.cat-btn');
    for (var j = 0; j < btns.length; j++) {
      btns[j].addEventListener('click', function() {
        currentCat = this.getAttribute('data-cat');
        renderCats();
        renderProducts();
      });
    }
  }

  // ─── PRODUCTS ─────────────────────────────────────────
  function getFiltered() {
    var search = document.getElementById('searchInput').value.toLowerCase();
    var sort = document.getElementById('sortSelect').value;
    var list = [];
    for (var i = 0; i < PRODUCTS.length; i++) {
      var p = PRODUCTS[i];
      var matchCat = currentCat === 'all' || p.cat === currentCat;
      var matchSearch = !search || p.name.toLowerCase().indexOf(search) !== -1 || p.desc.toLowerCase().indexOf(search) !== -1 || p.cat.indexOf(search) !== -1;
      if (matchCat && matchSearch) list.push(p);
    }
    if (sort === 'price-asc') list.sort(function(a,b){return a.price-b.price;});
    else if (sort === 'price-desc') list.sort(function(a,b){return b.price-a.price;});
    else if (sort === 'newest') list.sort(function(a,b){return (b.badge==='Nouveau'?1:0)-(a.badge==='Nouveau'?1:0);});
    else list.sort(function(a,b){return (b.badge==='Bestseller'||b.badge==='Populaire'?1:0)-(a.badge==='Bestseller'||a.badge==='Populaire'?1:0);});
    return list;
  }

  function renderProducts() {
    var list = getFiltered();
    var grid = document.getElementById('productsGrid');
    var noR = document.getElementById('noResults');
    if (!list.length) { grid.innerHTML = ''; noR.classList.remove('hidden'); return; }
    noR.classList.add('hidden');
    var html = '';
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var imgUrl = 'https://picsum.photos/seed/' + p.img + '/600/450.jpg';
      html += '<div class="prod-card border border-white/[0.08] card-hover group cursor-pointer" data-id="' + p.id + '" style="animation:slideUp .4s ease ' + (i*0.05) + 's both">' +
        '<div class="relative aspect-[4/3] overflow-hidden bg-bg-card">' +
        '<img src="' + imgUrl + '" alt="' + p.name + '" class="card-img w-full h-full object-cover" loading="lazy">' +
        '<div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>' +
        (p.badge ? '<div class="absolute top-4 left-4 bg-accent text-[#0B0D10] px-3 py-1 text-[10px] font-bold uppercase tracking-widest">' + p.badge + '</div>' : '') +
        '<div class="absolute top-4 right-4">' + (!p.sup ? '<span class="bg-black/60 backdrop-blur-sm text-[9px] font-bold uppercase tracking-wider px-2 py-1 text-green-400">Sans support</span>' : '<span class="bg-black/60 backdrop-blur-sm text-[9px] font-bold uppercase tracking-wider px-2 py-1 text-yellow-400">Support requis</span>') + '</div>' +
        '<div class="absolute bottom-4 left-4 right-4 flex items-end justify-between"><span class="flex items-center gap-2 text-xs text-gray-300"><span class="iconify text-sm" data-icon="lucide:box"></span>' + p.pieces + ' pièces</span><span class="text-xs text-gray-300">' + p.scale + '</span></div>' +
        '</div><div class="p-6"><div class="flex items-start justify-between gap-4 mb-3"><h3 class="font-display font-semibold text-base tracking-tight leading-tight">' + p.name + '</h3><div class="text-right shrink-0">' +
        (p.oldPrice ? '<span class="text-text-muted text-xs line-through block">' + fmtPrice(p.oldPrice) + '</span>' : '') +
        '<span class="font-display font-bold text-lg">' + fmtPrice(p.price) + '</span></div></div>' +
        '<p class="text-text-muted text-sm line-clamp-2 mb-4">' + p.desc + '</p>' +
        '<button class="add-btn w-full py-3 border border-white/[0.1] text-[11px] font-bold uppercase tracking-widest hover:bg-accent hover:border-accent hover:text-[#0B0D10] transition-all flex items-center justify-center gap-2" data-id="' + p.id + '"><span class="iconify text-sm" data-icon="lucide:shopping-bag"></span>Ajouter au panier</button></div></div>';
    }
    grid.innerHTML = html;

    // Event listeners
    var cards = document.querySelectorAll('.prod-card');
    for (var j = 0; j < cards.length; j++) {
      cards[j].addEventListener('click', function(e) {
        if (e.target.closest('.add-btn')) return;
        openModal(parseInt(this.getAttribute('data-id')));
      });
    }
    var addBtns = document.querySelectorAll('.add-btn');
    for (var k = 0; k < addBtns.length; k++) {
      addBtns[k].addEventListener('click', function(e) {
        e.stopPropagation();
        var id = parseInt(this.getAttribute('data-id'));
        addToCart(id);
      });
    }
  }

  // ─── CART ─────────────────────────────────────────────
  function addToCart(id) {
    var p = null;
    for (var i = 0; i < PRODUCTS.length; i++) { if (PRODUCTS[i].id === id) { p = PRODUCTS[i]; break; } }
    if (!p) return;
    var found = false;
    for (var j = 0; j < cart.length; j++) {
      if (cart[j].id === id) { cart[j].qty++; found = true; break; }
    }
    if (!found) cart.push({ id:p.id, name:p.name, price:p.price, img:p.img, qty:1 });
    updateCart();
    toast(p.name + ' ajouté');
  }

  function removeFromCart(id) {
    var newCart = [];
    for (var i = 0; i < cart.length; i++) { if (cart[i].id !== id) newCart.push(cart[i]); }
    cart = newCart;
    updateCart();
  }

  function changeQty(id, delta) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === id) {
        cart[i].qty += delta;
        if (cart[i].qty <= 0) { removeFromCart(id); return; }
        break;
      }
    }
    updateCart();
  }

  function updateCart() {
    var count = 0, total = 0;
    for (var i = 0; i < cart.length; i++) { count += cart[i].qty; total += cart[i].price * cart[i].qty; }
    var badge = document.getElementById('cartBadge');
    var footer = document.getElementById('cartFooter');
    if (count > 0) { badge.classList.remove('hidden'); badge.classList.add('flex'); badge.textContent = count; footer.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); badge.classList.remove('flex'); footer.classList.add('hidden'); }
    document.getElementById('cartTotal').textContent = fmtPrice(total);

    var itemsEl = document.getElementById('cartItems');
    if (!cart.length) {
      itemsEl.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-center"><span class="iconify text-4xl text-gray-600 mb-4" data-icon="lucide:shopping-bag"></span><p class="text-text-muted text-sm">Votre panier est vide</p></div>';
      return;
    }
    var html = '';
    for (var j = 0; j < cart.length; j++) {
      var c = cart[j];
      html += '<div class="flex gap-4 py-4 border-b border-white/[0.08]"><div class="w-20 h-20 shrink-0 overflow-hidden bg-bg-card"><img src="https://picsum.photos/seed/' + c.img + '/200/200.jpg" class="w-full h-full object-cover"></div>' +
        '<div class="flex-1 min-w-0"><h4 class="font-display font-medium text-sm truncate">' + c.name + '</h4><p class="text-text-muted text-xs mt-1">' + fmtPrice(c.price) + '</p>' +
        '<div class="flex items-center gap-3 mt-2">' +
        '<button class="cq-btn w-7 h-7 border border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white transition-colors" data-id="' + c.id + '" data-d="-1"><span class="iconify text-xs" data-icon="lucide:minus"></span></button>' +
        '<span class="text-sm font-medium w-6 text-center">' + c.qty + '</span>' +
        '<button class="cq-btn w-7 h-7 border border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white transition-colors" data-id="' + c.id + '" data-d="1"><span class="iconify text-xs" data-icon="lucide:plus"></span></button>' +
        '<button class="rm-btn ml-auto text-gray-600 hover:text-accent transition-colors" data-id="' + c.id + '"><span class="iconify text-base" data-icon="lucide:trash-2"></span></button>' +
        '</div></div></div>';
    }
    itemsEl.innerHTML = html;

    var cqBtns = itemsEl.querySelectorAll('.cq-btn');
    for (var k = 0; k < cqBtns.length; k++) {
      cqBtns[k].addEventListener('click', function() { changeQty(parseInt(this.getAttribute('data-id')), parseInt(this.getAttribute('data-d'))); });
    }
    var rmBtns = itemsEl.querySelectorAll('.rm-btn');
    for (var l = 0; l < rmBtns.length; l++) {
      rmBtns[l].addEventListener('click', function() { removeFromCart(parseInt(this.getAttribute('data-id'))); });
    }
  }

  // ─── PRODUCT MODAL + 3D VIEWER ───────────────────────
  var mvRenderer, mvScene, mvCamera, mvControls, mvMesh, mvAnim, mvMode = 'solid', mvColor = '#C0C0C0';

  function createDemoShape(cat) {
    var g = new THREE.Group();
    var m = new THREE.MeshStandardMaterial({ color: mvColor, roughness: 0.5, metalness: 0.2 });
    var mDark = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.8 });
    var mWood = new THREE.MeshStandardMaterial({ color: '#8B7355', roughness: 0.7 });
    var mMetal = new THREE.MeshStandardMaterial({ color: '#555', roughness: 0.4, metalness: 0.6 });

    function box(w,h,d,x,y,z,mat) { var b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat||m); b.position.set(x,y,z); b.castShadow=true; b.receiveShadow=true; g.add(b); return b; }
    function cyl(rt,rb,h,s,x,y,z,mat) { var c=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,s),mat||m); c.position.set(x,y,z); c.castShadow=true; g.add(c); return c; }

    if (cat === 'sci-fi') {
      box(4,2.5,3.5,0,1.25,0); box(4.4,0.2,3.9,0,2.6,0);
      box(1.4,2,0.15,0,1,1.73,mDark); box(0.8,0.6,0.05,1.2,1.8,1.73,mMetal);
      for(var i=0;i<4;i++) box(0.6,0.05,0.05,-1.3,1.4+i*0.2,1.73,mMetal);
      box(2,0.15,0.6,0,0.075,2.15); box(0.3,2.5,0.6,-2.2,1.25,0); box(0.3,2.5,0.6,2.2,1.25,0);
      cyl(0.3,0.3,0.8,12,2.8,0.4,2,mWood);
    } else if (cat === 'fantasy') {
      box(3,3,3,0,1.5,0); box(3.4,0.15,3.4,0,3.075,0);
      cyl(1.8,2,1.5,8,0,4.2,m); cyl(2,1.8,0.3,8,4.8,4.2,m);
      box(0.8,2,0.1,0,1,1.51,mDark);
    } else if (cat === 'ruines') {
      box(3,2.5,0.4,0,1.25,0); box(1.2,1.8,0.4,1.8,0.9,0);
      box(0.6,0.3,0.4,2.7,0.15,0.3); box(0.5,0.2,0.3,-0.5,0.1,0.5);
      box(0.8,0.15,0.6,0.5,0.075,0.8); box(0.3,0.4,0.3,1.2,0.2,1);
    } else if (cat === 'nature') {
      cyl(0.15,0.2,3,8,0,1.5,mWood);
      var leaves = new THREE.Mesh(new THREE.SphereGeometry(1.2,8,6), new THREE.MeshStandardMaterial({color:'#4A6741',roughness:0.8}));
      leaves.position.set(0,3.5,1.5); leaves.castShadow=true; g.add(leaves);
      box(1.5,0.8,1.2,3,0.4,0,new THREE.MeshStandardMaterial({color:'#777',roughness:0.9}));
      box(0.8,0.5,0.8,-2,0.25,-1,new THREE.MeshStandardMaterial({color:'#666',roughness:0.9}));
    } else {
      box(0.6,0.8,0.6,-1,0.4,0,mWood); box(0.6,0.8,0.6,0.8,0.4,0,mWood);
      box(0.8,0.5,0.6,2,0.25,0.5); box(1,0.3,0.7,-0.5,0.15,1.2);
      cyl(0.25,0.25,0.7,10,1.5,0.35,-0.8,mMetal);
    }
    return g;
  }

  function initModalViewer(canvas, cat) {
    mvScene = new THREE.Scene();
    mvScene.background = new THREE.Color('#090B0E');
    var w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
    mvCamera = new THREE.PerspectiveCamera(45, w/Math.max(h,1), 0.1, 1000);
    mvCamera.position.set(6, 5, -6);
    mvRenderer = new THREE.WebGLRenderer({ canvas:canvas, antialias:true });
    mvRenderer.setSize(w, h);
    mvRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mvRenderer.shadowMap.enabled = true;
    mvRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    mvRenderer.toneMappingExposure = 1.1;

    mvScene.add(new THREE.AmbientLight('#ffffff', 0.4));
    var dl = new THREE.DirectionalLight('#FFF5E6', 0.9);
    dl.position.set(6,10,5); dl.castShadow=true; dl.shadow.mapSize.set(512,512);
    dl.shadow.camera.near=0.5; dl.shadow.camera.far=30; dl.shadow.camera.left=-8; dl.shadow.camera.right=8; dl.shadow.camera.top=8; dl.shadow.camera.bottom=-8;
    mvScene.add(dl);
    var fill = new THREE.DirectionalLight('#D4963A', 0.2); fill.position.set(-4,3,-4); mvScene.add(fill);

    mvScene.add(new THREE.GridHelper(16,16,'#1a1d22','#14161a'));
    var gnd = new THREE.Mesh(new THREE.PlaneGeometry(16,16), new THREE.ShadowMaterial({opacity:0.3}));
    gnd.rotation.x=-Math.PI/2; gnd.position.y=-0.01; gnd.receiveShadow=true; mvScene.add(gnd);

    mvMesh = createDemoShape(cat);
    mvScene.add(mvMesh);
    var box = new THREE.Box3().setFromObject(mvMesh);
    var center = box.getCenter(new THREE.Vector3());
    var size = box.getSize(new THREE.Vector3());
    mvMesh.position.sub(center);
    mvMesh.position.y += box.min.y - center.y + 0.001;
    mvControls = new THREE.OrbitControls(mvCamera, mvRenderer.domElement);
    mvControls.enableDamping=true; mvControls.dampingFactor=0.08;
    mvControls.minDistance=2; mvControls.maxDistance=20;
    mvControls.maxPolarAngle=Math.PI/2+0.1;
    mvControls.target.set(0,size.y/2,0);
    applyModalMode();

    // Info
    var tv=0,tt=0;
    mvMesh.traverse(function(c){if(c.isMesh&&c.geometry){var g=c.geometry;tv+=g.attributes.position?g.attributes.position.count:0;tt+=g.index?g.index.count/3:(g.attributes.position?g.attributes.position.count/3:0);}});
    var infoEl = document.getElementById('mvInfo');
    if(infoEl) infoEl.textContent = tv.toLocaleString('fr-FR') + ' sommets · ' + Math.round(tt).toLocaleString('fr-FR') + ' triangles · ' + size.x.toFixed(1)+'×'+size.y.toFixed(1)+'×'+size.z.toFixed(1);

    function animate() { mvAnim = requestAnimationFrame(animate); mvControls.update(); mvRenderer.render(mvScene,mvCamera); }
    animate();
  }

  function destroyModalViewer() {
    if (mvAnim) cancelAnimationFrame(mvAnim);
    if (mvControls) mvControls.dispose();
    if (mvRenderer) mvRenderer.dispose();
    mvRenderer=null; mvScene=null; mvCamera=null; mvControls=null; mvMesh=null; mvAnim=null;
  }

  function applyModalMode() {
    if (!mvMesh) return;
    mvMesh.traverse(function(c) {
      if (!c.isMesh) return;
      if (mvMode==='solid') c.material = new THREE.MeshStandardMaterial({color:mvColor,roughness:0.5,metalness:0.2});
      else if (mvMode==='normal') c.material = new THREE.MeshNormalMaterial();
      else c.material = new THREE.MeshBasicMaterial({color:'#D4963A',wireframe:true});
    });
  }

  function setMvMode(mode) {
    mvMode = mode;
    var btns = document.querySelectorAll('.vmode');
    for(var i=0;i<btns.length;i++){btns[i].classList.remove('on');btns[i].classList.add('text-gray-400');}
    var active = document.querySelector('.vmode[data-m="'+mode+'"]');
    if(active){active.classList.add('on');active.classList.remove('text-gray-400');}
    document.getElementById('mvColors').style.opacity = mode==='solid'?'1':'0.3';
    document.getElementById('mvColors').style.pointerEvents = mode==='solid'?'auto':'none';
    applyModalMode();
  }

  function setMvColor(color) {
    mvColor = color;
    if(mvMode==='solid') applyModalMode();
    document.querySelectorAll('#mvColors button').forEach(function(b){b.style.borderColor='transparent';});
    event.currentTarget.style.borderColor='#D4963A';
  }

  function openModal(id) {
    var p = null;
    for(var i=0;i<PRODUCTS.length;i++){if(PRODUCTS[i].id===id){p=PRODUCTS[i];break;}}
    if(!p) return;
    var modal = document.getElementById('productModal');
    var content = document.getElementById('modalContent');

    content.innerHTML =
      '<div class="grid md:grid-cols-2">' +
        '<div class="relative aspect-square md:aspect-auto bg-[#090B0E]" style="min-height:400px">' +
          '<canvas id="modalViewerCanvas"></canvas>' +
          '<div id="mvDropZone" class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 transition-opacity" style="background:rgba(11,13,16,.85)"><div class="text-center"><span class="iconify text-accent text-4xl mb-3 mx-auto block" data-icon="lucide:upload-cloud"></span><p class="font-display font-semibold">Déposez un STL</p></div></div>' +
          '<div class="absolute top-3 left-3 flex gap-2">' +
            '<button class="vmode on border border-white/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" data-m="solid">Solid</button>' +
            '<button class="vmode text-gray-400 border border-white/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" data-m="normal">Normal</button>' +
            '<button class="vmode text-gray-400 border border-white/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" data-m="wireframe">Wire</button>' +
          '</div>' +
          '<div id="mvColors" class="absolute top-3 right-3 flex gap-1.5">' +
            '<button class="w-6 h-6 rounded-sm border-2 border-accent" style="background:#C0C0C0" onclick="setMvColor(\'#C0C0C0\')"></button>' +
            '<button class="w-6 h-6 rounded-sm border-2 border-transparent hover:border-white/30" style="background:#D4963A" onclick="setMvColor(\'#D4963A\')"></button>' +
            '<button class="w-6 h-6 rounded-sm border-2 border-transparent hover:border-white/30" style="background:#8B7355" onclick="setMvColor(\'#8B7355\')"></button>' +
            '<button class="w-6 h-6 rounded-sm border-2 border-transparent hover:border-white/30" style="background:#4A6741" onclick="setMvColor(\'#4A6741\')"></button>' +
            '<button class="w-6 h-6 rounded-sm border-2 border-transparent hover:border-white/30" style="background:#222" onclick="setMvColor(\'#222222\')"></button>' +
          '</div>' +
          '<div class="absolute bottom-0 left-0 right-0 px-3 py-2 border-t border-white/[0.08] flex items-center justify-between" style="background:rgba(11,13,16,.8);backdrop-filter:blur(8px)">' +
            '<span id="mvInfo" class="text-[10px] text-gray-500"></span>' +
            '<label class="text-[10px] text-gray-500 hover:text-white transition-colors cursor-pointer flex items-center gap-1"><span class="iconify text-xs" data-icon="lucide:upload"></span>Importer STL<input type="file" accept=".stl" class="hidden" onchange="loadModalSTL(this.files[0])"></label>' +
          '</div>' +
        '</div>' +
        '<div class="p-8 md:p-10 flex flex-col">' +
          (p.badge ? '<div class="inline-flex self-start bg-accent text-[#0B0D10] px-3 py-1 text-[10px] font-bold uppercase tracking-widest mb-4">'+p.badge+'</div>' : '') +
          '<h2 class="font-display font-semibold text-2xl md:text-3xl tracking-tight leading-tight mb-3">'+p.name+'</h2>' +
          '<div class="flex items-center gap-4 mb-6"><span class="font-display font-bold text-2xl text-accent">'+fmtPrice(p.price)+'</span>'+(p.oldPrice?'<span class="text-text-muted line-through">'+fmtPrice(p.oldPrice)+'</span>':'')+'</div>' +
          '<div class="flex items-center gap-4 mb-6 text-sm text-text-muted"><span class="flex items-center gap-1"><span class="iconify" data-icon="lucide:box"></span>'+p.pieces+' pièces</span><span class="flex items-center gap-1"><span class="iconify" data-icon="lucide:ruler"></span>'+p.scale+'</span><span class="flex items-center gap-1"><span class="iconify" data-icon="'+(p.sup?'lucide:alert-triangle':'lucide:check-circle')+'"></span>'+(p.sup?'Support':'Sans support')+'</span></div>' +
          '<p class="text-text-muted text-sm leading-relaxed mb-8">'+p.desc+'</p>' +
          '<div class="border-t border-white/[0.08] pt-6 mb-8"><h4 class="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4">Contenu du kit</h4><ul class="space-y-2">';
    for(var d=0;d<p.details.length;d++){
      content += '<li class="flex items-center gap-2 text-sm text-gray-300"><span class="iconify text-accent text-xs" data-icon="lucide:check"></span>'+p.details[d]+'</li>';
    }
    content += '</ul></div>' +
          '<div class="mt-auto"><button id="modalAddBtn" class="w-full py-4 btn-accent font-display text-[11px] uppercase tracking-widest flex items-center justify-center gap-2" data-id="'+p.id+'"><span class="iconify text-base" data-icon="lucide:shopping-bag"></span>Ajouter — '+fmtPrice(p.price)+'</button><p class="text-center text-text-muted text-[10px] mt-3">Téléchargement instantané après paiement</p></div>' +
        '</div></div>';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';

    // Init 3D viewer after DOM is ready
    setTimeout(function() {
      var canvas = document.getElementById('modalViewerCanvas');
      if(canvas) initModalViewer(canvas, p.cat);

      // Mode buttons
      var vbtns = content.querySelectorAll('.vmode');
      for(var v=0;v<vbtns.length;v++){
        vbtns[v].addEventListener('click', function(){ setMvMode(this.getAttribute('data-m')); });
      }

      // Add to cart button
      var addBtn = document.getElementById('modalAddBtn');
      if(addBtn) addBtn.addEventListener('click', function(){ addToCart(parseInt(this.getAttribute('data-id'))); closeModal(); });

      // Drag & drop STL on viewer
      var viewerEl = canvas ? canvas.parentElement : null;
      if(viewerEl){
        viewerEl.addEventListener('dragover', function(e){e.preventDefault();document.getElementById('mvDropZone').style.opacity='1';});
        viewerEl.addEventListener('dragleave', function(){document.getElementById('mvDropZone').style.opacity='0';});
        viewerEl.addEventListener('drop', function(e){e.preventDefault();document.getElementById('mvDropZone').style.opacity='0';var f=e.dataTransfer.files[0];if(f&&f.name.toLowerCase().endsWith('.stl'))loadModalSTL(f);});
      }
    }, 50);
  }

  function loadModalSTL(file) {
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var geo = new THREE.STLLoader().parse(e.target.result);
      geo.computeVertexNormals();
      if(mvMesh) mvScene.remove(mvMesh);
      var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:mvColor,roughness:0.5,metalness:0.2}));
      mesh.castShadow=true; mesh.receiveShadow=true;
      mvMesh = new THREE.Group(); mvMesh.add(mesh); mvScene.add(mvMesh);
      var box=new THREE.Box3().setFromObject(mvMesh);var center=box.getCenter(new THREE.Vector3());var size=box.getSize(new THREE.Vector3());
      mvMesh.position.sub(center);mvMesh.position.y+=box.min.y-center.y+0.001;
      mvControls.target.set(0,size.y/2,0);
      var tv=0,tt=0;mvMesh.traverse(function(c){if(c.isMesh&&c.geometry){var g=c.geometry;tv+=g.attributes.position?g.attributes.position.count:0;tt+=g.index?g.index.count/3:(g.attributes.position?g.attributes.position.count/3:0);}});
      var infoEl=document.getElementById('mvInfo');if(infoEl)infoEl.textContent=tv.toLocaleString('fr-FR')+' sommets · '+Math.round(tt).toLocaleString('fr-FR')+' triangles · '+size.x.toFixed(1)+'×'+size.y.toFixed(1)+'×'+size.z.toFixed(1);
      applyModalMode();
      toast('"'+file.name+'" chargé dans le viewer');
    };
    reader.readAsArrayBuffer(file);
  }

  function closeModal() {
    destroyModalViewer();
    var modal = document.getElementById('productModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  }

  // ─── SEARCH ───────────────────────────────────────────
  function toggleSearch() {
    var bar = document.getElementById('searchBar');
    var hidden = bar.classList.contains('hidden');
    bar.classList.toggle('hidden');
    if (hidden) { document.getElementById('searchInput').focus(); }
    else { document.getElementById('searchInput').value = ''; renderProducts(); }
  }

  // ─── MOBILE MENU ──────────────────────────────────────
  function toggleMobile() {
    var m = document.getElementById('mobileMenu');
    m.classList.toggle('hidden');
    document.body.style.overflow = m.classList.contains('hidden') ? '' : 'hidden';
  }

  // ─── CART TOGGLE ─────────────────────────────────────
  function toggleCart() {
    var o = document.getElementById('cartOverlay');
    o.classList.toggle('hidden');
    document.body.style.overflow = o.classList.contains('hidden') ? '' : 'hidden';
  }

  // ─── ORDER MODAL ─────────────────────────────────────
  function openOrderModal() {
    var m = document.getElementById('orderModal');
    m.classList.remove('hidden'); m.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }
  function closeOrderModal() {
    var m = document.getElementById('orderModal');
    m.classList.add('hidden'); m.classList.remove('flex');
    document.body.style.overflow = '';
  }

  // ─── FAQ ──────────────────────────────────────────────
  function renderFaq() {
    var html = '';
    for (var i = 0; i < FAQS.length; i++) {
      html += '<div class="faq-item border-b border-white/[0.08]"><button class="faq-q w-full flex items-center justify-between py-6 text-left"><span class="font-display font-medium text-base pr-4">' + FAQS[i].q + '</span><span class="iconify text-xl text-gray-500 shrink-0 faq-i transition-transform" data-icon="lucide:plus"></span></button><div class="faq-a hidden pb-6"><p class="text-text-muted text-sm leading-relaxed">' + FAQS[i].a + '</p></div></div>';
    }
    document.getElementById('faqList').innerHTML = html;
    var items = document.querySelectorAll('.faq-q');
    for (var j = 0; j < items.length; j++) {
      items[j].addEventListener('click', function() {
        var answer = this.nextElementSibling;
        var icon = this.querySelector('.faq-i');
        var isOpen = !answer.classList.contains('hidden');
        var all = document.querySelectorAll('.faq-a');
        var allI = document.querySelectorAll('.faq-i');
        for (var k = 0; k < all.length; k++) { all[k].classList.add('hidden'); allI[k].setAttribute('data-icon','lucide:plus'); allI[k].style.transform=''; }
        if (!isOpen) { answer.classList.remove('hidden'); icon.setAttribute('data-icon','lucide:minus'); icon.style.transform='rotate(180deg)'; }
      });
    }
  }

  // ─── NEWSLETTER ──────────────────────────────────────
  function subscribe() {
    var email = document.getElementById('nlEmail').value;
    var msg = document.getElementById('nlMsg');
    if (!email || email.indexOf('@') === -1) {
      msg.textContent = 'Veuillez entrer une adresse email valide.';
      msg.className = 'text-xs text-accent mt-3'; msg.classList.remove('hidden'); return;
    }
    msg.textContent = '✓ Inscription confirmée !';
    msg.className = 'text-xs text-green-400 mt-3'; msg.classList.remove('hidden');
    document.getElementById('nlEmail').value = '';
    toast('Inscription confirmée');
  }

  // ─── STRIPE CHECKOUT (dynamic load) ─────────────────
  async function startCheckout() {
    var email = document.getElementById('checkoutEmail').value.trim();
    var errEl = document.getElementById('emailErr');
    var btn = document.getElementById('checkoutBtn');
    if (!email || email.indexOf('@')===-1) { errEl.classList.remove('hidden'); return; }
    errEl.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Chargement...';
    try {
      if (!window.Stripe) await loadScript('https://js.stripe.com/v3/');
      var stripe = window.Stripe(CONFIG.STRIPE_PK);
      // En production, appeler ton Edge Function ici
      toast('Stripe configuré — mode démo');
      console.info('Checkout payload:', { email: email, items: cart });
    } catch(e) {
      toast('Erreur : ' + e.message);
    }
    btn.disabled = false;
    btn.innerHTML = '<span class="iconify text-base" data-icon="lucide:lock"></span> Payer avec Stripe';
  }

  // ─── SHOWCASE 3D (homepage) ─────────────────────────
  var scRenderer, scScene, scCamera, scControls, scAnim;
  function initShowcase() {
    var canvas = document.getElementById('showcaseCanvas');
    var container = canvas.parentElement;
    scScene = new THREE.Scene();
    scScene.background = new THREE.Color('#090B0E');
    scCamera = new THREE.PerspectiveCamera(45, container.clientWidth/Math.max(container.clientHeight,1), 0.1, 1000);
    scCamera.position.set(8, 6, -8);
    scRenderer = new THREE.WebGLRenderer({canvas:canvas,antialias:true});
    scRenderer.setSize(container.clientWidth,container.clientHeight);
    scRenderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    scRenderer.shadowMap.enabled=true;
    scRenderer.toneMapping=THREE.ACESFilmicToneMapping;
    scRenderer.toneMappingExposure=1.1;
    scScene.add(new THREE.AmbientLight('#ffffff',0.4));
    var dl=new THREE.DirectionalLight('#FFF5E6',0.9);dl.position.set(8,12,6);dl.castShadow=true;dl.shadow.mapSize.set(512,512);dl.shadow.camera.near=0.5;dl.shadow.camera.far=30;dl.shadow.camera.left=-8;dl.shadow.camera.right=8;dl.shadow.camera.top=8;dl.shadow.camera.bottom=-8;scScene.add(dl);
    var fl=new THREE.DirectionalLight('#D4963A',0.2);fl.position.set(-5,3,-5);scScene.add(fl);
    scScene.add(new THREE.GridHelper(16,16,'#1a1d22','#14161a'));
    var gnd=new THREE.Mesh(new THREE.PlaneGeometry(16,16),new THREE.ShadowMaterial({opacity:0.3}));gnd.rotation.x=-Math.PI/2;gnd.position.y=-0.01;gnd.receiveShadow=true;scScene.add(gnd);
    var m=new THREE.MeshStandardMaterial({color:'#C0C0C0',roughness:0.5,metalness:0.2});
    function bx(w,h,d,x,y,z,mt){var b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mt||m);b.position.set(x,y,z);b.castShadow=true;b.receiveShadow=true;scScene.add(b);}
    bx(4,2.5,3.5,0,1.25,0);bx(4.4,0.2,3.9,0,2.6,0);bx(0.3,2.5,0.6,-2.2,1.25,0);bx(0.3,2.5,0.6,2.2,1.25,0);
    bx(0.6,0.8,0.6,-1,0.4,2.5,new THREE.MeshStandardMaterial({color:'#8B7355',roughness:0.7}));
    scControls=new THREE.OrbitControls(scCamera,scRenderer.domElement);scControls.enableDamping=true;scControls.dampingFactor=0.08;scControls.autoRotate=true;scControls.autoRotateSpeed=1.5;scControls.minDistance=4;scControls.maxDistance=18;scControls.maxPolarAngle=Math.PI/2+0.1;scControls.target.set(0,1,0);
    new ResizeObserver(function(){var w=container.clientWidth,h=container.clientHeight;scCamera.aspect=w/Math.max(h,1);scCamera.updateProjectionMatrix();scRenderer.setSize(w,h);}).observe(container);
    function animate(){scAnim=requestAnimationFrame(animate);scControls.update();scRenderer.render(scScene,scCamera);}
    animate();
  }

  // ─── EVENT LISTENERS (all via addEventListener) ──────
  document.getElementById('searchBtn').addEventListener('click', toggleSearch);
  document.getElementById('searchClose').addEventListener('click', toggleSearch);
  document.getElementById('searchInput').addEventListener('input', renderProducts);
  document.getElementById('cartBtn').addEventListener('click', toggleCart);
  document.getElementById('cartClose').addEventListener('click', toggleCart);
  document.getElementById('cartBg').addEventListener('click', toggleCart);
  document.getElementById('checkoutBtn').addEventListener('click', startCheckout);
  document.getElementById('menuBtn').addEventListener('click', toggleMobile);
  document.getElementById('menuClose').addEventListener('click', toggleMobile);
  document.querySelectorAll('.mob-link').forEach(function(a){ a.addEventListener('click', toggleMobile); });
  document.getElementById('productModalClose').addEventListener('click', closeModal);
  document.getElementById('productModalBg').addEventListener('click', closeModal);
  document.getElementById('sortSelect').addEventListener('change', renderProducts);
  document.getElementById('nlBtn').addEventListener('click', subscribe);
  document.getElementById('addPackBtn').addEventListener('click', function() {
    var found = false;
    for(var i=0;i<cart.length;i++){if(cart[i].id===999){cart[i].qty++;found=true;break;}}
    if(!found) cart.push({id:999,name:'Starter Kit Wargame Ultimate',price:49.90,img:'3dwp-starter',qty:1});
    updateCart(); toast('Starter Kit ajouté');
  });
  document.getElementById('resetFilters').addEventListener('click', function(){ currentCat='all'; document.getElementById('searchInput').value=''; renderCats(); renderProducts(); });
  // Order modal
  document.querySelector('a[href="#orders"]') || null;
  var orderLinks = document.querySelectorAll('a');
  for(var i=0;i<orderLinks.length;i++){if(orderLinks[i].textContent.indexOf('commandes')!==-1){orderLinks[i].addEventListener('click',function(e){e.preventDefault();openOrderModal();});}}
  document.getElementById('orderModalClose').addEventListener('click', closeOrderModal);
  document.getElementById('orderModalBg').addEventListener('click', closeOrderModal);
  document.getElementById('orderLookupBtn').addEventListener('click', function(){
    var results = document.getElementById('orderResults');
    results.innerHTML = '<p class="text-text-muted text-sm text-center py-4">Supabase non configuré — mode démo</p>';
  });

  // ESC key
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    closeModal(); closeOrderModal();
    var cart = document.getElementById('cartOverlay');
    if (!cart.classList.contains('hidden')) toggleCart();
    var search = document.getElementById('searchBar');
    if (!search.classList.contains('hidden')) toggleSearch();
    var menu = document.getElementById('mobileMenu');
    if (!menu.classList.contains('hidden')) toggleMobile();
  });

  // ─── INIT ────────────────────────────────────────────
  renderCats();
  renderProducts();
  updateCart();
  renderFaq();
  window.addEventListener('load', initShowcase);
