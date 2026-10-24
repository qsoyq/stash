/** @namespace x */

// Stash executes this file as an async function body. Do not redeclare injected globals.
function echo(...args) {
    console.log('[x-ad]', ...args)
}

function getScriptType() {
    return typeof $script !== 'undefined' ? $script.type : 'undefined'
}

function getScriptResponseBody() {
    const body = $response.body
    return typeof body === 'string' ? body : body == null ? '' : new TextDecoder('utf-8').decode(new Uint8Array(body))
}

async function get(params) {
    return new Promise((resolve, reject) => {
        $httpClient.get(params, (error, response, data) => {
            if (error) reject(new Error(String(error)))
            else resolve({ response, data })
        })
    })
}

function getXOptions() {
    const options = {
        block_ads_and_recommendations: true,
        hide_top_nav: true,
        hide_home_composer: true,
        hide_chat_drawer: true,
        hide_sidebar_trends: true,
        hide_nav_grok: true,
        hide_bottom_grok: true,
        hide_nav_premium: true,
        hide_nav_verified_orgs: true,
        hide_nav_jobs: true,
        hide_account_menu: true,
        hide_grok_drawer: true,
        hide_floating_post_button: true,
        hide_reply_permissions: true,
        hide_grok_actions: true,
        hide_translate_button: true,
        hide_automated_content: true,
        hide_probable_spam_prompt: true,
        enable_custom_layout: true,
        home_width_vw: 65,
        page_width_vw: 55,
        center_primary_column: true,
        enable_escape_back: true,
        enable_layout_diagnostics: false,
        hide_bottom_bar: false,
        hide_bottom_bar_on_scroll: true,
        hide_nav_notifications: false,
        hide_nav_messages: false,
        hide_notification_badge: false,
        hide_show_posts_prompt: false,
    }
    if (typeof $argument === 'undefined' || !$argument) return options
    let supplied
    try {
        supplied = JSON.parse($argument)
    } catch (_) {
        console.log('[x-ad] 参数不是有效 JSON，使用默认设置')
        return options
    }
    if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied)) return options
    for (const key of Object.keys(options)) {
        if (typeof options[key] === 'boolean' && typeof supplied[key] === 'boolean') {
            options[key] = supplied[key]
        } else if (typeof options[key] === 'number' && Number.isInteger(supplied[key]) && supplied[key] >= 30 && supplied[key] <= 100) {
            options[key] = supplied[key]
        }
    }
    return options
}

