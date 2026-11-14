import { motionEase, reducedMotion, tween } from './site-motion.js?v=anime-motion-1'

const gallery = document.querySelector('[data-gallery]')

if (gallery) {
  const hero = gallery.closest('.hero')
  const intro = hero.querySelector('.hero-copy')
  const lead = intro.querySelector('.hero-lead')
  const introLines = intro.querySelectorAll('.hero-title-line,.hero-lead-line,.hero-explore')
  const planes = [...gallery.querySelectorAll('[data-plane]')]
  const controls = [...gallery.querySelectorAll('[data-gallery-index]')]
  const caption = gallery.querySelector('[data-gallery-caption]')
  const projectLinks = [...caption.querySelectorAll('a')]
  const artworkDescription = document.querySelector('#gallery-art-description')
  const frame = gallery.querySelector('.gallery-selection')
  const footer = gallery.querySelector('.gallery-footer')
  const controlRow = footer.querySelector('.gallery-index')
  // The original reference defines the card outlines and ribbon geometry.
  const sourceFaces = planes.map(plane => JSON.parse(plane.dataset.face))
  let selectedCursor = Math.max(0, controls.findIndex(control => control.getAttribute('aria-pressed') === 'true'))
  let requestedCursor = selectedCursor
  let pendingProjectHref = null
  let cycling = false
  let layoutVersion = 0
  let dragLayout
  let gesture
  let release
  let galleryTransition
  let suppressCardClick = false
  const instances = new Map(planes.map((plane,i) => {
    plane.dataset.occurrence = String(i)
    return [i,plane]
  }))
  const stage = gallery.querySelector('.gallery-stage')
  const studyAt = cursor => ((cursor%planes.length)+planes.length)%planes.length
  const frameWidthNative = 520
  const selectedWidthLimit = frameWidthNative - 54
  const frameLeftNative = 803.5 - frameWidthNative/2

  const dimensions = planes.map(plane => ({width:Number(plane.style.getPropertyValue('--source-w')),height:Number(plane.style.getPropertyValue('--source-h'))}))
  const slotHeights = [373,417,655,489,557]
  const slotTops = [480,382,154,191,94]

  function arrangement(index) {
    const poses = []
    for (let i = 0; i < planes.length; i++) {
      const slot = (i-index+2+planes.length)%planes.length
      const factor = slotHeights[slot]/dimensions[i].height
      poses[i] = {slot,factor,width:dimensions[i].width*factor,height:slotHeights[slot],y:slotTops[slot]}
    }
    const leftNear=(index+4)%5,leftFar=(index+3)%5,rightNear=(index+1)%5,rightFar=(index+2)%5
    const selectedFactor=Math.min(655/dimensions[index].height,selectedWidthLimit/dimensions[index].width)
    Object.assign(poses[index], {factor:selectedFactor,width:dimensions[index].width*selectedFactor,height:dimensions[index].height*selectedFactor})
    poses[index].x = 803.5-poses[index].width/2
    poses[index].y = 809-poses[index].height
    poses[leftNear].x = poses[index].x-poses[leftNear].width
    poses[leftFar].x = poses[leftNear].x+28-poses[leftFar].width
    poses[rightNear].x = poses[index].x+poses[index].width-3
    poses[rightFar].x = poses[rightNear].x+poses[rightNear].width-43
    return poses
  }

  function ribbonPoses(cursor,scale,originX,width,minOccurrence,maxOccurrence) {
    const poses = new Map()
    const core = arrangement(studyAt(cursor))
    core.forEach((pose,study)=>poses.set(cursor+pose.slot-2,{...pose,study}))
    const overscan = Math.max(240,360*scale)
    let leftOccurrence=cursor-2,rightOccurrence=cursor+2
    let left=poses.get(leftOccurrence),right=poses.get(rightOccurrence)
    while (left.x*scale+originX>-overscan || leftOccurrence>minOccurrence) {
      const occurrence=--leftOccurrence,study=studyAt(occurrence)
      const factor=slotHeights[0]/dimensions[study].height
      const cardWidth=dimensions[study].width*factor
      left={study,slot:occurrence-cursor+2,factor,width:cardWidth,height:slotHeights[0],x:left.x+28-cardWidth,y:slotTops[0]}
      poses.set(occurrence,left)
    }
    while ((right.x+right.width)*scale+originX<width+overscan || rightOccurrence<maxOccurrence) {
      const occurrence=++rightOccurrence,study=studyAt(occurrence)
      const factor=slotHeights[4]/dimensions[study].height
      const cardWidth=dimensions[study].width*factor
      right={study,slot:occurrence-cursor+2,factor,width:cardWidth,height:slotHeights[4],x:right.x+right.width-43,y:slotTops[4]}
      poses.set(occurrence,right)
    }
    return poses
  }

  function leftEdgeAtY(polygon, y) {
    const intersections=[]
    polygon.forEach(([x1,y1],i) => {
      const [x2,y2]=polygon[(i+1)%polygon.length]
      if (Math.abs(y2-y1)<.001 || y<Math.min(y1,y2) || y>Math.max(y1,y2)) return
      intersections.push(x1+(x2-x1)*(y-y1)/(y2-y1))
    })
    return intersections.length ? Math.min(...intersections) : Infinity
  }

  function cancelRelease() {
    const previous = release
    release = undefined
    previous?.transition.cancel()
    return previous
  }

  function planeFor(occurrence, study) {
    let plane = instances.get(occurrence)
    if (!plane) {
      plane = planes[study].cloneNode(true)
      plane.removeAttribute('data-plane')
      plane.dataset.occurrence = String(occurrence)
      stage.append(plane)
      instances.set(occurrence, plane)
    }
    return plane
  }

  function renderStudy(animate = false, previousCursor = selectedCursor, settleDuration) {
    const version=++layoutVersion
    const motionEnabled=animate&&settleDuration!==0&&!reducedMotion.matches
    const previousTransforms=new Map()
    if (motionEnabled) {
      for (const [key,plane] of instances) {
        const transform=getComputedStyle(plane).transform
        if (transform==='none') continue
        const {m41,m42,m11}=new DOMMatrixReadOnly(transform)
        previousTransforms.set(key,{x:m41,y:m42,factor:m11})
      }
    }
    galleryTransition?.cancel()
    // The scene uses layout pixels; client rectangles include the site's desktop scale.
    const zoom = Number(getComputedStyle(document.documentElement).zoom) || 1
    const scrollTop = scrollY
    const viewportHeight = innerHeight / zoom
    const boundsOf = element => {
      const {left,right,top,bottom,height} = element.getBoundingClientRect()
      return {left:left/zoom,right:right/zoom,top:(top+scrollTop)/zoom,bottom:(bottom+scrollTop)/zoom,height:height/zoom}
    }
    const width = gallery.getBoundingClientRect().width / zoom
    const fraction = value => Math.min(1, Math.max(0, value))
    // Move the controls to the outer rail only when there is room beside the artwork.
    const wide = fraction((innerWidth - 1200) / 500) * fraction((innerHeight - 800) / 100)
    const interpolate = (from, to) => from + (to - from) * wide
    gallery.style.setProperty('--gallery-wide', wide)
    gallery.classList.add('gallery--projected')
    const footerHeight = boundsOf(footer).height
    const controlsWidth = controlRow.getBoundingClientRect().width / zoom
    const naturalScale = Math.max(width, 640) / 1672
    const lowestScale = Math.min(naturalScale, .25 / zoom)
    const compactFont = 16 / zoom
    const compactLabelPadding = 10 / zoom
    const compactControlsGap = 6 / zoom
    const compactBottomSpace = 16 / zoom
    const firstArtworkTop = Math.min(...slotTops)
    const compactTop = boundsOf(intro).bottom + 16 / zoom
    const frameBudget = viewportHeight - compactTop - compactControlsGap - footerHeight - compactBottomSpace
    // Fit the entire caption and control row before spending the remaining height on art.
    const compactScale = Math.max(lowestScale, Math.min(
      naturalScale,
      frameBudget / (862 - firstArtworkTop),
      (frameBudget - compactFont * 1.4 - compactLabelPadding) / (817 - firstArtworkTop)
    ))
    const wideHeight = Math.max(viewportHeight, boundsOf(lead).bottom + 400)
    const wideScale = Math.min(naturalScale, wideHeight / 940)
    const scale = interpolate(compactScale, wideScale)
    const offsetY = interpolate(compactTop - firstArtworkTop * compactScale, Math.max(0, wideHeight - 940 * wideScale))
    const fontSize = interpolate(compactFont, Math.max(16, Math.min(24, 20 * wideScale)))
    const lineHeight = fontSize * 1.4
    const labelPadding = interpolate(compactLabelPadding, Math.max(12, Math.min(32, 16 * wideScale)))
    const frameWidth = frameWidthNative * scale
    const frameTop = 174 * scale + offsetY
    const frameBottom = offsetY + Math.max(862 * scale, 817 * scale + lineHeight + labelPadding)
    const footerTop = Math.max(
      frameBottom + interpolate(compactControlsGap, 0),
      interpolate(frameBottom, wideHeight - 44 * wideScale - footerHeight)
    )
    const sceneHeight = Math.max(viewportHeight, footerTop + footerHeight + compactBottomSpace)
    const copyLines = wide > 0 ? [...introLines].map(boundsOf) : []
    const centeredOrigin = width / 2 - (frameLeftNative + frameWidthNative / 2) * scale
    const baseOrigin = interpolate(centeredOrigin, (width - 1672 * scale) / 2)
    let clearance = 0
    if (copyLines.length) {
      // Reserve space for every selected face so changing the study never moves the frame.
      const faces = sourceFaces.map((face, i) => {
        const factor = Math.min(655 / dimensions[i].height, selectedWidthLimit / dimensions[i].width)
        const xOrigin = 803.5 - dimensions[i].width * factor / 2
        const yOrigin = 809 - dimensions[i].height * factor
        return face.map(([x, y]) => [(xOrigin + x * factor) * scale + baseOrigin, (yOrigin + y * factor) * scale + offsetY])
      })
      for (const bounds of copyLines) {
        if (bounds.bottom > frameTop && bounds.top < frameBottom) {
          clearance = Math.max(clearance, bounds.right + 24 - (frameLeftNative * scale + baseOrigin))
        }
        for (const y of [bounds.top + 2, bounds.bottom - 2]) {
          for (const face of faces) clearance = Math.max(clearance, bounds.right + 16 - leftEdgeAtY(face, y))
        }
      }
    }
    const originX = baseOrigin + clearance
    const navBottom = boundsOf(document.querySelector('.main-nav')).bottom
    const frameLeft = frameLeftNative * scale + originX
    const centeredControlsRight = frameLeft + (frameWidth + controlsWidth) / 2
    const controlsInset = Math.max(0, boundsOf(footer).right - centeredControlsRight)
    gallery.style.setProperty('--gallery-controls-top', `${footerTop}px`)
    gallery.style.setProperty('--gallery-controls-inset', `${interpolate(controlsInset, 0)}px`)
    hero.style.setProperty('--scene-header-height', `${hero.offsetTop}px`)
    const existing=[...instances.keys()]
    const poses=ribbonPoses(selectedCursor,scale,originX,width,Math.min(...existing),Math.max(...existing))
    const occurrences=[...poses.keys()]
    const previousPoses=motionEnabled?ribbonPoses(previousCursor,scale,originX,width,Math.min(...occurrences),Math.max(...occurrences)):new Map()
    const overscan=Math.max(240,360*scale)
    function project(pose) {
      const x=pose.x*scale+originX
      const cardWidth=pose.width*scale,cardHeight=pose.height*scale
      let y = pose.y * scale + offsetY
      if (pose.slot >= 4) y = interpolate(y, Math.max(y, navBottom + 16))
      if (pose.slot <= 0) y = interpolate(y, Math.min(y, footerTop - 16 - cardHeight))
      if (wide > 0 && pose.slot < 2) {
        for (const bounds of copyLines) {
          const top=bounds.top-16,bottom=bounds.bottom+16
          const face=sourceFaces[pose.study].map(([px,py])=>[x+px*pose.factor*scale,y+py*pose.factor*scale])
          const samples=[top,bottom,...face.map(point=>point[1]).filter(py=>py>=top&&py<=bottom)]
          const intersects=samples.some(py=>leftEdgeAtY(face,py)<bounds.right+16&&-leftEdgeAtY(face.map(([px,fy])=>[-px,fy]),py)>bounds.left-16)
          if (intersects) y=Math.max(y,bounds.bottom+24)
        }
      }
      return {x,y,width:cardWidth,factor:pose.factor*scale,transform:`translate(${x}px,${y}px) scale(${pose.factor*scale})`}
    }
    dragLayout = {scale,originX,width,zoom,overscan,project}
    const moving=[],positions=new Map()
    for (const [occurrence,pose] of poses) {
      const plane=planeFor(occurrence,pose.study)
      const position=project(pose)
      positions.set(occurrence,position)
      plane.style.zIndex=String(Math.max(1,7-Math.abs(pose.slot-2)))
      const outside=position.x+position.width<0||position.x>width
      plane.setAttribute('aria-hidden',String(outside))
      plane.inert=outside
      if (motionEnabled) {
        const from=previousTransforms.get(occurrence)||project(previousPoses.get(occurrence))
        moving.push({plane,from,to:position})
      } else plane.style.transform=position.transform
    }
    Object.assign(frame.style, {left:`${frameLeft}px`,top:`${frameTop}px`,width:`${frameWidth}px`,height:`${frameBottom-frameTop}px`})
    Object.assign(caption.style, {left:`${frameLeft}px`,top:`${frameBottom-labelPadding-lineHeight}px`,width:`${frameWidth}px`,fontSize:`${fontSize}px`,lineHeight:`${lineHeight}px`})
    hero.style.setProperty('--scene-height', `${sceneHeight}px`)
    function prune() {
      if (version!==layoutVersion) return
      for (const [occurrence,plane] of instances) {
        const position=positions.get(occurrence)
        if (!position || position.x+position.width<-overscan || position.x>width+overscan) {
          plane.remove()
          instances.delete(occurrence)
        }
      }
    }
    if (!motionEnabled) {
      prune()
      return Promise.resolve()
    }
    const duration=settleDuration??Math.min(540,340+Math.max(0,Math.abs(selectedCursor-previousCursor)-1)*42)
    galleryTransition = tween({
      duration,
      update:progress => moving.forEach(({plane,from,to}) => paintCard(plane,from,to,progress))
    })
    return galleryTransition.finished.then(prune)
  }

  function paintCard(plane,from,to,progress) {
    const x=from.x+(to.x-from.x)*progress
    const y=from.y+(to.y-from.y)*progress
    const factor=from.factor+(to.factor-from.factor)*progress
    plane.style.transform=`translate(${x}px,${y}px) scale(${factor})`
  }

  function updateSelection(cursor) {
    const index = studyAt(cursor)
    controls.forEach((control,i) => {
      control.setAttribute('aria-pressed', String(i === index))
      control.tabIndex = i === index ? 0 : -1
    })
    artworkDescription.textContent = planes[index].querySelector('img').alt
    projectLinks.forEach((link,i) => link.toggleAttribute('hidden', i !== index))
  }

  function runSelection(nextCursor, settleDuration) {
    const previousCursor=selectedCursor
    selectedCursor=nextCursor
    cycling=true
    renderStudy(true,previousCursor,settleDuration).then(()=>{
      cycling=false
      if (requestedCursor!==selectedCursor) {
        runSelection(requestedCursor)
        return
      }
      if (pendingProjectHref) {
        const href = pendingProjectHref
        pendingProjectHref = null
        location.assign(href)
      }
    })
  }

  function selectOccurrence(cursor,moveFocus=false,projectHref=null) {
    if (gesture?.tracks) return
    const interrupted = cancelRelease()
    requestedCursor=cursor
    pendingProjectHref=projectHref
    // Keep focus and its destination in sync even while artwork is still moving.
    updateSelection(cursor)
    if (moveFocus) controls[studyAt(cursor)].focus({preventScroll:true})
    if (!cycling&&(interrupted||requestedCursor!==selectedCursor)) runSelection(requestedCursor)
  }

  function selectStudy(index,moveFocus=false) {
    const forward=(index-studyAt(requestedCursor)+planes.length)%planes.length
    const delta=forward<=planes.length/2?forward:forward-planes.length
    selectOccurrence(requestedCursor+delta,moveFocus)
  }

  function prepareDrag(drag) {
    const {scale,originX,width,zoom,project} = dragLayout
    const occurrences = [...instances.keys()]
    const first = Math.min(drag.anchor,...occurrences)
    const last = Math.max(drag.anchor,...occurrences)
    drag.posesAt = cursor => new Map(
      [...ribbonPoses(cursor,scale,originX,width,first,last)].map(([occurrence,pose]) => [occurrence,project(pose)])
    )
    const rest = {cursor:selectedCursor,distance:0,poses:drag.posesAt(selectedCursor)}
    return [[rest],[rest]]
  }

  function dragSegment(drag, offset) {
    const direction = offset > 0 ? -1 : 1
    const stops = drag.tracks[direction === -1 ? 0 : 1]
    const distance = Math.abs(offset)
    // Measure each step at the point the visitor grabbed, even as the artwork scales.
    const anchorX = poses => {
      const pose = poses.get(drag.anchor)
      return pose.x + pose.width*drag.anchorFraction
    }
    while (stops.length === 1 || stops.at(-1).distance < distance) {
      const previous = stops.at(-1)
      const cursor = previous.cursor + direction
      const poses = drag.posesAt(cursor)
      const step = (anchorX(previous.poses)-anchorX(poses))*direction*dragLayout.zoom
      stops.push({cursor,distance:previous.distance+Math.max(24,step),poses})
    }
    const index = stops.findIndex(stop => stop.distance >= distance)
    const end = stops[Math.max(1,index)]
    const start = stops[Math.max(0,index-1)]
    const progress = (distance-start.distance)/(end.distance-start.distance)
    return {start,end,progress,direction}
  }

  function paintDrag(drag, offset=drag.lastX-drag.startX) {
    const {width,overscan} = dragLayout
    const segment = dragSegment(drag,offset)
    const {start,end,progress} = segment
    const between = (from,to) => from+(to-from)*progress
    const front = progress < .5 ? start.cursor : end.cursor
    const visible = new Set()
    for (const [occurrence,from] of start.poses) {
      const to = end.poses.get(occurrence)
      if (!to) continue
      const x = between(from.x,to.x)
      const cardWidth = between(from.width,to.width)
      if (x+cardWidth < -overscan || x > width+overscan) continue
      const plane = planeFor(occurrence,studyAt(occurrence))
      paintCard(plane,from,to,progress)
      plane.style.zIndex = String(Math.max(1,7-Math.abs(occurrence-front)))
      const outside = x+cardWidth < 0 || x > width
      if (plane.inert !== outside) {
        plane.inert = outside
        plane.setAttribute('aria-hidden',String(outside))
      }
      visible.add(occurrence)
    }
    for (const [occurrence,plane] of instances) {
      if (visible.has(occurrence)) continue
      plane.remove()
      instances.delete(occurrence)
    }
    return segment
  }

  function queueDragPaint(drag) {
    if (drag.frame !== undefined) return
    drag.frame = requestAnimationFrame(() => {
      drag.frame = undefined
      if (gesture === drag) paintDrag(drag)
    })
  }

  function recordDragPosition(drag,event) {
    drag.lastX = event.clientX
    drag.samples.push({x:event.clientX,time:event.timeStamp})
    while (drag.samples.length > 1 && event.timeStamp-drag.samples[0].time > 100) {
      drag.samples.shift()
    }
  }

  stage.addEventListener('pointerdown', event => {
    if (gesture || !event.isPrimary || event.button !== 0) return
    suppressCardClick = false
    if (cycling || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const plane = event.target.closest('[data-occurrence]')
    const box = plane?.getBoundingClientRect()
    gesture = {
      id:event.pointerId,
      anchor:plane ? Number(plane.dataset.occurrence) : selectedCursor,
      anchorFraction:box?.width ? (event.clientX-box.left)/box.width : .5,
      pressX:event.clientX,
      startX:event.clientX,
      startY:event.clientY,
      samples:[]
    }
    recordDragPosition(gesture,event)
  })

  addEventListener('pointermove', event => {
    if (event.pointerId !== gesture?.id) return
    if (event.pointerType === 'mouse' && !(event.buttons & 1)) {
      finishDrag(event)
      return
    }
    const drag = gesture
    if (!drag.tracks) {
      const x = Math.abs(event.clientX - drag.pressX)
      const y = Math.abs(event.clientY - drag.startY)
      if (Math.max(x,y) < (event.pointerType === 'mouse' ? 5 : 8)) return
      if (y >= x || cycling) {
        gesture = null
        return
      }
      const interrupted = cancelRelease()
      if (interrupted) {
        // Resume from the exact point on the ribbon where the release stopped.
        const previous = interrupted.drag
        drag.tracks = previous.tracks
        drag.posesAt = previous.posesAt
        drag.anchor = previous.anchor
        drag.anchorFraction = previous.anchorFraction
        drag.startX = drag.pressX-interrupted.offset
      } else drag.tracks = prepareDrag(drag)
      suppressCardClick = true
      stage.setPointerCapture(event.pointerId)
      stage.classList.add('gallery-stage--dragging')
    }
    recordDragPosition(drag,event)
    queueDragPaint(drag)
  })

  function finishDrag(event) {
    if (event.pointerId !== gesture?.id) return
    const drag = gesture
    gesture = null
    if (!drag.tracks) return
    if (drag.frame !== undefined) cancelAnimationFrame(drag.frame)
    stage.classList.remove('gallery-stage--dragging')
    const released = event.type === 'pointerup'
    if (released) recordDragPosition(drag,event)
    const offset = drag.lastX-drag.startX
    const {start,end} = paintDrag(drag)
    const sample = drag.samples[0]
    const elapsed = event.timeStamp-sample.time
    const velocity = released && elapsed > 0 ? (drag.lastX-sample.x)/elapsed : 0
    const maxGlide = (end.distance-start.distance)*.85
    const glide = Math.abs(offset) > 16 ? Math.max(-maxGlide,Math.min(maxGlide,velocity*160)) : 0
    const target = dragSegment(drag,offset+glide)
    const stop = target.progress < .5 ? target.start : target.end
    requestedCursor = released ? stop.cursor : selectedCursor
    const destination = released ? -stop.distance*target.direction : 0
    const remaining = Math.abs(offset-destination)
    const duration = remaining < 1 ? 0 : Math.min(345,125+remaining/(.85+Math.abs(velocity)))
    pendingProjectHref = null
    const settleSelection = () => {
      updateSelection(requestedCursor)
      runSelection(requestedCursor,0)
    }
    if (reducedMotion.matches || duration === 0) {
      settleSelection()
      return
    }
    const settling = {drag,offset}
    release = settling
    settling.transition = tween({
      from:offset,to:destination,duration,ease:motionEase.release,
      update:value => {
        settling.offset = value
        paintDrag(drag,value)
      }
    })
    settling.transition.finished.then(() => {
      if (release !== settling) return
      release = undefined
      settleSelection()
    })
  }

  addEventListener('pointerup', finishDrag)
  addEventListener('pointercancel', finishDrag)
  stage.addEventListener('lostpointercapture', event => {
    // Touch may transfer implicit capture from the card to the stage.
    if (event.target === stage) finishDrag(event)
  })
  stage.addEventListener('dragstart', event => event.preventDefault())
  stage.addEventListener('click',event=>{
    if (suppressCardClick && event.detail > 0) {
      event.preventDefault()
      suppressCardClick = false
      return
    }
    const link = event.target.closest('a.art-card')
    if (!link || event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const occurrence = Number(link.closest('[data-occurrence]').dataset.occurrence)
    if (!cycling && !release && occurrence === selectedCursor) return
    event.preventDefault()
    selectOccurrence(occurrence,true,link.href)
  })
  controls.forEach((control,i)=>control.addEventListener('click',()=>selectStudy(i,true)))
  gallery.addEventListener('keydown',event=>{
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key==='ArrowRight') selectOccurrence(requestedCursor+1,true)
    else if (event.key==='ArrowLeft') selectOccurrence(requestedCursor-1,true)
    else if (event.key==='Home') selectStudy(0,true)
    else if (event.key==='End') selectStudy(planes.length-1,true)
    else return
    event.preventDefault()
  })
  function refreshLayout() {
    if (cancelRelease()) {
      updateSelection(requestedCursor)
      runSelection(requestedCursor,0)
      return
    }
    renderStudy()
    if (gesture?.tracks) {
      gesture.tracks = prepareDrag(gesture)
      paintDrag(gesture)
    }
  }

  const observer = new ResizeObserver(refreshLayout)
  observer.observe(gallery)
  observer.observe(intro)
  observer.observe(document.querySelector('.masthead'))
  addEventListener('resize', refreshLayout)
  reducedMotion.addEventListener('change', refreshLayout)
  // The controls and caption provide one accessible route through the repeated artwork.
  stage.setAttribute('aria-hidden','true')
  updateSelection(selectedCursor)
  renderStudy()
  document.fonts.ready.then(refreshLayout)
  for (const button of controls) button.disabled = false
}
