/* Путеводитель: общее поведение страниц. Данные (поиск, словарь, уроки) приходят из data.js. */
(function(){
  var D=window.SITE_DATA||{search:[],glossary:{},lessons:[]};
  var root=document.documentElement;
  function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(_){return null}}

  /* тема */
  function setTheme(m){
    if(m==='light'||m==='dark')root.setAttribute('data-theme',m);else root.removeAttribute('data-theme');
    document.querySelectorAll('[data-theme-btn]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-theme-btn')===(m||'auto')))});
  }
  try{['pv-pal','pv-pal-min','pv-pal2','pv-pal2-min','pv-pal3','pv-bg'].forEach(function(k){localStorage.removeItem(k);sessionStorage.removeItem(k)})}catch(_){}
  /* по умолчанию всегда тёмная; выбор запоминаем в трёх местах, потому что в некоторых браузерах localStorage недоступен */
  function readTheme(){
    var t=store('pv-theme');
    if(!t)try{t=sessionStorage.getItem('pv-theme')}catch(_){}
    if(!t){var m=/^pv-theme=(light|dark)$/.exec(window.name||'');t=m&&m[1]}
    return t==='light'?'light':'dark';
  }
  function saveTheme(m){
    store('pv-theme',m);
    try{sessionStorage.setItem('pv-theme',m)}catch(_){}
    if(!window.name||/^pv-theme=/.test(window.name))window.name='pv-theme='+m;
  }
  setTheme(readTheme());
  /* эта страница открыта «под» другой как фон для смахивания «назад»: только показываем, ничего не запоминаем и не трогаем */
  if(window.name==='pv-peek')return;
  document.querySelectorAll('[data-theme-btn]').forEach(function(b){b.addEventListener('click',function(){var m=b.getAttribute('data-theme-btn');saveTheme(m);setTheme(m)})});

  /* путь по сайту: запоминаем, с какой страницы человек пришёл, чтобы «Назад» вёл именно туда,
     а не в раздел из «хлебных крошек». Путь растёт только от переходов по ссылкам сайта;
     открыли страницу заново — путь начинается с неё. */
  var nav=(performance.getEntriesByType&&performance.getEntriesByType('navigation')[0])||{};
  var curPage=(location.pathname.split('/').pop()||'home.html').replace(/^index\.html$/,'home.html');
  var trail=sget('pv-trail')||[],wentBack=sget('pv-back'),linked=sget('pv-nav');
  /* «назад» действует, только если его нажали только что: старый флаг не должен открывать страницу с середины */
  if(!(typeof wentBack==='number'&&Date.now()-wentBack<15000))wentBack=null;
  sset('pv-back',null);sset('pv-nav',null);
  (function(){
    var last=trail[trail.length-1],same=!!last&&last.p===curPage,item={p:curPage,y:0};
    if(wentBack&&same)return;
    if(nav.type==='back_forward'){
      if(trail.length>1&&trail[trail.length-2].p===curPage)trail.pop();else if(!same)trail.push(item);
      return;
    }
    if(nav.type==='reload'||!linked){if(!same)trail=[item];return}
    if(!same)trail.push(item);
    if(trail.length>40)trail=trail.slice(-40);
  })();
  sset('pv-trail',trail);
  wentBack=!!wentBack&&trail.length>0&&trail[trail.length-1].p===curPage;
  var leaving=false;
  function saveY(){if(!leaving&&trail.length){trail[trail.length-1].y=Math.round(window.scrollY);sset('pv-trail',trail)}}
  function markNav(){saveY();sset('pv-nav',1)}
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href]');
    if(!a||a.target==='_blank'||/^(#|https?:|mailto:|tel:)/.test(a.getAttribute('href')))return;
    markNav();
  });
  window.addEventListener('pagehide',saveY);

  /* новая страница всегда открывается с начала (кроме «Назад» и ссылок на место в странице);
     после «Назад» — на том же месте, где человек был */
  (function(){
    if(wentBack){
      var y=trail[trail.length-1].y||0;
      var go=function(){window.scrollTo({top:y,behavior:'instant'})};
      go();window.addEventListener('load',function(){setTimeout(go,0)});
      return;
    }
    if(nav.type==='back_forward')return;
    /* якорь в адресе статьи (#…) не уводит в середину: статья всегда с начала. Словарь — исключение, там якорь ведёт к слову */
    if(location.hash){
      if(location.hash==='#resume'||/^glossary/.test(curPage))return;
      try{history.replaceState(null,'',location.pathname+location.search)}catch(_){}
    }
    var top=function(){window.scrollTo({top:0,behavior:'instant'})};
    top();window.addEventListener('load',function(){setTimeout(top,0)});
  })();

  /* шапка */
  var hdr=document.querySelector('.hdr');
  if(hdr)window.addEventListener('scroll',function(){hdr.classList.toggle('scrolled',window.scrollY>8)},{passive:true});

  /* прогресс маршрута */
  var done={};try{done=JSON.parse(store('pv-done')||'{}')||{}}catch(_){done={}}
  function saveDone(){store('pv-done',JSON.stringify(done))}
  var endMark=document.querySelector('[data-lesson-end]');
  if(endMark){
    var slug=endMark.getAttribute('data-lesson-end');
    store('pv-last',slug);
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){done[slug]=1;saveDone();io.disconnect()}})});
      io.observe(endMark);
    }
  }
  document.querySelectorAll('[data-lesson]').forEach(function(li){if(done[li.getAttribute('data-lesson')])li.classList.add('done')});
  var doneCount=D.lessons.filter(function(l){return done[l.slug]}).length;
  document.querySelectorAll('[data-progress-text]').forEach(function(el){el.textContent=doneCount?('Пройдено уроков: '+doneCount+' из '+D.lessons.length):''});
  var cont=document.getElementById('continue'),routeBtn=document.querySelector('[data-route-start]');
  var last=store('pv-last'),next=null;
  if(D.lessons.length&&(last||doneCount)){
    var li=-1;D.lessons.forEach(function(l,i){if(l.slug===last)li=i});
    if(li>-1&&!done[last])next=D.lessons[li];
    else{
      for(var i=li+1;i<D.lessons.length;i++){if(!done[D.lessons[i].slug]){next=D.lessons[i];break}}
      if(!next)for(var j=0;j<D.lessons.length;j++){if(!done[D.lessons[j].slug]){next=D.lessons[j];break}}
    }
  }
  /* маршрут: если уже что-то читали, кнопка ведёт к следующему уроку */
  if(routeBtn&&next){routeBtn.href=next.slug+'.html';routeBtn.textContent='Продолжить'}
  if(cont){
    if(next){
      cont.href=next.slug+'.html';
      cont.querySelector('small').textContent='Урок '+next.n+' из '+D.lessons.length;
      cont.querySelector('b').textContent=next.title;
      cont.style.setProperty('--p',Math.round(doneCount/D.lessons.length*100)+'%');
      cont.hidden=false;
    }
  }

  /* возврат к уроку: если из урока ушли по ссылке, на другой странице появится кнопка «Вернуться к уроку» */
  function sget(k){try{return JSON.parse(sessionStorage.getItem(k))}catch(_){return null}}
  function sset(k,v){try{if(v===null)sessionStorage.removeItem(k);else sessionStorage.setItem(k,JSON.stringify(v))}catch(_){}}
  if(endMark){
    var here=endMark.getAttribute('data-lesson-end');
    var ret=sget('pv-return');
    if(ret&&ret.slug===here){
      if(location.hash==='#resume'){
        var go=function(){window.scrollTo({top:ret.y,behavior:'instant'})};
        history.replaceState(null,'',location.pathname);
        if(document.readyState==='complete')setTimeout(go,30);else window.addEventListener('load',function(){setTimeout(go,30)});
      }
      sset('pv-return',null);
    }
    document.addEventListener('click',function(e){
      var a=e.target.closest('.prose a[href], .next-steps a[href]');
      if(!a||a.closest('.nav-cards'))return;
      var l=D.lessons.filter(function(x){return x.slug===here})[0];
      if(l)sset('pv-return',{slug:here,title:l.title,n:l.n,y:window.scrollY});
    });
  }else{
    var r=sget('pv-return');
    /* на главной уже есть карточка «Продолжить» — вторую плашку не показываем */
    if(r&&!document.getElementById('continue')){
      var bar=document.createElement('div');bar.className='return-bar';
      bar.innerHTML='<a href="'+r.slug+'.html#resume"><span aria-hidden="true">←</span><span><small>Вернуться к уроку '+r.n+'</small><b></b></span></a><button type="button" aria-label="Скрыть">×</button>';
      bar.querySelector('b').textContent=r.title;
      bar.querySelector('button').addEventListener('click',function(){sset('pv-return',null);bar.remove()});
      document.body.appendChild(bar);
    }
  }

  /* словарь: всплывающие объяснения */
  var pop=null;
  function closePop(){if(pop){pop.remove();pop=null;document.querySelectorAll('.term[aria-expanded="true"]').forEach(function(t){t.setAttribute('aria-expanded','false')})}}
  document.addEventListener('click',function(e){
    var t=e.target.closest('.term');
    if(t){
      e.preventDefault();
      var open=t.getAttribute('aria-expanded')==='true';closePop();if(open)return;
      var g=D.glossary[t.getAttribute('data-term')];if(!g)return;
      pop=document.createElement('div');pop.className='pop';pop.setAttribute('role','dialog');pop.setAttribute('aria-label',g.term);
      pop.innerHTML='<button type="button" class="x" aria-label="Закрыть">×</button><b></b><p></p><a href="glossary.html#'+t.getAttribute('data-term')+'">Подробнее в словаре →</a>';
      pop.querySelector('b').textContent=g.term;pop.querySelector('p').textContent=g.def;
      document.body.appendChild(pop);
      var r=t.getBoundingClientRect(),w=pop.offsetWidth;
      var left=Math.min(Math.max(12,r.left+window.scrollX+r.width/2-w/2),window.scrollX+document.documentElement.clientWidth-w-12);
      pop.style.left=left+'px';pop.style.top=(r.bottom+window.scrollY+8)+'px';
      t.setAttribute('aria-expanded','true');
      pop.querySelector('.x').addEventListener('click',closePop);
      return;
    }
    if(pop&&!e.target.closest('.pop'))closePop();
  });

  /* поиск по сайту: служебные слова («что», «как», «ли»…) не учитываем, слова сравниваем по основе */
  function norm(s){return (s||'').toLowerCase().replace(/ё/g,'е')}
  var STOP={'а':1,'и':1,'в':1,'во':1,'на':1,'не':1,'ли':1,'же':1,'бы':1,'то':1,'по':1,'за':1,'из':1,'от':1,'до':1,'о':1,'об':1,'у':1,'к':1,'с':1,'со':1,'для':1,'что':1,'чем':1,'как':1,'так':1,'это':1,'этот':1,'эта':1,'эти':1,'ну':1,'да':1,'нет':1,'или':1,'но':1,'если':1,'почему':1,'зачем':1,'когда':1,'где':1,'кто':1,'какой':1,'какая':1,'какое':1,'какие':1,'такой':1,'такая':1,'такое':1,'есть':1,'был':1,'была':1,'было':1,'были':1,'быть':1,'можно':1,'нужно':1,'надо':1,'правда':1,'вообще':1,'мне':1,'меня':1,'мой':1,'моя':1,'я':1,'ты':1,'вы':1,'мы':1,'он':1,'она':1,'они':1,'его':1,'ее':1,'их':1,'там':1,'тут':1,'все':1,'всё':1,'весь':1,'очень':1,'самом':1,'деле':1,'ведь':1,'разве':1,'неужели':1,'просто':1,'тогда':1,'сейчас':1,'может':1,'могу':1,'могут':1,'мои':1,'моих':1,'мою':1,'мое':1,'свой':1,'свою':1,'свои':1,'своих':1,'этого':1,'этом':1,'этой':1,'значит':1,'означает':1,'чего':1,'тот':1,'того':1,'нам':1,'нас':1,'вам':1,'вас':1,'тебя':1,'тебе':1,'себя':1,'себе':1,'уже':1,'еще':1,'бывает':1,'бывают':1,'чтобы':1,'чтоб':1,'будет':1,'будут':1,'буду':1,'вдруг':1};
  /* грубая основа слова: отрезаем окончание, чтобы «Бога», «Богу» и «Бог» находили друг друга */
  function stem(w){var b=w.replace(/(ами|ями|ого|его|ому|ему|ыми|ими|ах|ях|ов|ев|ей|ой|ий|ый|ая|яя|ое|ее|ые|ие|ам|ям|ом|ем|ую|юю|ют|ут|ет|ит|ть|ся|сь|[аеиоуыэюяйь])$/,'');return b.length>=3?b:w}
  function words(s){return ' '+norm(s).replace(/[^a-zа-я0-9]+/g,' ')}
  /* у длинного слова сравниваем начало без двух последних букв: «выглядит» найдёт «выглядел», «христианином» — «христиане» */
  function terms(q){return norm(q).replace(/[^a-zа-я0-9]+/g,' ').trim().split(' ').filter(function(w){return w.length>1&&!STOP[w]}).map(function(w){w=stem(w);return w.length>=7?w.slice(0,Math.max(5,w.length-2)):w})}
  /* редкое слово важнее частого: «динозавры» говорит о вопросе больше, чем «Библия» */
  var DF={};
  function prep(it){if(!it._w){it._w=[words(it.title),words(it.keys||''),words(it.text||'')];it._t=terms(it.title)}}
  function weight(w){
    if(DF[w]==null){var n=0;D.search.forEach(function(it){prep(it);if(it._w[0].indexOf(w)>-1||it._w[1].indexOf(w)>-1)n++});DF[w]=n}
    /* слова, которого нет нигде, скорее всего случайное: средний вес, чтобы оно не перевешивало */
    return DF[w]?1+Math.log((D.search.length+1)/(DF[w]+1))/2:2;
  }
  function findItems(q){
    var ws=terms(q),nq=norm(q).replace(/[^a-zа-я0-9]+/g,' ').trim();
    if(!ws.length)return {items:[],good:false};
    var wt=ws.map(function(w){return weight(' '+w)}),all=wt.reduce(function(a,b){return a+b},0);
    var res=D.search.map(function(it){
      prep(it);
      var tl=it._w[0],ks=it._w[1],hay=it._w[2],s=0,hit=0,inTitle=0;
      /* слово ищем с начала слова: «ад» не должен находиться внутри «страдания» */
      ws.forEach(function(w,i){w=' '+w;var k=wt[i];if(tl.indexOf(w)>-1){s+=3*k;hit+=k;inTitle++}else if(ks.indexOf(w)>-1){s+=2*k;hit+=k}else if(hay.indexOf(w)>-1){s+=.6*k;hit+=.5*k}});
      if(nq.length>3&&tl.indexOf(' '+nq)>-1)s+=10;
      /* при равенстве выше тот, чей заголовок почти целиком совпал с вопросом */
      if(it._t.length)s+=Math.min(1,inTitle/it._t.length);
      if(it.kind==='Вопрос')s+=.3;
      /* выше тот, у кого совпало больше слов вопроса, а не одно частое слово */
      var c=hit/all;
      return {it:it,s:s*(.4+c),c:c};
    }).filter(function(x){return x.s>.3}).sort(function(a,b){return b.s-a.s});
    /* «хорошо нашлось», если у лучшего результата совпала хотя бы половина значимых слов в заголовке или ключевых словах */
    var best=res[0],good=!!best&&(best.c>=.6||ws.length===1&&best.c>=.5);
    /* если ответ нашёлся, слабые совпадения не показываем, чтобы не мешали */
    if(good)res=res.filter(function(x){return x.s>=best.s*.4});
    /* если ответа нет, предлагаем только то, что совпало хотя бы наполовину */
    else res=res.filter(function(x){return x.c>=.5});
    return {items:res.map(function(x){return x.it}),good:good};
  }
  window.findItems=findItems;

  /* поиск */
  var search=document.getElementById('search');
  if(search){
    var sInput=document.getElementById('s-input'),sList=document.getElementById('s-list'),sLabel=document.getElementById('s-label');
    /* найденный пункт: заголовок, под ним начало короткого ответа (если это вопрос) и тип справа */
    function itemLink(it,a){
      var t=document.createElement('span');t.className='st';
      var b=document.createElement('b');b.textContent=it.title;t.appendChild(b);
      if(it.short){var p=document.createElement('span');p.className='sn';p.textContent=it.short;t.appendChild(p)}
      var sm=document.createElement('small');sm.textContent=/^Урок/.test(it.kind)?'Урок':it.kind;
      a.appendChild(t);a.appendChild(sm);return a;
    }
    function noAnswer(el,q){
      el.innerHTML='<b>Отдельного ответа на этот вопрос у нас пока нет.</b><span>Мы постепенно добавляем новые вопросы. Попробуйте спросить другими словами или посмотрите <a href="questions.html">все вопросы</a>.</span><span>Или задайте его лично: <a href="https://t.me/Polinwqk" target="_blank" rel="noopener">напишите мне в Telegram</a>.</span>';
    }
    function render(q){
      q=norm(q).trim();var items,r=null;
      sList.innerHTML='';
      if(!q||!terms(q).length){sLabel.textContent='С чего можно начать';items=D.search.filter(function(it){return it.pin})}
      else{r=findItems(q);items=r.items;sLabel.textContent=r.good?'Результаты':''}
      if(r&&!r.good){
        var li=document.createElement('li');li.className='no-answer';noAnswer(li,q);sList.appendChild(li);
        if(!items.length){sLabel.hidden=true;return}
        var h=document.createElement('li');h.className='head';h.textContent='Возможно, поможет:';sList.appendChild(h);
      }
      sLabel.hidden=!sLabel.textContent;
      items.slice(0,8).forEach(function(it){
        var li=document.createElement('li'),a=document.createElement('a');a.href=it.url;
        li.appendChild(itemLink(it,a));sList.appendChild(li);
      });
    }
    window.openSearch=function(q){search.hidden=false;sInput.value=q||'';render(q);setTimeout(function(){sInput.focus()},30)};
    function closeSearch(){search.hidden=true}
    document.querySelectorAll('[data-open-search]').forEach(function(b){b.addEventListener('click',function(){window.openSearch('')})});
    document.getElementById('s-close').addEventListener('click',closeSearch);
    search.addEventListener('click',function(e){if(e.target===search)closeSearch()});
    sInput.addEventListener('input',function(){render(sInput.value)});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeSearch();closePop()}});
    /* поле «У меня есть вопрос» на главной: подсказки появляются сразу, пока человек печатает */
    var ds=document.getElementById('door-search');
    if(ds){
      var qi=document.getElementById('q-input'),sug=document.createElement('ul'),cur=-1;
      sug.className='suggest';sug.id='q-suggest';sug.setAttribute('role','listbox');sug.setAttribute('aria-label','Подходящие материалы');sug.hidden=true;
      ds.appendChild(sug);
      qi.setAttribute('autocomplete','off');qi.setAttribute('role','combobox');qi.setAttribute('aria-controls','q-suggest');qi.setAttribute('aria-expanded','false');
      function links(){return sug.querySelectorAll('a')}
      function hideSug(){sug.hidden=true;qi.setAttribute('aria-expanded','false');cur=-1}
      function mark(i){var ls=links();cur=i;ls.forEach(function(a,k){a.setAttribute('aria-selected',String(k===i))});if(ls[i])ls[i].scrollIntoView({block:'nearest'})}
      function showSug(){
        var q=qi.value.trim();if(!q){hideSug();return}
        var r=findItems(q),items=r.items,head='';
        sug.innerHTML='';
        if(!terms(q).length||q.length<3&&!items.length){items=D.search.filter(function(it){return it.pin});head='С чего можно начать'}
        else if(!r.good){
          /* ждём, пока человек допишет слово, и только потом говорим, что ответа нет */
          var e=document.createElement('li');e.className='no-answer';noAnswer(e,q);sug.appendChild(e);
          if(items.length)head='Возможно, поможет:';
        }
        if(head){var h=document.createElement('li');h.className='head';h.textContent=head;sug.appendChild(h)}
        items.slice(0,6).forEach(function(it){
          var li=document.createElement('li'),a=document.createElement('a');a.href=it.url;a.setAttribute('role','option');a.tabIndex=-1;
          li.appendChild(itemLink(it,a));sug.appendChild(li);
        });
        if(items.length>6){var m=document.createElement('li'),b=document.createElement('button');b.type='button';b.className='all';b.textContent='Все результаты ('+items.length+')';b.addEventListener('click',function(){hideSug();window.openSearch(qi.value)});m.appendChild(b);sug.appendChild(m)}
        sug.hidden=false;qi.setAttribute('aria-expanded','true');cur=-1;
      }
      qi.addEventListener('input',showSug);
      qi.addEventListener('focus',function(){if(qi.value.trim())showSug()});
      qi.addEventListener('keydown',function(e){
        if(sug.hidden)return;var n=links().length;
        if(e.key==='ArrowDown'&&n){e.preventDefault();mark((cur+1)%n)}
        else if(e.key==='ArrowUp'&&n){e.preventDefault();mark((cur-1+n)%n)}
        else if(e.key==='Escape'){hideSug()}
        else if(e.key==='Enter'&&cur>-1){e.preventDefault();markNav();location.href=links()[cur].href}
      });
      document.addEventListener('click',function(e){if(!ds.contains(e.target))hideSug()});
      ds.addEventListener('submit',function(e){e.preventDefault();hideSug();window.openSearch(qi.value)});
    }
  }

  /* словарь на главной */
  var chips=document.getElementById('chips'),def=document.getElementById('def');
  if(chips&&def){
    function show(slug){
      var g=D.glossary[slug];if(!g)return;
      def.innerHTML='<b></b><p></p>';
      def.querySelector('b').textContent=g.term;def.querySelector('p').textContent=g.def;
      chips.querySelectorAll('.chip').forEach(function(c){c.setAttribute('aria-pressed',String(c.getAttribute('data-slug')===slug))});
    }
    chips.addEventListener('click',function(e){var c=e.target.closest('.chip');if(c)show(c.getAttribute('data-slug'))});
    var first=chips.querySelector('.chip[aria-pressed="true"]')||chips.querySelector('.chip');if(first)show(first.getAttribute('data-slug'));
  }

  /* фильтр на страницах-списках */
  var filter=document.getElementById('filter');
  if(filter){
    var byUrl={};D.search.forEach(function(it){byUrl[it.url]=it});
    var empty=document.createElement('div');empty.className='no-answer filter-empty';empty.hidden=true;filter.insertAdjacentElement('afterend',empty);
    var isQ=/questions/.test(location.pathname)||!!document.querySelector('a[href="questions.html"][aria-current="page"]');
    filter.addEventListener('input',function(){
      var ws=terms(filter.value),shown=0,r=null,found={};
      /* на странице вопросов ищем так же, как в общем поиске: по связкам и другими словами */
      if(isQ&&ws.length){r=findItems(filter.value);if(r.good)r.items.forEach(function(it){found[it.url]=1})}
      document.querySelectorAll('[data-filter-item]').forEach(function(el){
        var ok;
        if(r)ok=!!found[el.getAttribute('href')];
        else{var it=byUrl[el.getAttribute('href')],hay=words(el.textContent+' '+(it?(it.keys||'')+' '+(it.short||''):''));ok=!ws.length||ws.every(function(w){return hay.indexOf(' '+w)>-1})}
        el.hidden=!ok;if(ok)shown++;
      });
      document.querySelectorAll('[data-filter-group]').forEach(function(g){g.hidden=!g.querySelector('[data-filter-item]:not([hidden])')});
      /* ответ нашёлся, но не в списке вопросов (например, в уроке) — показываем ссылку на него */
      var elsewhere=r&&r.good&&!shown?r.items.slice(0,3):[];
      empty.hidden=!!shown;
      if(elsewhere.length){
        empty.innerHTML='<b>Ответ на этот вопрос есть здесь:</b>';
        elsewhere.forEach(function(it){var s=document.createElement('span'),a=document.createElement('a');a.href=it.url;a.textContent=it.title;s.appendChild(a);empty.appendChild(s)});
      }
      else if(!shown)empty.innerHTML=isQ?'<b>Отдельного ответа на этот вопрос у нас пока нет.</b><span>Мы постепенно добавляем новые вопросы. Попробуйте спросить другими словами или сотрите текст, чтобы увидеть все вопросы.</span><span>Или задайте его лично: <a href="https://t.me/Polinwqk" target="_blank" rel="noopener">напишите мне в Telegram</a>.</span>':'<b>Ничего не нашлось.</b><span>Попробуйте другие слова.</span>';
    });
  }
  /* «Назад»: сначала — туда, откуда человек пришёл на самом деле, иначе — в раздел из «хлебных крошек» */
  var crumbs=document.querySelectorAll('.crumbs a');
  var NAMES={'home.html':'Главная','index.html':'Главная','route.html':'Начать с нуля','topics.html':'Темы','questions.html':'Вопросы','glossary.html':'Словарь','stories.html':'Сторис'};
  function pageName(p){
    p=(p||'').split('#')[0].split('/').pop()||'home.html';
    if(NAMES[p])return NAMES[p];
    for(var i=0;i<D.search.length;i++)if(D.search[i].url===p)return D.search[i].title;
    return '';
  }
  /* куда ведёт «назад»: {go: функция, name: подпись} или null, если идти некуда */
  function backTarget(){
    /* с главной назад не уходим: она и так начало сайта */
    if(/^((home|index)(\.html)?)?$/.test(curPage))return null;
    if(trail.length>1&&trail[trail.length-1].p===curPage){
      var to=trail[trail.length-2].p,ref='';
      try{ref=new URL(document.referrer).pathname.split('/').pop()}catch(_){}
      /* прошлая страница — та же, что в истории браузера: возвращаемся через историю, браузер достаёт её из памяти мгновенно */
      if(ref===to&&history.length>1)return {name:pageName(to),href:to,go:function(){history.back()}};
      return {name:pageName(to),href:to,go:function(){trail.pop();sset('pv-trail',trail);sset('pv-back',Date.now());leaving=true;location.href=to}};
    }
    var r=document.referrer,same=false;
    try{same=!!r&&new URL(r).origin===location.origin&&r.split('#')[0]!==location.href.split('#')[0]}catch(_){}
    if(same&&history.length>1)return {name:pageName(new URL(r).pathname),go:function(){history.back()}};
    if(crumbs.length){var c=crumbs[crumbs.length-1];return {name:c.textContent,href:c.getAttribute('href'),go:function(){location.href=c.getAttribute('href')}}}
    if(!/(^|\/)((home|index)\.html)?$/.test(location.pathname))return {name:'Главная',href:'home.html',go:function(){location.href='home.html'}};
    return null;
  }
  function goBack(){var t=backTarget();if(t)t.go()}
  /* на главной жест «назад» браузера (два пальца по тачпаду на Маке, смахивание на телефоне) не срабатывает:
     главная и так начало сайта */
  if(/^((home|index)(\.html)?)?$/.test(curPage)){
    root.style.overscrollBehaviorX='none';
    if(document.body)document.body.style.overscrollBehaviorX='none';
    /* Safari на Маке жест не отменяет по стилю: гасим сами боковые движения двумя пальцами.
       На главной ничего не листается вбок, так что читать это не мешает */
    window.addEventListener('wheel',function(e){if(Math.abs(e.deltaX)>Math.abs(e.deltaY))e.preventDefault()},{passive:false});
  }

  /* на главной «назад» на телефоне ничего не делает: главная — начало сайта. Свой жест iPhone (от левого края)
     сайт отключить не может, поэтому после первого касания ставим «пустой шаг» в истории: жест возвращает на ту же главную.
     Только если на главную пришли с другой страницы сайта — пришедших из Instagram или поиска не держим. */
  (function(){
    if(!/^((home|index)(\.html)?)?$/.test(curPage)||!('ontouchstart' in window))return;
    var inside=false;try{inside=!!document.referrer&&new URL(document.referrer).origin===location.origin}catch(_){}
    if(!inside||!history.pushState)return;
    var armed=false;
    function arm(){if(armed)return;armed=true;try{history.pushState({pvStay:1},'',location.href)}catch(_){}}
    window.addEventListener('touchstart',arm,{passive:true});
    window.addEventListener('popstate',function(){if(armed)try{history.pushState({pvStay:1},'',location.href)}catch(_){}});
  })();

  /* жест «назад»: смахнуть вправо двумя пальцами на тачпаде (как на Маке) или пальцем по экрану телефона.
     Тачпад — только когда сайт открыт внутри другой страницы или во встроенном браузере приложения: обычный браузер это умеет сам.
     Палец на телефоне — всегда: на iPhone смахивание «назад» работает не везде (например, с иконки на экране «Домой»). */
  (function(){
    var framed;try{framed=window.self!==window.top}catch(_){framed=true}
    /* встроенный браузер приложения (например, превью в Claude) сам по свайпу назад не ходит — делаем это мы */
    if(/\b(Claude|Electron)\//.test(navigator.userAgent))framed=true;
    var phone=('ontouchstart' in window)||(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
    if(!framed&&!phone)return;
    if(framed)root.style.overscrollBehaviorX='none';
    var LIMIT=120;
    /* не мешаем, если открыт поиск или под пальцами то, что само листается вбок */
    function blocked(el){
      var s=document.getElementById('search');if(s&&!s.hidden)return true;
      for(;el&&el.nodeType===1&&el!==document.body;el=el.parentElement){
        if(/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))return true;
        if(el.scrollWidth>el.clientWidth+1){var o=getComputedStyle(el).overflowX;if(o==='auto'||o==='scroll')return true}
      }
      return false;
    }
    /* тачпад */
    var sum=0,axis=null,fired=false,idle=0;
    if(framed)window.addEventListener('wheel',function(e){
      if(e.ctrlKey)return;
      clearTimeout(idle);idle=setTimeout(function(){sum=0;axis=null;fired=false},200);
      if(fired){e.preventDefault();return}
      var dx=e.deltaX*(e.deltaMode===1?16:1),dy=e.deltaY*(e.deltaMode===1?16:1);
      if(axis===null){if(Math.abs(dx)===Math.abs(dy))return;axis=Math.abs(dx)>Math.abs(dy)&&!blocked(e.target)?'x':'y'}
      if(axis!=='x')return;
      e.preventDefault();
      sum=Math.max(0,sum-dx);
      if(sum>=LIMIT){fired=true;goBack()}
    },{passive:false});

    /* телефон: смахивание «назад», как в приложениях на iPhone. Под текущей страницей сразу видна прошлая
       (она заранее тихо загружена сзади), текущая едет за пальцем, прошлая слегка выдвигается слева.
       Короткое быстрое смахивание или дальше чем на пятую часть экрана — страница доезжает вправо и мы уже на прошлой;
       иначе страница возвращается на место. */
    var site=document.querySelector('.site');
    if(!site)return;
    var tgt=null,sx=0,sy=0,x=0,state=null,raf=0,pts=[],W=0;
    var EASE='cubic-bezier(.22,.8,.24,1)';
    /* прошлая страница под текущей: окно шириной x слева, в нём сама страница */
    var peek=null,frame=null,shade=null,peekHref='';
    function peekUrl(t){
      if(!t||!t.href)return '';
      var h=t.href;try{h=new URL(h,location.href)}catch(_){return ''}
      if(h.origin!==location.origin||/stories/.test(h.pathname))return '';
      return h.pathname+h.search;
    }
    function peekY(){
      if(trail.length>1&&trail[trail.length-1].p===curPage)return trail[trail.length-2].y||0;
      return 0;
    }
    function preparePeek(){
      var t=backTarget(),u=peekUrl(t);
      if(!u)return;
      if(peek&&peekHref===u)return;
      if(peek)peek.remove();
      peekHref=u;
      peek=document.createElement('div');peek.className='peek';peek.setAttribute('aria-hidden','true');
      frame=document.createElement('iframe');frame.name='pv-peek';frame.tabIndex=-1;frame.title='';
      shade=document.createElement('i');
      peek.appendChild(frame);peek.appendChild(shade);document.body.appendChild(peek);
      var y=peekY();
      frame.addEventListener('load',function(){try{frame.contentWindow.scrollTo({top:y,behavior:'instant'})}catch(_){}});
      frame.src=u;
    }
    function paint(){
      raf=0;
      var p=Math.min(1,x/W);
      site.style.transform='translate3d('+x+'px,0,0)';
      if(peek){
        peek.style.width=x+'px';
        frame.style.transform='translate3d('+(-(1-p)*W*.3)+'px,0,0)';
        shade.style.opacity=String((1-p)*.35);
      }
    }
    function reset(){
      state=null;x=0;
      site.style.transition=site.style.transform=site.style.willChange='';
      if(peek){peek.style.transition=frame.style.transition=shade.style.transition='';peek.style.width='0';peek.classList.remove('on')}
    }
    function animateTo(to,ms,done){
      var tr=ms+'ms '+EASE;
      site.style.transition='transform '+tr;
      site.style.transform='translate3d('+to+'px,0,0)';
      if(peek){
        peek.style.transition='width '+tr;frame.style.transition='transform '+tr;shade.style.transition='opacity '+tr;
        peek.style.width=to+'px';
        frame.style.transform='translate3d('+(to?0:-W*.3)+'px,0,0)';shade.style.opacity=to?'0':'.35';
      }
      var fin=false;function end(){if(fin)return;fin=true;done()}
      setTimeout(end,ms+20);
    }
    window.addEventListener('touchstart',function(e){
      if(state==='leaving')return;
      state=null;
      preparePeek();
      if(e.touches.length!==1||blocked(e.target))return;
      sx=e.touches[0].clientX;sy=e.touches[0].clientY;state='?';pts=[];
    },{passive:true});
    window.addEventListener('touchmove',function(e){
      if(!state||state==='y'||state==='leaving')return;
      var t=e.touches[0],dx=t.clientX-sx,dy=t.clientY-sy;
      if(state==='?'){
        if(Math.abs(dx)<8&&Math.abs(dy)<8)return;
        if(!(dx>0&&dx>Math.abs(dy)*1.2)){state='y';return}
        tgt=backTarget();if(!tgt){state='y';return}
        state='x';W=window.innerWidth;site.style.willChange='transform';site.style.transition='';
        if(peek){peek.style.transition=frame.style.transition=shade.style.transition='';frame.style.width=W+'px';peek.classList.add('on')}
      }
      e.preventDefault();
      x=Math.max(0,dx);
      var now=performance.now();pts.push([now,x]);while(pts.length>1&&now-pts[0][0]>80)pts.shift();
      if(!raf)raf=requestAnimationFrame(paint);
    },{passive:false});
    window.addEventListener('touchend',function(){
      if(state!=='x'){if(state!=='leaving')state=null;return}
      if(raf){cancelAnimationFrame(raf);paint()}
      /* скорость за последние ~80 мс; если палец перед отпусканием стоял, скорость нулевая */
      var now=performance.now(),v=0;
      if(pts.length>1&&now-pts[pts.length-1][0]<60){var a=pts[0],b=pts[pts.length-1];v=(b[1]-a[1])/Math.max(1,b[0]-a[0])}
      if(x>W*.2||(v>.25&&x>16)){
        state='leaving';
        /* чем дальше уже утянули, тем короче доводка: от 0,24 до 0,12 с */
        animateTo(W,Math.round(240-120*Math.min(1,x/W)),function(){tgt.go()});
      }
      else{state='back';animateTo(0,180,reset)}
    });
    window.addEventListener('touchcancel',function(){if(state==='x'){state='back';animateTo(0,180,reset)}else if(state!=='leaving')state=null});
    /* вернулись на эту страницу кнопкой «назад» браузера — страница должна стоять на месте, без следов прошлого смахивания */
    window.addEventListener('pageshow',function(e){if(e.persisted)reset()});
  })();
})();