// Runs only in the injected browser script. Keep helpers inside this function
// so serialization does not depend on Stash globals or external page libraries.
function removeAdsCode(options) {
    window.__stashXBlocker?.destroy()
    const hiddenClass = 'x-ad-hidden'
    const sidebarClass = 'x-ad-empty-sidebar'
    const autoHideBottomBar = options.hide_bottom_bar_on_scroll && !options.hide_bottom_bar
    const needsUpdates = Object.entries(options).some(([key, value]) =>
        key !== 'enable_escape_back' && key !== 'enable_layout_diagnostics' && value === true)
    const simpleRules = [
        ['hide_chat_drawer', "[data-testid='chat-drawer-main']"],
        ['hide_nav_grok', "header a[aria-label='Grok'], header a[href='/i/grok']"],
        ['hide_nav_premium', "header a[aria-label='Premium'], header a[href='/i/premium_sign_up']"],
        ['hide_nav_verified_orgs', "header a[aria-label='Verified Orgs'], header a[href='/i/verified-orgs-signup']"],
        ['hide_nav_jobs', "header a[aria-label='Jobs'], header a[href='/jobs']"],
        ['hide_account_menu', "header button[aria-label='Account menu'], header [data-testid='SideNav_AccountSwitcher_Button']"],
        ['hide_floating_post_button', "[data-testid='FloatingActionButtonBase']"],
        ['hide_grok_drawer', "[data-testid='GrokDrawer']"],
        ['hide_grok_actions', "button[aria-label='Grok actions']"],
        ['hide_translate_button', "button[aria-label='Translate post']"],
        ['hide_reply_permissions', "[data-testid='tweetReplyRestrictions'], [data-testid='reply-restrictions']"],
        ['hide_sidebar_trends', "[data-testid='sidebarColumn'] [data-testid='trend'], [data-testid='sidebarColumn'] [data-testid='trends']"],
        ['block_ads_and_recommendations', "[data-testid='sidebarColumn'] [data-testid='premium-signup'], [data-testid='sidebarColumn'] [data-testid='super-upsell-UpsellCardRenderProperties']"],
    ].filter(([key]) => options[key])
    const style = document.createElement('style')
    style.id = 'x-ad-blocker-style'
    style.textContent = `
        .${hiddenClass}, .${sidebarClass} { display: none !important; }
        ${simpleRules.map(([, selector]) => `${selector} { display: none !important; }`).join('\n')}
        ${autoHideBottomBar ? `
        .x-ad-bottom-bar-autohide { transition: transform 0.2s ease, opacity 0.2s ease !important; }
        .x-ad-bottom-bar-collapsed {
            transform: translateY(calc(100% + env(safe-area-inset-bottom))) !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        @media (prefers-reduced-motion: reduce) { .x-ad-bottom-bar-autohide { transition: none !important; } }
        ` : ''}
        ${options.enable_custom_layout ? `
        @media (min-width: 1000px) {
            div[data-testid='primaryColumn'] {
                width: ${options.page_width_vw}vw !important;
                max-width: 100% !important;
                min-width: 0 !important;
                flex: 0 1 ${options.page_width_vw}vw !important;
            }
            html.x-ad-home-layout div[data-testid='primaryColumn'] {
                width: ${options.home_width_vw}vw !important;
                flex-basis: ${options.home_width_vw}vw !important;
            }
        }` : ''}
    `

    const scopes = ['header', 'nav', "[data-testid='BottomBar']"]
    const scopedLinks = paths => scopes.flatMap(scope => paths.map(path => `${scope} a[href${path}]`)).join(', ')
    const notificationLinks = "a[data-testid='AppTabBar_Notifications_Link'], " + scopedLinks(["='/notifications'", "='/notifications/'"])
    const messageLinks = "a[data-testid='AppTabBar_DirectMessage_Link'], " + scopedLinks(["='/messages'", "='/messages/'", "^='/i/chat'"])
    const showPostsPattern = /^(?:Show|显示|顯示)\s*[\d.,]+\s*[KkMm万萬]?\s*(?:posts?|Tweets?|(?:条|個|个|篇|則|则)?\s*(?:帖子|贴子|推文|貼文))$/
    const detailPattern = /^\/[^/]+\/status\/\d+(?:\/|$)/
    const managed = new Map()
    const sidebarTargets = new Set()
    let bottomBarTargets = new Set()
    let barNodes = []
    let centered = null
    let column = null
    let sidebar = null
    let destroyed = false
    let paused = false
    let frame = null
    let fullUpdate = true
    let layoutDirty = true
    let barsDirty = true
    let scrollDirty = false
    let domDirty = false
    let roots = new Set()
    let path = new URL(window.location.href).pathname
    const previousHomeClass = document.documentElement.classList.contains('x-ad-home-layout')
    let scrollState = { lastY: currentScrollY(), distance: 0, direction: 0, collapsed: false }
    const listeners = []
    const historyHooks = []
    let observedLayout = []

    function setClass(element, name, enabled) {
        if (element.classList.contains(name) !== enabled) element.classList.toggle(name, enabled)
    }

    function find(root, selector) {
        const matches = Array.from(root.querySelectorAll(selector))
        if (root instanceof Element && root.matches(selector)) matches.unshift(root)
        return matches
    }

    function navigationItem(element) {
        const stop = "body, main, header, nav, [role='navigation'], [data-testid='BottomBar'], [data-testid='primaryColumn'], #react-root, #layers"
        let target = element
        for (let parent = target.parentElement; parent && parent.children.length === 1 && !parent.matches(stop); parent = parent.parentElement) target = parent
        return target
    }

    function bottomBarContainer(bar) {
        let target = bar
        for (;;) {
            if (window.getComputedStyle(target).position === 'fixed') return target
            const parent = target.parentElement
            if (!parent || parent.children.length !== 1 || parent.matches("body, main, header, nav, [role='navigation'], [data-testid='primaryColumn'], #react-root, #layers")) break
            target = parent
        }
        return bar
    }

    function refreshBars() {
        barNodes = Array.from(document.querySelectorAll("[data-testid='BottomBar']"))
        const targets = new Set(barNodes.map(bottomBarContainer))
        bottomBarTargets.forEach(item => {
            if (!targets.has(item)) item.classList.remove('x-ad-bottom-bar-autohide', 'x-ad-bottom-bar-collapsed')
        })
        bottomBarTargets = targets
        bottomBarTargets.forEach(item => setClass(item, 'x-ad-bottom-bar-autohide', true))
        renderBars()
    }

    function renderBars() {
        bottomBarTargets.forEach(item => setClass(item, 'x-ad-bottom-bar-collapsed', scrollState.collapsed))
    }

    function maxScrollY() {
        return Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    }

    function currentScrollY() {
        const y = Math.max(0, window.scrollY || window.pageYOffset || 0)
        return Math.min(y, maxScrollY())
    }

    // A pure direction decision: accumulate small movements, but reset the
    // distance when direction reverses. Page-end rubber banding is clamped above.
    function nextScrollState(previous, y) {
        const delta = y - previous.lastY
        const direction = Math.sign(delta)
        const distance = direction && direction !== previous.direction ? delta : previous.distance + delta
        return {
            lastY: y,
            direction: direction || previous.direction,
            distance: y <= 8 ? 0 : distance,
            collapsed: y <= 8 ? false : Math.abs(distance) >= 8 ? distance > 0 : previous.collapsed,
        }
    }

    function notificationBadges(link) {
        const badges = []
        link.querySelectorAll('span, [aria-label]').forEach(element => {
            if (element.closest('svg') || element.querySelector('svg')) return
            const label = element.getAttribute('aria-label') || ''
            const text = element.textContent.trim()
            if (!/^\d+\+?$/.test(text) && !/unread|未读|未讀/i.test(label)) return
            if (!badges.some(badge => badge.contains(element))) badges.push(element)
        })
        return badges
    }

    function collect(root, hits) {
        function hide(element, reason) {
            if (!element) return
            if (!hits.has(element)) hits.set(element, new Set())
            hits.get(element).add(reason)
        }
        if (options.hide_top_nav && !(window.innerWidth < 1000 && path.startsWith('/explore'))) {
            find(root, "[data-testid='TopNavBar']").forEach(element => hide(element, 'top-nav'))
        }
        if (options.hide_home_composer && path === '/home') {
            find(root, "[data-testid='tweetTextarea_0']").forEach(composer => {
                const container = composer.closest("[data-testid='cellInnerDiv'], [data-testid='tweetComposer']")
                    || (composer.parentElement?.previousElementSibling?.matches("[role='progressbar']") ? composer.parentElement : null)
                hide(container, 'composer')
            })
        }
        if (options.hide_bottom_grok && window.innerWidth < 1000) {
            find(root, "nav a[href='/i/grok'], [data-testid='BottomBar'] a[href='/i/grok']").forEach(link => {
                if (!link.closest('header, article')) hide(link, 'bottom-grok')
            })
        }
        if (options.hide_bottom_bar) find(root, "[data-testid='BottomBar']").forEach(bar => hide(navigationItem(bar), 'bottom-bar'))
        if (options.hide_nav_notifications || options.hide_notification_badge) {
            find(root, notificationLinks).forEach(link => {
                if (link.closest('article')) return
                if (options.hide_nav_notifications) hide(navigationItem(link), 'notifications')
                if (options.hide_notification_badge) notificationBadges(link).forEach(badge => hide(badge, 'notification-badge'))
            })
        }
        if (options.hide_nav_messages) find(root, messageLinks).forEach(link => {
            if (!link.closest('article')) hide(navigationItem(link), 'messages')
        })
        if (options.block_ads_and_recommendations) {
            find(root, "[data-testid='sidebarColumn'] a[href^='/i/premium_sign_up']").forEach(link => hide(link.closest('aside, section') || link, 'premium'))
            find(root, "[data-testid='sidebarColumn'] aside").forEach(card => {
                if (card.querySelector("[data-testid='UserCell']")) hide(card, 'recommendation')
            })
        }
        if (options.hide_sidebar_trends) find(root, "[data-testid='sidebarColumn'] [data-testid='trend']").forEach(trend => hide(trend.closest('section') || trend, 'trends'))
        if (options.hide_reply_permissions && detailPattern.test(path)) {
            find(root, "[data-testid='primaryColumn'] [aria-live='polite']").forEach(region => {
                if (!region.closest('article') && ['Who can reply', '谁可以回复', '誰可以回覆'].includes(region.textContent.trim())) hide(region, 'reply-permissions')
            })
        }
        if (options.hide_show_posts_prompt || options.hide_probable_spam_prompt) {
            find(root, "[data-testid='primaryColumn'] [role='button'], [data-testid='primaryColumn'] button").forEach(button => {
                if (button.closest('article')) return
                const text = button.textContent.replace(/\s+/g, ' ').trim()
                if (options.hide_show_posts_prompt && showPostsPattern.test(text)) {
                    const cell = button.closest("[data-testid='cellInnerDiv']")
                    // A reused cell may contain both a prompt and a tweet: never hide the tweet.
                    hide(cell && !cell.querySelector('article') ? cell : button, 'show-posts')
                }
                if (options.hide_probable_spam_prompt && text === 'Show probable spam') hide(button, 'spam')
            })
        }
        if (options.hide_automated_content) {
            // Text in tweetText or an unstructured article is not metadata. Prefer
            // explicit automation labels, with author metadata as a narrow fallback.
            find(root, "[data-testid='primaryColumn'] [data-testid='automationLabel'], [data-testid='primaryColumn'] [data-testid='automatedLabel'], [data-testid='primaryColumn'] [data-testid='User-Name'] span").forEach(label => {
                if (label.closest("[data-testid='tweetText']") || label.textContent.trim() !== 'Automated') return
                const article = label.closest('article')
                if (article && !article.parentElement?.closest('article')) hide(article.closest("[data-testid='cellInnerDiv']") || article, 'automated')
            })
        }
    }

    function reconcile(changedRoots) {
        const hits = new Map()
        changedRoots.forEach(root => collect(root, hits))
        managed.forEach((reasons, element) => {
            if (!element.isConnected || changedRoots.some(root => root === document || root.contains(element) || element.contains(root))) {
                managed.delete(element)
                if (!hits.has(element)) setClass(element, hiddenClass, false)
            }
        })
        hits.forEach((reasons, element) => {
            managed.set(element, reasons)
            setClass(element, hiddenClass, true)
        })
    }

    function hasVisibleContent(element, ignoreOwnDisplay = false) {
        if (!ignoreOwnDisplay && managed.has(element)) return false
        const computed = window.getComputedStyle(element)
        if ((!ignoreOwnDisplay && computed.display === 'none') || computed.visibility === 'hidden') return false
        const text = Array.from(element.childNodes).some(node => node.nodeType === 3 && node.textContent.trim())
        if (text || element.matches('input, button, img, svg, video, canvas, iframe')) return true
        return Array.from(element.children).some(child => hasVisibleContent(child))
    }

    function restoreCenter() {
        if (!centered) return
        if (centered.element.style.getPropertyValue('transform') === centered.applied) {
            if (centered.original) centered.element.style.setProperty('transform', centered.original, centered.priority)
            else centered.element.style.removeProperty('transform')
        }
        centered = null
    }

    function updateLayout() {
        if (options.enable_custom_layout) setClass(document.documentElement, 'x-ad-home-layout', path.startsWith('/home'))
        if (options.hide_top_nav) {
            document.querySelectorAll("header[role='banner']").forEach(header => {
                const hasNavigation = header.querySelector("nav, a, button, input, [data-testid='TopNavBar']") !== null
                const collapse = window.innerWidth < 1000 && !path.startsWith('/explore') && !hasNavigation && !hasVisibleContent(header, true)
                const reasons = new Set(managed.get(header) || [])
                reasons.delete('banner')
                if (collapse) reasons.add('banner')
                if (reasons.size) managed.set(header, reasons)
                else managed.delete(header)
                setClass(header, hiddenClass, reasons.size > 0)
            })
        }
        column = document.querySelector("[data-testid='primaryColumn']")
        sidebar = document.querySelector("[data-testid='sidebarColumn']")
        sidebarTargets.forEach(old => { if (old !== sidebar) { setClass(old, sidebarClass, false); sidebarTargets.delete(old) } })
        const empty = sidebar && (options.block_ads_and_recommendations || options.hide_sidebar_trends) && !hasVisibleContent(sidebar, true)
        if (sidebar) {
            setClass(sidebar, sidebarClass, !!empty)
            sidebarTargets.add(sidebar)
        }
        const showSidebar = sidebar && !empty && window.getComputedStyle(sidebar).display !== 'none'
        if (centered && (centered.element !== column || column.style.getPropertyValue('transform') !== centered.applied)) restoreCenter()
        if (!column || !options.center_primary_column || window.innerWidth < 1000 || showSidebar) restoreCenter()
        else {
            if (!centered) centered = { element: column, original: column.style.getPropertyValue('transform'), priority: column.style.getPropertyPriority('transform'), offset: 0, applied: null }
            // Account for our previous translation instead of clearing it and forcing two layouts.
            const rect = column.getBoundingClientRect()
            const offset = (window.innerWidth - rect.width) / 2 - rect.left + centered.offset
            const applied = `translateX(${offset}px)${centered.original ? ` ${centered.original}` : ''}`
            if (centered.applied !== applied) column.style.setProperty('transform', applied, 'important')
            centered.offset = offset
            centered.applied = applied
        }
        if (resizeObserver) {
            const elements = [column, column?.parentElement, sidebar].filter(Boolean)
            if (elements.length !== observedLayout.length || elements.some((element, index) => element !== observedLayout[index])) {
                resizeObserver.disconnect()
                observedLayout = elements
                elements.forEach(element => resizeObserver.observe(element))
            }
        }
    }

    function addRoot(element) {
        if (!element?.isConnected) return
        const boundary = element.closest("[data-testid='cellInnerDiv'], [data-testid='sidebarColumn'], header, nav, [data-testid='BottomBar'], [data-testid='primaryColumn']") || element
        for (const existing of roots) if (existing.contains(boundary)) return
        for (const existing of roots) if (boundary.contains(existing)) roots.delete(existing)
        roots.add(boundary)
    }

    function mutations(records) {
        let changed = false
        for (const record of records) {
            const target = record.target.nodeType === 1 ? record.target : record.target.parentElement
            if (!target || target.closest('script, style, [data-stash-layout-diagnostic]')) continue
            const nodes = record.type === 'childList' ? [...record.addedNodes, ...record.removedNodes] : []
            if (nodes.length && nodes.every(node => node.nodeType === 1 && node.matches('script, style, [data-stash-layout-diagnostic]'))) continue
            changed = domDirty = true
            if (barNodes.some(bar => target.contains(bar) || bar.contains(target)) || target.closest("[data-testid='BottomBar']")) barsDirty = true
            if (record.type === 'childList') {
                for (const node of nodes) {
                    if (node.nodeType === 1 && (node.matches("[data-testid='BottomBar']") || node.querySelector("[data-testid='BottomBar']"))) barsDirty = true
                }
            }
            if (target === document.body || target === document.documentElement) {
                const added = Array.from(record.addedNodes || []).filter(node => node.nodeType === 1 && !node.matches('script, style, [data-stash-layout-diagnostic]'))
                added.forEach(addRoot)
                if (record.type === 'attributes') layoutDirty = true
            } else addRoot(target)
            if (nodes.some(node => node.nodeType === 1 && (node.matches("header, [data-testid='primaryColumn'], [data-testid='sidebarColumn']") || node.querySelector("header, [data-testid='primaryColumn'], [data-testid='sidebarColumn']")))) layoutDirty = true
            // Timeline text updates do not change horizontal layout. Header/sidebar,
            // structural changes and external styles can change available column space.
            if (target.closest("header, [data-testid='sidebarColumn']") || target === column || record.type === 'attributes' && ['style', 'class'].includes(record.attributeName) || !column?.isConnected) layoutDirty = true
        }
        if (changed) schedule()
    }

    const observer = needsUpdates ? new MutationObserver(mutations) : null
    const observedWidths = new WeakMap()
    const resizeObserver = needsUpdates && (options.center_primary_column || options.hide_top_nav) ? new ResizeObserver(entries => {
        let widthChanged = false
        entries.forEach(entry => {
            if (observedWidths.get(entry.target) !== entry.contentRect.width) widthChanged = true
            observedWidths.set(entry.target, entry.contentRect.width)
        })
        if (widthChanged) { layoutDirty = true; schedule() }
    }) : null
    function observe() {
        observer?.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'href', 'aria-label', 'role', 'data-testid'] })
    }

    function schedule() {
        if (destroyed || paused || document.visibilityState === 'hidden' || frame !== null || !needsUpdates) return
        frame = window.requestAnimationFrame(flush)
    }

    function flush() {
        frame = null
        if (destroyed || paused || document.visibilityState === 'hidden') return
        mutationsPending()
        observer?.disconnect()
        try {
            const nextPath = new URL(window.location.href).pathname
            if (nextPath !== path) {
                path = nextPath
                fullUpdate = layoutDirty = barsDirty = true
                scrollState = { lastY: currentScrollY(), distance: 0, direction: 0, collapsed: false }
            }
            if (fullUpdate || domDirty || roots.size) reconcile(fullUpdate ? [document] : Array.from(roots))
            if (fullUpdate || layoutDirty) updateLayout()
            if (autoHideBottomBar && (fullUpdate || barsDirty)) refreshBars()
            if (autoHideBottomBar && scrollDirty) {
                const max = maxScrollY()
                // Shrinking content can clamp the window's position without a user
                // gesture. Do not interpret that clamp as an upward scroll.
                const previous = scrollState.lastY > max ? { ...scrollState, lastY: max, distance: 0 } : scrollState
                const next = nextScrollState(previous, currentScrollY())
                const changed = next.collapsed !== scrollState.collapsed
                scrollState = next
                if (changed) renderBars()
            }
            fullUpdate = layoutDirty = barsDirty = scrollDirty = domDirty = false
            roots.clear()
        } finally { observe() }
    }

    function mutationsPending() {
        const records = observer?.takeRecords()
        if (records?.length) mutations(records)
        // mutations() may schedule another frame. This flush already includes its work.
        if (frame !== null) window.cancelAnimationFrame(frame)
        frame = null
    }

    function listen(target, type, callback, settings) {
        target.addEventListener(type, callback, settings)
        listeners.push(() => target.removeEventListener(type, callback, settings))
    }

    function refresh() {
        fullUpdate = layoutDirty = barsDirty = true
        schedule()
    }

    function destroy() {
        if (destroyed) return
        destroyed = true
        if (frame !== null) window.cancelAnimationFrame(frame)
        observer?.disconnect()
        resizeObserver?.disconnect()
        listeners.forEach(remove => remove())
        historyHooks.forEach(([key, original, wrapper]) => { if (window.history[key] === wrapper) window.history[key] = original })
        managed.forEach((_, element) => setClass(element, hiddenClass, false))
        sidebarTargets.forEach(element => setClass(element, sidebarClass, false))
        bottomBarTargets.forEach(element => element.classList.remove('x-ad-bottom-bar-autohide', 'x-ad-bottom-bar-collapsed'))
        restoreCenter()
        setClass(document.documentElement, 'x-ad-home-layout', previousHomeClass)
        style.remove()
        managed.clear()
        sidebarTargets.clear()
        bottomBarTargets.clear()
        roots.clear()
        if (window.__stashXBlocker?.destroy === destroy) delete window.__stashXBlocker
    }

    window.__stashXBlocker = { refresh, destroy }
    if (options.enable_escape_back) listen(document, 'keydown', event => {
        if (event.key !== 'Escape' || event.isComposing || event.repeat || !detailPattern.test(new URL(window.location.href).pathname)) return
        if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return
        event.preventDefault()
        event.stopPropagation()
        window.history.back()
    }, true)
    if (needsUpdates) {
        document.head.appendChild(style)
        flush()
        listen(window, 'resize', refresh)
        listen(window.visualViewport || window, 'resize', () => { layoutDirty = barsDirty = true; schedule() })
        if (autoHideBottomBar) listen(window, 'scroll', () => { scrollDirty = true; schedule() }, { passive: true })
        listen(window, 'popstate', refresh)
        listen(window, 'pageshow', () => {
            paused = false
            scrollState = { lastY: currentScrollY(), distance: 0, direction: 0, collapsed: false }
            refresh()
        })
        listen(window, 'pagehide', () => {
            paused = true
            if (frame !== null) window.cancelAnimationFrame(frame)
            frame = null
            observer.disconnect()
            resizeObserver?.disconnect()
            observedLayout = []
        })
        listen(document, 'visibilitychange', () => {
            paused = document.visibilityState === 'hidden'
            if (paused) {
                if (frame !== null) window.cancelAnimationFrame(frame)
                frame = null
                observer.disconnect()
                resizeObserver?.disconnect()
                observedLayout = []
            } else {
                scrollState = { lastY: currentScrollY(), distance: 0, direction: 0, collapsed: false }
                refresh()
            }
        })
        for (const key of ['pushState', 'replaceState']) {
            const original = window.history[key]
            if (typeof original !== 'function') continue
            const wrapper = function (...args) {
                const result = original.apply(this, args)
                if (new URL(window.location.href).pathname !== path) refresh()
                return result
            }
            window.history[key] = wrapper
            historyHooks.push([key, original, wrapper])
        }
    }
}

