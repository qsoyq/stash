// Browser-only layout inspector. Load as a classic inline or external script with
// data-layout-config JSON: { site, hiddenClass, publicRoutes, targets, settings }.
// targets maps report names to CSS selectors; settings accepts booleans/numbers only.
// publicRoutes must contain only non-personal static paths. No text, input values,
// cookies or network uploads are collected. Reports are generated on button clicks.
function startLayoutDiagnostics(config) {
    if (window.__stashLayoutDiagnostics) return
    if (!config || typeof config !== 'object' || Array.isArray(config)) return
    const site = typeof config.site === 'string' && /^[a-z0-9_-]{1,32}$/.test(config.site) ? config.site : 'unknown'
    const options = Object.fromEntries(Object.entries(config.settings || {}).filter(([key, value]) =>
        /^[a-z_]{1,64}$/.test(key) && (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)))))
    const targets = Object.entries(config.targets || {}).filter(([name, selector]) =>
        /^[a-zA-Z_]{1,64}$/.test(name) && typeof selector === 'string' && selector.length <= 256).slice(0, 16)
    function findTarget(selector) {
        try { return document.querySelector(selector) } catch (_) { return null }
    }
    const hiddenClass = typeof config.hiddenClass === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(config.hiddenClass) ? config.hiddenClass : 'stash-diagnostic-no-hidden-class'
    const diagnosticAttribute = 'data-stash-layout-diagnostic'

    function roundRect(rect) {
        return {
            top: Math.round(rect.top), bottom: Math.round(rect.bottom),
            left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height),
        }
    }

    function describeElement(element) {
        const style = window.getComputedStyle(element)
        return {
            tag: element.tagName.toLowerCase(),
            testid: element.getAttribute('data-testid'),
            role: element.getAttribute('role'),
            classes: Array.from(element.classList).slice(0, 8),
            rect: roundRect(element.getBoundingClientRect()),
            style: {
                display: style.display, position: style.position, zIndex: style.zIndex,
                overflow: style.overflow, height: style.height, minHeight: style.minHeight,
                paddingTop: style.paddingTop, marginTop: style.marginTop,
                transform: style.transform === 'none' ? null : style.transform, opacity: style.opacity,
            },
            childCount: element.children.length,
            hiddenByScript: element.classList.contains(hiddenClass),
        }
    }

    function ancestorChain(element, limit = 16) {
        const chain = []
        for (let current = element; current && chain.length < limit; current = current.parentElement) {
            chain.push(describeElement(current))
            if (current === document.documentElement) break
        }
        return chain
    }

    function isDiagnosticElement(element) {
        return element.closest(`[${diagnosticAttribute}]`) !== null
    }

    function measureSafeArea() {
        const probe = document.createElement('div')
        probe.setAttribute(diagnosticAttribute, '')
        probe.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'
        document.body.appendChild(probe)
        const style = window.getComputedStyle(probe)
        const result = { top: style.paddingTop, bottom: style.paddingBottom }
        probe.remove()
        return result
    }

    function collectLayoutDiagnostics() {
        const maxTop = 360
        const bottomStart = Math.max(0, window.innerHeight - 180)
        const width = window.innerWidth || document.documentElement.clientWidth
        const topElements = Array.from(document.querySelectorAll('body *')).filter(element => {
            if (isDiagnosticElement(element) || element.matches('script, style')) return false
            const rect = element.getBoundingClientRect()
            return rect.bottom > 0 && rect.top < maxTop && rect.height >= 16 && rect.width >= width * 0.5
        }).slice(0, 100).map(element => {
            let depth = 0
            for (let current = element; current.parentElement; current = current.parentElement) depth++
            return { depth, ...describeElement(element) }
        })
        const svgs = Array.from(document.querySelectorAll('svg')).filter(svg => {
            if (isDiagnosticElement(svg)) return false
            const rect = svg.getBoundingClientRect()
            return rect.bottom > 0 && rect.top < window.innerHeight && (rect.top < maxTop || rect.bottom > bottomStart) && rect.width > 0 && rect.height > 0
        }).slice(0, 40).map(svg => ({
            svg: describeElement(svg),
            viewBox: svg.getAttribute('viewBox'),
            firstPath: svg.querySelector('path')?.getAttribute('d')?.slice(0, 160) || null,
            ancestors: ancestorChain(svg.parentElement, 8),
        }))
        const sampleRows = [...new Set([
            ...Array.from({ length: 19 }, (_, index) => index * 20),
            ...Array.from({ length: 9 }, (_, index) => bottomStart + index * 20),
        ])].filter(y => y < window.innerHeight)
        const probes = sampleRows.map(y => ({
            y,
            stack: document.elementsFromPoint(width / 2, y)
                .filter(element => !isDiagnosticElement(element)).slice(0, 10).map(describeElement),
        }))
        const path = new URL(window.location.href).pathname
        return {
            diagnosticVersion: 2,
            toolVersion: '1.0.0',
            site,
            timestamp: new Date().toISOString(),
            route: Array.isArray(config.publicRoutes) && config.publicRoutes.includes(path) ? path : '[other route]',
            standalone: {
                navigator: window.navigator?.standalone === true,
                displayMode: window.matchMedia?.('(display-mode: standalone)')?.matches === true,
            },
            viewport: {
                innerWidth: window.innerWidth, innerHeight: window.innerHeight,
                visualViewportHeight: window.visualViewport?.height ?? null,
                visualViewportOffsetTop: window.visualViewport?.offsetTop ?? null,
                devicePixelRatio: window.devicePixelRatio ?? null,
                safeArea: measureSafeArea(),
            },
            scroll: {
                windowY: Math.round(window.scrollY || 0),
                documentTop: Math.round(document.scrollingElement?.scrollTop || 0),
            },
            options,
            targets: Object.fromEntries(targets.map(([name, selector]) => {
                const element = findTarget(selector)
                return [name, element ? { element: describeElement(element), ancestors: ancestorChain(element) } : null]
            })),
            topElements,
            svgs,
            probes,
        }
    }

    async function copyDiagnosticText(text) {
        try {
            if (window.navigator?.clipboard?.writeText) {
                await window.navigator.clipboard.writeText(text)
                return true
            }
        } catch (_) { }
        const area = document.createElement('textarea')
        area.setAttribute(diagnosticAttribute, '')
        area.value = text
        area.readOnly = true
        area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'
        document.body.appendChild(area)
        area.select()
        let copied = false
        try { copied = document.execCommand('copy') } catch (_) { }
        area.remove()
        return copied
    }

    function showManualCopy(text) {
        document.querySelector('[data-stash-layout-diagnostic-panel]')?.remove()
        const panel = document.createElement('div')
        panel.setAttribute(diagnosticAttribute, '')
        panel.setAttribute('data-stash-layout-diagnostic-panel', '')
        panel.style.cssText = 'position:fixed;inset:12px;z-index:2147483647;background:#000;border:1px solid #1d9bf0;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px'
        const area = document.createElement('textarea')
        area.value = text
        area.readOnly = true
        area.style.cssText = 'flex:1;width:100%;font:11px monospace;background:#111;color:#fff;border:0'
        const close = document.createElement('button')
        close.textContent = '关闭'
        close.type = 'button'
        close.addEventListener('click', () => panel.remove())
        panel.append(area, close)
        document.body.appendChild(panel)
        area.select()
    }

    function ensureDiagnosticButton() {
        if (document.querySelector('[data-stash-layout-diagnostic-button]')) return
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = '复制诊断信息'
        button.setAttribute(diagnosticAttribute, '')
        button.setAttribute('data-stash-layout-diagnostic-button', '')
        button.style.cssText = 'position:fixed;right:12px;bottom:calc(env(safe-area-inset-bottom) + 76px);z-index:2147483647;border:0;border-radius:999px;padding:8px 12px;background:#1d9bf0;color:#fff;font:600 13px -apple-system,system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35)'
        button.addEventListener('click', async () => {
            const text = JSON.stringify(collectLayoutDiagnostics(), null, 2)
            const copied = await copyDiagnosticText(text)
            button.textContent = copied ? '已复制' : '请手动复制'
            if (!copied) showManualCopy(text)
            window.setTimeout(() => { button.textContent = '复制诊断信息' }, 2500)
        })
        document.body.appendChild(button)
    }

    window.__stashLayoutDiagnostics = { collect: collectLayoutDiagnostics }
    ensureDiagnosticButton()
    window.setInterval(ensureDiagnosticButton, 1000)
}

// Classic script entrypoint: configuration belongs to this tag, not to a shared global.
try {
    const config = JSON.parse(document.currentScript?.getAttribute('data-layout-config') || '{}')
    startLayoutDiagnostics(config)
} catch (_) {
    console.warn('[layout-diagnostics] Invalid configuration')
}
