import { animate, cubicBezier } from './assets/vendor/anime-4.5.0.min.js'

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
export const motionEase = {
  arrive: cubicBezier(.16,1,.3,1),
  release: cubicBezier(.22,.78,.25,1),
  leave: cubicBezier(.4,0,.75,1)
}

// A canceled tween settles its promise too, so callers can safely replace it.
export function tween({from=0,to=1,duration,ease=motionEase.arrive,update}) {
  let complete
  const finished = new Promise(resolve => { complete = resolve })
  const sample = {value:from}
  update(from)
  if (reducedMotion.matches || duration === 0 || from === to) {
    update(to)
    complete()
    return {finished,cancel() {}}
  }
  const animation = animate(sample, {
    value:to,
    duration,
    ease,
    onUpdate:() => update(sample.value),
    onComplete:() => {
      update(to)
      complete()
    }
  })
  return {
    finished,
    cancel() {
      animation.cancel()
      complete()
    }
  }
}

function plainClick(event) {
  return !event.defaultPrevented && event.button === 0 &&
    !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
}

function bindRow(row) {
  let pointer = matchMedia('(hover: hover)').matches && row.matches(':hover')
  let keyboard = row.matches(':focus-visible')
  let progress = pointer || keyboard ? 1 : 0
  let transition
  function paint(value) {
    progress = value
    row.style.setProperty('--row-motion',value)
  }
  function sync() {
    transition?.cancel()
    const active = pointer || keyboard
    transition = tween({from:progress,to:active ? 1 : 0,duration:active ? 170 : 120,update:paint})
  }
  row.classList.add('motion-row')
  paint(progress)
  row.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return
    pointer = true
    sync()
  })
  row.addEventListener('pointerleave', event => {
    if (event.pointerType === 'touch') return
    pointer = false
    sync()
  })
  row.addEventListener('focus', () => {
    keyboard = row.matches(':focus-visible')
    sync()
  })
  row.addEventListener('blur', () => {
    keyboard = false
    sync()
  })
  reducedMotion.addEventListener('change', sync)
}

if (CSS.supports('color', 'color-mix(in srgb, white 50%, black)')) {
  document.querySelectorAll('a.directory-row,a.hub-row:not(.hub-row--pending)').forEach(bindRow)
}

const connectDialog = document.querySelector('[data-connect-dialog]')
if (connectDialog && typeof connectDialog.showModal === 'function') {
  let trigger
  let progress = 0
  let transition
  let closing = false
  function paint(value) {
    progress = value
    connectDialog.style.setProperty('--dialog-motion',value)
  }
  function closeConnect() {
    if (closing || !connectDialog.open) return
    closing = true
    transition?.cancel()
    transition = tween({from:progress,to:0,duration:140,ease:motionEase.leave,update:paint})
    transition.finished.then(() => {
      if (closing && connectDialog.open) connectDialog.close()
    })
  }
  document.querySelectorAll('[data-connect]').forEach(link => {
    link.setAttribute('aria-haspopup','dialog')
    link.setAttribute('aria-controls',connectDialog.id)
    link.setAttribute('aria-expanded','false')
    link.addEventListener('click',event => {
      if (!plainClick(event) || connectDialog.open) return
      event.preventDefault()
      trigger = link
      trigger.setAttribute('aria-expanded','true')
      paint(0)
      connectDialog.showModal()
      transition = tween({duration:210,update:paint})
    })
  })
  connectDialog.addEventListener('close', () => {
    closing = false
    transition?.cancel()
    trigger?.setAttribute('aria-expanded','false')
    trigger?.focus({preventScroll:true})
  })
  connectDialog.addEventListener('cancel', event => {
    event.preventDefault()
    closeConnect()
  })
  connectDialog.addEventListener('submit', event => {
    if (event.target.method !== 'dialog') return
    event.preventDefault()
    closeConnect()
  })
  connectDialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return
    const focusable = [...connectDialog.querySelectorAll('button:not([disabled]),a[href]')]
    const first = focusable[0], last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus({preventScroll:true})
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus({preventScroll:true})
    }
  })
  connectDialog.addEventListener('click', event => {
    if (event.target !== connectDialog) return
    const {left,right,top,bottom} = connectDialog.getBoundingClientRect()
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) closeConnect()
  })
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches || !connectDialog.open) return
    transition?.cancel()
    if (closing) connectDialog.close()
    else paint(1)
  })
}

let sectionScroll
function cancelSectionScroll() {
  sectionScroll?.cancel()
  sectionScroll = undefined
}
for (const event of ['wheel','touchstart','pointerdown','popstate']) {
  addEventListener(event,cancelSectionScroll,{passive:true})
}
addEventListener('keydown',event => {
  if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) cancelSectionScroll()
})
reducedMotion.addEventListener('change',cancelSectionScroll)

document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]:not(.skip-link)')
  if (!link || !plainClick(event) || reducedMotion.matches || !link.hash) return
  const target = document.getElementById(decodeURIComponent(link.hash.slice(1)))
  if (!target) return
  event.preventDefault()
  cancelSectionScroll()
  const from = scrollY
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0
  const top = target.getBoundingClientRect().top + from - margin
  const to = Math.max(0,Math.min(top,document.scrollingElement.scrollHeight-innerHeight))
  if (location.hash !== link.hash) history.pushState(null,'',link.hash)
  if (!target.matches('a[href],button,input,select,textarea,[tabindex]')) {
    target.tabIndex = -1
    target.addEventListener('blur',() => target.removeAttribute('tabindex'),{once:true})
  }
  target.focus({preventScroll:true})
  const duration = Math.min(420,180+Math.abs(to-from)*.18)
  const animation = tween({
    from,to,duration,
    update:value => scrollTo({top:value,behavior:'instant'})
  })
  sectionScroll = animation
  animation.finished.then(() => {
    if (sectionScroll === animation) sectionScroll = undefined
  })
})