const LAYOUT_DIAGNOSTICS_URL = 'https://raw.githubusercontent.com/qsoyq/stash/main/script/browser/layout-diagnostics.js'

async function loadLayoutDiagnosticsSource() {
    try {
        const result = await get({ url: LAYOUT_DIAGNOSTICS_URL, timeout: 5 })
        const status = result.response?.status ?? result.response?.statusCode
        if (status >= 200 && status < 300 && typeof result.data === 'string' && result.data.includes('function startLayoutDiagnostics')) {
            return result.data
        }
        echo(`[Warn] 页面布局诊断脚本下载失败：HTTP ${status}`)
    } catch (error) {
        echo(`[Warn] 页面布局诊断脚本下载失败：${error.error || error}`)
    }
    return null
}

function addDiagnosticFailureNotice(document, container) {
    const notice = document.createElement('script')
    notice.textContent = "(function(){var b=document.createElement('button');b.textContent='诊断工具加载失败（点击关闭）';b.style.cssText='position:fixed;right:12px;bottom:calc(env(safe-area-inset-bottom) + 76px);z-index:2147483647;background:#b33;color:white;padding:8px';b.onclick=function(){b.remove()};document.body.appendChild(b)})();"
    container.appendChild(notice)
}

function removeAds(document, options, diagnosticSource = null) {
    const enabled = Object.values(options).some(value => value === true)
    if (!enabled) return false
    const script = document.createElement('script')
    const container = document.body || document.documentElement
    const settings = JSON.stringify(options).replace(/</g, '\\u003c')
    script.textContent = `(${removeAdsCode.toString()})(${settings});`
    if (options.enable_layout_diagnostics && !diagnosticSource) {
        addDiagnosticFailureNotice(document, container)
    } else if (options.enable_layout_diagnostics) {
        const diagnostic = document.createElement('script')
        diagnostic.textContent = diagnosticSource.replace(/<\/script/gi, '<\\/script')
        diagnostic.setAttribute('data-layout-config', JSON.stringify({
            site: 'x',
            hiddenClass: 'x-ad-hidden',
            publicRoutes: ['/home', '/explore'],
            targets: {
                topNav: "[data-testid='TopNavBar']",
                banner: "header[role='banner']",
                primaryColumn: "[data-testid='primaryColumn']",
                sidebarColumn: "[data-testid='sidebarColumn']",
                bottomBar: "[data-testid='BottomBar']",
                bottomGrok: "nav a[href='/i/grok']:not(header a), [data-testid='BottomBar'] a[href='/i/grok']",
                navNotifications: "a[data-testid='AppTabBar_Notifications_Link'], [data-testid='BottomBar'] a[href='/notifications']",
                navMessages: "a[data-testid='AppTabBar_DirectMessage_Link'], [data-testid='BottomBar'] a[href='/messages'], [data-testid='BottomBar'] a[href^='/i/chat']",
            },
            settings: {
                hide_top_nav: options.hide_top_nav,
                hide_home_composer: options.hide_home_composer,
                enable_custom_layout: options.enable_custom_layout,
                center_primary_column: options.center_primary_column,
                hide_bottom_bar: options.hide_bottom_bar,
                hide_bottom_bar_on_scroll: options.hide_bottom_bar_on_scroll,
                hide_nav_notifications: options.hide_nav_notifications,
                hide_nav_messages: options.hide_nav_messages,
                hide_notification_badge: options.hide_notification_badge,
                hide_show_posts_prompt: options.hide_show_posts_prompt,
            },
        }))
        container.appendChild(diagnostic)
    }
    container.appendChild(script)
    return true
}


