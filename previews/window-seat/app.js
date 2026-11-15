const stage = document.querySelector('#stage');
const login = document.querySelector('#login-card');
const ticket = document.querySelector('#ticket');
const loginTab = document.querySelector('#login-tab');
const passTab = document.querySelector('#pass-tab');
const form = document.querySelector('#login-form');
const note = document.querySelector('#form-note');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let busy = false;
let activeMotion = [];
const ease = 'cubic-bezier(.22,1,.36,1)';
const ticketDetails = [...ticket.querySelectorAll('.ticket-main > *, .ticket-stub > *')];
function animate(element, keyframes, options) {
  const animation = element.animate(keyframes, { fill: 'both', ...options });
  activeMotion.push(animation);
  return animation;
}
function finishMotion() {
  activeMotion.forEach(animation => animation.finish());
}
window.addEventListener('resize', finishMotion);
reduceMotion.addEventListener('change', event => { if (event.matches) finishMotion(); });

async function flyIntoWindow() {
  const windowMark = document.querySelector('.window-mark');
  const bounds = windowMark.getBoundingClientRect();
  const viewport = document.createElement('div');
  viewport.className = 'flight-viewport';
  viewport.setAttribute('aria-hidden', 'true');
  const flyingWindow = windowMark.cloneNode(true);
  flyingWindow.classList.add('flying-window');
  Object.assign(flyingWindow.style, {left:`${bounds.left}px`,top:`${bounds.top}px`,width:`${bounds.width}px`,height:`${bounds.height}px`});
  viewport.append(flyingWindow);
  document.body.append(viewport);
  const scale = Math.max(innerWidth / (bounds.width - 10), innerHeight / (bounds.height - 10)) * 1.3;
  const x = innerWidth / 2 - (bounds.left + bounds.width / 2);
  const y = innerHeight / 2 - (bounds.top + bounds.height / 2);
  stage.dataset.motion = 'flying';
  const zoom = animate(flyingWindow, [
    {transform:'translate(0,0) scale(1)',offset:0},
    {transform:`translate(${x}px,${y}px) scale(${scale})`,offset:.86},
    {transform:`translate(${x}px,${y}px) scale(${scale * 1.04})`,offset:1}
  ], {duration:1200,easing:'cubic-bezier(.65,0,.35,1)'});
  await zoom.finished;
  return viewport;
}

async function setState(next, fromButton = false) {
  if (busy || stage.dataset.state === next) return;
  busy = true;
  stage.setAttribute('aria-busy', 'true');
  loginTab.disabled = passTab.disabled = true;
  const isPass = next === 'pass';
  const outgoing = isPass ? login : ticket;
  const incoming = isPass ? ticket : login;
  const hadFocus = outgoing.contains(document.activeElement);
  const button = document.querySelector('#login-button');
  // Measure before hiding anything. Both surfaces occupy the same grid cell.
  const source = button.getBoundingClientRect();
  outgoing.inert = true;
  incoming.inert = false;
  let flightViewport;
  try {
    if (isPass && !reduceMotion.matches) {
      flightViewport = await flyIntoWindow();
    }
    incoming.hidden = false;
    stage.dataset.motion = 'revealing';
    if (!reduceMotion.matches && isPass) {
      if (flightViewport) animate(flightViewport, [{opacity:1},{opacity:0}], {duration:280,easing:'ease-out'});
      const target = ticket.getBoundingClientRect();
      ticket.classList.add('is-morphing');
      const start = `translate(${source.left-target.left}px,${source.top-target.top}px) scale(${source.width/target.width},${source.height/target.height})`;
      // The real ticket panels expand from the button, rather than swapping in a duplicate.
      animate(ticket, [
        {transform:start,offset:0},
        {transform:'translate(0,0) scale(1)',offset:1}
      ], {duration:820,easing:ease});
      animate(login, [{opacity:1},{opacity:0}], {duration:240,easing:'ease-out'});
      ticket.querySelectorAll('.ticket-main, .ticket-stub').forEach(panel => {
        animate(panel, [
          {backgroundColor:'#101415',offset:0},
          {backgroundColor:'#101415',offset:.28},
          {backgroundColor:'#fcfdfb',offset:.82},
          {backgroundColor:'#fcfdfb',offset:1}
        ], {duration:820,easing:'linear'});
      });
      ticketDetails.forEach((detail, index) => {
        // Route and seat arrive together while the ticket is still settling.
        const order = detail.matches('.route, .seat') ? 0 : 1;
        animate(detail, [
          {opacity:0,transform:'translateY(16px)'},
          {opacity:1,transform:'translateY(0)'}
        ], {duration:340,delay:460 + order*60 + (index % 2)*20,easing:ease});
      });
      await Promise.all(activeMotion.map(animation => animation.finished));
    } else {
      outgoing.hidden = true;
      if (!reduceMotion.matches) {
        await animate(incoming, [{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}], {duration:240,easing:ease}).finished;
      }
    }
  } finally {
    outgoing.hidden = true;
    incoming.hidden = false;
    flightViewport?.remove();
    delete stage.dataset.motion;
    // Remove fill effects so replay and responsive layout use their natural styles.
    activeMotion.forEach(animation => animation.cancel());
    activeMotion = [];
    ticket.classList.remove('is-morphing');
    stage.dataset.state = next;
    loginTab.setAttribute('aria-pressed', String(!isPass));
    passTab.setAttribute('aria-pressed', String(isPass));
    loginTab.disabled = passTab.disabled = false;
    stage.removeAttribute('aria-busy');
    document.querySelector('#scene-title').textContent = isPass ? 'The window is yours.' : 'A little closer to the sky.';
    document.querySelector('#scene-detail').textContent = isPass ? 'San Francisco to New York · Seat 23A' : 'Your next journey starts here';
    document.querySelector('#state-announcement').textContent = isPass ? 'Sample boarding pass. SFO to JFK, window seat 23A.' : 'Login preview';
    if (fromButton && isPass) ticket.focus({preventScroll:true});
    else if (hadFocus) (isPass ? passTab : loginTab).focus({preventScroll:true});
    busy = false;
  }
}
loginTab.addEventListener('click', () => setState('login'));
passTab.addEventListener('click', () => setState('pass'));
form.addEventListener('submit', event => {
  event.preventDefault();
  const invalid = [...form.querySelectorAll('input')].find(input => !input.validity.valid);
  form.querySelectorAll('input').forEach(input => input.setAttribute('aria-invalid', String(!input.validity.valid)));
  if (invalid) {
    note.textContent = invalid.type === 'email' ? 'Enter a sample email address to continue.' : 'Use a made-up password of at least 4 characters.';
    invalid.focus();
    return;
  }
  note.textContent = 'Demo only. Use made-up details.';
  setState('pass', true);
});
form.addEventListener('input', event => {event.target.removeAttribute('aria-invalid');note.textContent = 'Demo only. Use made-up details.';});
document.querySelector('#password-toggle').addEventListener('click', event => {
  const input = document.querySelector('#password');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  event.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  event.currentTarget.setAttribute('aria-pressed', String(show));
});
