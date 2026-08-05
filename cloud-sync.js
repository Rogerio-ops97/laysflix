(()=>{
const TABLE='laysflix_user_states';
const APP_URL='https://rogerio-ops97.github.io/laysflix/';
const CONFIRMATION_REDIRECT=`${APP_URL}?auth=confirmed`;
const RECOVERY_REDIRECT=`${APP_URL}?auth=recovery`;
const RESEND_COOLDOWN_KEY='laysflix-auth-resend-after';
const REMEMBER_SESSION_KEY='laysflix-auth-remember';
let client=null,hooks=null,currentUser=null,currentProfileKind='standard',recoverySession=null,syncTimer=null,authArtTimer=null,resendTimer=null,bound=false,authArtStarted=false,lastCloudState='offline';
const clone=value=>JSON.parse(JSON.stringify(value));
const normalizeKind=value=>value==='lays'?'lays':'standard';
const byUpdated=(left,right)=>Number(right?.updatedAt||0)>=Number(left?.updatedAt||0)?right:left;
const isConfirmed=user=>Boolean(user?.email_confirmed_at||user?.confirmed_at);
const rememberSession=()=>localStorage.getItem(REMEMBER_SESSION_KEY)!=='false';
const authStorage={getItem:key=>rememberSession()?localStorage.getItem(key):sessionStorage.getItem(key),setItem:(key,value)=>{const primary=rememberSession()?localStorage:sessionStorage,secondary=rememberSession()?sessionStorage:localStorage;primary.setItem(key,value);secondary.removeItem(key)},removeItem:key=>{localStorage.removeItem(key);sessionStorage.removeItem(key)}};
function mergeKeyed(left=[],right=[],keyOf){const items=new Map;[...left,...right].forEach(item=>{const key=keyOf(item);if(!key)return;items.set(key,items.has(key)?byUpdated(items.get(key),item):item)});return [...items.values()]}
function mergeStates(local={},remote={}){const dismissed=[...new Set([...(local.dismissed||[]),...(remote.dismissed||[])])],blocked=new Set(dismissed),library=mergeKeyed(local.library,remote.library,item=>`${item.media_type||item.type||(item.name?'tv':'movie')}:${item.id}`).filter(item=>!blocked.has(`${item.media_type||item.type||(item.name?'tv':'movie')}:${item.id}`)),diary={...(local.diary||{})};Object.entries(remote.diary||{}).forEach(([key,value])=>diary[key]=diary[key]?byUpdated(diary[key],value):value);return {...local,...remote,library,diary,dismissed,watchEvents:mergeKeyed(local.watchEvents,remote.watchEvents,item=>item.id),trash:mergeKeyed(local.trash,remote.trash,item=>`${item.deletedAt}:${item.item?.id}`),lists:mergeKeyed(local.lists,remote.lists,item=>item.id)} }
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
function showConfirmationHelp(show){const button=document.querySelector('#resendConfirmation');if(button)button.hidden=!show}
function hasRecoveryIntent(){return new URL(location.href).searchParams.get('auth')==='recovery'}
function cleanAuthUrl(){const url=new URL(location.href);url.searchParams.delete('auth');history.replaceState({},'',`${url.pathname}${url.search}`)}
function friendlyAuthError(error){
  const raw=String(error?.message||error||'').toLowerCase(),code=String(error?.code||'').toLowerCase();
  if(raw.includes('rate limit')||code.includes('rate_limit')||code.includes('over_email_send'))return 'O limite de e-mails do servidor gratuito foi atingido. Aguarde a liberação da cota antes de criar outra conta ou reenviar a confirmação.';
  if(raw.includes('email not confirmed')||code==='email_not_confirmed')return 'Seu e-mail ainda não foi confirmado. Abra o link recebido ou aguarde para pedir um novo.';
  if(raw.includes('invalid login credentials')||code==='invalid_credentials')return 'E-mail ou senha incorretos.';
  if(raw.includes('user already registered')||code==='user_already_exists')return 'Já existe uma conta com este e-mail. Entre com sua senha ou recupere o acesso.';
  if(raw.includes('password')&&(raw.includes('weak')||raw.includes('least')))return 'Escolha uma senha mais forte, com pelo menos 6 caracteres.';
  if(raw.includes('expired')||raw.includes('invalid')&&raw.includes('token'))return 'Este link expirou ou já foi usado. Solicite uma nova redefinição de senha.';
  if(raw.includes('email')&&raw.includes('invalid'))return 'Digite um endereço de e-mail válido.';
  if(raw.includes('network')||raw.includes('fetch'))return 'Não foi possível conectar agora. Confira sua internet e tente novamente.';
  return 'Não foi possível concluir agora. Tente novamente em alguns instantes.';
}
function startResendCooldown(seconds=60){
  const button=document.querySelector('#resendConfirmation');
  if(!button)return;
  const saved=Number(localStorage.getItem(RESEND_COOLDOWN_KEY)||0),until=Math.max(saved,Date.now()+seconds*1000);
  localStorage.setItem(RESEND_COOLDOWN_KEY,String(until));
  clearInterval(resendTimer);
  const update=()=>{
    const remaining=Math.ceil((until-Date.now())/1000);
    if(remaining>0){button.disabled=true;button.textContent=`Reenviar em ${remaining}s`;return}
    clearInterval(resendTimer);localStorage.removeItem(RESEND_COOLDOWN_KEY);button.disabled=false;button.textContent='Reenviar confirmação da conta';
  };
  update();
  resendTimer=setInterval(update,1000);
}
function restoreResendCooldown(){
  const until=Number(localStorage.getItem(RESEND_COOLDOWN_KEY)||0),remaining=Math.ceil((until-Date.now())/1000);
  if(remaining>0)startResendCooldown(remaining);else localStorage.removeItem(RESEND_COOLDOWN_KEY);
}
function setAuthBusy(busy){const page=document.querySelector('#authPage'),mode=page?.dataset.mode,button=mode==='recovery'?document.querySelector('#passwordResetSubmit'):document.querySelector('#authSubmit');if(button){button.disabled=busy;button.textContent=busy?'Aguarde…':mode==='recovery'?'Salvar nova senha':mode==='signup'?'Criar conta':'Entrar'}}
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
async function pushNow(){clearTimeout(syncTimer);if(!client||!currentUser||!hooks)return;setStatus('syncing');const payload=clone(hooks.getState());payload.preferences={...(payload.preferences||{}),profileKind:currentProfileKind};const {error}=await client.from(TABLE).upsert({user_id:currentUser.id,profile_kind:currentProfileKind,state:payload,revision:Date.now(),updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error){setStatus(navigator.onLine?'error':'offline',error.message);return false}setStatus('synced');return true}
function queue(){if(!currentUser)return;setStatus(navigator.onLine?'syncing':'offline');clearTimeout(syncTimer);syncTimer=setTimeout(pushNow,400)}
async function connectSession(session){
  if(!session?.user)return;
  if(!isConfirmed(session.user)){
    currentUser=null;
    hooks?.onSession?.(null);
    setStatus('offline','Confirme seu e-mail para criar o perfil');
    showAuth(true);
    setMode(document.querySelector('#authPage'),'login');
    document.querySelector('#authEmail').value=session.user.email||'';
    showConfirmationHelp(true);
    authMessage('Seu cadastro ainda está pendente. Confirme o e-mail para criar o perfil e liberar o LalaFlix.',true);
    return;
  }
  currentUser=session.user;
  showAuth(false);
  hooks.onSession?.(session);
  setStatus('syncing');
  const {data,error}=await client.from(TABLE).select('state,revision,updated_at,profile_kind').eq('user_id',session.user.id).maybeSingle();
  if(error){setStatus(navigator.onLine?'error':'offline',error.message);return}
  currentProfileKind=normalizeKind(data?.profile_kind);
  const local=clone(hooks.activateUser(session.user.id,{profileKind:currentProfileKind,isNew:!data}));
  const merged=data?.state?mergeStates(local,data.state):local;
  merged.preferences={...(merged.preferences||{}),profileKind:currentProfileKind};
  hooks.applyState(merged,session.user.id,currentProfileKind);
  await pushNow();
}
async function disconnect(){clearTimeout(syncTimer);currentUser=null;currentProfileKind='standard';hooks?.onSession?.(null);setStatus('offline','Entre para sincronizar');showAuth(true)}
function showPasswordReset(session){
  recoverySession=session||recoverySession;
  currentUser=null;
  hooks?.onSession?.(null);
  setStatus('offline','Defina sua nova senha');
  setMode(document.querySelector('#authPage'),'recovery');
  showAuth(true);
  authMessage(recoverySession?.user?'Crie uma nova senha com pelo menos 8 caracteres.':'O link não pôde ser validado. Solicite uma nova redefinição.',!recoverySession?.user);
}
function setMode(page,mode){
  const signup=mode==='signup',recovery=mode==='recovery';
  page.dataset.mode=mode;
  const modes=document.querySelector('.auth-modes'),authForm=document.querySelector('#authForm'),resetForm=document.querySelector('#passwordResetForm'),cancel=document.querySelector('#cancelPasswordReset'),offline=document.querySelector('#authOffline');
  if(modes)modes.hidden=recovery;
  if(authForm)authForm.hidden=recovery;
  if(resetForm)resetForm.hidden=!recovery;
  if(cancel)cancel.hidden=!recovery;
  if(offline)offline.hidden=recovery;
  page.querySelectorAll('[data-auth-mode]').forEach(item=>item.classList.toggle('active',item.dataset.authMode===mode));
  document.querySelector('#authSubmit').textContent=signup?'Criar conta':'Entrar';
  document.querySelector('.auth-panel h1').textContent=recovery?'Crie uma nova senha':signup?'Crie seu perfil':'Entre no LalaFlix';
  document.querySelector('.auth-panel>p').textContent=recovery?'Proteja sua conta com uma senha nova e exclusiva.':signup?'Crie sua conta e comece uma biblioteca totalmente nova.':'Sincronize filmes, séries, episódios e notas entre seu celular e computador.';
  document.querySelector('#authPassword').autocomplete=signup?'new-password':'current-password';
  document.querySelector('#forgotPassword').hidden=signup||recovery;
  showConfirmationHelp(false);
  authMessage('');
}
function bindAuth(){
  if(bound)return;
  bound=true;
  const page=document.querySelector('#authPage'),form=document.querySelector('#authForm');
  const remember=document.querySelector('#authRemember');
  remember.checked=rememberSession();
  remember.onchange=()=>localStorage.setItem(REMEMBER_SESSION_KEY,String(remember.checked));
  restoreResendCooldown();
  page?.querySelectorAll('[data-auth-mode]').forEach(button=>button.onclick=()=>setMode(page,button.dataset.authMode));
  form.onsubmit=async event=>{
    event.preventDefault();
    const email=document.querySelector('#authEmail').value.trim(),password=document.querySelector('#authPassword').value,signup=page.dataset.mode==='signup';
    if(!email||password.length<6)return authMessage('Informe um e-mail e uma senha com pelo menos 6 caracteres.',true);
    localStorage.setItem(REMEMBER_SESSION_KEY,String(remember.checked));
    setAuthBusy(true);
    const result=signup?await client.auth.signUp({email,password,options:{emailRedirectTo:CONFIRMATION_REDIRECT}}):await client.auth.signInWithPassword({email,password});
    setAuthBusy(false);
    if(result.error){
      const waiting=String(result.error?.message||'').toLowerCase().includes('email not confirmed')||String(result.error?.code||'').toLowerCase()==='email_not_confirmed';
      showConfirmationHelp(waiting);
      return authMessage(friendlyAuthError(result.error),true);
    }
    if(signup&&!result.data.session){
      setMode(page,'login');
      document.querySelector('#authEmail').value=email;
      showConfirmationHelp(true);
      startResendCooldown(90);
      document.querySelector('.auth-panel h1').textContent='Confirme seu e-mail';
      document.querySelector('.auth-panel>p').textContent='Seu perfil será criado somente depois que o e-mail for confirmado.';
      authMessage('Enviamos o link de confirmação. Abra-o para concluir a criação da conta e entrar no LalaFlix.');
    }
    else authMessage('Login realizado. Sincronizando sua biblioteca…');
  };
  document.querySelector('#authOffline').onclick=()=>showAuth(false);
  document.querySelector('#openAuth').onclick=async()=>{if(currentUser)await pushNow();document.querySelector('#settings')?.close();setMode(page,'login');showAuth(true)};
  document.querySelector('#syncNow').onclick=pushNow;
  document.querySelector('#signOut').onclick=async()=>{await pushNow();await client.auth.signOut()};
  document.querySelector('#forgotPassword').onclick=async()=>{const email=document.querySelector('#authEmail').value.trim();if(!email)return authMessage('Digite seu e-mail primeiro.',true);const button=document.querySelector('#forgotPassword');button.disabled=true;const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:RECOVERY_REDIRECT});button.disabled=false;authMessage(error?friendlyAuthError(error):'Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha.',!!error)};
  document.querySelector('#passwordResetForm').onsubmit=async event=>{
    event.preventDefault();
    const password=document.querySelector('#newPassword').value,confirmation=document.querySelector('#confirmNewPassword').value;
    if(password.length<8)return authMessage('A nova senha precisa ter pelo menos 8 caracteres.',true);
    if(password!==confirmation)return authMessage('As duas senhas precisam ser iguais.',true);
    if(!recoverySession?.user)return authMessage('Este link não é mais válido. Solicite uma nova redefinição.',true);
    setAuthBusy(true);
    const {data,error}=await client.auth.updateUser({password});
    setAuthBusy(false);
    if(error)return authMessage(friendlyAuthError(error),true);
    const sessionUser=data?.user||recoverySession.user;
    recoverySession=null;
    cleanAuthUrl();
    document.querySelector('#passwordResetForm').reset();
    authMessage('Senha alterada com sucesso. Entrando no LalaFlix…');
    setTimeout(()=>connectSession({user:sessionUser}),550);
  };
  document.querySelector('#cancelPasswordReset').onclick=async()=>{recoverySession=null;cleanAuthUrl();await client.auth.signOut();setMode(page,'login');showAuth(true)};
  document.querySelector('#resendConfirmation').onclick=async()=>{const email=document.querySelector('#authEmail').value.trim();if(!email)return authMessage('Digite o e-mail da conta primeiro.',true);const button=document.querySelector('#resendConfirmation');button.disabled=true;const {error}=await client.auth.resend({type:'signup',email,options:{emailRedirectTo:CONFIRMATION_REDIRECT}});startResendCooldown(90);authMessage(error?friendlyAuthError(error):'Novo e-mail enviado. Abra somente o link mais recente.',!!error)};
}
async function init(appHooks){hooks=appHooks;startAuthArtwork();const url=window.LAYSFLIX_SUPABASE_URL,key=window.LAYSFLIX_SUPABASE_PUBLISHABLE_KEY;if(!url||!key||!window.supabase?.createClient){setStatus('offline','Nuvem indisponível');return}client=window.supabase.createClient(url,key,{auth:{persistSession:true,storage:authStorage,autoRefreshToken:true,detectSessionInUrl:true}});bindAuth();const {data:{session}}=await client.auth.getSession();if(hasRecoveryIntent())showPasswordReset(session);else if(session)await connectSession(session);else{hooks.onSession?.(null);showAuth(true);setStatus('offline','Entre para sincronizar')}client.auth.onAuthStateChange((event,next)=>setTimeout(()=>{const recoveryMode=document.querySelector('#authPage')?.dataset.mode==='recovery';if(event==='PASSWORD_RECOVERY'||hasRecoveryIntent()&&!recoveryMode)return showPasswordReset(next);if(recoveryMode)return;next?connectSession(next):disconnect()},0));addEventListener('online',()=>currentUser?pushNow():setStatus('offline'));addEventListener('offline',()=>setStatus('offline'));addEventListener('visibilitychange',()=>{if(!currentUser)return;document.visibilityState==='visible'?connectSession({user:currentUser}):pushNow()});addEventListener('pagehide',()=>{if(currentUser)pushNow()})}
window.LaysFlixCloud={init,queue,pushNow,get user(){return currentUser},get status(){return lastCloudState},get profileKind(){return currentProfileKind}};
})();