async function main() {
    const options = getXOptions()
    if (!Object.values(options).some(value => value === true)) {
        $done({})
        return
    }
    switch (getScriptType()) {
        case "response":
            let url = (new URL($request.url))
            let body = getScriptResponseBody()
            let ct = Object.entries($response.headers || {}).find(([name]) => name.toLowerCase() === 'content-type')?.[1]
            if (ct && ct.toLowerCase().includes("text/html") && body) {
                echo(`url: ${url}, path: ${url.pathname}`)
                const document = new DOMParser().parseFromString(body, 'text/html')
                const diagnosticSource = options.enable_layout_diagnostics ? await loadLayoutDiagnosticsSource() : null
                if (!removeAds(document, options, diagnosticSource)) {
                    $done({})
                    break
                }
                // Keep the original document mode; outerHTML alone drops the doctype.
                const doctype = document.doctype
                const declaration = doctype ? `<!DOCTYPE ${doctype.name}${doctype.publicId ? ` PUBLIC "${doctype.publicId}"` : ''}${doctype.systemId ? `${doctype.publicId ? '' : ' SYSTEM'} "${doctype.systemId}"` : ''}>` : ''
                $done({ body: declaration + document.documentElement.outerHTML })
                break
            }
        default:
            $done({})
    }
}

main().catch(error => {
    echo('[Error]', error instanceof Error ? error.message : String(error))
    $done({})
})
