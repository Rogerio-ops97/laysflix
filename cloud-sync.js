(()=>{
const TABLE='laysflix_user_states';
const PENDING_PROFILE='laysflix.pending-profile.';
const AUTH_REDIRECT='https://rogerio-ops97.github.io/laysflix/';
let client=null,hooks=null,currentUser=null,currentProfileKind='standard',syncTimer=null,authArtTimer=null,bound=false,authArtStarted=false,lastCloudState='offline';
const clone=value=>JSON.parse(JSON.stringify(value));
const normalizeKind=value=>value==='lays'?'lays':'standard';
const emailKey=email=>`${PENDING_PROFILE}${String(email||'').trim().toLowerCase()}`;
const byUpdated=(left,right)=>Number(right?.updatedAt||0)>=Number(left?.updatedAt||0)?right:left;
function mergeKeyed(left=[],right=[],keyOf){const items=new Map;[...left,...right].forEach(item=>{const key=keyOf(item);if(!key)return;items.set(key,items.has(key)?byUpdated(items.get(key),item):item)});return [...items.values()]}
function mergeStates(local={},remote={}){const dismissed=[...new Set([...(local.dismissed||[]),...(remote.dismissed||[])])],blocked=new Set(dismissed),library=mergeKeyed(local.library,remote.library,item=>`${item.media_type||item.type||(item.name?'tv':'movie')}:${item.id}`).filter(item=>!blocked.has(`${item.media_type||item.type||(item.name?'tv':'movie')}:${item.id}`)),diary={...(local.diary||{})};Object.entries(remote.diary||{}).forEach(([key,value])=>diary[key]=diary[key]?byUpdated(diary[key],value):value);return {...local,...remote,library,diary,dismissed,watchEvents:mergeKeyed(local.watchEvents,remote.watchEvents,item=>item.id),trash:mergeKeyed(local.trash,remote.trash,item=>`${item.deletedAt}:${item.item?.id}`),lists:mergeKeyed(local.lists,remote.lists,item=>item.id)} }
function pendingProfile(user){const pending=localStorage.getItem(emailKey(user?.email)),metadata=user?.user_metadata?.laysflix_profile;return normalizeKind(pending||metadata)}
function setStatus(status,message=''){
  lastCloudState=status;
  document.documentElement.dataset.cloud=status;
  const label=document.querySelector('#cloudStatus');
  if(label)label.textContent=message||({synced:'Sincronizado agora',syncing:'Sincronizando…',offline:'Offline — alterações protegidas neste aparelho',error:'Não foi possível sincronizar'}[status]||status);
  const account=document.querySelector('#cloudAccount');
  if(account)account.textContent=currentUser?.email||'Nenhuma conta conectada';
  const profile=document.querySelector('#cloudProfile');
  if(profile)profile.textContent=currentUser?(currentProfileKind==='lays'?'Perfil da Lays · histórico importado':'Perfil pessoal · começou do zero'):'Perfil não conectado';
  const sync=document.querySelector('#syncNow'),signOut=document.querySelector('#signOut'),open=document.querySelector('#openAuth');
  if(sync)sync.disabled=!currentUser;
  if(signOut)signOut.hidden=!currentUser;
  if(open)open.textContent=currentUser?'Trocar conta':'Entrar';
  hooks?.onCloudStatus?.(status,currentUser,currentProfileKind);
}
function showAuth(show,message=''){const page=document.querySelector('#authPage');if(!page)return;page.classList.toggle('open',show);page.setAttribute('aria-hidden',String(!show));const output=document.querySelector('#authMessage');if(output&&message)output.textContent=message}
function authMessage(message,error=false){const output=document.querySelector('#authMessage');if(output){output.textContent=message;output.classList.toggle('error',error)}}
function setAuthBusy(busy){const button=document.querySelector('#authSubmit');if(button){button.disabled=busy;button.textContent=busy?'Aguarde…':document.querySelector('#authPage')?.dataset.mode==='signup'?'Criar conta':'Entrar'}}
async function startAuthArtwork(){
  if(authArtStarted)return;
  authArtStarted=true;
  const frames=[...document.querySelectorAll('.auth-art-frame')];
  if(frames.length<2)return;
  try{
    const response=await fetch(`intro-feed.json?build=${encodeURIComponent(window.LAYSFLIX_BUILD_ID||'daily')}`,{cache:'no-store'});
    if(!response.ok)return;
    const feed=await response.json(),available=(feed.items||[]).filter(item=>item.backdrop_path);
    if(!available.length)return;
    const offset=Math.floor(Date.now()/864e5)%available.length,items=[...available.slice(offset),...available.slice(0,offset)].slice(0,10);
    let active=0,index=0,loading=false;
    const next=()=>{
      if(loading||document.hidden)return;
      loading=true;
      const item=items[index++%items.length],url=`https://image.tmdb.org/t/p/w1280${item.backdrop_path}`,preload=new Image();
      preload.decoding='async';
      preload.onload=()=>{const incoming=active?0:1;frames[incoming].style.backgroundImage=`url('${url}')`;requestAnimationFrame(()=>{frames[incoming].classList.add('active');frames[active].classList.remove('active');active=incoming;loading=false})};
      preload.onerror=()=>{loading=false};
      preload.src=url;
    };
    next();
    authArtTimer=setInterval(next,7800);
    addEventListener('visibilitychange',()=>{if(!document.hidden)next()});
  }catch{}
}
async function pushNow(){clearTimeout(syncTimer);if(!client||!currentUser||!hooks)return;setStatus('syncing');const payload=clone(hooks.getState());payload.preferences={...(payload.preferences||{}),profileKind:currentProfileKind};const {error}=await client.from(TABLE).upsert({user_id:currentUser.id,profile_kind:currentProfileKind,state:payload,revision:Date.now(),updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error){setStatus(navigator.onLine?'error':'offline',error.message);return false}localStorage.removeItem(emailKey(currentUser.email));setStatus('synced');return true}
function queue(){if(!currentUser)return;setStatus(navigator.onLine?'syncing':'offline');clearTimeout(syncTimer);syncTimer=setTimeout(pushNow,900)}
async function connectSession(session){
  if(!session?.user)return;
  const same=currentUser?.id===session.user.id;
  currentUser=session.user;
  showAuth(false);
  hooks.onSession?.(session);
  if(same&&lastCloudState==='synced')return;
  setStatus('syncing');
  const {data,error}=await client.from(TABLE).select('state,revision,updated_at,profile_kind').eq('user_id',session.user.id).maybeSingle();
  if(error){setStatus(navigator.onLine?'error':'offline',error.message);return}
  currentProfileKind=normalizeKind(data?.profile_kind||pendingProfile(session.user));
  const local=clone(hooks.activateUser(session.user.id,{profileKind:currentProfileKind,isNew:!data}));
  const merged=data?.state?mergeStates(local,data.state):local;
  merged.preferences={...(merged.preferences||{}),profileKind:currentProfileKind};
  hooks.applyState(merged,session.user.id,currentProfileKind);
  await pushNow();
}
async function disconnect(){clearTimeout(syncTimer);currentUser=null;currentProfileKind='standard';hooks?.onSession?.(null);setStatus('offline','Entre para sincronizar');showAuth(true)}
function setMode(page,mode){
  const signup=mode==='signup';
  page.dataset.mode=mode;
  page.querySelectorAll('[data-auth-mode]').forEach(item=>item.classList.toggle('active',item.dataset.authMode===mode));
  document.querySelector('#authSubmit').textContent=signup?'Criar conta':'Entrar';
  document.querySelector('.auth-panel h1').textContent=signup?'Crie seu perfil':'Entre no LaysFlix';
  document.querySelector('.auth-panel>p').textContent=signup?'Escolha se este perfil começa vazio ou recebe o histórico da Lays.':'Sincronize filmes, séries, episódios e notas entre iPhone e computador.';
  document.querySelector('#authPassword').autocomplete=signup?'new-password':'current-password';
  document.querySelector('#authProfileChoice').hidden=!signup;
  document.querySelector('#forgotPassword').hidden=signup;
  document.querySelector('#resendConfirmation').hidden=signup;
  authMessage('');
}
function bindAuth(){
  if(bound)return;
  bound=true;
  const page=document.querySelector('#authPage'),form=document.querySelector('#authForm');
  page?.querySelectorAll('[data-auth-mode]').forEach(button=>button.onclick=()=>setMode(page,button.dataset.authMode));
  form.onsubmit=async event=>{
    event.preventDefault();
    const email=document.querySelector('#authEmail').value.trim(),password=document.querySelector('#authPassword').value,signup=page.dataset.mode==='signup',profileKind=normalizeKind(new FormData(form).get('profileKind'));
    if(!email||password.length<6)return authMessage('Informe um e-mail e uma senha com pelo menos 6 caracteres.',true);
    setAuthBusy(true);
    const result=signup?await client.auth.signUp({email,password,options:{emailRedirectTo:AUTH_REDIRECT,data:{laysflix_profile:profileKind}}}):await client.auth.signInWithPassword({email,password});
    setAuthBusy(false);
    if(result.error)return authMessage(result.error.message,true);
    if(signup)localStorage.setItem(emailKey(email),profileKind);
    if(signup&&!result.data.session)authMessage(profileKind==='lays'?'Conta criada. Confirme o e-mail; o histórico será importado no primeiro acesso.':'Conta criada. Confirme o e-mail; seu perfil começará vazio.');
    else authMessage('Login realizado. Sincronizando sua biblioteca…');
  };
  document.querySelector('#authOffline').onclick=()=>showAuth(false);
  document.querySelector('#openAuth').onclick=async()=>{if(currentUser)await pushNow();document.querySelector('#settings')?.close();setMode(page,'login');showAuth(true)};
  document.querySelector('#syncNow').onclick=pushNow;
  document.querySelector('#signOut').onclick=async()=>{await pushNow();await client.auth.signOut()};
  document.querySelector('#forgotPassword').onclick=async()=>{const email=document.querySelector('#authEmail').value.trim();if(!email)return authMessage('Digite seu e-mail primeiro.',true);const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:AUTH_REDIRECT});authMessage(error?error.message:'Enviamos as instruções para seu e-mail.',!!error)};
  document.querySelector('#resendConfirmation').onclick=async()=>{const email=document.querySelector('#authEmail').value.trim();if(!email)return authMessage('Digite o e-mail da conta primeiro.',true);const button=document.querySelector('#resendConfirmation');button.disabled=true;const {error}=await client.auth.resend({type:'signup',email,options:{emailRedirectTo:AUTH_REDIRECT}});button.disabled=false;authMessage(error?error.message:'Novo e-mail enviado. Abra o link mais recente.',!!error)};
}
async function init(appHooks){hooks=appHooks;startAuthArtwork();const url=window.LAYSFLIX_SUPABASE_URL,key=window.LAYSFLIX_SUPABASE_PUBLISHABLE_KEY;if(!url||!key||!window.supabase?.createClient){setStatus('offline','Nuvem indisponível');return}client=window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});bindAuth();const {data:{session}}=await client.auth.getSession();if(session)await connectSession(session);else{hooks.onSession?.(null);showAuth(true);setStatus('offline','Entre para sincronizar')}client.auth.onAuthStateChange((event,next)=>setTimeout(()=>next?connectSession(next):disconnect(),0));addEventListener('online',()=>currentUser?pushNow():setStatus('offline'));addEventListener('offline',()=>setStatus('offline'));addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&currentUser)connectSession({user:currentUser})})}
window.LaysFlixCloud={init,queue,pushNow,get user(){return currentUser},get status(){return lastCloudState},get profileKind(){return currentProfileKind}};
})();
