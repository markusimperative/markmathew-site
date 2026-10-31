const gallery = document.querySelector('[data-gallery]')

if (gallery) {
  const cards = [...gallery.querySelectorAll('[data-study]')]
  const controls = [...gallery.querySelectorAll('[data-gallery-index]')]
  const caption = gallery.querySelector('[data-gallery-caption]')
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const titles = ['Landscape exploration', 'Data as material', 'Architectural light study', 'Lexography', 'Energy studies']
  // Exported Figma variant geometry: x, y, width, height on the 1440 × 551.724 stage.
  const layouts = [
    [[499.73,0,440.538,552],[964.27,44,375.76,488],[1364.03,64,294.4,480],[34.21,162,209.455,384],[267.67,122,208.062,368]],
    [[189.79,122,293.692,368],[507.48,0,425.04,552],[956.52,44,299.307,488],[1279.83,64,261.818,480],[-51.32,162,217.108,384]],
    [[0,161.84,305.287,382.529],[292.41,121.38,283.218,367.816],[560.92,0,338.391,551.724],[912.18,44.14,264.828,485.517],[1169.66,62.53,270.345,478.161]],
    [[1194.45,64,383.077,480],[.07,162,295.68,384],[319.75,122,225.707,368],[569.45,0,301.091,552],[894.55,44,275.908,488]],
    [[900.05,44,389.462,488],[1313.51,64,369.6,480],[79.71,162,235.52,384],[339.23,122,200.727,368],[563.95,0,312.092,552]],
  ]
  let selected = 2

  function selectStudy(index, moveFocus = false) {
    const next = (index + cards.length) % cards.length
    if (next === selected) {
      if (moveFocus) controls[next].focus({ preventScroll: true })
      return
    }
    const previous = cards.map(card => {
      card.getAnimations().forEach(animation => animation.cancel())
      return card.getBoundingClientRect()
    })
    selected = next
    cards.forEach((card, i) => {
      const [x,y,width,height] = layouts[next][i]
      for (const [key,value] of Object.entries({x,y,w:width,h:height})) card.style.setProperty(`--card-${key}`, value)
      card.setAttribute('aria-pressed', String(i === next))
      controls[i].setAttribute('aria-pressed', String(i === next))
      controls[i].tabIndex = i === next ? 0 : -1
    })
    const current = cards.map(card => card.getBoundingClientRect())
    if (!reducedMotion.matches) cards.forEach((card,i) => {
      const before = previous[i], after = current[i]
      card.animate([
        { transformOrigin: 'top left', transform: `translate(${before.left-after.left}px,${before.top-after.top}px) scale(${before.width/after.width},${before.height/after.height})` },
        { transformOrigin: 'top left', transform: 'none' },
      ], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' })
    })
    caption.textContent = titles[next]
    caption.style.setProperty('--caption-offset', next === 2 ? '10.11px' : '0px')
    if (moveFocus) controls[next].focus({ preventScroll: true })
  }

  cards.forEach((card,i) => card.addEventListener('click', () => selectStudy(i)))
  controls.forEach((control,i) => control.addEventListener('click', () => selectStudy(i, true)))
  gallery.addEventListener('keydown', event => {
    let next
    if (event.key === 'ArrowRight') next = selected + 1
    else if (event.key === 'ArrowLeft') next = selected - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = cards.length - 1
    else return
    event.preventDefault()
    selectStudy(next, true)
  })
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) cards.forEach(card => card.getAnimations().forEach(animation => animation.finish()))
  })
  for (const button of [...cards, ...controls]) button.disabled = false
}

const connectDialog = document.querySelector('[data-connect-dialog]')
if (connectDialog && typeof connectDialog.showModal === 'function') {
  let trigger
  document.querySelectorAll('[data-connect]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault()
    trigger = link
    connectDialog.showModal()
  }))
  connectDialog.addEventListener('close', () => trigger?.focus({ preventScroll: true }))
  connectDialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return
    const focusable = [...connectDialog.querySelectorAll('button:not([disabled]),a[href]')]
    const first = focusable[0], last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus({ preventScroll: true })
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus({ preventScroll: true })
    }
  })
  connectDialog.addEventListener('click', event => {
    if (event.target !== connectDialog) return
    const {left,right,top,bottom} = connectDialog.getBoundingClientRect()
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) connectDialog.close()
  })
}
