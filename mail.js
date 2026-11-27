/* Mailto stays the send path. This only copies the address and says so when no mail app opens.
   A future form posts into #contact-form[data-form="unconfigured"]; nothing here submits. */
(() => {
  const note = 'If no mail app opens, copy the address and paste it into any mail program.'
  const copied = 'Email address copied.'
  const failed = 'Select the address and copy it from your browser menu.'

  const statusFor = (node) => {
    const root = node.closest('section, footer, main, .ax-foot-col') || document.body
    return root.querySelector('[data-mail-status]')
  }

  const write = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value)
      return true
    }
    const field = document.createElement('textarea')
    field.value = value
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.left = '-999px'
    document.body.appendChild(field)
    field.select()
    let ok = false
    try { ok = document.execCommand('copy') } catch { ok = false }
    field.remove()
    return ok
  }

  document.querySelectorAll('[data-copy-email]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.getAttribute('data-copy-email') || ''
      const live = statusFor(button)
      const label = button.textContent
      let ok = false
      try { ok = await write(value) } catch { ok = false }
      if (live) live.textContent = ok ? copied : failed
      if (ok) button.textContent = 'Copied'
      window.setTimeout(() => {
        button.textContent = label
        if (live && live.textContent === copied) live.textContent = note
      }, 2500)
    })
  })

  document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
    link.addEventListener('click', () => {
      const live = statusFor(link)
      if (!live) return
      let left = false
      const mark = () => { left = true }
      window.addEventListener('blur', mark, { once: true })
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') left = true
      }, { once: true })
      window.setTimeout(() => {
        if (!left && document.visibilityState === 'visible') live.textContent = 'No mail app opened. Copy the address and paste it into any mail program.'
      }, 1600)
    })
  })
})()
